import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarMonthOutlined,
  LocationOnOutlined,
  EmojiEventsOutlined,
} from "@mui/icons-material";
import Overview from "./overview";
import Events from "./events";
import BracketsSchedule from "./brackets";
import RegisteredPlayers, { approvedPlayersDatabase } from "./players"; // approvedPlayersDatabase ကို import လုပ်ခြင်း
import { getTournament } from "../features/tournaments/api/tournamentApi";
import { resolveApiAssetUrl } from "../core/api/apiClient";

function formatTournamentDate(date) {
  if (!date) return "Date not set";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Date not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsedDate);
}

function mapTournamentDetails(data) {
  const categories = data.categories || [];
  const venues = data.venues || [];
  const entryStatuses = categories.map((item) => item.entryStatus);
  const startDate = formatTournamentDate(data.startDate);
  const endDate = formatTournamentDate(data.endDate);
  const registrationStatus = entryStatuses.includes("open")
    ? "Registration Open"
    : entryStatuses.includes("closing_soon")
      ? "Registration Closing Soon"
      : "Registration Closed";

  return {
    ...data,
    categories,
    venues,
    rules: data.rules || [],
    image: resolveApiAssetUrl(data.bannerUrl),
    status: registrationStatus,
    discipline:
      categories
        .map((item) => `${item.categoryName} (${item.categoryCode})`)
        .join(", ") || "No categories",
    date: startDate === endDate ? startDate : `${startDate} – ${endDate}`,
    court: venues
      .map((venue) => [venue.venueName, venue.address].filter(Boolean).join(", "))
      .filter(Boolean)
      .join(" · "),
    points: `${Number(data.rankingPointsPool || 0).toLocaleString()} PTS`,
    entryFee: `${Number(categories[0]?.entryFee || 0).toLocaleString()} MMK`,
  };
}

export default function TournamentDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let cancelled = false;

    async function loadTournament() {
      setLoading(true);
      setLoadError("");
      try {
        const data = await getTournament(id);
        if (!cancelled) setTournament(mapTournamentDetails(data));
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load tournament details.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTournament();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Approved players စုစုပေါင်းအရေအတွက်ကို dynamic ဖြင့် ရယူခြင်း (လိုအပ်ပါက တကယ့် API count ဖြင့် အစားထိုးနိုင်သည်)
  const totalApprovedPlayers = approvedPlayersDatabase
    ? approvedPlayersDatabase.length
    : 0;

  const handleEnroll = () => {
    navigate(`/register`, { state: { tournament } });
  };

  if (loading || loadError || !tournament) {
    return (
      <main
        style={{
          minHeight: "60vh",
          display: "grid",
          placeContent: "center",
          justifyItems: "center",
          gap: "14px",
          padding: "24px",
          color: loadError ? "#b91c1c" : "#596170",
          textAlign: "center",
        }}
      >
        {loading ? (
          <p role="status">Loading tournament details...</p>
        ) : (
          <>
            <p role="alert">
              Unable to load tournament details: {loadError}
            </p>
            <button
              type="button"
              onClick={() => navigate("/tournaments")}
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
          </>
        )}
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        padding: "24px 32px 60px",
        background: "#f7f8fa",
        color: "#172033",
        fontFamily: "'Inter', sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: "1400px", margin: "0 auto" }}>
        {/* Hero Banner with Smart Centered Content Width */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "320px",
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "24px",
            boxShadow: "0 6px 24px rgba(0, 0, 0, 0.1)",
          }}
        >
          {tournament.image && (
            <img
              src={tournament.image}
              alt={tournament.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(9,15,30,0.85) 100%)",
            }}
          />
          <div style={{ position: "absolute", top: "20px", left: "24px" }}>
            <span
              style={{
                background: "#087b59",
                color: "#fff",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "800",
                letterSpacing: "0.5px",
              }}
            >
              {tournament.status}
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: "24px",
              left: "24px",
              right: "24px",
              color: "#fff",
            }}
          >
            <h1
              style={{
                fontSize: "clamp(26px, 3.5vw, 36px)",
                fontWeight: "800",
                margin: "0 0 10px",
                lineHeight: "1.2",
              }}
            >
              {tournament.title}
            </h1>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "20px",
                fontSize: "14px",
                color: "#e2e8f0",
                fontWeight: "600",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <CalendarMonthOutlined
                  style={{ fontSize: 18, color: "#ff3366" }}
                />{" "}
                {tournament.date}
              </span>
              <span
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <LocationOnOutlined
                  style={{ fontSize: 18, color: "#ff3366" }}
                />{" "}
                {tournament.court}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #eef0f3",
              padding: "20px 24px",
              borderRadius: "14px",
              boxShadow: "0 3px 10px rgba(20, 30, 50, 0.03)",
            }}
          >
            <div
              style={{
                fontSize: "11.5px",
                fontWeight: "800",
                color: "#727987",
                marginBottom: "6px",
                letterSpacing: "0.5px",
              }}
            >
              TOURNAMENT RANKING POOL
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: "26px",
                  fontWeight: "800",
                  color: "#ae1236",
                }}
              >
                {tournament.points}
              </span>
              <EmojiEventsOutlined style={{ color: "#ae1236", fontSize: 26 }} />
            </div>
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #eef0f3",
              padding: "20px 24px",
              borderRadius: "14px",
              boxShadow: "0 3px 10px rgba(20, 30, 50, 0.03)",
            }}
          >
            <div
              style={{
                fontSize: "11.5px",
                fontWeight: "800",
                color: "#727987",
                marginBottom: "6px",
                letterSpacing: "0.5px",
              }}
            >
              TOURNAMENT ENTRY FEE
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: "26px",
                  fontWeight: "800",
                  color: "#172033",
                }}
              >
                {tournament.entryFee}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "#727987",
                  fontWeight: "700",
                }}
              >
                Per Player
              </span>
            </div>
          </div>
        </div>

        {/* Mini Tabs Header (Registered Players တွင် dynamic count ကို ထည့်သွင်းထားသည်) */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            borderBottom: "1px solid #eef0f3",
            marginBottom: "24px",
            overflowX: "auto",
          }}
        >
          {[
            { id: "overview", label: "Overview" },
            { id: "categories", label: "Events & Categories" },
            { id: "brackets", label: "Brackets & Schedule" },
            {
              id: "players",
              label: `Registered Players (${totalApprovedPlayers})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 20px",
                border: "none",
                background: "transparent",
                color: activeTab === tab.id ? "#ae1236" : "#596170",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                whiteSpace: "nowrap",
                borderBottom: `3px solid ${activeTab === tab.id ? "#ae1236" : "transparent"}`,
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Tab Components */}
        {activeTab === "overview" && (
          <Overview tournament={tournament} onEnroll={handleEnroll} />
        )}
        {activeTab === "categories" && <Events tournament={tournament} />}
        {activeTab === "brackets" && (
          <BracketsSchedule tournament={tournament} />
        )}
        {activeTab === "players" && (
          <RegisteredPlayers tournament={tournament} />
        )}
      </div>
    </main>
  );
}
