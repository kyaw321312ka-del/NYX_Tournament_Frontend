import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowForward,
  Bolt,
  CalendarMonth,
  EmojiEvents,
  LocationOn,
  Visibility,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  SportsTennis,
  AccessTime,
  MilitaryTech,
} from "@mui/icons-material";
import { getTournaments } from "../api/tournamentApi";
import { resolveApiAssetUrl } from "../../../core/api/apiClient";

const DEFAULT_TOURNAMENT_IMAGE =
  "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1400&q=85";

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

const initialMatches = [
  {
    id: 1,
    court: "CRT 1",
    category: "MS • QF",
    status: "SET 3",
    player1: "Aung Aung",
    player2: "Kyaw Kyaw",
    score1: 14,
    score2: 11,
    previous: "21-18, 18-21",
    time: "LIVE NOW",
    live: true,
  },
  {
    id: 2,
    court: "CRT 3",
    category: "XD • R16",
    status: "SET 2",
    player1: "Thura / Lin Lin",
    player2: "Min Min / Su Su",
    score1: 15,
    score2: 9,
    previous: "21-16",
    time: "LIVE NOW",
    live: true,
  },
  {
    id: 3,
    court: "CRT 2",
    category: "WS • SF",
    status: "UPCOMING",
    player1: "May Myat",
    player2: "Thinzar Moe",
    score1: "Seed 1",
    score2: "Seed 4",
    previous: "",
    time: "Today 04:30 PM",
    live: false,
  },
  {
    id: 4,
    court: "CRT 4",
    category: "MD • QF",
    status: "UPCOMING",
    player1: "Zaw Zaw / Nyi Nyi",
    player2: "Hein Htet / Kaung",
    score1: "Seed 2",
    score2: "Q-Spot",
    previous: "",
    time: "Today 05:15 PM",
    live: false,
  },
];

const initialPlayers = [
  {
    id: 1,
    name: "Ko Phyoe",
    club: "Phoenix Shuttle Club",
    seed: 2,
    points: 2450,
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    form: ["W", "W", "W", "W"],
  },
  {
    id: 2,
    name: "Kyaw Kyaw",
    club: "Yangon Badminton Academy",
    seed: 2,
    points: 1980,
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80",
    form: ["W", "W", "L", "W"],
  },
  {
    id: 3,
    name: "Ma Pwint",
    club: "Elite Smashers Club",
    seed: 3,
    points: 1620,
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
    form: ["L", "W", "W", "W"],
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [tournamentLoadError, setTournamentLoadError] = useState("");
  const [activeTournament, setActiveTournament] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadTournaments() {
      setLoading(true);
      setTournamentLoadError("");
      try {
        const result = await getTournaments({ page: 1, pageSize: 20 });
        if (cancelled) return;
        const publishedTournaments = result.tournaments
          .filter(
            (item) =>
              (item.publicationStatus || "").toLowerCase() === "published",
          )
          .map((item) => {
            const startDate = formatTournamentDate(item.startDate);
            const endDate = formatTournamentDate(item.endDate);
            const venues = (item.venues || [])
              .map((venue) =>
                [venue.venueName, venue.address].filter(Boolean).join(", "),
              )
              .filter(Boolean);
            const rankingPoints = Number(item.rankingPointsPool);

            return {
              id: item.id,
              title: item.title || "Untitled Tournament",
              date:
                startDate === endDate
                  ? startDate
                  : `${startDate} – ${endDate}`,
              location: venues.join(" · ") || "Location to be announced",
              prize:
                Number.isFinite(rankingPoints) && rankingPoints > 0
                  ? `${rankingPoints.toLocaleString()} PTS`
                  : "Points TBA",
              description: item.description || "Tournament details coming soon.",
              image: item.bannerUrl
                ? resolveApiAssetUrl(item.bannerUrl)
                : DEFAULT_TOURNAMENT_IMAGE,
            };
          });
        setTournaments(publishedTournaments);
        setActiveTournament(0);
      } catch (error) {
        if (!cancelled) {
          setTournamentLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load published tournaments.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTournaments();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto animation slider for featured tournament card (every 4 seconds)
  useEffect(() => {
    if (tournaments.length < 2) return undefined;
    const interval = setInterval(() => {
      setActiveTournament((current) => (current + 1) % tournaments.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [tournaments.length]);

  const tournament = tournaments[activeTournament];
  const liveCount = initialMatches.filter((match) => match.live).length;

  const changeTournament = (direction) => {
    if (tournaments.length < 2) return;
    setActiveTournament((current) => {
      return (current + direction + tournaments.length) % tournaments.length;
    });
  };

  if (loading) {
    return (
      <div className="nyx-page">
        <div className="nyx-container">
          <div className="nyx-skeleton-card">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="nyx-page">
      <style>{inlineStyles}</style>
      <div className="nyx-container">
        {/* Hero Section */}
        <section className="nyx-hero nyx-reveal">
          <div className="nyx-hero-content">
            <div className="nyx-eyebrow">
              <span className="nyx-live-dot" />
              REGISTRATION OPEN FOR SEASON 2026
            </div>

            <h1 className="nyx-hero-title">
              Elevate Your Badminton Game with{" "}
              <span className="nyx-brand-name">nyx</span>
            </h1>

            <p className="nyx-hero-description">
              Enroll in premier tournaments, track live match brackets in
              real-time, and climb the verified player leaderboard.
            </p>

            <div className="nyx-hero-actions">
              <button
                className="nyx-button nyx-button-dark"
                onClick={() =>
                  document
                    .getElementById("nyx-tournament")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Explore Tournaments <ArrowForward />
              </button>

              <button
                className="nyx-button nyx-button-light"
                onClick={() => navigate("/login")}
              >
                Register Player
              </button>
            </div>
          </div>

          <div className="nyx-hero-decoration">
            <div className="nyx-court-grid" />
            <div className="nyx-floating-ball">
              <SportsTennis />
            </div>
            <div className="nyx-decoration-ring" />
          </div>
        </section>

        {/* Featured Tournament Card */}
        {tournament ? (
          <section className="nyx-feature-card nyx-reveal" id="nyx-tournament">
            <div className="nyx-feature-top">
              <span className="nyx-label">FEATURED EVENT</span>

              <span className="nyx-prize">
                <EmojiEvents /> {tournament.prize}
              </span>
            </div>

            <div className="nyx-feature-image-wrap">
              <img
                className="nyx-feature-image"
                src={tournament.image}
                alt={tournament.title}
              />

              <div className="nyx-image-overlay" />

              <span className="nyx-image-category">{tournament.date}</span>

              {tournaments.length > 1 && (
                <>
                  <button
                    className="nyx-carousel-button nyx-carousel-left"
                    onClick={() => changeTournament(-1)}
                    aria-label="Previous tournament"
                  >
                    <KeyboardArrowLeft />
                  </button>

                  <button
                    className="nyx-carousel-button nyx-carousel-right"
                    onClick={() => changeTournament(1)}
                    aria-label="Next tournament"
                  >
                    <KeyboardArrowRight />
                  </button>
                </>
              )}
            </div>

            <div className="nyx-feature-info">
              <h2>{tournament.title}</h2>

              <p className="nyx-feature-description">
                {tournament.description}
              </p>

              <div className="nyx-feature-meta">
                <span>
                  <LocationOn /> {tournament.location}
                </span>

                <span>
                  <CalendarMonth /> {tournament.date}
                </span>
              </div>

              <div className="nyx-feature-actions">
                <button
                  className="nyx-button nyx-button-red nyx-enroll-btn"
                  onClick={() => navigate("/tournaments")}
                >
                  <Visibility /> View Details
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="nyx-feature-card nyx-reveal" id="nyx-tournament">
            <span className="nyx-label">FEATURED EVENT</span>
            <p
              role={tournamentLoadError ? "alert" : "status"}
              className="nyx-feature-description"
            >
              {tournamentLoadError
                ? `Unable to load published tournaments: ${tournamentLoadError}`
                : "There are no published tournaments to feature yet."}
            </p>
            <button
              className="nyx-button nyx-button-red"
              onClick={() => navigate("/tournaments")}
            >
              Browse Tournaments <ArrowForward />
            </button>
          </section>
        )}

        {/* Today's Matches Section */}
        <section className="nyx-section nyx-reveal" id="nyx-matches">
          <div className="nyx-section-heading">
            <div className="nyx-heading-left">
              <h2>
                <span className="nyx-heading-dot" />
                Today's Matches
              </h2>

              <span className="nyx-section-count">
                {liveCount} Events Active
              </span>
            </div>

            <button
              className="nyx-text-link"
              onClick={() => navigate("/matches")}
            >
              View All Matches
              <ArrowForward />
            </button>
          </div>

          <div className="nyx-match-grid">
            {initialMatches.map((match) => (
              <article
                className={`nyx-match-card ${match.live ? "nyx-match-live" : ""}`}
                key={match.id}
              >
                <div className="nyx-match-top">
                  <div className="nyx-match-type">
                    <span className="nyx-court-badge">{match.court}</span>
                    <span>{match.category}</span>
                  </div>

                  <span
                    className={`nyx-match-status ${
                      match.live ? "nyx-status-live" : ""
                    }`}
                  >
                    {match.live && <span className="nyx-live-dot" />}
                    {match.status}
                  </span>
                </div>

                <div className="nyx-match-player">
                  <span className="nyx-player-name">{match.player1}</span>
                  <strong className="nyx-player-score">{match.score1}</strong>
                </div>

                <div className="nyx-match-player">
                  <span className="nyx-player-name nyx-player-muted">
                    {match.player2}
                  </span>
                  <strong className="nyx-player-score">{match.score2}</strong>
                </div>

                <div className="nyx-match-footer">
                  <span>{match.live ? "Past Sets" : <AccessTime />}</span>
                  <strong>{match.previous || match.time}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Top Players Leaderboard Section */}
        <section className="nyx-section nyx-leaderboard-section nyx-reveal">
          <div className="nyx-section-heading">
            <div>
              <h2 className="nyx-leaderboard-title">
                <MilitaryTech /> Top Players Leaderboard
              </h2>

              <p className="nyx-section-subtitle">
                Official player rankings based on NYX points
              </p>
            </div>
            <button
              className="nyx-text-link"
              onClick={() => navigate("/leaderboard")}
            >
              Full Rankings
              <ArrowForward />
            </button>
          </div>

          <div className="nyx-player-list">
            {initialPlayers.map((player, index) => (
              <article
                className={`nyx-player-card ${index === 0 ? "nyx-player-card-first" : ""}`}
                key={player.id}
              >
                <div className="nyx-player-main">
                  <div
                    className={`nyx-rank ${index === 0 ? "nyx-rank-first" : ""}`}
                  >
                    {index + 1}
                  </div>

                  <img
                    className="nyx-player-avatar"
                    src={player.avatar}
                    alt={player.name}
                  />

                  <div className="nyx-player-info">
                    <div className="nyx-player-name-line">
                      <h3>{player.name}</h3>
                      <span className="nyx-seed-badge">Seed {player.seed}</span>
                    </div>

                    <p>{player.club}</p>
                  </div>
                </div>

                <div className="nyx-player-stats">
                  <span className="nyx-points-label">NYX Points</span>

                  <strong>
                    {player.points.toLocaleString()} <span>PTS</span>
                  </strong>

                  <div className="nyx-form-label">Form</div>

                  <div className="nyx-form-list">
                    {player.form.map((result, formIndex) => (
                      <span
                        className={`nyx-form-badge ${
                          result === "W" ? "nyx-form-win" : "nyx-form-loss"
                        }`}
                        key={`${player.id}-${formIndex}`}
                      >
                        {result}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const inlineStyles = `
@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap");

.nyx-page {
  --nyx-primary: #e63950;
  --nyx-primary-dark: #c9233b;
  --nyx-primary-light: #fff0f2;
  --nyx-navy: #14202e;
  --nyx-text: #19212d;
  --nyx-muted: #89919e;
  --nyx-border: #edf0f4;
  --nyx-surface: #ffffff;
  --nyx-background: #f5f7fa;
  --nyx-success: #16a875;
  --nyx-shadow: 0 12px 36px rgba(25, 33, 45, 0.055);
  min-height: 100vh;
  padding: 20px 14px 45px;
  overflow-x: hidden;
  background: var(--nyx-background);
  color: var(--nyx-text);
  font-family: "DM Sans", sans-serif;
  font-size: 14.5px;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}

.nyx-page *, .nyx-page *::before, .nyx-page *::after {
  box-sizing: border-box;
}

.nyx-page .nyx-container {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
}

.nyx-page .nyx-hero {
  position: relative;
  display: flex;
  min-height: 350px;
  margin-bottom: 24px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-left: 5px solid #a83b4d;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: var(--nyx-shadow);
  isolation: isolate;
}

.nyx-page .nyx-hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  width: 65%;
  padding: 28px 24px;
}

.nyx-page .nyx-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  margin-bottom: 14px;
  border: 1px solid #f8e1e5;
  border-radius: 30px;
  background: #fff0f2;
  color: #a72b40;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.8px;
}

.nyx-page .nyx-live-dot {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--nyx-primary);
}

.nyx-page .nyx-live-dot::after {
  position: absolute;
  inset: -4px;
  border: 1px solid rgba(230, 57, 80, 0.4);
  border-radius: 50%;
  content: "";
  animation: nyxPulse 1.7s ease-out infinite;
}

.nyx-page .nyx-hero-title {
  max-width: 660px;
  margin: 0;
  color: var(--nyx-text);
  font-family: "Outfit", sans-serif;
  font-size: clamp(26px, 4vw, 46px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -1.2px;
}

.nyx-page .nyx-brand-name {
  display: inline-block;
  color: var(--nyx-primary);
  font-size: clamp(34px, 5vw, 56px);
  animation: nyxBrandGlow 4s ease-in-out infinite;
}

.nyx-page .nyx-hero-description {
  max-width: 510px;
  margin: 14px 0 20px;
  color: #646d7b;
  font-size: 14px;
  line-height: 1.7;
}

.nyx-page .nyx-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.nyx-page .nyx-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
  text-decoration: none;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease, border-color 0.25s ease, color 0.25s ease;
}

.nyx-page .nyx-button:hover {
  transform: translateY(-2px);
}

.nyx-page .nyx-button svg {
  width: 17px;
  height: 17px;
}

.nyx-page .nyx-button-dark {
  border-color: var(--nyx-navy);
  background: var(--nyx-navy);
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(20, 32, 46, 0.13);
}

.nyx-page .nyx-button-dark:hover {
  background: #27384d;
}

.nyx-page .nyx-button-light {
  border-color: #eceef2;
  background: #f5f6f8;
  color: #394252;
}

.nyx-page .nyx-button-light:hover {
  border-color: #f0cbd1;
  background: #fff0f2;
  color: var(--nyx-primary-dark);
}

.nyx-page .nyx-button-red {
  border-color: var(--nyx-primary);
  background: var(--nyx-primary);
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(230, 57, 80, 0.17);
}

.nyx-page .nyx-button-red:hover {
  background: var(--nyx-primary-dark);
}

.nyx-page .nyx-hero-decoration {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 34%;
  overflow: hidden;
  border-left: 1px solid rgba(225, 229, 235, 0.6);
  background: radial-gradient(circle at 65% 30%, rgba(230, 57, 80, 0.08), transparent 40%), linear-gradient(135deg, #fff 0%, #fbf8f9 100%);
}

.nyx-page .nyx-court-grid {
  position: absolute;
  inset: 18% -15% -15% 0;
  background-image: linear-gradient(to right, transparent calc(50% - 1px), #e9eaf0 calc(50% - 1px), #e9eaf0 calc(50% + 1px), transparent calc(50% + 1px)), linear-gradient(to bottom, transparent calc(50% - 1px), #e9eaf0 calc(50% - 1px), #e9eaf0 calc(50% + 1px), transparent calc(50% + 1px));
  background-size: 100% 100%;
  opacity: 0.8;
}

.nyx-page .nyx-floating-ball {
  position: absolute;
  top: 25%;
  left: 33%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 76px;
  border: 1px solid rgba(230, 57, 80, 0.12);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--nyx-primary);
  box-shadow: 0 15px 40px rgba(230, 57, 80, 0.1);
  animation: nyxFloat 5s ease-in-out infinite;
}

.nyx-page .nyx-floating-ball svg {
  width: 38px;
  height: 38px;
  transform: rotate(-35deg);
}

.nyx-page .nyx-decoration-ring {
  position: absolute;
  right: -45px;
  bottom: -65px;
  width: 210px;
  height: 210px;
  border: 1px solid rgba(230, 57, 80, 0.17);
  border-radius: 50%;
  animation: nyxRotate 25s linear infinite;
}

.nyx-page .nyx-feature-card {
  padding: 16px;
  margin-bottom: 36px;
  overflow: hidden;
  border: 1px solid #ffffff;
  border-left: 5px solid #a83b4d;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: var(--nyx-shadow);
}

.nyx-page .nyx-feature-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.nyx-page .nyx-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #f1f3f6;
  color: #5d6572;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.9px;
}

.nyx-page .nyx-prize {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border: 1px solid #e6ecf6;
  border-radius: 7px;
  background: #f1f6ff;
  color: #2b4b7c;
  font-size: 10.5px;
  font-weight: 800;
  white-space: nowrap;
}

.nyx-page .nyx-prize svg {
  width: 15px;
  height: 15px;
}

.nyx-page .nyx-feature-image-wrap {
  position: relative;
  height: clamp(200px, 30vw, 340px);
  overflow: hidden;
  border-radius: 10px;
  background: #e8ebf0;
}

.nyx-page .nyx-feature-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 45%;
}

.nyx-page .nyx-image-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 17, 28, 0.3) 0%, transparent 40%, rgba(10, 17, 28, 0.12) 100%);
  pointer-events: none;
}

.nyx-page .nyx-image-category {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  background: rgba(168, 35, 54, 0.93);
  color: #ffffff;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.6px;
  backdrop-filter: blur(8px);
}

.nyx-page .nyx-carousel-button {
  position: absolute;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: var(--nyx-navy);
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.13);
  transform: translateY(-50%);
  transition: background 0.25s ease, color 0.25s ease, transform 0.25s ease;
}

.nyx-page .nyx-carousel-button:hover {
  background: var(--nyx-primary);
  color: #ffffff;
  transform: translateY(-50%) scale(1.08);
}

.nyx-page .nyx-carousel-button svg {
  width: 22px;
  height: 22px;
}

.nyx-page .nyx-carousel-left {
  left: 12px;
}

.nyx-page .nyx-carousel-right {
  right: 12px;
}

.nyx-page .nyx-feature-info {
  padding: 16px 12px 4px;
}

.nyx-page .nyx-feature-info h2 {
  margin: 0;
  color: var(--nyx-text);
  font-family: "Outfit", sans-serif;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.4px;
}

.nyx-page .nyx-feature-description {
  max-width: 780px;
  margin: 8px 0 12px;
  color: #636d7d;
  font-size: 13px;
  line-height: 1.7;
}

.nyx-page .nyx-feature-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-top: 8px;
}

.nyx-page .nyx-feature-meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #727a87;
  font-size: 11.5px;
  font-weight: 600;
}

.nyx-page .nyx-feature-meta svg {
  width: 15px;
  height: 15px;
  color: #d56b79;
}

.nyx-page .nyx-feature-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.nyx-page .nyx-feature-actions .nyx-button {
  flex: 1;
  font-size: 12px;
  padding: 0 12px;
  white-space: nowrap;
}

.nyx-page .nyx-section {
  margin-bottom: 40px;
}

.nyx-page .nyx-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.nyx-page .nyx-heading-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.nyx-page .nyx-section-heading h2,
.nyx-page .nyx-leaderboard-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--nyx-text);
  font-family: "Outfit", sans-serif;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.nyx-page .nyx-heading-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--nyx-primary);
  box-shadow: 0 0 0 4px rgba(230, 57, 80, 0.09);
}

.nyx-page .nyx-section-count {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 20px;
  background: #edf0f4;
  color: #586374;
  font-size: 10.5px;
  font-weight: 700;
}

.nyx-page .nyx-text-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: #a73c4e;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 800;
  white-space: nowrap;
  transition: color 0.25s ease, gap 0.25s ease;
}

.nyx-page .nyx-text-link:hover {
  gap: 8px;
  color: var(--nyx-primary);
}

.nyx-page .nyx-text-link svg {
  width: 16px;
  height: 16px;
}

.nyx-page .nyx-match-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.nyx-page .nyx-match-card {
  position: relative;
  min-width: 0;
  padding: 15px;
  overflow: hidden;
  border: 1px solid #ffffff;
  border-left: 4px solid transparent;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 5px 20px rgba(25, 33, 45, 0.025);
  transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
}

.nyx-page .nyx-match-card:hover {
  border-color: #f3dfe3;
  border-left-color: var(--nyx-primary);
  box-shadow: 0 10px 24px rgba(25, 33, 45, 0.07);
  transform: translateY(-3px);
}

.nyx-page .nyx-match-card.nyx-match-live {
  border-left-color: #a83b4d;
}

.nyx-page .nyx-match-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
}

.nyx-page .nyx-match-type {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  color: #767e8c;
  font-size: 10.5px;
  font-weight: 700;
}

.nyx-page .nyx-court-badge {
  padding: 5px 8px;
  border-radius: 6px;
  background: var(--nyx-navy);
  color: #ffffff;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.3px;
}

.nyx-page .nyx-match-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 6px;
  background: #f0f2f5;
  color: #6f7885;
  font-size: 9.5px;
  font-weight: 800;
  white-space: nowrap;
}

.nyx-page .nyx-match-status.nyx-status-live {
  background: #fff0f2;
  color: var(--nyx-primary-dark);
}

.nyx-page .nyx-match-status .nyx-live-dot {
  width: 5px;
  height: 5px;
}

.nyx-page .nyx-match-player {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 30px;
}

.nyx-page .nyx-player-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #262e3a;
  font-size: 13px;
  font-weight: 700;
}

.nyx-page .nyx-player-name.nyx-player-muted {
  color: #7b8390;
  font-weight: 500;
}

.nyx-page .nyx-player-score {
  flex-shrink: 0;
  color: var(--nyx-text);
  font-family: "Outfit", sans-serif;
  font-size: 15px;
  font-weight: 800;
}

.nyx-page .nyx-match-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f0f2f5;
}

.nyx-page .nyx-match-footer span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #6e7684;
  font-size: 10.5px;
}

.nyx-page .nyx-match-footer span svg {
  width: 13px;
  height: 13px;
}

.nyx-page .nyx-match-footer strong {
  color: #5a6372;
  font-size: 10.5px;
  font-weight: 700;
  text-align: right;
}

.nyx-page .nyx-leaderboard-title > svg {
  width: 24px;
  height: 24px;
  color: #c58a35;
}

.nyx-page .nyx-section-subtitle {
  margin: 5px 0 0;
  color: #7c8593;
  font-size: 11.5px;
}

.nyx-page .nyx-player-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nyx-page .nyx-player-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #ffffff;
  border-left: 4px solid transparent;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 5px 20px rgba(25, 33, 45, 0.025);
  transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
}

.nyx-page .nyx-player-card.nyx-player-card-first {
  border-left-color: var(--nyx-primary);
}

.nyx-page .nyx-player-card:hover {
  border-left-color: var(--nyx-primary);
  box-shadow: 0 10px 24px rgba(25, 33, 45, 0.07);
  transform: translateX(2px);
}

.nyx-page .nyx-player-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.nyx-page .nyx-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 1px solid #eceef2;
  border-radius: 50%;
  background: #f2f4f7;
  color: #4e5765;
  font-family: "Outfit", sans-serif;
  font-size: 14px;
  font-weight: 800;
}

.nyx-page .nyx-rank.nyx-rank-first {
  border-color: #f3e1c4;
  background: #fff4df;
  color: #b9852c;
  box-shadow: 0 0 0 4px rgba(185, 133, 44, 0.06);
}

.nyx-page .nyx-player-avatar {
  display: block;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: 2px solid #f2f3f6;
  border-radius: 50%;
  background: #e9edf2;
  object-fit: cover;
}

.nyx-page .nyx-player-info {
  min-width: 0;
  flex: 1;
}

.nyx-page .nyx-player-name-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.nyx-page .nyx-player-info h3 {
  margin: 0;
  color: var(--nyx-text);
  font-family: "Outfit", sans-serif;
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nyx-page .nyx-seed-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 6px;
  border-radius: 5px;
  background: #edf0f5;
  color: #3f4957;
  font-size: 9.5px;
  font-weight: 800;
  flex-shrink: 0;
}

.nyx-page .nyx-player-info p {
  margin: 3px 0 0;
  color: #7d8592;
  font-size: 11.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nyx-page .nyx-player-stats {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.nyx-page .nyx-points-label {
  color: #9299a3;
  font-size: 9.5px;
  font-weight: 600;
}

.nyx-page .nyx-player-stats > strong {
  color: var(--nyx-text);
  font-family: "Outfit", sans-serif;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.4px;
}

.nyx-page .nyx-player-stats > strong span {
  font-size: 11.5px;
  letter-spacing: 0;
}

.nyx-page .nyx-form-label {
  margin-top: 2px;
  color: #9198a2;
  font-size: 9.5px;
  font-weight: 600;
}

.nyx-page .nyx-form-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.nyx-page .nyx-form-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  font-size: 9.5px;
  font-weight: 800;
}

.nyx-page .nyx-form-badge.nyx-form-win {
  background: var(--nyx-navy);
  color: #ffffff;
}

.nyx-page .nyx-form-badge.nyx-form-loss {
  background: #e8ebf0;
  color: #6f7885;
}

@keyframes nyxFloat {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-14px) rotate(7deg); }
}

@keyframes nyxRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes nyxPulse {
  0% { opacity: 0.8; transform: scale(0.65); }
  100% { opacity: 0; transform: scale(1.8); }
}

@keyframes nyxBrandGlow {
  0%, 100% { text-shadow: 0 0 0 rgba(230, 57, 80, 0); }
  50% { text-shadow: 0 5px 20px rgba(230, 57, 80, 0.18); }
}

@media (max-width: 900px) {
  .nyx-page .nyx-hero {
    min-height: 320px;
  }
  .nyx-page .nyx-hero-content {
    width: 100%;
    padding: 24px 20px;
  }
  .nyx-page .nyx-hero-decoration {
    display: none;
  }
}

@media (max-width: 600px) {
  .nyx-page {
    padding: 12px 5px 30px;
  }
  .nyx-page .nyx-match-grid {
    grid-template-columns: 1fr;
  }
  .nyx-page .nyx-feature-actions {
    flex-direction: column;
  }
  .nyx-page .nyx-feature-actions .nyx-button {
    width: 100%;
  }
}
`;
