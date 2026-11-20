import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  getAdminPlayer,
  updateIdentityDocumentStatus,
} from "../api/playerApi";
import {
  apiAssetRequest,
  resolveApiAssetUrl,
} from "../../../core/api/apiClient";

const cardStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "24px",
  marginBottom: "20px",
};

function formatDate(value) {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString();
}

function formatStatus(value) {
  if (!value) return "Not submitted";
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCategoryName(category) {
  if (typeof category === "string") return category;
  return (
    category?.categoryName ||
    category?.name ||
    category?.title ||
    category?.category?.categoryName ||
    "Category"
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt
        style={{
          color: "#64748b",
          fontSize: "11px",
          fontWeight: 700,
          marginBottom: "6px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          color: "#0f172a",
          fontSize: "14px",
          fontWeight: 600,
          margin: 0,
          overflowWrap: "anywhere",
        }}
      >
        {value ?? "Not provided"}
      </dd>
    </div>
  );
}

export default function PlayerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const listPlayer = location.state?.player;
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [updatingVerificationStatus, setUpdatingVerificationStatus] =
    useState("");
  const [verificationUpdateError, setVerificationUpdateError] = useState("");
  const [documentPreviews, setDocumentPreviews] = useState({});
  const [documentPreviewErrors, setDocumentPreviewErrors] = useState({});
  const detailUser =
    details?.user || details?.player || details?.profile || details || {};
  const detailIdentityDocuments =
    details?.identityDocuments ||
    detailUser.identityDocuments ||
    {};
  const frontDocumentPath = detailIdentityDocuments.frontIdImg || "";
  const backDocumentPath = detailIdentityDocuments.backIdImg || "";

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      setIsLoading(true);
      setError("");
      try {
        const result = await getAdminPlayer(id);
        if (!cancelled) setDetails(result);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load player details.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    const objectUrls = [];
    const sources = [
      ["front", frontDocumentPath],
      ["back", backDocumentPath],
    ];

    async function loadDocumentPreviews() {
      const results = await Promise.all(
        sources.map(async ([side, path]) => {
          if (!path) return { side, url: "", error: "" };
          try {
            const blob = await apiAssetRequest(path);
            if (cancelled) return { side, url: "", error: "" };
            const url = URL.createObjectURL(blob);
            objectUrls.push(url);
            return { side, url, error: "" };
          } catch (requestError) {
            return {
              side,
              url: "",
              error:
                requestError instanceof Error
                  ? requestError.message
                  : "Unable to load document preview.",
            };
          }
        }),
      );

      if (!cancelled) {
        setDocumentPreviews(
          Object.fromEntries(results.map(({ side, url }) => [side, url])),
        );
        setDocumentPreviewErrors(
          Object.fromEntries(results.map(({ side, error }) => [side, error])),
        );
      }
    }

    loadDocumentPreviews();
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [frontDocumentPath, backDocumentPath]);

  if (isLoading) {
    return (
      <div role="status" style={{ padding: "32px", color: "#334155" }}>
        Loading player details...
      </div>
    );
  }

  if (error || !details) {
    return (
      <div
        role="alert"
        style={{ padding: "32px", color: "#b91c1c" }}
      >
        <p>Unable to load player details: {error || "No player data returned."}</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Retry
          </button>
          <button type="button" onClick={() => navigate("/admin/players")}>
            Back to players
          </button>
        </div>
      </div>
    );
  }

  const user = detailUser;
  const categories = Array.isArray(details.categories)
    ? details.categories
    : Array.isArray(user.categories)
      ? user.categories
      : [];
  const identityDocuments = detailIdentityDocuments;
  const awards = [
    details.awardHistory,
    details.rankingPointAwards,
    details.awards,
    user.rankingPointAwards,
    user.awardHistory,
    user.awards,
  ].find(Array.isArray) || [];
  const rawPoints =
    details.totalRankingPoints ??
    details.totalPoints ??
    details.rankingPoints ??
    details.points ??
    user.totalRankingPoints ??
    user.points ??
    0;
  const points = Number(rawPoints);
  const playerName =
    user.athleteName || user.name || listPlayer?.name || "Player";
  const playerId =
    user.playerId ||
    details.playerId ||
    listPlayer?.playerId ||
    `#NYX-${user.id ?? id}`;
  const status = user.status || details.status || listPlayer?.status || "—";
  const verificationStatus = formatStatus(
    identityDocuments.verificationStatus ||
      (identityDocuments.frontUploaded || identityDocuments.backUploaded
        ? "pending"
        : null),
  );
  const currentVerificationStatus = String(
    identityDocuments.verificationStatus || "",
  ).toLowerCase();
  const imageUrl = user.profileImageUrl
    ? resolveApiAssetUrl(user.profileImageUrl)
    : "";
  const initials = playerName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleVerificationStatusUpdate(nextStatus) {
    setUpdatingVerificationStatus(nextStatus);
    setVerificationUpdateError("");
    try {
      const updatedStatus = await updateIdentityDocumentStatus(id, nextStatus);
      setDetails((current) => {
        const statusPatch = { verificationStatus: updatedStatus };
        if (current.identityDocuments) {
          return {
            ...current,
            identityDocuments: {
              ...current.identityDocuments,
              ...statusPatch,
            },
          };
        }

        const nestedUserKey = ["user", "player", "profile"].find(
          (key) => current[key],
        );
        if (nestedUserKey) {
          return {
            ...current,
            [nestedUserKey]: {
              ...current[nestedUserKey],
              identityDocuments: {
                ...current[nestedUserKey].identityDocuments,
                ...statusPatch,
              },
            },
          };
        }

        return {
          ...current,
          identityDocuments: {
            ...identityDocuments,
            ...statusPatch,
          },
        };
      });
    } catch (requestError) {
      setVerificationUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update identity-document status.",
      );
    } finally {
      setUpdatingVerificationStatus("");
    }
  }

  return (
    <main
      style={{
        backgroundColor: "#f8fafc",
        minHeight: "100%",
        padding: "24px",
        color: "#0f172a",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/admin/players")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 14px",
            marginBottom: "20px",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            color: "#334155",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <ArrowBackIcon fontSize="small" />
          Back to players
        </button>

        <section style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: "76px",
              height: "76px",
              flex: "0 0 76px",
              overflow: "hidden",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              backgroundColor: "#e2e8f0",
              color: "#334155",
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`${playerName} profile`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ margin: "0 0 6px", fontSize: "23px" }}>
              {playerName}
            </h1>
            <div style={{ color: "#64748b", fontSize: "13px" }}>
              {playerId} · User ID: {user.id ?? id}
            </div>
          </div>
          <span
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              backgroundColor: "#f1f5f9",
              color: "#334155",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {formatStatus(status)}
          </span>
        </section>

        <section style={cardStyle}>
          <h2 style={{ margin: "0 0 20px", fontSize: "18px" }}>
            Profile details
          </h2>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "22px 18px",
              margin: 0,
            }}
          >
            <Detail label="Full name" value={playerName} />
            <Detail
              label="Email"
              value={user.contactEmail || user.email}
            />
            <Detail
              label="Phone"
              value={user.phoneNumber || user.phno}
            />
            <Detail
              label="Club / team"
              value={user.teamClub || user.clubName}
            />
            <Detail label="Gender" value={user.gender} />
            <Detail label="Birthday" value={formatDate(user.birthday)} />
            <Detail label="Address" value={user.address} />
            <Detail label="Account role" value={user.role} />
            <Detail
              label="Email verification"
              value={
                user.emailVerifiedAt
                  ? `Verified on ${formatDate(user.emailVerifiedAt)}`
                  : "Not verified"
              }
            />
            <Detail
              label="Ranking points"
              value={`${(Number.isFinite(points) ? points : 0).toLocaleString()} points`}
            />
          </dl>
        </section>

        <section style={cardStyle}>
          <h2 style={{ margin: "0 0 16px", fontSize: "18px" }}>
            Registered categories
          </h2>
          {categories.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {categories.map((category, index) => (
                <span
                  key={
                    category.id ||
                    category.categoryId ||
                    `${getCategoryName(category)}-${index}`
                  }
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {getCategoryName(category)}
                  {category?.categoryCode ? ` (${category.categoryCode})` : ""}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
              No categories registered.
            </p>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={{ margin: "0 0 8px", fontSize: "18px" }}>
            Identity verification
          </h2>
          <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: "13px" }}>
            Verification status: <strong>{verificationStatus}</strong>
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            {[
              {
                side: "front",
                label: "Front document",
                uploaded: identityDocuments.frontUploaded,
              },
              {
                side: "back",
                label: "Back document",
                uploaded: identityDocuments.backUploaded,
              },
            ].map(({ side, label, uploaded }) => (
              <div
                key={label}
                style={{
                  padding: "14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  backgroundColor: "#f8fafc",
                  fontSize: "13px",
                }}
              >
                <strong>{label}:</strong>{" "}
                {uploaded ? "Uploaded" : "Not uploaded"}
                {documentPreviews[side] ? (
                  <img
                    src={documentPreviews[side]}
                    alt={`${label} preview`}
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: "280px",
                      objectFit: "contain",
                      marginTop: "12px",
                      backgroundColor: "#ffffff",
                      borderRadius: "6px",
                    }}
                  />
                ) : (
                  <p
                    style={{
                      margin: "10px 0 0",
                      color: documentPreviewErrors[side] ? "#b91c1c" : "#64748b",
                    }}
                  >
                    {documentPreviewErrors[side] ||
                      (uploaded
                        ? "Preview is not available."
                        : "No document uploaded.")}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "16px",
            }}
          >
            <button
              type="button"
              onClick={() => handleVerificationStatusUpdate("approved")}
              disabled={
                Boolean(updatingVerificationStatus) ||
                currentVerificationStatus === "approved"
              }
              style={{
                padding: "9px 14px",
                border: "none",
                borderRadius: "8px",
                backgroundColor: "#15803d",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 600,
                opacity:
                  updatingVerificationStatus ||
                  currentVerificationStatus === "approved"
                    ? 0.6
                    : 1,
              }}
            >
              {updatingVerificationStatus === "approved"
                ? "Approving..."
                : "Approve documents"}
            </button>
            <button
              type="button"
              onClick={() => handleVerificationStatusUpdate("rejected")}
              disabled={
                Boolean(updatingVerificationStatus) ||
                currentVerificationStatus === "rejected"
              }
              style={{
                padding: "9px 14px",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                backgroundColor: "#fff1f2",
                color: "#b91c1c",
                cursor: "pointer",
                fontWeight: 600,
                opacity:
                  updatingVerificationStatus ||
                  currentVerificationStatus === "rejected"
                    ? 0.6
                    : 1,
              }}
            >
              {updatingVerificationStatus === "rejected"
                ? "Rejecting..."
                : "Reject documents"}
            </button>
          </div>
          {verificationUpdateError && (
            <p
              role="alert"
              style={{ margin: "12px 0 0", color: "#b91c1c", fontSize: "13px" }}
            >
              {verificationUpdateError}
            </p>
          )}
          <p style={{ margin: "14px 0 0", color: "#64748b", fontSize: "12px" }}>
            Document previews are loaded from authenticated admin endpoints.
          </p>
        </section>

        <section style={cardStyle}>
          <h2 style={{ margin: "0 0 16px", fontSize: "18px" }}>
            Award history
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: "620px",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", color: "#64748b" }}>
                  <th style={{ padding: "12px" }}>TOURNAMENT</th>
                  <th style={{ padding: "12px" }}>DATE</th>
                  <th style={{ padding: "12px" }}>CATEGORY</th>
                  <th style={{ padding: "12px" }}>AWARD</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>
                    POINTS
                  </th>
                </tr>
              </thead>
              <tbody>
                {awards.length > 0 ? (
                  awards.map((award, index) => {
                    const awardPoints =
                      award.points ?? award.pointsEarned;
                    const tournament =
                      award.tournamentTitle ||
                      award.tournament?.title ||
                      award.tournamentName ||
                      "—";
                    return (
                      <tr
                        key={award.id || `${tournament}-${index}`}
                        style={{ borderTop: "1px solid #e2e8f0" }}
                      >
                        <td style={{ padding: "14px 12px" }}>{tournament}</td>
                        <td style={{ padding: "14px 12px", color: "#64748b" }}>
                          {formatDate(
                            award.awardedAt ||
                              award.eventDate ||
                              award.createdAt ||
                              award.date,
                          )}
                        </td>
                        <td style={{ padding: "14px 12px" }}>
                          {award.categoryName ||
                            award.category?.categoryName ||
                            award.category?.name ||
                            (typeof award.category === "string"
                              ? award.category
                              : "—")}
                          {award.categoryCode ? ` (${award.categoryCode})` : ""}
                        </td>
                        <td style={{ padding: "14px 12px" }}>
                          {award.result ||
                            award.label ||
                            award.awardName ||
                            award.placement ||
                            award.title ||
                            "Award"}
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          {awardPoints == null || !Number.isFinite(Number(awardPoints))
                            ? "—"
                            : `${Number(awardPoints).toLocaleString()} pts`}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "20px 12px",
                        textAlign: "center",
                        color: "#64748b",
                      }}
                    >
                      No award history recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
