import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { getAdminPlayers } from "../api/playerApi";

const PAGE_SIZE = 20;

function mapAdminPlayer(player) {
  const points = Number(player.points);
  const playerId = player.playerId || `#NYX-${player.id}`;

  return {
    id: playerId,
    playerId,
    userId: player.id,
    name: player.athleteName,
    team: player.teamClub || "—",
    email: player.contactEmail,
    phone: player.phoneNumber || "—",
    stats: `${(Number.isFinite(points) ? points : 0).toLocaleString()} PTS`,
    status: player.status || "Unknown",
  };
}

export default function PlayersPage() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Players");
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [players, setPlayers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    pageCount: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPlayers() {
      setIsLoading(true);
      setLoadError("");
      try {
        const result = await getAdminPlayers({
          page: currentPage,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;

        setPlayers(result.players.map(mapAdminPlayer));
        setPagination({
          ...result.pagination,
          pageCount: Number.isInteger(Number(result.pagination.pageCount))
            ? Math.max(Number(result.pagination.pageCount), 1)
            : 1,
        });
      } catch (error) {
        if (!cancelled) {
          setPlayers([]);
          setPagination((current) => ({ ...current, total: 0 }));
          setLoadError(
            error instanceof Error ? error.message : "Unable to load players.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPlayers();
    return () => {
      cancelled = true;
    };
  }, [currentPage, reloadKey]);

  const filteredPlayers = players.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.playerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "All Players" ||
      p.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalPages = pagination.pageCount;

  const handleExportCSV = () => {
    const csvValue = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const headers =
      "Player ID,Athlete Name,Team/Club,Contact Email,Phone Number,Stats & Points,Status\n";
    const rows = filteredPlayers.map((player) =>
      [
        player.playerId,
        player.name,
        player.team,
        player.email,
        player.phone,
        player.stats,
        player.status,
      ]
        .map(csvValue)
        .join(","),
    );
    const csvContent =
      "data:text/csv;charset=utf-8," +
      encodeURIComponent([headers.trimEnd(), ...rows].join("\n"));
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "registered_players.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        padding: "28px",
        backgroundColor: "#f8fafc",
        minHeight: "calc(100vh - 75px)",
        boxSizing: "border-box",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          backgroundColor: "#ffffff",
          padding: "16px 20px",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1",
            minWidth: "280px",
            maxWidth: "400px",
          }}
        >
          <SearchIcon
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
              fontSize: "18px",
            }}
          />
          <input
            type="text"
            placeholder="Search player name, ID, or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: "100%",
              padding: "10px 12px 10px 38px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "12px",
              outline: "none",
              boxSizing: "border-box",
              backgroundColor: "#fff",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              fontWeight: "bold",
              color: "#334155",
            }}
          >
            Status:
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#fff",
                fontSize: "12px",
                fontWeight: "600",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="All Players">All Players</option>
              <option value="Pending">Pending</option>
              <option value="Active">Active</option>
              <option value="Warning">Warning</option>
              <option value="Banned">Banned</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#0f172a",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            <FileDownloadOutlinedIcon style={{ fontSize: "16px" }} /> Export
          </button>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                color: "#64748b",
                fontSize: "11px",
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              <th style={{ padding: "14px 20px" }}>Player ID</th>
              <th style={{ padding: "14px 20px" }}>Athlete Name</th>
              <th style={{ padding: "14px 20px" }}>Team / Club</th>
              <th style={{ padding: "14px 20px" }}>Contact Email</th>
              <th style={{ padding: "14px 20px" }}>Phone Number</th>
              <th style={{ padding: "14px 20px" }}>Stats & Points</th>
              <th style={{ padding: "14px 20px" }}>Status</th>
              <th style={{ padding: "14px 20px", textAlign: "center" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan="8"
                  role="status"
                  style={{ padding: "24px", textAlign: "center" }}
                >
                  Loading players...
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td
                  colSpan="8"
                  role="alert"
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#b91c1c",
                  }}
                >
                  Unable to load players: {loadError}{" "}
                  <button
                    type="button"
                    onClick={() => setReloadKey((key) => key + 1)}
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : filteredPlayers.length === 0 ? (
              <tr>
                <td
                  colSpan="8"
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  No players match your search or status filter.
                </td>
              </tr>
            ) : (
              filteredPlayers.map((player) => {
                const normalizedStatus = player.status.toLowerCase();
                const statusColors =
                  normalizedStatus === "active" ||
                  normalizedStatus === "approved"
                    ? { background: "#f0fdf4", color: "#16a34a" }
                    : normalizedStatus === "banned" ||
                        normalizedStatus === "rejected"
                      ? { background: "#fef2f2", color: "#dc2626" }
                      : normalizedStatus === "pending" ||
                          normalizedStatus === "warning"
                        ? { background: "#fefce8", color: "#ca8a04" }
                        : { background: "#f1f5f9", color: "#475569" };

                return (
                  <tr
                    key={player.playerId}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      color: "#334155",
                    }}
                  >
                    <td
                      style={{
                        padding: "14px 20px",
                        fontWeight: "bold",
                        color: "#0f172a",
                      }}
                    >
                      {player.playerId}
                    </td>
                    <td
                      style={{
                        padding: "14px 20px",
                        fontWeight: "600",
                        color: "#0f172a",
                      }}
                    >
                      {player.name}
                    </td>
                    <td style={{ padding: "14px 20px", color: "#64748b" }}>
                      {player.team}
                    </td>
                    <td style={{ padding: "14px 20px", color: "#334155" }}>
                      {player.email}
                    </td>
                    <td style={{ padding: "14px 20px", color: "#334155" }}>
                      {player.phone}
                    </td>
                    <td
                      style={{
                        padding: "14px 20px",
                        fontWeight: "bold",
                        color: "#0f172a",
                      }}
                    >
                      {player.stats}
                    </td>
                    <td
                      style={{ padding: "14px 20px", whiteSpace: "nowrap" }}
                    >
                      <span
                        style={{
                          backgroundColor: statusColors.background,
                          color: statusColors.color,
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        ● {player.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "14px 20px",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <button
                        onClick={() =>
                          navigate(`/admin/players/${player.userId}`, {
                            state: { player },
                          })
                        }
                        style={{
                          backgroundColor: "#f1f5f9",
                          color: "#0f172a",
                          border: "1px solid #cbd5e1",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <VisibilityOutlinedIcon style={{ fontSize: "14px" }} />{" "}
                        View Details
                      </button>
                    </td>
                  </tr>
                  );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {filteredPlayers.length} matching players on this page,{" "}
            {pagination.total} total
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: "6px 12px",
                backgroundColor: "#fff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                color: currentPage === 1 ? "#94a3b8" : "#334155",
              }}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                style={{
                  width: "32px",
                  height: "32px",
                  backgroundColor:
                    currentPage === index + 1 ? "#0f172a" : "#fff",
                  color: currentPage === index + 1 ? "#fff" : "#334155",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {index + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{
                padding: "6px 12px",
                backgroundColor: "#fff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "12px",
                cursor:
                  currentPage === totalPages || totalPages === 0
                    ? "not-allowed"
                    : "pointer",
                color:
                  currentPage === totalPages || totalPages === 0
                    ? "#94a3b8"
                    : "#334155",
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
