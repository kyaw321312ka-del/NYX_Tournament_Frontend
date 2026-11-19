import { useNavigate } from "react-router-dom";
import { FormatListNumberedOutlined } from "@mui/icons-material";
import { useAuth } from "../../auth/hooks/useAuth";

export default function Events({ tournament }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAuthenticated = Boolean(session?.token);

  const categoriesList = (tournament.categories || []).map((category) => ({
    code: category.categoryCode,
    name: category.categoryName,
    eligibility: category.eligibilityCriteria || "Not specified",
    pointsPool: `${Number(category.pointsPool || 0).toLocaleString()} PTS`,
    matchFormat: category.matchFormat || "Not specified",
    officialShuttle: [
      category.shuttleName,
      category.shuttleSpeed ? `Speed ${category.shuttleSpeed}` : "",
    ]
      .filter(Boolean)
      .join(" - ") || "Not specified",
    seedsProtected: category.seedCount
      ? `${category.seedCount} Seeded Positions`
      : "",
    pairingType: category.pairingType || "",
    entryStatus:
      category.entryStatus === "closed"
        ? "Enrollment Closed"
        : category.entryStatus === "closing_soon"
          ? "Closing Soon"
          : "Enrollment Open",
    btnText: `Enroll for ${category.categoryCode}`,
    isClosed: category.entryStatus === "closed",
  }));

  const handleEnrollClick = (category) => {
    navigate("/enroll", { state: { tournament, category } });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "100%",
      }}
    >
      {/* Header Bar with Dynamic Count */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #eef0f3",
          borderRadius: "16px",
          padding: "20px 24px",
          boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "800",
              color: "#172033",
              margin: "0 0 6px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <FormatListNumberedOutlined
              style={{ fontSize: 22, color: "#ae1236" }}
            />{" "}
            Event Categories
          </h3>
          <p
            style={{
              fontSize: "13.5px",
              color: "#727987",
              margin: 0,
              fontWeight: "500",
            }}
          >
            Select an event category to inspect quota capacities, seed rankings,
            and entry requirements.
          </p>
        </div>
        <span
          style={{
            background: "#172033",
            color: "#fff",
            fontSize: "12px",
            fontWeight: "800",
            padding: "6px 14px",
            borderRadius: "8px",
          }}
        >
          {categoriesList.length} Categories
        </span>
      </div>

      {/* Categories Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {categoriesList.length === 0 ? (
          <p style={{ color: "#727987" }}>
            No categories are configured for this tournament.
          </p>
        ) : categoriesList.map((cat, idx) => (
          <div
            key={idx}
            style={{
              background: "#fff",
              border: "1px solid #eef0f3",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* Top Title & Code */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  background: "#172033",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "900",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  flexShrink: 0,
                }}
              >
                {cat.code}
              </div>
              <h4
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "#172033",
                  margin: "0",
                }}
              >
                {cat.name}
              </h4>
            </div>

            {/* Info Grid: Desktop တွင် ၃ ခုစီတန်း၍ ဘေးချင်းယှဉ်ပြရန် ချိန်ညှိထားသည် */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
                background: "#f8f9fa",
                padding: "18px",
                borderRadius: "12px",
                border: "1px solid #edf0f3",
                fontSize: "13px",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#727987",
                    fontWeight: "700",
                    marginBottom: "3px",
                    fontSize: "11px",
                    letterSpacing: "0.5px",
                  }}
                >
                  ELIGIBILITY
                </div>
                <div style={{ color: "#172033", fontWeight: "800" }}>
                  {cat.eligibility}
                </div>
              </div>
              <div>
                <div
                  style={{
                    color: "#727987",
                    fontWeight: "700",
                    marginBottom: "3px",
                    fontSize: "11px",
                    letterSpacing: "0.5px",
                  }}
                >
                  POINTS POOL
                </div>
                <div style={{ color: "#ae1236", fontWeight: "800" }}>
                  {cat.pointsPool}
                </div>
              </div>
              <div>
                <div
                  style={{
                    color: "#727987",
                    fontWeight: "700",
                    marginBottom: "3px",
                    fontSize: "11px",
                    letterSpacing: "0.5px",
                  }}
                >
                  MATCH FORMAT
                </div>
                <div style={{ color: "#172033", fontWeight: "800" }}>
                  {cat.matchFormat}
                </div>
              </div>
              <div>
                <div
                  style={{
                    color: "#727987",
                    fontWeight: "700",
                    marginBottom: "3px",
                    fontSize: "11px",
                    letterSpacing: "0.5px",
                  }}
                >
                  OFFICIAL SHUTTLE
                </div>
                <div style={{ color: "#172033", fontWeight: "800" }}>
                  {cat.officialShuttle}
                </div>
              </div>

              {cat.seedsProtected && (
                <div>
                  <div
                    style={{
                      color: "#727987",
                      fontWeight: "700",
                      marginBottom: "3px",
                      fontSize: "11px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    SEEDS PROTECTED
                  </div>
                  <div style={{ color: "#172033", fontWeight: "800" }}>
                    {cat.seedsProtected}
                  </div>
                </div>
              )}
              {cat.pairingType && (
                <div>
                  <div
                    style={{
                      color: "#727987",
                      fontWeight: "700",
                      marginBottom: "3px",
                      fontSize: "11px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    PAIRING TYPE
                  </div>
                  <div style={{ color: "#172033", fontWeight: "800" }}>
                    {cat.pairingType}
                  </div>
                </div>
              )}
              {cat.earlyVerify && (
                <div>
                  <div
                    style={{
                      color: "#727987",
                      fontWeight: "700",
                      marginBottom: "3px",
                      fontSize: "11px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    EARLY VERIFY
                  </div>
                  <div style={{ color: "#172033", fontWeight: "800" }}>
                    {cat.earlyVerify}
                  </div>
                </div>
              )}
              {cat.pairRule && (
                <div>
                  <div
                    style={{
                      color: "#727987",
                      fontWeight: "700",
                      marginBottom: "3px",
                      fontSize: "11px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    PAIR RULE
                  </div>
                  <div style={{ color: "#172033", fontWeight: "800" }}>
                    {cat.pairRule}
                  </div>
                </div>
              )}

              <div>
                <div
                  style={{
                    color: "#727987",
                    fontWeight: "700",
                    marginBottom: "3px",
                    fontSize: "11px",
                    letterSpacing: "0.5px",
                  }}
                >
                  ENTRY STATUS
                </div>
                <div style={{ color: "#087b59", fontWeight: "800" }}>
                  {cat.entryStatus}
                </div>
              </div>
            </div>

            {/* Enroll Button Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
                borderTop: "1px solid #f1f3f6",
                paddingTop: "16px",
              }}
            >
              <button
                onClick={() => handleEnrollClick(cat.name)}
                disabled={cat.isClosed || !isAuthenticated}
                title={
                  !isAuthenticated
                    ? "Log in to enroll in this event."
                    : undefined
                }
                style={{
                  background:
                    cat.isClosed || !isAuthenticated ? "#9ca3af" : "#ae1236",
                  color: "#fff",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "800",
                  cursor:
                    cat.isClosed || !isAuthenticated
                      ? "not-allowed"
                      : "pointer",
                  boxShadow: "0 3px 12px rgba(174, 18, 54, 0.25)",
                  transition: "background 0.2s",
                }}
              >
                {cat.isClosed
                  ? "Enrollment Closed"
                  : !isAuthenticated
                    ? "Log in to Enroll"
                    : cat.btnText}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
