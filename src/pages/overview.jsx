import {
  InfoOutlined,
  EmojiEventsOutlined,
  FormatListNumberedOutlined,
  LocationOnOutlined,
} from "@mui/icons-material";

export default function Overview({ tournament }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
      }}
    >
      {/* Tournament Overview & Official Rules */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #eef0f3",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
        }}
      >
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "800",
            color: "#172033",
            margin: "0 0 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <InfoOutlined style={{ fontSize: 22, color: "#ae1236" }} /> Tournament
          Overview & Official Rules
        </h3>
        <p
          style={{
            fontSize: "15px",
            lineHeight: "1.75",
            color: "#4b5563",
            margin: "0 0 20px",
          }}
        >
          {tournament.description}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {(tournament.rules || []).map((rule, idx) => (
            <div
              key={rule.id || `${rule.title}-${idx}`}
              style={{
                display: "flex",
                gap: "14px",
                background: "#f8f9fa",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #edf0f3",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  background: "#fde9ee",
                  color: "#ae1236",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "800",
                  flexShrink: 0,
                }}
              >
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div>
                <h4
                  style={{
                    margin: "0 0 4px",
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "#172033",
                  }}
                >
                  {rule.title}
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12.5px",
                    color: "#6b7280",
                    lineHeight: "1.5",
                  }}
                >
                  {rule.description}
                </p>
              </div>
            </div>
          ))}
          {(!tournament.rules || tournament.rules.length === 0) && (
            <p style={{ color: "#727987" }}>
              No official rules have been added to this tournament.
            </p>
          )}
        </div>
      </div>

      {/* Leaderboard Points Allocation */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #eef0f3",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "4px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "800",
              color: "#172033",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <EmojiEventsOutlined style={{ fontSize: 22, color: "#ae1236" }} />{" "}
            Leaderboard Points Allocation
          </h3>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#596170",
              background: "#f1f3f6",
              padding: "4px 10px",
              borderRadius: "6px",
            }}
          >
            Pure Ranking Points • No Monetary Purse
          </span>
        </div>
        <div style={{ height: "14px" }} />

        {(tournament.categories || []).map((category, categoryIndex) => (
          <div
            key={category.id || `${category.categoryCode}-${categoryIndex}`}
            style={{
              padding: "12px 0",
              borderBottom:
                categoryIndex === tournament.categories.length - 1
                  ? "none"
                  : "1px solid #f1f3f6",
            }}
          >
            <h4 style={{ margin: "0 0 8px", color: "#172033" }}>
              {category.categoryName} ({category.categoryCode})
            </h4>
            {(category.pointTiers || []).length === 0 ? (
              <p style={{ margin: 0, color: "#727987" }}>
                No leaderboard points configured.
              </p>
            ) : (
              category.pointTiers.map((tier, tierIndex) => (
                <div
                  key={tier.id || `${tier.position}-${tierIndex}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom:
                      tierIndex === category.pointTiers.length - 1
                        ? "none"
                        : "1px solid #f1f3f6",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#172033",
                    }}
                  >
                    <EmojiEventsOutlined
                      style={{ color: "#d97706", fontSize: 20 }}
                    />
                    {tier.label}
                  </span>
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: "900",
                      color: "#ae1236",
                    }}
                  >
                    {Number(tier.points || 0).toLocaleString()} PTS
                  </span>
                </div>
              ))
            )}
          </div>
        ))}
        {(tournament.categories || []).length === 0 && (
          <p style={{ color: "#727987" }}>
            No leaderboard points are configured.
          </p>
        )}
      </div>

      {/* Included Categories & Draw Caps */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #eef0f3",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
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
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "800",
              color: "#172033",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <FormatListNumberedOutlined
              style={{ fontSize: 22, color: "#ae1236" }}
            />{" "}
            Included Categories & Draw Caps
          </h3>
          <span
            style={{ fontSize: "12px", fontWeight: "800", color: "#727987" }}
          >
            {(tournament.categories || []).length} Events Active
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {(tournament.categories || []).map((cat, idx) => (
            <div
              key={idx}
              style={{
                background: "#f8f9fa",
                border: "1px solid #eef0f3",
                borderRadius: "12px",
                padding: "18px",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    background: "#172033",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: "800",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  {cat.code}
                </span>
                <span
                  style={{
                    background: "#fde9ee",
                    color: "#ae1236",
                    fontSize: "11px",
                    fontWeight: "800",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  {cat.entryStatus === "closing_soon"
                    ? "Closing Soon"
                    : cat.entryStatus === "closed"
                      ? "Closed"
                      : "Open"}
                </span>
              </div>
              <h4
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#172033",
                  margin: "0 0 4px",
                }}
              >
                {cat.categoryName}
              </h4>
              <p
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  margin: 0,
                  fontWeight: "500",
                }}
              >
                {cat.pairingType} • {cat.seedCount} seeded positions
              </p>
            </div>
          ))}
          {(tournament.categories || []).length === 0 && (
            <p style={{ color: "#727987" }}>
              No categories are configured for this tournament.
            </p>
          )}
        </div>
      </div>

      {/* Location Address */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #eef0f3",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
        }}
      >
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "800",
            color: "#172033",
            margin: "0 0 10px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <LocationOnOutlined style={{ fontSize: 22, color: "#ae1236" }} />{" "}
          Location Address
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "14.5px",
            color: "#4b5563",
            fontWeight: "600",
          }}
        >
          {tournament.court}
        </p>
      </div>
    </div>
  );
}
