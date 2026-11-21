import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import { getCategoryLeaderboard } from "../api/rankingApi";
import { getTournaments } from "../../tournaments/api/tournamentApi";

export default function RankingPage() {
  const outletContext = useOutletContext() || {};
  const { isDark: parentIsDark } = outletContext;
  const isDark = parentIsDark ?? false;

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoadingCategories(true);
      setLoadError("");
      try {
        const result = await getTournaments({
          page: 1,
          pageSize: 100,
          authenticated: true,
        });
        const options = result.tournaments.flatMap((tournament) =>
          (Array.isArray(tournament.categories) ? tournament.categories : [])
            .filter((category) => category.id != null)
            .map((category) => ({
              id: String(category.id),
              label: `${tournament.title || "Tournament"} — ${
                category.categoryName ||
                category.name ||
                category.categoryCode ||
                `Category ${category.id}`
              }`,
            })),
        );
        if (cancelled) return;
        setCategoryOptions(options);
        if (options.length === 0) {
          setLeaderboardData(null);
          setLoadingLeaderboard(false);
        }
        setSelectedCategoryId((current) =>
          options.some((option) => option.id === current)
            ? current
            : options[0]?.id || "",
        );
      } catch (requestError) {
        if (!cancelled) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load tournament categories.",
          );
          setCategoryOptions([]);
          setSelectedCategoryId("");
          setLeaderboardData(null);
          setLoadingLeaderboard(false);
        }
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!selectedCategoryId) {
      return undefined;
    }

    let cancelled = false;
    async function loadLeaderboard() {
      setLoadingLeaderboard(true);
      setLoadError("");
      try {
        const data = await getCategoryLeaderboard(selectedCategoryId);
        if (!cancelled) setLeaderboardData(data);
      } catch (requestError) {
        if (!cancelled) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load the category leaderboard.",
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

  const entries = useMemo(
    () => leaderboardData?.entries || [],
    [leaderboardData],
  );
  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => {
      const name = entry.player.name.toLowerCase();
      return (
        name.includes(query) ||
        String(entry.registrationId).includes(query) ||
        String(entry.player.id).includes(query) ||
        entry.label.toLowerCase().includes(query)
      );
    });
  }, [entries, searchTerm]);

  const totalEntries = filteredEntries.length;
  const totalPages = Math.ceil(totalEntries / ITEMS_PER_PAGE) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const paginatedEntries = useMemo(() => {
    const start = (activePage - 1) * ITEMS_PER_PAGE;
    return filteredEntries.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEntries, activePage]);

  const top10Leaderboard = useMemo(() => {
    return [...entries]
      .sort((first, second) => Number(first.position) - Number(second.position))
      .slice(0, 10);
  }, [entries]);

  const selectedCategory = categoryOptions.find(
    (option) => option.id === selectedCategoryId,
  );

  const styles = {
    container: {
      padding: "28px",
      backgroundColor: isDark ? "#121315" : "#f8fafc",
      color: isDark ? "#e1e1e1" : "#333",
      minHeight: "calc(100vh - 75px)",
      fontFamily: "sans-serif",
      boxSizing: "border-box",
      position: "relative",
    },
    topbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      backgroundColor: isDark ? "#1a1c1e" : "#ffffff",
      padding: "16px 24px",
      borderRadius: "10px",
      border: `1px solid ${isDark ? "#2d3139" : "#e2e8f0"}`,
      flexWrap: "wrap",
      gap: "16px",
    },
    topbarRight: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      flexWrap: "wrap",
    },
    header: {
      display: "flex",
      flexDirection: "column",
    },
    selectContainer: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "15px",
      fontWeight: "bold",
      color: isDark ? "#cbd5e1" : "#334155",
    },
    select: {
      padding: "9px 14px",
      borderRadius: "8px",
      border: `1px solid ${isDark ? "#2d3139" : "#cbd5e1"}`,
      backgroundColor: isDark ? "#1a1c1e" : "#ffffff",
      fontSize: "13px",
      fontWeight: "600",
      color: isDark ? "#ffffff" : "#0f172a",
      outline: "none",
      cursor: "pointer",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 360px",
      gap: "20px",
    },
    card: {
      backgroundColor: isDark ? "#1a1c1e" : "#ffffff",
      borderRadius: "12px",
      border: `1px solid ${isDark ? "#2d3139" : "#e2e8f0"}`,
      padding: "20px",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
    },
    searchSection: {
      width: "100%",
      maxWidth: "400px",
    },
    searchInput: {
      width: "100%",
      padding: "11px 16px 11px 40px",
      border: `1px solid ${isDark ? "#2d3139" : "#cbd5e1"}`,
      borderRadius: "8px",
      fontSize: "13px",
      outline: "none",
      backgroundColor: isDark ? "#24272b" : "#ffffff",
      color: isDark ? "#ffffff" : "#333",
      boxSizing: "border-box",
    },
    searchBoxWrapper: {
      position: "relative",
      width: "100%",
    },
    searchIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#94a3b8",
      fontSize: "18px",
    },
    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      flexWrap: "wrap",
      gap: "12px",
    },
    cardHeaderTitle: {
      fontSize: "18px",
      fontWeight: "bold",
      color: isDark ? "#ffffff" : "#0f172a",
      margin: 0,
    },
    btn: {
      padding: "9px 16px",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: "bold",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    tableWrapper: {
      overflowX: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      fontSize: "12px",
      fontWeight: "bold",
      color: "#64748b",
      padding: "16px 14px",
      borderBottom: `1px solid ${isDark ? "#2d3139" : "#e2e8f0"}`,
      textAlign: "left",
      textTransform: "uppercase",
    },
    td: {
      padding: "16px 14px",
      fontSize: "14px",
      borderBottom: `1px solid ${isDark ? "#24272b" : "#f8fafc"}`,
      verticalAlign: "middle",
      color: isDark ? "#cbd5e1" : "#334155",
    },
    idCell: {
      color: isDark ? "#94a3b8" : "#64748b",
      fontWeight: "bold",
    },
    nameCell: {
      fontWeight: "bold",
      color: isDark ? "#ffffff" : "#0f172a",
    },
    pointsCell: {
      fontWeight: "bold",
      color: isDark ? "#cbd5e1" : "#334155",
    },
    totalCell: {
      textAlign: "right",
      fontWeight: "bold",
      color: isDark ? "#ffffff" : "#0f172a",
    },
    footer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "16px",
      flexWrap: "wrap",
      gap: "10px",
    },
    entriesInfo: {
      fontSize: "12px",
      color: "#64748b",
    },
    pagination: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    pageNav: {
      background: "none",
      border: `1px solid ${isDark ? "#2d3139" : "#cbd5e1"}`,
      padding: "6px 12px",
      borderRadius: "6px",
      fontSize: "12px",
      color: isDark ? "#cbd5e1" : "#64748b",
      cursor: "pointer",
    },
    pageNum: {
      width: "32px",
      height: "32px",
      borderRadius: "6px",
      border: `1px solid ${isDark ? "#2d3139" : "#cbd5e1"}`,
      background: isDark ? "#1a1c1e" : "#ffffff",
      fontSize: "12px",
      color: isDark ? "#cbd5e1" : "#64748b",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
    },
    pageNumActive: {
      backgroundColor: "#0f172a",
      color: "#ffffff",
      borderColor: "#0f172a",
    },
    lbHeader: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      paddingBottom: "14px",
      borderBottom: `1px solid ${isDark ? "#2d3139" : "#e2e8f0"}`,
      marginBottom: "16px",
    },
    lbHeaderTitle: {
      fontSize: "14px",
      fontWeight: "bold",
      color: isDark ? "#ffffff" : "#0f172a",
      margin: 0,
    },
    lbList: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    },
    lbItem: {
      display: "flex",
      alignItems: "center",
      padding: "10px 14px",
      borderRadius: "10px",
      backgroundColor: isDark ? "#24272b" : "#f8fafc",
      border: `1px solid ${isDark ? "#2d3139" : "#e2e8f0"}`,
    },
    lbItemRank1: {
      backgroundColor: isDark ? "#2e2a14" : "#fefce8",
      border: `1px solid ${isDark ? "#854d0e" : "#fef08a"}`,
    },
    rankBadge: {
      width: "32px",
      display: "flex",
      justifyContent: "center",
    },
    rankNum: {
      fontSize: "13px",
      fontWeight: "bold",
      color: "#64748b",
    },
    playerInfo: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      marginLeft: "8px",
    },
    lbName: {
      fontSize: "13px",
      fontWeight: "bold",
      color: isDark ? "#ffffff" : "#0f172a",
    },
    lbId: {
      fontSize: "11px",
      color: "#94a3b8",
    },
    lbPoints: {
      fontSize: "13px",
      fontWeight: "bold",
      color: "#d97706",
    },
    noDataText: {
      textAlign: "center",
      color: "#94a3b8",
      fontSize: "13px",
      padding: "20px 0",
      fontStyle: "italic",
    },
  };

  return (
    <div style={styles.container}>
      {/* TOPBAR */}
      <div style={styles.topbar}>
        <div style={styles.searchSection}>
          <div style={styles.searchBoxWrapper}>
            <SearchIcon style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search players or registration IDs..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={styles.searchInput}
            />
          </div>
        </div>

        <div style={styles.topbarRight}>
          <div style={styles.selectContainer}>
            Tournament category:
            <select
              style={styles.select}
              value={selectedCategoryId}
              disabled={loadingCategories || categoryOptions.length === 0}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setCurrentPage(1);
                setLeaderboardData(null);
              }}
            >
              <option value="">
                {loadingCategories ? "Loading categories…" : "Select category"}
              </option>
              {categoryOptions.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  style={{ backgroundColor: isDark ? "#1a1c1e" : "#fff" }}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            style={{
              ...styles.btn,
              backgroundColor: isDark ? "#24272b" : "#1e293b",
              color: "#ffffff",
            }}
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={loadingCategories || loadingLeaderboard}
            title="Refresh tournament categories and leaderboard"
          >
            <RefreshIcon style={{ fontSize: "16px" }} />
            Refresh
          </button>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          style={{ ...styles.card, color: "#b91c1c", marginBottom: "20px" }}
        >
          {loadError}
        </div>
      )}
      {(loadingCategories || loadingLeaderboard) && (
        <div role="status" style={{ marginBottom: "20px", color: "#64748b" }}>
          {loadingCategories
            ? "Loading tournament categories…"
            : "Loading category leaderboard…"}
        </div>
      )}

      {/* MAIN GRID */}
      <div style={styles.grid}>
        {/* LEFT BOX */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardHeaderTitle}>Finalized Category Awards</h3>
              {selectedCategory && (
                <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "12px" }}>
                  {selectedCategory.label}
                </p>
              )}
            </div>
          </div>

          {/* TABLE */}
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Position</th>
                  <th style={styles.th}>Registration ID</th>
                  <th style={styles.th}>Player Name</th>
                  <th style={styles.th}>Award</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.map((entry) => (
                  <tr key={entry.registrationId}>
                    <td style={{ ...styles.td, ...styles.pointsCell }}>
                      #{entry.position}
                    </td>
                    <td style={{ ...styles.td, ...styles.idCell }}>
                      {entry.registrationId}
                    </td>
                    <td style={{ ...styles.td, ...styles.nameCell }}>
                      {entry.player.name}
                    </td>
                    <td style={styles.td}>{entry.label}</td>
                    <td style={{ ...styles.td, ...styles.totalCell }}>
                      {Number(entry.points).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!loadingCategories &&
                  !loadingLeaderboard &&
                  !loadError &&
                  paginatedEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} style={styles.noDataText}>
                        {categoryOptions.length === 0
                          ? "No tournament categories are available."
                          : entries.length === 0
                            ? "No finalized leaderboard entries for this category yet."
                            : "No entries match your search."}
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>

          {/* FOOTER & PAGINATION */}
          <div style={styles.footer}>
            <span style={styles.entriesInfo}>
              Showing{" "}
              {totalEntries === 0 ? 0 : (activePage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(activePage * ITEMS_PER_PAGE, totalEntries)} of{" "}
              {totalEntries} leaderboard entries
            </span>

            <div style={styles.pagination}>
              <button
                style={{
                  ...styles.pageNav,
                  opacity: activePage === 1 ? 0.4 : 1,
                  cursor: activePage === 1 ? "not-allowed" : "pointer",
                }}
                disabled={activePage === 1}
                onClick={() => setCurrentPage(activePage - 1)}
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    style={{
                      ...styles.pageNum,
                      ...(activePage === page ? styles.pageNumActive : {}),
                    }}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                style={{
                  ...styles.pageNav,
                  opacity:
                    activePage === totalPages || totalPages === 0 ? 0.4 : 1,
                  cursor:
                    activePage === totalPages || totalPages === 0
                      ? "not-allowed"
                      : "pointer",
                }}
                disabled={activePage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(activePage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT BOX: Leaderboard */}
        <div style={styles.card}>
          <div style={styles.lbHeader}>
            <EmojiEventsOutlinedIcon
              style={{ color: "#eab308", fontSize: "22px" }}
            />
            <h3 style={styles.lbHeaderTitle}>
              Category Top 10 Leaderboard
            </h3>
          </div>

          <div style={styles.lbList}>
            {top10Leaderboard.length > 0 ? (
              top10Leaderboard.map((item, index) => {
                const rank = Number(item.position) || index + 1;
                const isTop3 = rank <= 3;
                return (
                  <div
                    key={item.registrationId}
                    style={{
                      ...styles.lbItem,
                      ...(rank === 1 ? styles.lbItemRank1 : {}),
                    }}
                  >
                    <div style={styles.rankBadge}>
                      {isTop3 ? (
                        <span style={{ fontSize: "16px" }}>
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                        </span>
                      ) : (
                        <span style={styles.rankNum}>{rank}</span>
                      )}
                    </div>

                    <div style={styles.playerInfo}>
                      <span style={styles.lbName}>{item.player.name}</span>
                      <span style={styles.lbId}>
                        Registration #{item.registrationId}
                      </span>
                    </div>

                    <div style={styles.lbPoints}>
                      {Number(item.points).toLocaleString()} Pts
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={styles.noDataText}>No players on the leaderboard</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
