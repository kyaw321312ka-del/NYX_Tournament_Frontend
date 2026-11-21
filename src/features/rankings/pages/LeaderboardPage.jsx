import { useEffect, useMemo, useState, useRef } from "react";
import {
  EmojiEventsRounded,
  SearchRounded,
  KeyboardArrowDownRounded,
  FileDownloadRounded,
} from "@mui/icons-material";
import { getCategoryLeaderboard } from "../api/rankingApi";
import { getTournaments } from "../../tournaments/api/tournamentApi";

export default function WebLeaderboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [showTourneyDropdown, setShowTourneyDropdown] = useState(false);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const dropdownRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTournaments() {
      setLoadingTournaments(true);
      setLoadError("");
      try {
        const result = await getTournaments({
          page: 1,
          pageSize: 100,
          authenticated: false,
        });
        const availableTournaments = result.tournaments.filter(
          (tournament) =>
            Array.isArray(tournament.categories) &&
            tournament.categories.some((category) => category.id != null),
        );
        if (cancelled) return;
        setTournaments(availableTournaments);
        const nextTournament = availableTournaments[0];
        const firstCategory = nextTournament?.categories?.find(
          (category) => category.id != null,
        );
        setSelectedTournamentId(String(nextTournament?.id ?? ""));
        setSelectedCategoryId(String(firstCategory?.id ?? ""));
        if (!nextTournament) {
          setLeaderboardData(null);
          setLoadingLeaderboard(false);
        }
      } catch (requestError) {
        if (!cancelled) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load tournaments.",
          );
          setTournaments([]);
          setSelectedTournamentId("");
          setSelectedCategoryId("");
          setLeaderboardData(null);
          setLoadingLeaderboard(false);
        }
      } finally {
        if (!cancelled) setLoadingTournaments(false);
      }
    }

    loadTournaments();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!selectedCategoryId) return undefined;

    let cancelled = false;
    async function loadLeaderboard() {
      setLoadingLeaderboard(true);
      setLoadError("");
      try {
        const data = await getCategoryLeaderboard(selectedCategoryId, {
          authenticated: false,
        });
        if (!cancelled) setLeaderboardData(data);
      } catch (requestError) {
        if (!cancelled) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load the leaderboard.",
          );
          setLeaderboardData(null);
        }
      } finally {
        if (!cancelled) setLoadingLeaderboard(false);
      }
    }

    loadLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, reloadKey]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowTourneyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTournament = tournaments.find(
    (tournament) => String(tournament.id) === String(selectedTournamentId),
  );
  const tournamentCategories = Array.isArray(selectedTournament?.categories)
    ? selectedTournament.categories.filter((category) => category.id != null)
    : [];
  const selectedCategory = tournamentCategories.find(
    (category) => String(category.id) === String(selectedCategoryId),
  );
  const entries = useMemo(
    () =>
      String(leaderboardData?.tournamentCategoryId) ===
      String(selectedCategoryId)
        ? leaderboardData.entries
        : [],
    [leaderboardData, selectedCategoryId],
  );

  const filteredPlayers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...entries]
      .filter((entry) => {
        if (!query) return true;
        return (
          entry.player.name.toLowerCase().includes(query) ||
          String(entry.registrationId).includes(query) ||
          entry.label.toLowerCase().includes(query)
        );
      })
      .sort(
        (first, second) =>
          Number(first.position) - Number(second.position) ||
          Number(second.points) - Number(first.points),
      );
  }, [entries, searchQuery]);

  const topThree = filteredPlayers.slice(0, 3);
  const remainingPlayers = filteredPlayers;

  function handleSelectTournament(tournament) {
    const firstCategory = tournament.categories?.find(
      (category) => category.id != null,
    );
    setSelectedTournamentId(String(tournament.id));
    setSelectedCategoryId(String(firstCategory?.id ?? ""));
    setLeaderboardData(null);
    setSearchQuery("");
    setShowTourneyDropdown(false);
  }

  function handleExportCsv() {
    const rows = [
      ["Position", "Registration ID", "Player", "Award", "Points"],
      ...filteredPlayers.map((entry) => [
        entry.position,
        entry.registrationId,
        entry.player.name,
        entry.label,
        entry.points,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\r\n");
    const downloadUrl = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `leaderboard-category-${selectedCategoryId}.csv`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap");

        .leaderboard-page {
          min-height: 100vh;
          padding: 32px 24px 64px;
          background: #f7f8fa;
          color: #172033;
          font-family: "DM Sans", "Manrope", sans-serif;
          font-size: 15px;
        }

        .leaderboard-container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
        }

        .leaderboard-top-controls {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          margin-bottom: 24px;
          align-items: center;
        }

        .search-box-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          color: #727987;
          font-size: 20px !important;
        }

        .search-input {
          width: 100%;
          min-height: 48px;
          padding: 0 16px 0 48px;
          border: 1px solid #eef0f3;
          border-radius: 12px;
          background: #fff;
          color: #172033;
          font: inherit;
          font-size: 15px;
          box-shadow: 0 3px 12px rgba(20, 30, 50, 0.03);
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #ae1236;
        }

        .tourney-filter-wrap {
          position: relative;
        }

        .tourney-dropdown-btn {
          min-width: 250px;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          border: 1px solid #eef0f3;
          border-radius: 12px;
          background: #fff;
          color: #ae1236;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          box-shadow: 0 3px 12px rgba(20, 30, 50, 0.03);
        }

        .tourney-dropdown-btn span {
          color: #172033;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tourney-menu-list {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: 280px;
          padding: 8px;
          border: 1px solid #eef0f3;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 15px 40px rgba(20, 30, 50, 0.15);
          z-index: 50;
        }

        .tourney-option-item {
          width: 100%;
          padding: 12px 14px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          text-align: left;
          color: #354052;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .tourney-option-item:hover, .tourney-option-active {
          background: #fde9ee;
          color: #ae1236;
        }

        .category-tabs-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .cat-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 44px;
          padding: 0 18px;
          border: 1px solid #eef0f3;
          border-radius: 12px;
          background: #fff;
          color: #596170;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 3px 10px rgba(20, 30, 50, 0.03);
          transition: all 0.2s;
        }

        .cat-tab-btn:hover {
          border-color: #ae1236;
          color: #ae1236;
        }

        .cat-tab-active {
          border-color: #ae1236;
          background: #ae1236;
          color: #fff;
          box-shadow: 0 4px 14px rgba(174, 18, 54, 0.25);
        }

        .season-header-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .season-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 800;
          color: #172033;
        }

        .season-title-wrap svg {
          color: #ae1236;
          font-size: 22px !important;
        }

        .season-sub {
          font-size: 13px;
          color: #727987;
          font-weight: 600;
        }

        /* Podium Cards with Hierarchy Height & Comfortable Padding */
        .podium-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 32px;
          align-items: flex-end;
        }

        .podium-card {
          position: relative;
          padding: 24px 20px;
          border: 1px solid #eef0f3;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 6px 20px rgba(20, 30, 50, 0.04);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .podium-card-first {
          background: linear-gradient(180deg, #fffcf5 0%, #fff 100%);
          border-color: #faebd7;
          padding-bottom: 34px;
          box-shadow: 0 12px 30px rgba(218, 165, 32, 0.12);
          transform: translateY(-8px);
        }

        .rank-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 14px;
        }

        .badge-first { background: #fff4d9; color: #957027; }
        .badge-second, .badge-third { background: #f1f3f6; color: #596170; }

        .avatar-img {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          margin-bottom: 14px;
          border: 2px solid #eef0f3;
          background: #f1f3f6;
          color: #596170;
          font-size: 18px;
          font-weight: 800;
        }

        .avatar-img-first {
          width: 76px;
          height: 76px;
          border: 3px solid #b8860b;
        }

        .player-podium-name {
          font-size: 18px;
          font-weight: 800;
          color: #172033;
          margin-bottom: 4px;
        }

        .player-podium-org {
          font-size: 13px;
          color: #727987;
          font-weight: 700;
          margin-bottom: 14px;
        }

        .podium-stats-box {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          background: #f8f9fb;
          font-size: 12px;
          color: #596170;
          font-weight: 700;
          margin-bottom: 14px;
          line-height: 1.5;
        }

        .podium-stats-box b {
          color: #172033;
        }

        .podium-pts {
          font-size: 24px;
          font-weight: 900;
          color: #ae1236;
        }

        .podium-pts-label {
          font-size: 11px;
          font-weight: 800;
          color: #727987;
          letter-spacing: 0.5px;
        }

        /* Rankings Table */
        .rankings-card-box {
          border: 1px solid #eef0f3;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 4px 16px rgba(20, 30, 50, 0.04);
          overflow: hidden;
        }

        .rankings-table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid #eef0f3;
          background: #f8f9fb;
        }

        .rankings-table-title {
          font-size: 20px;
          font-weight: 800;
          color: #172033;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .export-csv-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border: 1px solid #dfe3e9;
          border-radius: 8px;
          background: #fff;
          color: #354052;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .rank-row-item {
          display: grid;
          grid-template-columns: 70px 1.8fr 1.2fr 100px;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid #f1f3f6;
          transition: background 0.2s;
        }

        .rank-row-item:last-child {
          border-bottom: 0;
        }

        .rank-row-item:hover {
          background: #fcfcfd;
        }

        .col-rank {
          font-weight: 800;
          color: #354052;
          display: flex;
          align-items: center;
        }

        .col-player {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .table-avatar-img {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 1px solid #eef0f3;
          background: #f1f3f6;
          color: #596170;
          font-size: 13px;
          font-weight: 800;
        }

        .row-player-details {
          display: flex;
          flex-direction: column;
        }

        .row-player-name {
          font-size: 15px;
          font-weight: 800;
          color: #172033;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .row-player-org {
          font-size: 13px;
          color: #727987;
          font-weight: 600;
        }

        .col-record {
          font-size: 14px;
          color: #596170;
          font-weight: 700;
        }

        .col-pts {
          text-align: right;
          font-size: 16px;
          font-weight: 900;
          color: #172033;
        }

        .col-pts-sub {
          font-size: 10px;
          color: #727987;
          font-weight: 700;
        }

        .empty-ranking {
          padding: 40px;
          text-align: center;
          color: #727987;
          font-weight: 700;
          font-size: 14px;
        }

        @media (max-width: 900px) {
          .podium-grid { grid-template-columns: 1fr; align-items: stretch; }
          .podium-card-first { transform: none; }
          .leaderboard-top-controls { grid-template-columns: 1fr; }
          .rank-row-item { grid-template-columns: 50px 1.5fr 80px; }
          .col-record { display: none; }
          .leaderboard-page { padding: 16px 5px; }
        }
      `}</style>

      <main className="leaderboard-page">
        <div className="leaderboard-container">
          {/* Top Controls: Search Bar & Tournament Dropdown Filter */}
          <div className="leaderboard-top-controls">
            <div className="search-box-wrap">
              <SearchRounded className="search-icon" />
              <input
                className="search-input"
                type="text"
                placeholder="Search player, registration ID, or award..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="tourney-filter-wrap" ref={dropdownRef}>
              <button
                className="tourney-dropdown-btn"
                type="button"
                disabled={loadingTournaments || tournaments.length === 0}
                aria-expanded={showTourneyDropdown}
                onClick={() => setShowTourneyDropdown((v) => !v)}
              >
                <span>
                  <EmojiEventsRounded
                    style={{ fontSize: 18, color: "#ae1236" }}
                  />
                  {selectedTournament?.title || "Select tournament"}
                </span>
                <KeyboardArrowDownRounded />
              </button>

              {showTourneyDropdown && (
                <div className="tourney-menu-list">
                  {tournaments.map((tournament) => (
                    <button
                      key={tournament.id}
                      type="button"
                      className={`tourney-option-item ${String(selectedTournament?.id) === String(tournament.id) ? "tourney-option-active" : ""}`}
                      onClick={() => handleSelectTournament(tournament)}
                    >
                      {tournament.title || `Tournament #${tournament.id}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <nav
            className="category-tabs-row"
            aria-label="Leaderboard categories"
          >
            {tournamentCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`cat-tab-btn ${String(selectedCategoryId) === String(category.id) ? "cat-tab-active" : ""}`}
                onClick={() => {
                  setSelectedCategoryId(String(category.id));
                  setLeaderboardData(null);
                }}
              >
                {category.categoryName || category.name || category.categoryCode}
              </button>
            ))}
          </nav>

          {/* Season Header */}
          <div className="season-header-box">
            <div className="season-title-wrap">
              <EmojiEventsRounded />
              {selectedTournament?.title || "Tournament"} ·{" "}
              {selectedCategory?.categoryName ||
                selectedCategory?.name ||
                "Leaderboard"}
            </div>
            <span className="season-sub">
              {leaderboardData?.finalizedAt
                ? `Finalized ${new Date(leaderboardData.finalizedAt).toLocaleDateString()} · Draw v${leaderboardData.drawVersion}`
                : "Finalized category standings"}
            </span>
          </div>

          {loadError && (
            <div className="empty-ranking" role="alert">
              {loadError}
              <button
                type="button"
                className="tourney-option-item"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                Retry
              </button>
            </div>
          )}
          {(loadingTournaments || loadingLeaderboard) && (
            <div className="empty-ranking" role="status">
              {loadingTournaments
                ? "Loading tournaments…"
                : "Loading category leaderboard…"}
            </div>
          )}
          {!loadingTournaments &&
            !loadingLeaderboard &&
            !loadError &&
            tournaments.length === 0 && (
              <div className="empty-ranking">
                No published tournament categories are available.
              </div>
            )}

          {topThree.length > 0 && !loadingLeaderboard && (
            <div className="podium-grid">
              {[topThree[1], topThree[0], topThree[2]]
                .filter(Boolean)
                .map((entry) => {
                  const rank = Number(entry.position);
                  const medal =
                    rank === 1 ? "👑" : rank === 2 ? "🥈" : "🥉";
                  const initials = entry.player.name
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div
                      key={entry.registrationId}
                      className={`podium-card ${rank === 1 ? "podium-card-first" : ""}`}
                    >
                      <span
                        className={`rank-badge-pill ${rank === 1 ? "badge-first" : rank === 2 ? "badge-second" : "badge-third"}`}
                      >
                        {medal} #{rank} {entry.label}
                      </span>
                      <div
                        className={`avatar-img ${rank === 1 ? "avatar-img-first" : ""}`}
                        role="img"
                        aria-label={entry.player.name}
                      >
                        {initials}
                      </div>
                      <div className="player-podium-name">
                        {entry.player.name}
                      </div>
                      <div className="player-podium-org">
                        Registration #{entry.registrationId}
                      </div>
                      <div className="podium-stats-box">
                        Award: <b>{entry.label}</b>
                      </div>
                      <div className="podium-pts">
                        {Number(entry.points).toLocaleString()}
                      </div>
                      <div className="podium-pts-label">RANKING PTS</div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Rankings Table with Actual Ranks & Profile Avatars */}
          <div className="rankings-card-box">
            <div className="rankings-table-header">
              <div className="rankings-table-title">
                {selectedCategory?.categoryName ||
                  selectedCategory?.name ||
                  "Category"}{" "}
                Standings
              </div>
              <button
                className="export-csv-btn"
                type="button"
                disabled={remainingPlayers.length === 0}
                onClick={handleExportCsv}
              >
                <FileDownloadRounded style={{ fontSize: 16 }} />
                Export CSV
              </button>
            </div>

            <div>
              {remainingPlayers.length > 0 ? (
                remainingPlayers.map((player) => (
                  <div
                    className="rank-row-item"
                    key={player.registrationId}
                  >
                    <div className="col-rank">
                      <span
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          background: "#f1f3f6",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "12px",
                          fontWeight: "800",
                        }}
                      >
                          {player.position}
                      </span>
                    </div>

                    <div className="col-player">
                        <div
                          className="table-avatar-img"
                          role="img"
                          aria-label={player.player.name}
                        >
                          {player.player.name
                            .split(/\s+/)
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      <div className="row-player-details">
                          <div className="row-player-name">
                            {player.player.name}
                          </div>
                          <div className="row-player-org">
                            Registration #{player.registrationId}
                          </div>
                      </div>
                    </div>

                    <div className="col-record">
                        {player.label}
                    </div>

                    <div className="col-pts">
                        {Number(player.points).toLocaleString()}
                      <div className="col-pts-sub">PTS</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-ranking">
                  {loadError
                    ? "The leaderboard could not be loaded."
                    : loadingTournaments || loadingLeaderboard
                        ? "Loading leaderboard…"
                        : !selectedCategoryId
                          ? "Select a tournament category to see its leaderboard."
                          : entries.length === 0
                            ? "No finalized entries are available for this category yet."
                            : "No players match your search."}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
