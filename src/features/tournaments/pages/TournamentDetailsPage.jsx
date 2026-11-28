import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditModeIcon from "@mui/icons-material/Edit";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import {
  getDrawConfigurationOptions,
  getTournament,
  getTournamentCategories,
  publishTournament,
  unpublishTournament,
  updateTournament,
} from "../api/tournamentApi";
import { resolveApiAssetUrl } from "../../../core/api/apiClient";
import { getAgeGroups } from "../../ageGroups/api/ageGroupApi";

const POINT_FORMAT_PRESETS = [
  {
    value: "standard",
    label: "Standard badminton (21 / 2 / 30)",
    pointsToWin: 21,
    winningMargin: 2,
    maxPoints: 30,
  },
  {
    value: "short",
    label: "Short format (15 / 2 / 21)",
    pointsToWin: 15,
    winningMargin: 2,
    maxPoints: 21,
  },
];

function parseNumericField(value) {
  const normalized = String(value)
    .trim()
    .replace(/,/g, "")
    .replace(/\s*(PTS|MMK)$/i, "");
  const number = Number(normalized);
  return normalized && Number.isFinite(number) ? number : null;
}

function getPairingType(category) {
  const code = category.code.trim().toUpperCase();
  const name = category.name.toLowerCase();
  if (code === "XD" || name.includes("mixed")) return "mixed_doubles";
  if (["MD", "WD"].includes(code) || name.includes("doubles")) return "doubles";
  return "singles";
}

function formatDrawOption(value) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveDrawConfiguration(category, options) {
  const defaults = options?.defaults || {};
  return {
    drawFormat:
      category.drawConfiguration?.drawFormat || defaults.drawFormat || "",
    seedingMethod:
      category.drawConfiguration?.seedingMethod ||
      defaults.seedingMethod ||
      "",
    thirdPlaceMatch:
      typeof category.drawConfiguration?.thirdPlaceMatch === "boolean"
        ? category.drawConfiguration.thirdPlaceMatch
        : defaults.thirdPlaceMatch ?? false,
  };
}

function getAgeGroupPayload(category, availableAgeGroups) {
  if (!category.ageGroup) return null;

  const ageGroup =
    availableAgeGroups.find(
      (option) => String(option.id) === String(category.ageGroup),
    ) || category.source?.ageGroup;
  if (
    !ageGroup ||
    typeof ageGroup.name !== "string" ||
    !Number.isFinite(Number(ageGroup.age))
  ) {
    return null;
  }

  return { name: ageGroup.name, age: Number(ageGroup.age) };
}

function getPointFormatPreset(category) {
  const preset = POINT_FORMAT_PRESETS.find(
    (option) =>
      Number(category.pointsToWin) === option.pointsToWin &&
      Number(category.winningMargin) === option.winningMargin &&
      Number(category.maxPoints) === option.maxPoints,
  );
  return preset?.value || "custom";
}

export default function TournamentDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Form States
  const [title, setTitle] = useState("");
  const [fee, setFee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState(
    "Registration Open (Accepting Players)",
  );
  const [pointsPool, setPointsPool] = useState("");
  const [description, setDescription] = useState("");
  const [courtName, setCourtName] = useState("");
  const [address, setAddress] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [originalTournament, setOriginalTournament] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [updateError, setUpdateError] = useState("");

  // Edit Mode State (Default: Read-Only)
  const [isEditing, setIsEditing] = useState(false);

  // Form Validation State
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Official Rules State
  const [rules, setRules] = useState([]);

  // Categories State
  const [categories, setCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryLoadError, setCategoryLoadError] = useState("");
  const [availableAgeGroups, setAvailableAgeGroups] = useState([]);
  const [isLoadingAgeGroups, setIsLoadingAgeGroups] = useState(true);
  const [ageGroupLoadError, setAgeGroupLoadError] = useState("");
  const [drawConfigurationOptions, setDrawConfigurationOptions] =
    useState(null);
  const [isLoadingDrawConfiguration, setIsLoadingDrawConfiguration] =
    useState(true);
  const [drawConfigurationLoadError, setDrawConfigurationLoadError] =
    useState("");

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const publicationStatus = (
    originalTournament?.publicationStatus || ""
  ).toLowerCase();
  const isPublished = publicationStatus === "published";
  const isUnpublished = publicationStatus === "unpublished";
  const isPublicationLocked = isPublished;

  useEffect(() => {
    let cancelled = false;

    async function loadTournament() {
      setIsLoading(true);
      setLoadError("");
      try {
        const tournament = await getTournament(id, { authenticated: true });
        if (cancelled) return;

        setOriginalTournament({
          ...tournament,
          publicationLocked:
            tournament.publicationStatus?.toLowerCase() === "published",
        });
        setTitle(tournament.title || "");
        setFee(String(tournament.defaultEntryFee ?? ""));
        setStartDate(tournament.startDate?.slice(0, 10) || "");
        setEndDate(tournament.endDate?.slice(0, 10) || "");
        setRegistrationStatus(
          tournament.categories?.length > 0 &&
            tournament.categories.every(
              (category) => category.entryStatus === "closed",
            )
            ? "Registration Closed"
            : "Registration Open (Accepting Players)",
        );
        setPointsPool(String(tournament.rankingPointsPool ?? ""));
        setDescription(tournament.description || "");
        setCourtName(
          (tournament.venues || [])
            .map((venue) => venue.venueName)
            .filter(Boolean)
            .join(", "),
        );
        setAddress(
          (tournament.venues || [])
            .map((venue) => venue.address)
            .filter(Boolean)
            .join(", "),
        );
        setBannerImage(resolveApiAssetUrl(tournament.bannerUrl));
        setRules(
          [...(tournament.rules || [])]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(
              ({ title: ruleTitle, description: ruleDescription }) => ({
                title: ruleTitle || "",
                description: ruleDescription || "",
              }),
            ),
        );
        setCategories(
          (tournament.categories || []).map((category) => ({
            source: category,
            code: category.categoryCode || "",
            name: category.categoryName || "",
            ageGroup: String(
              category.ageGroupId ??
                category.ageGroup?.id ??
                category.ageGroup ??
                "",
            ),
            drawConfiguration: category.drawConfiguration || null,
            entryFee: String(category.entryFee ?? ""),
            pairingType:
              category.pairingType ||
              getPairingType({
                code: category.categoryCode || "",
                name: category.categoryName || "",
              }),
            seeds: category.seedCount
              ? `${category.seedCount} Seeded Positions`
              : "Unseeded",
            format: category.matchFormat || "Best of 3 games",
            pointsToWin: String(category.pointsToWin ?? 21),
            winningMargin: String(category.winningMargin ?? 2),
            maxPoints: String(category.maxPoints ?? 30),
            gamesToWin: String(category.gamesToWin ?? 2),
            status:
              category.entryStatus === "closed"
                ? "Enrollment Closed"
                : category.entryStatus === "closing_soon"
                  ? "Open (Fast Closing)"
                  : "Enrollment Open",
            criteria: category.eligibilityCriteria || "",
            pointsPool: String(category.pointsPool ?? ""),
            shuttle: category.shuttleName || "",
            shuttleSpeed: category.shuttleSpeed || "",
            pointTiers:
              category.pointTiers?.length > 0
                ? category.pointTiers.map((tier) => ({
                    source: tier,
                    place: tier.label || "",
                    points: String(tier.points ?? ""),
                  }))
                : [
                    { source: null, place: "Champion", points: "" },
                    { source: null, place: "Runner-up", points: "" },
                  ],
          })),
        );
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load tournament details.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadTournament();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategoryOptions() {
      setIsLoadingCategories(true);
      setCategoryLoadError("");
      try {
        const options = await getTournamentCategories();
        if (!cancelled) setAvailableCategories(options);
      } catch (error) {
        if (!cancelled) {
          setCategoryLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load tournament categories.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingCategories(false);
      }
    }

    loadCategoryOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAgeGroups() {
      setIsLoadingAgeGroups(true);
      setAgeGroupLoadError("");
      try {
        const options = await getAgeGroups();
        if (!cancelled) setAvailableAgeGroups(options);
      } catch (error) {
        if (!cancelled) {
          setAgeGroupLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load age groups.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingAgeGroups(false);
      }
    }

    loadAgeGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDrawConfigurationOptions() {
      setIsLoadingDrawConfiguration(true);
      setDrawConfigurationLoadError("");
      try {
        const options = await getDrawConfigurationOptions();
        if (cancelled) return;
        setDrawConfigurationOptions(options);
      } catch (error) {
        if (!cancelled) {
          setDrawConfigurationLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load draw configuration options.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingDrawConfiguration(false);
      }
    }

    loadDrawConfigurationOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bannerImage.startsWith("blob:")) return undefined;
    return () => URL.revokeObjectURL(bannerImage);
  }, [bannerImage]);

  const handleImageChange = (e) => {
    if (!isEditing) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setBannerFile(null);
      setBannerImage(resolveApiAssetUrl(originalTournament?.bannerUrl));
      setUpdateError("Choose a JPEG, PNG, or WebP banner image.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setBannerFile(null);
      setBannerImage(resolveApiAssetUrl(originalTournament?.bannerUrl));
      setUpdateError("The banner image must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }

    setUpdateError("");
    setBannerFile(file);
    setBannerImage(URL.createObjectURL(file));
  };

  const handleAddRule = () => {
    if (!isEditing) return;
    setRules([...rules, { title: "", description: "" }]);
  };

  const handleRemoveRule = (index) => {
    if (!isEditing || index === 0) return; // Prevent deleting first rule
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleAddCategory = () => {
    if (!isEditing) return;
    setCategories([
      ...categories,
      {
        source: null,
        code: "",
        name: "",
        ageGroup: "",
        drawConfiguration: drawConfigurationOptions
          ? { ...drawConfigurationOptions.defaults }
          : null,
        entryFee: "",
        pairingType: "",
        seeds: "8 Seeded Positions",
        format: "Best of 3 games",
        pointsToWin: "21",
        winningMargin: "2",
        maxPoints: "30",
        gamesToWin: "2",
        status: "Open (Fast Closing)",
        criteria: "",
        pointsPool: "",
        shuttle: "",
        shuttleSpeed: "",
        pointTiers: [
          { source: null, place: "Champion", points: "" },
          { source: null, place: "Runner-up", points: "" },
        ],
      },
    ]);
  };

  const updateCategoryField = (categoryIndex, field, value) => {
    setCategories((current) =>
      current.map((category, index) =>
        index === categoryIndex ? { ...category, [field]: value } : category,
      ),
    );
  };

  const applyPointFormatPreset = (categoryIndex, presetValue) => {
    const preset = POINT_FORMAT_PRESETS.find(
      (option) => option.value === presetValue,
    );
    if (!preset) return;

    setCategories((current) =>
      current.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              pointsToWin: String(preset.pointsToWin),
              winningMargin: String(preset.winningMargin),
              maxPoints: String(preset.maxPoints),
            }
          : category,
      ),
    );
  };

  const updateCategoryDrawConfiguration = (categoryIndex, field, value) => {
    setCategories((current) =>
      current.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              drawConfiguration: {
                ...(category.drawConfiguration ||
                  drawConfigurationOptions?.defaults ||
                  {}),
                [field]: value,
              },
            }
          : category,
      ),
    );
  };

  const selectCategoryCode = (categoryIndex, code) => {
    const selectedCategory = availableCategories.find(
      (option) => option.categoryCode === code,
    );
    setCategories((current) =>
      current.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              code: selectedCategory?.categoryCode || "",
              name: selectedCategory?.name || "",
              pairingType:
                selectedCategory?.pairingType ||
                getPairingType({
                  code: selectedCategory?.categoryCode || "",
                  name: selectedCategory?.name || "",
                }),
            }
          : category,
      ),
    );
  };

  const handleRemoveCategory = (index) => {
    if (!isEditing || index === 0) return; // Prevent deleting first category
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleAddPointTier = (categoryIndex) => {
    if (!isEditing) return;
    setCategories((current) =>
      current.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              pointTiers: [
                ...category.pointTiers,
                {
                  source: null,
                  place: `Place ${category.pointTiers.length + 1}`,
                  points: "",
                },
              ],
            }
          : category,
      ),
    );
  };

  const handlePointTierChange = (categoryIndex, tierIndex, field, value) => {
    setCategories((current) =>
      current.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              pointTiers: category.pointTiers.map((tier, tierPosition) =>
                tierPosition === tierIndex
                  ? { ...tier, [field]: value }
                  : tier,
              ),
            }
          : category,
      ),
    );
  };

  const handleRemovePointTier = (categoryIndex, tierIndex) => {
    if (!isEditing) return;
    setCategories((current) =>
      current.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              pointTiers: category.pointTiers.filter(
                (_, tierPosition) => tierPosition !== tierIndex,
              ),
            }
          : category,
      ),
    );
  };

  const handleUnpublish = async () => {
    if (!originalTournament || isUnpublishing) return;
    setIsUnpublishing(true);
    setUpdateError("");
    try {
      await unpublishTournament(id);
      setOriginalTournament((current) => ({
        ...current,
        publicationStatus: "unpublished",
        publicationLocked: false,
      }));
      setIsEditing(false);
      setUpdateError("");
    } catch (error) {
      setUpdateError(
        error instanceof Error
          ? error.message
          : "Unable to unpublish tournament.",
      );
    } finally {
      setIsUnpublishing(false);
    }
  };

  const handleRepublish = async () => {
    if (!originalTournament || isUnpublishing) return;
    setIsUnpublishing(true);
    setUpdateError("");
    try {
      await publishTournament(id);
      setOriginalTournament((current) => ({
        ...current,
        publicationStatus: "published",
        publicationLocked: true,
      }));
      setIsEditing(false);
    } catch (error) {
      setUpdateError(
        error instanceof Error
          ? error.message
          : "Unable to publish tournament.",
      );
    } finally {
      setIsUnpublishing(false);
    }
  };

  // Comprehensive Validation on Update
  const handleUpdate = async (e, publishAfterSave = false) => {
    e.preventDefault();
    if (!isEditing) return;
    if (isPublicationLocked) {
      setIsEditing(false);
      setUpdateError("Published tournaments remain locked against edits.");
      return;
    }

    setAttemptedSubmit(true);
    setUpdateError("");

    if (!title || !startDate || !endDate || !pointsPool || !description) {
      setUpdateError(
        "Complete the required tournament title, dates, points pool, and description.",
      );
      return;
    }
    if (!courtName || !address) {
      setUpdateError("Complete the venue name and full address.");
      return;
    }
    if (
      rules.length === 0 ||
      rules.some(
        (rule) => !rule.title.trim() || !rule.description.trim(),
      ) ||
      categories.some(
        (category) =>
          !category.code.trim() ||
          !category.name.trim() ||
          !category.pointsPool ||
          category.pointTiers.length === 0 ||
          category.pointTiers.some(
            (tier) => !tier.place.trim() || !tier.points,
          ),
      )
    ) {
      setUpdateError(
        "Complete every rule and category. Each category needs a draw configuration, points pool, and at least one complete point tier.",
      );
      return;
    }

    if (
      isLoadingCategories ||
      categoryLoadError ||
      isLoadingAgeGroups ||
      ageGroupLoadError ||
      isLoadingDrawConfiguration ||
      drawConfigurationLoadError ||
      !drawConfigurationOptions
    ) {
      setUpdateError(
        categoryLoadError ||
          ageGroupLoadError ||
          drawConfigurationLoadError ||
          "Wait for tournament category options to finish loading before saving.",
      );
      return;
    }

    if (
      categories.some(
        (category) =>
          !drawConfigurationOptions.drawFormats.includes(
            resolveDrawConfiguration(category, drawConfigurationOptions)
              .drawFormat,
          ) ||
          !drawConfigurationOptions.seedingMethods.includes(
            resolveDrawConfiguration(category, drawConfigurationOptions)
              .seedingMethod,
          ) ||
          typeof resolveDrawConfiguration(category, drawConfigurationOptions)
            .thirdPlaceMatch !== "boolean",
      )
    ) {
      setUpdateError(
        "Each category needs a valid draw format, seeding method, and third-place match setting.",
      );
      return;
    }

    if (
      categories.some(
        (category) =>
          category.ageGroup &&
          !getAgeGroupPayload(category, availableAgeGroups),
      )
    ) {
      setUpdateError("Select a valid age group or clear the age restriction.");
      return;
    }

    if (
      categories.some((category) => {
        const categoryEntryFee = parseNumericField(category.entryFee || fee);
        const scoringValues = [
          category.pointsToWin,
          category.winningMargin,
          category.maxPoints,
          category.gamesToWin,
        ];
        return (
          categoryEntryFee === null ||
          categoryEntryFee < 0 ||
          scoringValues.some(
            (value) => !Number.isInteger(Number(value)) || Number(value) < 1,
          )
        );
      })
    ) {
      setUpdateError(
        "Each category needs a valid entry fee and positive whole-number match scoring settings.",
      );
      return;
    }

    const numericFields = [
      parseNumericField(pointsPool),
      ...categories.flatMap((category) => [
        parseNumericField(category.pointsPool),
        ...category.pointTiers.map((tier) => parseNumericField(tier.points)),
      ]),
    ];
    if (numericFields.some((value) => value === null || value < 0)) {
      setUpdateError(
        "Entry fees and ranking points must be valid non-negative numbers.",
      );
      return;
    }

    if (!originalTournament) {
      setUpdateError("Tournament details have not finished loading.");
      return;
    }

    const existingVenueNames = (originalTournament.venues || [])
      .map((venue) => venue.venueName)
      .filter(Boolean)
      .join(", ");
    const existingAddresses = (originalTournament.venues || [])
      .map((venue) => venue.address)
      .filter(Boolean)
      .join(", ");
    const venues =
      courtName === existingVenueNames && address === existingAddresses
        ? (originalTournament.venues || []).map((venue) => ({
            venueName: venue.venueName,
            address: venue.address,
          }))
        : [
            { venueName: courtName.trim(), address: address.trim() },
          ];

    const tournamentPayload = {
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      rankingPointsPool: parseNumericField(pointsPool),
      venues,
      rules: rules.map((rule, index) => ({
        title: rule.title.trim(),
        description: rule.description.trim(),
        sortOrder: index + 1,
      })),
      categories: categories.map((category) => {
        const seedCount = Number.parseInt(category.seeds, 10) || 0;
        const status =
          registrationStatus === "Registration Closed" ||
          category.status === "Enrollment Closed"
            ? "closed"
            : category.status === "Enrollment Open"
              ? "open"
              : "closing_soon";

        return {
          categoryCode: category.code.trim().toUpperCase(),
          categoryName: category.name.trim(),
          ageGroup: getAgeGroupPayload(category, availableAgeGroups),
          drawConfiguration: resolveDrawConfiguration(
            category,
            drawConfigurationOptions,
          ),
          pairingType: category.pairingType || getPairingType(category),
          seedCount,
          matchFormat: category.format,
          entryFee: parseNumericField(category.entryFee || fee),
          entryStatus: status,
          eligibilityCriteria: category.criteria.trim() || undefined,
          pointsPool: parseNumericField(category.pointsPool),
          pointsToWin: Number(category.pointsToWin),
          winningMargin: Number(category.winningMargin),
          maxPoints: Number(category.maxPoints),
          gamesToWin: Number(category.gamesToWin),
          shuttleName: category.shuttle.trim() || undefined,
          shuttleSpeed: category.shuttleSpeed.trim() || undefined,
          pointTiers: category.pointTiers.map((tier, tierIndex) => ({
            position: tier.source?.position ?? tierIndex + 1,
            label: tier.place.trim(),
            points: parseNumericField(tier.points),
          })),
        };
      }),
    };

    const shouldPublish =
      publishAfterSave &&
      originalTournament.publicationStatus?.toLowerCase() !== "published";

    setIsSaving(true);
    let detailsSaved = false;
    try {
      const updatedTournament = await updateTournament(
        id,
        tournamentPayload,
        bannerFile,
      );
      detailsSaved = true;
      setOriginalTournament((current) => ({
        ...current,
        ...updatedTournament,
      }));

      if (shouldPublish) {
        await publishTournament(id);
      }

      const savedTournament = shouldPublish
        ? { ...updatedTournament, publicationStatus: "published" }
        : {
            ...updatedTournament,
            ...(publicationStatus === "unpublished"
              ? { publicationStatus: "unpublished" }
              : {}),
          };
      setOriginalTournament((current) => ({
        ...current,
        ...savedTournament,
      }));
      if (savedTournament.bannerUrl) {
        setBannerImage(resolveApiAssetUrl(savedTournament.bannerUrl));
      }
      setBannerFile(null);
      setIsEditing(false);
      setShowSuccessModal(true);
    } catch (error) {
      setUpdateError(
        detailsSaved
          ? `Tournament details were saved, but publishing failed: ${error instanceof Error ? error.message : "Unable to publish tournament."}`
          : error instanceof Error
            ? error.message
            : "Unable to update tournament.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderCategoryLeaderboard = (category, categoryIndex) => (
    <div
      style={{
        marginTop: "24px",
        paddingTop: "20px",
        borderTop: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "14px",
        }}
      >
        <h3 style={{ fontSize: "13px", color: "#0f172a", margin: 0 }}>
          Category Point Tiers *
        </h3>
        {isEditing && (
          <button
            type="button"
            onClick={() => handleAddPointTier(categoryIndex)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              backgroundColor: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            <AddIcon style={{ fontSize: "16px" }} /> Add Point Tier
          </button>
        )}
      </div>
      {category.pointTiers.length === 0 ? (
        <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
          No leaderboard point tiers configured.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "12px",
          }}
        >
          {category.pointTiers.map((tier, tierIndex) => (
            <div
              key={tierIndex}
              style={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "16px" }}>🏆</span>
              <input
                aria-label={`${category.name} leaderboard place`}
                type="text"
                value={tier.place}
                disabled={!isEditing}
                onChange={(event) =>
                  handlePointTierChange(
                    categoryIndex,
                    tierIndex,
                    "place",
                    event.target.value,
                  )
                }
                style={{
                  minWidth: 0,
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border:
                    attemptedSubmit && !tier.place
                      ? "1px solid #dc2626"
                      : "1px solid #cbd5e1",
                  fontSize: "12px",
                  outline: "none",
                  fontWeight: "bold",
                  color: "#0f172a",
                  backgroundColor: isEditing ? "#fff" : "#f8fafc",
                  cursor: isEditing ? "text" : "not-allowed",
                }}
              />
              <input
                aria-label={`${category.name} points`}
                type="number"
                min="0"
                value={tier.points}
                disabled={!isEditing}
                onChange={(event) =>
                  handlePointTierChange(
                    categoryIndex,
                    tierIndex,
                    "points",
                    event.target.value,
                  )
                }
                style={{
                  width: "100px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border:
                    attemptedSubmit && !tier.points
                      ? "1px solid #dc2626"
                      : "1px solid #cbd5e1",
                  fontSize: "12px",
                  outline: "none",
                  fontWeight: "bold",
                  backgroundColor: isEditing ? "#fff" : "#f8fafc",
                  cursor: isEditing ? "text" : "not-allowed",
                }}
              />
              {isEditing && (
                <button
                  type="button"
                  aria-label={`Remove ${category.name} leaderboard tier`}
                  onClick={() =>
                    handleRemovePointTier(categoryIndex, tierIndex)
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: "#dc2626",
                    cursor: "pointer",
                  }}
                >
                  <DeleteOutlineIcon style={{ fontSize: "18px" }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div
        role="status"
        style={{
          minHeight: "50vh",
          display: "grid",
          placeItems: "center",
          color: "#64748b",
          fontWeight: "700",
        }}
      >
        Loading tournament details...
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        style={{
          minHeight: "50vh",
          display: "grid",
          placeContent: "center",
          gap: "16px",
          justifyItems: "center",
          color: "#b91c1c",
        }}
      >
        <p role="alert">Unable to load tournament: {loadError}</p>
        <button
          type="button"
          onClick={() => navigate("/admin/tournament")}
          style={{
            padding: "10px 16px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Back to Tournaments
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        paddingBottom: "80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Top Header with Back Button & Edit Mode Toggle Button */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "24px 30px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          <button
            onClick={() => navigate("/admin/tournament")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#f8fafc",
              cursor: "pointer",
              color: "#334155",
            }}
          >
            <ArrowBackIosNewIcon style={{ fontSize: "18px" }} />
          </button>
          <div>
            <h1
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#0f172a",
                margin: "0 0 4px 0",
              }}
            >
              {isEditing ? "Edit Tournament" : "Tournament Details & Configuration"}
            </h1>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0" }}>
              {isEditing
                ? "Update tournament details, official rules, event categories, and points system."
                : "Review, update, and manage official tournament rules, categories, and schedule."}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "14px",
          }}
        >
          {isEditing && (
            <span
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                color: "#64748b",
                backgroundColor: "#f1f5f9",
                padding: "10px 16px",
                borderRadius: "8px",
              }}
            >
              EDIT MODE
            </span>
          )}
          {isPublished && (
            <button
              type="button"
              disabled={isSaving || isUnpublishing}
              onClick={handleUnpublish}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: isUnpublishing ? "#94a3b8" : "#b91c1c",
                color: "#ffffff",
                border: "none",
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: isSaving || isUnpublishing ? "wait" : "pointer",
              }}
            >
              <VisibilityOffOutlinedIcon style={{ fontSize: "16px" }} />
              {isUnpublishing ? "UNPUBLISHING..." : "UNPUBLISH"}
            </button>
          )}
          {isUnpublished && (
            <button
              type="button"
              disabled={isSaving || isUnpublishing}
              onClick={handleRepublish}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: isUnpublishing ? "#94a3b8" : "#16a34a",
                color: "#ffffff",
                border: "none",
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: isSaving || isUnpublishing ? "wait" : "pointer",
              }}
            >
              <CloudUploadOutlinedIcon style={{ fontSize: "16px" }} />
              {isUnpublishing ? "PUBLISHING..." : "PUBLISH AGAIN"}
            </button>
          )}
          {publicationStatus === "draft" && (
            <button
              type="button"
              disabled={isSaving || isUnpublishing}
              onClick={handleRepublish}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: isUnpublishing ? "#94a3b8" : "#16a34a",
                color: "#ffffff",
                border: "none",
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: isSaving || isUnpublishing ? "wait" : "pointer",
              }}
            >
              <CloudUploadOutlinedIcon style={{ fontSize: "16px" }} />
              {isUnpublishing ? "PUBLISHING..." : "PUBLISH"}
            </button>
          )}
          {/* Toggle Edit Mode Button */}
          <button
            disabled={isSaving || isPublicationLocked}
            onClick={() => {
              setIsEditing(!isEditing);
              setAttemptedSubmit(false);
              setUpdateError("");
            }}
            title={
              isPublicationLocked
                ? "Published tournaments cannot be edited."
                : undefined
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: isPublicationLocked
                ? "#f1f5f9"
                : isEditing
                  ? "#fee2e2"
                  : "#f1f5f9",
              color: isPublicationLocked
                ? "#64748b"
                : isEditing
                  ? "#dc2626"
                  : "#475569",
              border: isEditing ? "1px solid #fecaca" : "1px solid #cbd5e1",
              padding: "10px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: isPublicationLocked ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            <EditModeIcon style={{ fontSize: "16px" }} />
            {isPublicationLocked
              ? "Published (Read-Only)"
              : isEditing
                ? "Edit Mode Active"
                : "Enable Edit Mode"}
          </button>
        </div>
      </div>

      <div
        style={{
          maxWidth: "1120px",
          margin: "36px auto",
          padding: "0 32px",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
        }}
      >
        {/* SECTION 1: Basic Tournament Details */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "36px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
              borderBottom: "1px solid #f1f5f9",
              paddingBottom: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  backgroundColor: "#0f172a",
                  color: "#fff",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                1
              </span>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#0f172a",
                  margin: "0",
                }}
              >
                Basic Tournament Details
              </h2>
            </div>
            <span
              style={{ fontSize: "11px", fontWeight: "bold", color: "#dc2626" }}
            >
              * MANDATORY FIELDS
            </span>
          </div>

          <p
            style={{ fontSize: "12px", color: "#64748b", margin: "0 0 20px 0" }}
          >
            General identity, schedule timeline, registration fee and sanction
            status.
          </p>

          {/* Banner Image Preview */}
          <div
            style={{
              position: "relative",
              marginBottom: "24px",
              border: isEditing ? "2px dashed #cbd5e1" : "none",
              borderRadius: "10px",
              padding: isEditing ? "12px" : 0,
              backgroundColor: isEditing ? "#f8fafc" : "transparent",
              textAlign: "center",
            }}
          >
            {bannerImage ? (
              <img
                src={bannerImage}
                alt="Tournament Banner"
                style={{
                  width: "100%",
                  height: isEditing ? "200px" : "220px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  opacity: isEditing ? 1 : 0.95,
                }}
              />
            ) : (
              isEditing ? (
                <div style={{ padding: "16px" }}>
                  <CloudUploadOutlinedIcon
                    style={{
                      fontSize: "40px",
                      color: "#94a3b8",
                      marginBottom: "10px",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: "#0f172a",
                      marginBottom: "6px",
                    }}
                  >
                    Tournament Banner (Optional)
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginBottom: "16px",
                    }}
                  >
                    Recommended dimension: 1200 × 400 px (JPEG, PNG or WebP up to
                    5MB)
                  </div>
                </div>
              ) : (
                <div
                  role="img"
                  aria-label="No tournament banner available"
                  style={{
                    width: "100%",
                    height: "220px",
                    backgroundColor: "#e2e8f0",
                    borderRadius: "10px",
                  }}
                />
              )
            )}
            {isEditing && (
              <label
                style={{
                  position: bannerImage ? "absolute" : "static",
                  bottom: bannerImage ? "22px" : undefined,
                  right: bannerImage ? "22px" : undefined,
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CloudUploadOutlinedIcon style={{ fontSize: "16px" }} />
                {bannerImage ? "Change Banner" : "Choose File"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
              </label>
            )}
            {bannerFile && (
              <span
                style={{
                  position: bannerImage ? "absolute" : "static",
                  left: bannerImage ? "22px" : undefined,
                  bottom: bannerImage ? "22px" : undefined,
                  display: bannerImage ? "inline-block" : "block",
                  marginTop: bannerImage ? 0 : "10px",
                  padding: "7px 10px",
                  backgroundColor: bannerImage
                    ? "rgba(15,23,42,0.85)"
                    : "#f1f5f9",
                  color: bannerImage ? "#fff" : "#334155",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontWeight: "bold",
                  maxWidth: "100%",
                  overflowWrap: "anywhere",
                }}
              >
                Selected: {bannerFile.name}
              </span>
            )}
          </div>

          {/* Form Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Tournament Title *
              </label>
              <input
                type="text"
                value={title}
                disabled={!isEditing}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: "8px",
                  border:
                    attemptedSubmit && !title
                      ? "1px solid #dc2626"
                      : "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                  fontWeight: "600",
                  color: "#0f172a",
                  backgroundColor: isEditing ? "#fff" : "#f8fafc",
                  cursor: isEditing ? "text" : "not-allowed",
                }}
              />
              {attemptedSubmit && !title && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#dc2626",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Tournament title is required
                </span>
              )}
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Default Category Entry Fee (MMK) (Optional)
              </label>
              <input
                type="text"
                value={fee}
                disabled={!isEditing}
                onChange={(e) => setFee(e.target.value)}
                placeholder="e.g., 25,000"
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                  fontWeight: "600",
                  color: "#0f172a",
                  backgroundColor: isEditing ? "#fff" : "#f8fafc",
                  cursor: isEditing ? "text" : "not-allowed",
                }}
              />
            </div>
          </div>

          {/* Date Pickers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                disabled={!isEditing}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: "8px",
                  border:
                    attemptedSubmit && !startDate
                      ? "1px solid #dc2626"
                      : "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: isEditing ? "#fff" : "#f8fafc",
                  cursor: isEditing ? "text" : "not-allowed",
                }}
              />
              {attemptedSubmit && !startDate && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#dc2626",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Start date is required
                </span>
              )}
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                disabled={!isEditing}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: "8px",
                  border:
                    attemptedSubmit && !endDate
                      ? "1px solid #dc2626"
                      : "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: isEditing ? "#fff" : "#f8fafc",
                  cursor: isEditing ? "text" : "not-allowed",
                }}
              />
              {attemptedSubmit && !endDate && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#dc2626",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  End date is required
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Registration Status
              </label>
              <select
                value={registrationStatus}
                disabled={!isEditing}
                onChange={(e) => setRegistrationStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: isEditing ? "#fff" : "#f8fafc",
                  fontSize: "13px",
                  outline: "none",
                  cursor: isEditing ? "pointer" : "not-allowed",
                }}
              >
                <option>Registration Open (Accepting Players)</option>
                <option>Registration Closed</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Tournament Ranking Points Pool *
              </label>
              <input
                type="text"
                value={pointsPool}
                disabled={!isEditing}
                onChange={(e) => setPointsPool(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: "8px",
                  border:
                    attemptedSubmit && !pointsPool
                      ? "1px solid #dc2626"
                      : "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: isEditing ? "#fff" : "#f8fafc",
                  cursor: isEditing ? "text" : "not-allowed",
                }}
              />
              {attemptedSubmit && !pointsPool && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#dc2626",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Points pool is required
                </span>
              )}
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "bold",
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              Tournament Overview Description *
            </label>
            <textarea
              rows="3"
              value={description}
              disabled={!isEditing}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: "8px",
                border:
                  attemptedSubmit && !description
                    ? "1px solid #dc2626"
                    : "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: isEditing ? "#fff" : "#f8fafc",
                cursor: isEditing ? "text" : "not-allowed",
              }}
            ></textarea>
            {attemptedSubmit && !description && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#dc2626",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                Overview description is required
              </span>
            )}
          </div>
        </div>

        {/* SECTION 2: Venue & Operational Location */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "36px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
              borderBottom: "1px solid #f1f5f9",
              paddingBottom: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  backgroundColor: "#0f172a",
                  color: "#fff",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                2
              </span>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#0f172a",
                  margin: "0",
                }}
              >
                Venue & Operational Location
              </h2>
            </div>
          </div>
          <p
            style={{ fontSize: "12px", color: "#64748b", margin: "0 0 20px 0" }}
          >
            Court layout center, official coordinates, and transit reference.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Venue / Court Name *
              </label>
              <input
                type="text"
                value={courtName}
                disabled={!isEditing}
                onChange={(e) => setCourtName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: "8px",
                  border:
                    attemptedSubmit && !courtName
                      ? "1px solid #dc2626"
                      : "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: isEditing ? "#fff" : "#f8fafc",
                  cursor: isEditing ? "text" : "not-allowed",
                }}
              />
              {attemptedSubmit && !courtName && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#dc2626",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Court name is required
                </span>
              )}
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Full Location Address *
              </label>
              <input
                type="text"
                value={address}
                disabled={!isEditing}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: "8px",
                  border:
                    attemptedSubmit && !address
                      ? "1px solid #dc2626"
                      : "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: isEditing ? "#fff" : "#f8fafc",
                  cursor: isEditing ? "text" : "not-allowed",
                }}
              />
              {attemptedSubmit && !address && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#dc2626",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Address is required
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: OFFICIAL TOURNAMENT RULES */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "36px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
              borderBottom: "1px solid #f1f5f9",
              paddingBottom: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  backgroundColor: "#0f172a",
                  color: "#fff",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                3
              </span>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#0f172a",
                  margin: "0",
                }}
              >
                OFFICIAL TOURNAMENT RULES
              </h2>
            </div>
            {isEditing && (
              <button
                onClick={handleAddRule}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  backgroundColor: "#0f172a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                <AddIcon style={{ fontSize: "16px" }} /> Add Rules
              </button>
            )}
          </div>
          <p
            style={{ fontSize: "12px", color: "#64748b", margin: "0 0 20px 0" }}
          >
            Define tournament gameplay governance, shuttlecock standards, and
            dress codes.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            {rules.map((rule, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "24px",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: "#64748b",
                    }}
                  >
                    RULE NODE #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                  </span>
                  {/* Hide delete button for the first item (idx === 0) */}
                  {isEditing && idx > 0 && (
                    <button
                      onClick={() => handleRemoveRule(idx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#dc2626",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "12px",
                        gap: "2px",
                      }}
                    >
                      <DeleteOutlineIcon style={{ fontSize: "16px" }} /> Remove
                    </button>
                  )}
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Rule Title *
                  </label>
                  <input
                    type="text"
                    value={rule.title}
                    disabled={!isEditing}
                    onChange={(e) => {
                      const newRules = [...rules];
                      newRules[idx].title = e.target.value;
                      setRules(newRules);
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border:
                        attemptedSubmit && !rule.title
                          ? "1px solid #dc2626"
                          : "1px solid #cbd5e1",
                      fontSize: "12px",
                      outline: "none",
                      boxSizing: "border-box",
                      backgroundColor: isEditing ? "#fff" : "#f8fafc",
                      cursor: isEditing ? "text" : "not-allowed",
                    }}
                  />
                  {attemptedSubmit && !rule.title && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#dc2626",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      Rule title is required
                    </span>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Rule Description *
                  </label>
                  <textarea
                    rows="3"
                    value={rule.description}
                    disabled={!isEditing}
                    onChange={(e) => {
                      const newRules = [...rules];
                      newRules[idx].description = e.target.value;
                      setRules(newRules);
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border:
                        attemptedSubmit && !rule.description
                          ? "1px solid #dc2626"
                          : "1px solid #cbd5e1",
                      fontSize: "12px",
                      outline: "none",
                      boxSizing: "border-box",
                      backgroundColor: isEditing ? "#fff" : "#f8fafc",
                      cursor: isEditing ? "text" : "not-allowed",
                    }}
                  ></textarea>
                  {attemptedSubmit && !rule.description && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#dc2626",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      Rule description is required
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: Event Categories & Match Requirements */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "36px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
              borderBottom: "1px solid #f1f5f9",
              paddingBottom: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  backgroundColor: "#0f172a",
                  color: "#fff",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                4
              </span>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#0f172a",
                  margin: "0",
                }}
              >
                Event Categories & Match Requirements
              </h2>
            </div>
            {isEditing && (
              <button
                onClick={handleAddCategory}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  backgroundColor: "#0f172a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                <AddIcon style={{ fontSize: "16px" }} /> Add Category Event
              </button>
            )}
          </div>
          <p
            style={{ fontSize: "12px", color: "#64748b", margin: "0 0 20px 0" }}
          >
            Configure age groups, draws, seed allocations, shuttlecock specs and
            match structures.
          </p>

          {isLoadingCategories && (
            <p role="status" style={{ color: "#64748b", fontSize: "12px" }}>
              Loading category options...
            </p>
          )}
          {categoryLoadError && (
            <p role="alert" style={{ color: "#b91c1c", fontSize: "12px" }}>
              Unable to load category options: {categoryLoadError}
            </p>
          )}
          {isLoadingAgeGroups && (
            <p role="status" style={{ color: "#64748b", fontSize: "12px" }}>
              Loading age groups...
            </p>
          )}
          {ageGroupLoadError && (
            <p role="alert" style={{ color: "#b91c1c", fontSize: "12px" }}>
              Unable to load age groups: {ageGroupLoadError}
            </p>
          )}
          {isLoadingDrawConfiguration && (
            <p role="status" style={{ color: "#64748b", fontSize: "12px" }}>
              Loading draw configuration options...
            </p>
          )}
          {drawConfigurationLoadError && (
            <p role="alert" style={{ color: "#b91c1c", fontSize: "12px" }}>
              Unable to load draw configuration options:{" "}
              {drawConfigurationLoadError}
            </p>
          )}

          {categories.map((cat, idx) => {
            const seedOptions = [
              "8 Seeded Positions",
              "16 Seeded Positions",
              "Unseeded",
            ];
            const isCustomSeed = !seedOptions.includes(cat.seeds);
            const formatOptions = [
              "Best of 3 games",
              "Best of 5 games",
              "Single game",
            ];
            const isCustomFormat = !formatOptions.includes(cat.format);
            const drawConfiguration = resolveDrawConfiguration(
              cat,
              drawConfigurationOptions,
            );
            const categorySettingFields = [
              ["entryFee", "Category Entry Fee (MMK)", "Uses default fee"],
              ["pointsToWin", "Points to Win", "21"],
              ["winningMargin", "Winning Margin", "2"],
              ["maxPoints", "Maximum Points", "30"],
              ["gamesToWin", "Games to Win", "2"],
            ];
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "24px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "bold",
                        color: "#0f172a",
                      }}
                    >
                      Category #{idx + 1} Configuration
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        backgroundColor: "#f0fdf4",
                        color: "#16a34a",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontWeight: "bold",
                      }}
                    >
                      Active Roster
                    </span>
                  </div>
                  {/* Hide delete button for the first category item (idx === 0) */}
                  {isEditing && idx > 0 && (
                    <button
                      onClick={() => handleRemoveCategory(idx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      <DeleteOutlineIcon style={{ fontSize: "16px" }} /> Delete
                      Category
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "20px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: "bold",
                        color: "#334155",
                        marginBottom: "6px",
                      }}
                    >
                      Draw Format
                    </label>
                    <select
                      value={drawConfiguration.drawFormat || ""}
                      onChange={(event) =>
                        updateCategoryDrawConfiguration(
                          idx,
                          "drawFormat",
                          event.target.value,
                        )
                      }
                      disabled={
                        !isEditing ||
                        isLoadingDrawConfiguration ||
                        Boolean(drawConfigurationLoadError)
                      }
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: isEditing ? "#fff" : "#f8fafc",
                        fontSize: "12px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="">Select a draw format</option>
                      {(drawConfigurationOptions?.drawFormats || []).map(
                        (drawFormat) => (
                          <option key={drawFormat} value={drawFormat}>
                            {formatDrawOption(drawFormat)}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: "bold",
                        color: "#334155",
                        marginBottom: "6px",
                      }}
                    >
                      Seeding Method
                    </label>
                    <select
                      value={drawConfiguration.seedingMethod || ""}
                      onChange={(event) =>
                        updateCategoryDrawConfiguration(
                          idx,
                          "seedingMethod",
                          event.target.value,
                        )
                      }
                      disabled={
                        !isEditing ||
                        isLoadingDrawConfiguration ||
                        Boolean(drawConfigurationLoadError)
                      }
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: isEditing ? "#fff" : "#f8fafc",
                        fontSize: "12px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="">Select a seeding method</option>
                      {(drawConfigurationOptions?.seedingMethods || []).map(
                        (seedingMethod) => (
                          <option key={seedingMethod} value={seedingMethod}>
                            {formatDrawOption(seedingMethod)}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      paddingTop: "22px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#334155",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(drawConfiguration.thirdPlaceMatch)}
                      onChange={(event) =>
                        updateCategoryDrawConfiguration(
                          idx,
                          "thirdPlaceMatch",
                          event.target.checked,
                        )
                      }
                      disabled={!isEditing || isLoadingDrawConfiguration}
                    />
                    Third-place match
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.5fr 1fr",
                    gap: "20px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: "bold",
                        color: "#334155",
                        marginBottom: "6px",
                      }}
                    >
                      Category Code *
                    </label>
                    <select
                      value={cat.code}
                      disabled={
                        !isEditing ||
                        isLoadingCategories ||
                        Boolean(categoryLoadError)
                      }
                      onChange={(event) =>
                        selectCategoryCode(idx, event.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border:
                          attemptedSubmit && !cat.code
                            ? "1px solid #dc2626"
                            : "1px solid #cbd5e1",
                        fontSize: "12px",
                        outline: "none",
                        boxSizing: "border-box",
                        backgroundColor: isEditing ? "#fff" : "#f8fafc",
                        cursor: isEditing ? "pointer" : "not-allowed",
                      }}
                    >
                      <option value="">
                        {isLoadingCategories
                          ? "Loading categories..."
                          : "Select a category"}
                      </option>
                      {cat.code &&
                        !availableCategories.some(
                          (option) => option.categoryCode === cat.code,
                        ) && <option value={cat.code}>{cat.code}</option>}
                      {availableCategories.map((option) => (
                        <option
                          key={option.id}
                          value={option.categoryCode}
                        >
                          {option.categoryCode}
                        </option>
                      ))}
                    </select>
                    {attemptedSubmit && !cat.code && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#dc2626",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        Code is required
                      </span>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: "bold",
                        color: "#334155",
                        marginBottom: "6px",
                      }}
                    >
                      Category Name *
                    </label>
                    <input
                      type="text"
                      value={cat.name}
                      readOnly
                      placeholder="Select a category code first"
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border:
                          attemptedSubmit && !cat.name
                            ? "1px solid #dc2626"
                            : "1px solid #cbd5e1",
                        fontSize: "12px",
                        outline: "none",
                        boxSizing: "border-box",
                        backgroundColor: isEditing ? "#fff" : "#f8fafc",
                        cursor: "not-allowed",
                      }}
                    />
                    {attemptedSubmit && !cat.name && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#dc2626",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        Name is required
                      </span>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: "bold",
                        color: "#334155",
                        marginBottom: "6px",
                      }}
                    >
                      Age Group
                    </label>
                    <select
                      value={cat.ageGroup}
                      onChange={(event) =>
                        updateCategoryField(
                          idx,
                          "ageGroup",
                          event.target.value,
                        )
                      }
                      disabled={
                        !isEditing ||
                        isLoadingAgeGroups ||
                        Boolean(ageGroupLoadError)
                      }
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: isEditing ? "#fff" : "#f8fafc",
                        fontSize: "12px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="">
                        {isLoadingAgeGroups
                          ? "Loading age groups..."
                          : "Open / no age limit"}
                      </option>
                      {cat.ageGroup &&
                        !availableAgeGroups.some(
                          (ageGroup) =>
                            String(ageGroup.id) === String(cat.ageGroup),
                        ) && (
                          <option value={cat.ageGroup}>
                            {cat.source?.ageGroup?.name ||
                              cat.source?.ageGroupName ||
                              `Age group ${cat.ageGroup}`}
                          </option>
                        )}
                      {availableAgeGroups.map((ageGroup) => (
                        <option key={ageGroup.id} value={ageGroup.id}>
                          {ageGroup.name} (maximum age {ageGroup.age})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "20px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Seed Count
                  </label>
                  <select
                    value={isCustomSeed ? "Other" : cat.seeds}
                    disabled={!isEditing}
                    onChange={(e) => {
                      updateCategoryField(
                        idx,
                        "seeds",
                        e.target.value === "Other" ? "" : e.target.value,
                      );
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: isEditing ? "#fff" : "#f8fafc",
                      fontSize: "12px",
                      outline: "none",
                      cursor: isEditing ? "pointer" : "not-allowed",
                      marginBottom: isCustomSeed ? "8px" : 0,
                    }}
                  >
                    <option>8 Seeded Positions</option>
                    <option>16 Seeded Positions</option>
                    <option>Unseeded</option>
                    <option>Other</option>
                  </select>
                  {isCustomSeed && (
                    <input
                      type="text"
                      value={cat.seeds}
                      disabled={!isEditing}
                      onChange={(event) =>
                        updateCategoryField(idx, "seeds", event.target.value)
                      }
                      placeholder="Type custom seed count..."
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: isEditing ? "#fff" : "#f8fafc",
                        fontSize: "12px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Match Format
                  </label>
                  <select
                    value={isCustomFormat ? "Other" : cat.format}
                    disabled={!isEditing}
                    onChange={(e) => {
                      updateCategoryField(
                        idx,
                        "format",
                        e.target.value === "Other" ? "" : e.target.value,
                      );
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: isEditing ? "#fff" : "#f8fafc",
                      fontSize: "12px",
                      outline: "none",
                      cursor: isEditing ? "pointer" : "not-allowed",
                      marginBottom: isCustomFormat ? "8px" : 0,
                    }}
                  >
                    <option>Best of 3 games</option>
                    <option>Best of 5 games</option>
                    <option>Single game</option>
                    <option>Other</option>
                  </select>
                  {isCustomFormat && (
                    <input
                      type="text"
                      value={cat.format}
                      disabled={!isEditing}
                      onChange={(event) =>
                        updateCategoryField(idx, "format", event.target.value)
                      }
                      placeholder="Type custom match format..."
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: isEditing ? "#fff" : "#f8fafc",
                        fontSize: "12px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Entry Status Tag
                  </label>
                  <select
                    value={cat.status}
                    disabled={!isEditing}
                    onChange={(e) => {
                      const c = [...categories];
                      c[idx].status = e.target.value;
                      setCategories(c);
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: isEditing ? "#fff" : "#f8fafc",
                      fontSize: "12px",
                      outline: "none",
                      cursor: isEditing ? "pointer" : "not-allowed",
                    }}
                  >
                    <option>Open (Fast Closing)</option>
                    <option>Enrollment Open</option>
                    <option>Enrollment Closed</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Point Format Preset
                </label>
                <select
                  value={getPointFormatPreset(cat)}
                  disabled={!isEditing}
                  onChange={(event) =>
                    applyPointFormatPreset(idx, event.target.value)
                  }
                  style={{
                    width: "100%",
                    maxWidth: "420px",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: isEditing ? "#fff" : "#f8fafc",
                    fontSize: "12px",
                    outline: "none",
                    cursor: isEditing ? "pointer" : "not-allowed",
                  }}
                >
                  {POINT_FORMAT_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                  <option value="custom" disabled>
                    Custom (edit numeric fields below)
                  </option>
                </select>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    margin: "6px 0 0",
                  }}
                >
                  The preset fills the three point values below; the backend
                  stores those numeric values.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "14px",
                  marginBottom: "16px",
                }}
              >
                {categorySettingFields.map(([field, label, placeholder]) => (
                  <div key={field}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: "bold",
                        color: "#334155",
                        marginBottom: "6px",
                      }}
                    >
                      {label}
                    </label>
                    <input
                      type="number"
                      min={field === "entryFee" ? "0" : "1"}
                      step="1"
                      value={cat[field]}
                      disabled={!isEditing}
                      onChange={(event) =>
                        updateCategoryField(idx, field, event.target.value)
                      }
                      placeholder={placeholder}
                      style={{
                        width: "100%",
                        padding: "12px 10px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: isEditing ? "#fff" : "#f8fafc",
                        fontSize: "12px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "20px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Eligibility Criteria
                  </label>
                  <input
                    type="text"
                    value={cat.criteria}
                    disabled={!isEditing}
                    onChange={(e) => {
                      const c = [...categories];
                      c[idx].criteria = e.target.value;
                      setCategories(c);
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border:
                        attemptedSubmit && !cat.criteria
                          ? "1px solid #dc2626"
                          : "1px solid #cbd5e1",
                      fontSize: "12px",
                      outline: "none",
                      boxSizing: "border-box",
                      backgroundColor: isEditing ? "#fff" : "#f8fafc",
                      cursor: isEditing ? "text" : "not-allowed",
                    }}
                  />
                  {attemptedSubmit && !cat.criteria && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#dc2626",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      Criteria is required
                    </span>
                  )}
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Category Points Pool *
                  </label>
                  <input
                    type="text"
                    value={cat.pointsPool}
                    disabled={!isEditing}
                    onChange={(e) => {
                      const c = [...categories];
                      c[idx].pointsPool = e.target.value;
                      setCategories(c);
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border:
                        attemptedSubmit && !cat.pointsPool
                          ? "1px solid #dc2626"
                          : "1px solid #cbd5e1",
                      fontSize: "12px",
                      outline: "none",
                      boxSizing: "border-box",
                      backgroundColor: isEditing ? "#fff" : "#f8fafc",
                      cursor: isEditing ? "text" : "not-allowed",
                    }}
                  />
                  {attemptedSubmit && !cat.pointsPool && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#dc2626",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      Points pool is required
                    </span>
                  )}
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Official Shuttle *
                  </label>
                  <input
                    type="text"
                    value={cat.shuttle}
                    disabled={!isEditing}
                    onChange={(e) =>
                      updateCategoryField(idx, "shuttle", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border:
                        attemptedSubmit && !cat.shuttle
                          ? "1px solid #dc2626"
                          : "1px solid #cbd5e1",
                      fontSize: "12px",
                      outline: "none",
                      boxSizing: "border-box",
                      backgroundColor: isEditing ? "#fff" : "#f8fafc",
                      cursor: isEditing ? "text" : "not-allowed",
                    }}
                  />
                  {attemptedSubmit && !cat.shuttle && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#dc2626",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      Shuttle is required
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  marginTop: "20px",
                  paddingTop: "20px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "14px",
                  }}
                >
                  <strong style={{ color: "#0f172a", fontSize: "13px" }}>
                    Shuttle Speed
                  </strong>
                  <input
                    type="text"
                    value={cat.shuttleSpeed}
                    disabled={!isEditing}
                    onChange={(event) =>
                      updateCategoryField(
                        idx,
                        "shuttleSpeed",
                        event.target.value,
                      )
                    }
                    placeholder="e.g., 77"
                    aria-label={`Category ${idx + 1} shuttle speed`}
                    style={{
                      width: "180px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: isEditing ? "#fff" : "#f8fafc",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
              {renderCategoryLeaderboard(cat, idx)}
            </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        {updateError && (
          <div
            role="alert"
            style={{
              marginTop: "16px",
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: "13px",
              fontWeight: "700",
            }}
          >
            {updateError}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "16px",
            marginTop: "20px",
          }}
        >
          <button
            onClick={() => navigate("/admin/tournament")}
            disabled={isSaving}
            style={{
              padding: "14px 32px",
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
              color: "#334155",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={(event) => handleUpdate(event)}
            disabled={!isEditing || isSaving}
            style={{
              padding: "14px 36px",
              backgroundColor: isEditing && !isSaving ? "#dc2626" : "#cbd5e1",
              color: isEditing && !isSaving ? "#fff" : "#64748b",
              border: "none",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: isEditing && !isSaving ? "pointer" : "not-allowed",
              boxShadow:
                isEditing && !isSaving
                  ? "0 4px 12px rgba(220,38,38,0.3)"
                  : "none",
              opacity: isEditing && !isSaving ? 1 : 0.6,
              transition: "all 0.2s",
            }}
          >
            {isSaving ? "SAVING..." : "SAVE CHANGES & UPDATE"}
          </button>
          {!isPublicationLocked && (
            <button
              type="button"
              onClick={(event) => handleUpdate(event, true)}
              disabled={!isEditing || isSaving}
              style={{
                padding: "14px 36px",
                backgroundColor:
                  isEditing && !isSaving ? "#dc2626" : "#cbd5e1",
                color: isEditing && !isSaving ? "#fff" : "#64748b",
                border: "none",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor:
                  isEditing && !isSaving ? "pointer" : "not-allowed",
                boxShadow:
                  isEditing && !isSaving
                    ? "0 4px 12px rgba(220,38,38,0.3)"
                    : "none",
                opacity: isEditing && !isSaving ? 1 : 0.6,
                transition: "all 0.2s",
              }}
            >
              {isSaving ? "SAVING..." : "SAVE CHANGES & PUBLISH"}
            </button>
          )}
        </div>
      </div>

      {/* SUCCESS MODAL ON UPDATE */}
      {showSuccessModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "440px",
              padding: "36px",
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "18px",
              }}
            >
              <CheckCircleIcon style={{ fontSize: "58px", color: "#16a34a" }} />
            </div>
            <h2
              style={{
                fontSize: "19px",
                fontWeight: "bold",
                color: "#0f172a",
                marginBottom: "10px",
              }}
            >
              {originalTournament?.publicationStatus?.toLowerCase() ===
              "published"
                ? "Tournament Published!"
                : "Tournament Updated!"}
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                marginBottom: "26px",
              }}
            >
              {originalTournament?.publicationStatus?.toLowerCase() ===
              "published"
                ? "Your changes have been saved and the tournament is now published."
                : "Your changes have been successfully saved and updated across the platform."}
            </p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/admin/tournament");
              }}
              style={{
                width: "100%",
                padding: "13px",
                backgroundColor: "#0f172a",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Back to Tournaments
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
