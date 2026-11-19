import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  createTournament,
  getTournamentCategories,
} from "../api/tournamentApi";

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

export default function CreateTournamentPage() {
  const navigate = useNavigate();

  // Banner Image Preview State & Validation Error
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);

  // Form Field States for Basic Details & Venue
  const [title, setTitle] = useState("");
  const [fee, setFee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [regStatus, setRegStatus] = useState(
    "Registration Open (Accepting Players)",
  );
  const [pointsPool, setPointsPool] = useState("");
  const [description, setDescription] = useState("");
  const [courtName, setCourtName] = useState("");
  const [address, setAddress] = useState("");

  // Official Rules State
  const [rules, setRules] = useState([{ title: "", description: "" }]);

  // Categories State (Includes eligibility, points pool, and official shuttle)
  const [categories, setCategories] = useState([
    {
      code: "",
      name: "",
      pairingType: "",
      seeds: "8 Seeded Positions",
      format: "Best of 3 Sets to 21 Points",
      status: "Open (Fast Closing)",
      criteria: "",
      pointsPool: "",
      shuttle: "",
      shuttleSpeed: "",
      pointTiers: [
        { place: "Champion", points: "" },
        { place: "Runner-up", points: "" },
      ],
    },
  ]);

  // Validation Error Trigger State
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [availableCategories, setAvailableCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryLoadError, setCategoryLoadError] = useState("");

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setIsLoadingCategories(true);
      setCategoryLoadError("");
      try {
        const categoryOptions = await getTournamentCategories();
        if (!cancelled) setAvailableCategories(categoryOptions);
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

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (bannerImage?.startsWith("blob:")) {
        URL.revokeObjectURL(bannerImage);
      }
    },
    [bannerImage],
  );

  // Handle banner image selection and live preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerFile(file);
      setBannerImage(URL.createObjectURL(file));
    }
  };

  const handleAddRule = () => {
    setRules([...rules, { title: "", description: "" }]);
  };

  const handleRemoveRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleAddCategory = () => {
    setCategories([
      ...categories,
      {
        code: "",
        name: "",
        pairingType: "",
        seeds: "8 Seeded Positions",
        format: "Best of 3 Sets to 21 Points",
        status: "Open (Fast Closing)",
        criteria: "",
        pointsPool: "",
        shuttle: "",
        shuttleSpeed: "",
        pointTiers: [
          { place: "Champion", points: "" },
          { place: "Runner-up", points: "" },
        ],
      },
    ]);
  };

  const handleRemoveCategory = (index) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleAddPointTier = (categoryIndex) => {
    setCategories((current) =>
      current.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              pointTiers: [
                ...category.pointTiers,
                {
                  place: `Place ${category.pointTiers.length + 1}`,
                  points: "",
                },
              ],
            }
          : category,
      ),
    );
  };

  const handleRemovePointTier = (categoryIndex, tierIndex) => {
    setCategories((current) =>
      current.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              pointTiers: category.pointTiers.filter(
                (_, currentTierIndex) => currentTierIndex !== tierIndex,
              ),
            }
          : category,
      ),
    );
  };

  // Comprehensive validation across all required fields including image, overview, points pool, and category extra fields
  const handlePublish = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setAttemptedSubmit(true);
    setSubmissionError("");

    if (isLoadingCategories || categoryLoadError) {
      setSubmissionError(
        categoryLoadError ||
          "Wait for the category options to finish loading before submitting.",
      );
      return;
    }

    // 1. Validate Banner Image
    if (!bannerFile) return;

    // 2. Validate Basic Details
    if (!title || !fee || !startDate || !endDate || !pointsPool || !description)
      return;

    // 3. Validate Venue & Location
    if (!courtName || !address) return;

    // 4. Validate Official Rules
    for (let r of rules) {
      if (!r.title || !r.description) return;
    }

    // 5. Validate Event Categories (including criteria, points pool, and shuttle)
    for (let c of categories) {
      if (
        !c.code ||
        !c.name ||
        !c.criteria ||
        !c.pointsPool ||
        !c.shuttle ||
        !c.shuttleSpeed ||
        c.pointTiers.length === 0 ||
        c.pointTiers.some((tier) => !tier.place || !tier.points)
      )
        return;
    }

    const numericValues = [
      fee,
      pointsPool,
      ...categories.flatMap((category) => [
        category.pointsPool,
        ...category.pointTiers.map((tier) => tier.points),
      ]),
    ].map(parseNumericField);
    if (numericValues.some((value) => value === null)) {
      setSubmissionError(
        "Entry fees and ranking points must be valid numbers.",
      );
      return;
    }

    const [entryFee, rankingPointsPool] = numericValues;
    let categoryNumberIndex = 2;
    const tournament = {
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      bannerUrl: null,
      rankingPointsPool,
      venues: [{ venueName: courtName.trim(), address: address.trim() }],
      rules: rules.map((rule, sortOrder) => ({
        title: rule.title.trim(),
        description: rule.description.trim(),
        sortOrder,
      })),
      categories: categories.map((category) => {
        const categoryPointsPool = numericValues[categoryNumberIndex++];
        const categoryStatus =
          regStatus === "Registration Closed"
            ? "closed"
            : category.status === "Enrollment Closed"
              ? "closed"
              : category.status === "Enrollment Open"
                ? "open"
                : "closing_soon";
        const seedCount = Number.parseInt(category.seeds, 10) || 0;

        return {
          categoryCode: category.code.trim().toUpperCase(),
          categoryName: category.name.trim(),
          pairingType: category.pairingType || getPairingType(category),
          seedCount,
          matchFormat: category.format,
          entryFee,
          entryStatus: categoryStatus,
          eligibilityCriteria: category.criteria.trim(),
          pointsPool: categoryPointsPool,
          shuttleName: category.shuttle.trim(),
          shuttleSpeed: category.shuttleSpeed.trim(),
          pointTiers: category.pointTiers.map((tier, tierIndex) => ({
            position: tierIndex + 1,
            label: tier.place.trim(),
            points: numericValues[categoryNumberIndex++],
          })),
        };
      }),
    };

    setIsSubmitting(true);
    try {
      await createTournament(tournament, bannerFile);
      setShowSuccessModal(true);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Unable to publish tournament.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        paddingBottom: "80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Custom Top Header with Back Button */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "24px 30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            height: "10px",
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
              Create New Tournament
            </h1>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0" }}>
              Setup tournament details, official rules, event categories, and
              points system for public registration.
            </p>
          </div>
        </div>
        <div
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            color: "#64748b",
            backgroundColor: "#f1f5f9",
            padding: "10px 16px",
            borderRadius: "8px",
          }}
        >
          🛡 Official Master Sanction
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

          {/* Banner Upload Area with Error Border */}
          <div
            style={{
              border:
                attemptedSubmit && !bannerImage
                  ? "2px dashed #dc2626"
                  : "2px dashed #cbd5e1",
              borderRadius: "10px",
              padding: "28px",
              textAlign: "center",
              backgroundColor: "#f8fafc",
              marginBottom: "24px",
            }}
          >
            {bannerImage ? (
              <div style={{ position: "relative" }}>
                <img
                  src={bannerImage}
                  alt="Banner Preview"
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    borderRadius: "8px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setBannerImage(null);
                    setBannerFile(null);
                  }}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    backgroundColor: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  Remove Image
                </button>
              </div>
            ) : (
              <div>
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
                  Drag & Drop Cover Banner Image or Browse File *
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginBottom: "16px",
                  }}
                >
                  Recommended dimension: 1200 × 400 px (PNG, JPG up to 5MB; 16:9
                  ratio compatible)
                </div>
                <label
                  style={{
                    display: "inline-block",
                    padding: "10px 18px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    color: "#334155",
                  }}
                >
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                  />
                </label>
                {attemptedSubmit && !bannerImage && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#dc2626",
                      marginTop: "8px",
                      display: "block",
                    }}
                  >
                    Cover banner image is required
                  </span>
                )}
              </div>
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
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Yangon Masters Badminton Championship 2026"
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
                Tournament Entry Fee (MMK) *
              </label>
              <input
                type="text"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="e.g., 25,000"
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: "8px",
                  border:
                    attemptedSubmit && !fee
                      ? "1px solid #dc2626"
                      : "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {attemptedSubmit && !fee && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#dc2626",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Entry fee is required
                </span>
              )}
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
                  backgroundColor: "#fff",
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
                  backgroundColor: "#fff",
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
                value={regStatus}
                onChange={(e) => setRegStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#fff",
                  fontSize: "13px",
                  outline: "none",
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
                onChange={(e) => setPointsPool(e.target.value)}
                placeholder="e.g., 6,500 PTS"
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
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a short, engaging summary about this tournament..."
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
                onChange={(e) => setCourtName(e.target.value)}
                placeholder="e.g., Court 1"
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
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., Waizayandar Road, Thingangyun Township, Yangon"
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
                  {idx > 0 && (
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
                    onChange={(e) => {
                      const newRules = [...rules];
                      newRules[idx].title = e.target.value;
                      setRules(newRules);
                    }}
                    placeholder="e.g., Tournament Format & Knockout System"
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
                    onChange={(e) => {
                      const newRules = [...rules];
                      newRules[idx].description = e.target.value;
                      setRules(newRules);
                    }}
                    placeholder="Enter specific rule details..."
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

          {categories.map((cat, idx) => {
            const seedOptions = [
              "Single Elimination",
              "Double Elimination",
              "Round Robin",
              "8 Seeded Positions",
              "16 Seeded Positions",
              "Unseeded Knockout",
            ];
            const isCustomSeed = !seedOptions.includes(cat.seeds);
            const formatOptions = [
              "Best of 3 Sets to 21 Points",
              "Best of 5 Sets to 11 Points",
              "Single Set to 30 Points",
              "Best of 3 Sets to 11 Points",
            ];
            const isCustomFormat = !formatOptions.includes(cat.format);

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
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
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
                {idx > 0 && (
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
                  gridTemplateColumns: "1fr 2fr",
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
                    onChange={(e) => {
                      const selectedCategory = availableCategories.find(
                        (option) => option.categoryCode === e.target.value,
                      );
                      const c = [...categories];
                      c[idx] = {
                        ...c[idx],
                        code: selectedCategory?.categoryCode || "",
                        name: selectedCategory?.name || "",
                        pairingType: selectedCategory?.pairingType || "",
                      };
                      setCategories(c);
                    }}
                    disabled={isLoadingCategories || Boolean(categoryLoadError)}
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
                    }}
                  >
                    <option value="">
                      {isLoadingCategories
                        ? "Loading categories..."
                        : "Select a category"}
                    </option>
                    {availableCategories.map((option) => (
                      <option key={option.id} value={option.categoryCode}>
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
              </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "20px",
                    marginBottom: "16px",
                  }}
                >
                  {/* Seeds / Pairing Type */}
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
                      Seeds / Pairing Type
                    </label>
                    <select
                      value={isCustomSeed ? "Other" : cat.seeds}
                      onChange={(e) => {
                        const c = [...categories];
                        if (e.target.value === "Other") {
                          c[idx].seeds = ""; // Other ရွေးရင် အစက အလွတ်စပေးမယ်
                        } else {
                          c[idx].seeds = e.target.value;
                        }
                        setCategories(c);
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#fff",
                        fontSize: "12px",
                        outline: "none",
                        marginBottom: isCustomSeed ? "8px" : "0",
                      }}
                    >
                      <option>Single Elimination</option>
                      <option>Double Elimination</option>
                      <option>Round Robin</option>
                      <option>8 Seeded Positions</option>
                      <option>16 Seeded Positions</option>
                      <option>Unseeded Knockout</option>
                      <option>Other</option>
                    </select>
                    {isCustomSeed && (
                      <input
                        type="text"
                        value={cat.seeds}
                        onChange={(e) => {
                          const c = [...categories];
                          c[idx].seeds = e.target.value;
                          setCategories(c);
                        }}
                        placeholder="Type custom seeds/pairing..."
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "12px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    )}
                  </div>

                  {/* Match Format */}
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
                      onChange={(e) => {
                        const c = [...categories];
                        if (e.target.value === "Other") {
                          c[idx].format = ""; // Other ရွေးရင် အစက အလွတ်စပေးမယ်
                        } else {
                          c[idx].format = e.target.value;
                        }
                        setCategories(c);
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#fff",
                        fontSize: "12px",
                        outline: "none",
                        marginBottom: isCustomFormat ? "8px" : "0",
                      }}
                    >
                      <option>Best of 3 Sets to 21 Points</option>
                      <option>Best of 5 Sets to 11 Points</option>
                      <option>Single Set to 30 Points</option>
                      <option>Best of 3 Sets to 11 Points</option>
                      <option>Other</option>
                    </select>
                    {isCustomFormat && (
                      <input
                        type="text"
                        value={cat.format}
                        onChange={(e) => {
                          const c = [...categories];
                          c[idx].format = e.target.value;
                          setCategories(c);
                        }}
                        placeholder="Type custom match format..."
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
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
                        backgroundColor: "#fff",
                        fontSize: "12px",
                        outline: "none",
                      }}
                    >
                      <option>Open (Fast Closing)</option>
                      <option>Enrollment Open</option>
                      <option>Enrollment Closed</option>
                    </select>
                  </div>
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
                    Eligibility Criteria *
                  </label>
                  <input
                    type="text"
                    value={cat.criteria}
                    onChange={(e) => {
                      const c = [...categories];
                      c[idx].criteria = e.target.value;
                      setCategories(c);
                    }}
                    placeholder="e.g., National Top 150"
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
                    onChange={(e) => {
                      const c = [...categories];
                      c[idx].pointsPool = e.target.value;
                      setCategories(c);
                    }}
                    placeholder="e.g., 1,500 PTS"
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
                    onChange={(e) => {
                      const c = [...categories];
                      c[idx].shuttle = e.target.value;
                      setCategories(c);
                    }}
                    placeholder="e.g., Yonex Aerosensa 50"
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
                    Shuttle Speed *
                  </strong>
                  <input
                    type="text"
                    value={cat.shuttleSpeed}
                    onChange={(e) => {
                      const nextCategories = [...categories];
                      nextCategories[idx] = {
                        ...nextCategories[idx],
                        shuttleSpeed: e.target.value,
                      };
                      setCategories(nextCategories);
                    }}
                    placeholder="e.g., 77"
                    aria-label={`Category ${idx + 1} shuttle speed`}
                    style={{
                      width: "180px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border:
                        attemptedSubmit && !cat.shuttleSpeed
                          ? "1px solid #dc2626"
                          : "1px solid #cbd5e1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                {attemptedSubmit && !cat.shuttleSpeed && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#dc2626",
                      display: "block",
                      marginTop: "-8px",
                      marginBottom: "12px",
                    }}
                  >
                    Shuttle speed is required
                  </span>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <strong style={{ color: "#0f172a", fontSize: "13px" }}>
                    Category Point Tiers *
                  </strong>
                  <button
                    type="button"
                    onClick={() => handleAddPointTier(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "8px 12px",
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    <AddIcon style={{ fontSize: "15px" }} /> Add Tier
                  </button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {cat.pointTiers.map((tier, tierIndex) => (
                    <div
                      key={tierIndex}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px",
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                    >
                      <input
                        type="text"
                        value={tier.place}
                        onChange={(e) => {
                          const nextCategories = [...categories];
                          const nextTiers = [...cat.pointTiers];
                          nextTiers[tierIndex] = {
                            ...nextTiers[tierIndex],
                            place: e.target.value,
                          };
                          nextCategories[idx] = {
                            ...cat,
                            pointTiers: nextTiers,
                          };
                          setCategories(nextCategories);
                        }}
                        placeholder="e.g., Champion"
                        aria-label={`Category ${idx + 1} tier ${tierIndex + 1} label`}
                        style={{
                          minWidth: "0",
                          flex: "1",
                          padding: "10px",
                          borderRadius: "7px",
                          border:
                            attemptedSubmit && !tier.place
                              ? "1px solid #dc2626"
                              : "1px solid #cbd5e1",
                          fontSize: "12px",
                        }}
                      />
                      <input
                        type="text"
                        value={tier.points}
                        onChange={(e) => {
                          const nextCategories = [...categories];
                          const nextTiers = [...cat.pointTiers];
                          nextTiers[tierIndex] = {
                            ...nextTiers[tierIndex],
                            points: e.target.value,
                          };
                          nextCategories[idx] = {
                            ...cat,
                            pointTiers: nextTiers,
                          };
                          setCategories(nextCategories);
                        }}
                        placeholder="Points"
                        aria-label={`Category ${idx + 1} tier ${tierIndex + 1} points`}
                        style={{
                          width: "95px",
                          padding: "10px",
                          borderRadius: "7px",
                          border:
                            attemptedSubmit && !tier.points
                              ? "1px solid #dc2626"
                              : "1px solid #cbd5e1",
                          fontSize: "12px",
                        }}
                      />
                      {cat.pointTiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePointTier(idx, tierIndex)}
                          aria-label={`Remove category ${idx + 1} tier ${tierIndex + 1}`}
                          style={{
                            display: "flex",
                            padding: "5px",
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
                {attemptedSubmit &&
                  cat.pointTiers.some((tier) => !tier.place || !tier.points) && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#dc2626",
                        display: "block",
                        marginTop: "8px",
                      }}
                    >
                      Every point tier needs a label and points value.
                    </span>
                  )}
              </div>
            </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
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
            Cancel & Save Draft
          </button>
          {submissionError && (
            <p
              role="alert"
              style={{
                alignSelf: "center",
                margin: "0 auto 0 0",
                color: "#b91c1c",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              {submissionError}
            </p>
          )}
          <button
            onClick={handlePublish}
            disabled={isSubmitting}
            style={{
              padding: "14px 36px",
              backgroundColor: isSubmitting ? "#991b1b" : "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: isSubmitting ? "wait" : "pointer",
              boxShadow: "0 4px 12px rgba(220,38,38,0.3)",
            }}
          >
            {isSubmitting ? "PUBLISHING..." : "🚀 PUBLISH TOURNAMENT"}
          </button>
        </div>
      </div>

      {/* CUSTOM SUCCESS CARD MODAL */}
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
              Tournament Published!
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                marginBottom: "26px",
              }}
            >
              Your tournament has been successfully created and published for
              public registration.
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
