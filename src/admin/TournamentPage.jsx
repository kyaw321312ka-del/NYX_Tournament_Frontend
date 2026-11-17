import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { getTournaments } from "../features/tournaments/api/tournamentApi";
import { resolveApiAssetUrl } from "../core/api/apiClient";

const PAGE_SIZE = 20;

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

function getTournamentStatus(publicationStatus) {
  const status = (publicationStatus || "unknown").toLowerCase();
  const statusStyles = {
    published: { label: "Published", color: "#16a34a", background: "#f0fdf4" },
    draft: { label: "Draft", color: "#d97706", background: "#fef3c7" },
    archived: { label: "Archived", color: "#64748b", background: "#f1f5f9" },
  };
  return (
    statusStyles[status] || {
      label: publicationStatus || "Unknown",
      color: "#64748b",
      background: "#f1f5f9",
    }
  );
}

export default function TournamentPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tournaments, setTournaments] = useState([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTournaments() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const result = await getTournaments({ page, pageSize: PAGE_SIZE });
        if (cancelled) return;
        setTournaments(result.tournaments);
        setPageCount(
          Number.isInteger(result.pagination?.pageCount)
            ? Math.max(result.pagination.pageCount, 1)
            : 1,
        );
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load tournaments.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadTournaments();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const filteredTournaments = useMemo(
    () =>
      tournaments.filter((tournament) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          [tournament.title, tournament.description]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query));
        const matchesStatus =
          statusFilter === "All" ||
          (tournament.publicationStatus || "").toLowerCase() ===
            statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
      }),
    [searchQuery, statusFilter, tournaments],
  );

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#f8fafc",
        minHeight: "calc(100vh - 75px)",
        boxSizing: "border-box",
      }}
    >
      {/* Top Search & Filter & Create Action Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        {/* Search Bar */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            flex: "1",
            maxWidth: "450px",
          }}
        >
          <SearchIcon
            style={{
              position: "absolute",
              left: "12px",
              color: "#94a3b8",
              fontSize: "18px",
            }}
          />
          <input
            type="text"
            placeholder="Search tournaments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 38px",
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              fontSize: "13px",
              fontWeight: "600",
              color: "#334155",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="All">
              Status: All
            </option>
            <option value="draft">Status: Draft</option>
            <option value="published">Status: Published</option>
            <option value="archived">Status: Archived</option>
          </select>

          {/* Create New Tournament Button */}
          <button
            onClick={() => navigate("/admin/tournament/create")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 18px",
              backgroundColor: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
            }}
          >
            <AddIcon style={{ fontSize: "20px" }} /> Create New Tournament
          </button>
        </div>
      </div>

      {errorMessage && (
        <p
          role="alert"
          style={{
            margin: "0 0 20px",
            padding: "12px 16px",
            color: "#b91c1c",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
          }}
        >
          Unable to load tournaments: {errorMessage}
        </p>
      )}

      {/* Tournaments Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
        }}
      >
        {isLoading ? (
          <div
            role="status"
            style={{
              gridColumn: "span 3",
              padding: "40px",
              textAlign: "center",
              color: "#64748b",
              backgroundColor: "#ffffff",
              borderRadius: "12px",
            }}
          >
            Loading tournaments...
          </div>
        ) : filteredTournaments.length > 0 ? (
          filteredTournaments.map((tournament) => {
            const status = getTournamentStatus(tournament.publicationStatus);
            const firstCategory = tournament.categories?.[0];
            const venue = tournament.venues?.[0];
            const startDate = formatTournamentDate(tournament.startDate);
            const endDate = formatTournamentDate(tournament.endDate);
            const dateLabel =
              startDate === endDate ? startDate : `${startDate} – ${endDate}`;

            return (
            <div
              key={tournament.id}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                transition: "all 0.2s ease",
              }}
            >
              {/* Card Image with Badge */}
              <div
                style={{
                  position: "relative",
                  height: "150px",
                  backgroundColor: "#e2e8f0",
                }}
              >
                <img
                  src={
                    resolveApiAssetUrl(tournament.bannerUrl) ||
                    "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600"
                  }
                  alt={tournament.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    backgroundColor: status.background,
                    color: status.color,
                    padding: "4px 10px",
                    borderRadius: "9999px",
                    fontSize: "10px",
                    fontWeight: "800",
                    border: "1px solid rgba(0,0,0,0.05)",
                  }}
                >
                  ● {status.label.toUpperCase()}
                </div>
              </div>

              {/* Card Body */}
              <div
                style={{
                  padding: "18px",
                  flex: "1",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: "bold",
                      color: "#0f172a",
                      margin: "0 0 12px 0",
                      lineHeight: "1.4",
                    }}
                  >
                    {tournament.title}
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      marginBottom: "16px",
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CalendarTodayOutlinedIcon
                        style={{ fontSize: "14px", color: "#dc2626" }}
                      />
                      <span>{dateLabel}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <LocationOnOutlinedIcon
                        style={{ fontSize: "14px", color: "#2563eb" }}
                      />
                      <span>{venue?.venueName || "Venue not set"}</span>
                    </div>
                  </div>

                  {/* Points & Entry Fee Section */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      backgroundColor: "#f8fafc",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #f1f5f9",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "9px",
                          fontWeight: "700",
                          color: "#64748b",
                          textTransform: "uppercase",
                        }}
                      >
                        Points Pool
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "bold",
                          color: "#0f172a",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <EmojiEventsOutlinedIcon
                          style={{ fontSize: "13px", color: "#d97706" }}
                        />{" "}
                        {Number(
                          tournament.rankingPointsPool || 0,
                        ).toLocaleString()}{" "}
                        PTS
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "9px",
                          fontWeight: "700",
                          color: "#64748b",
                          textTransform: "uppercase",
                        }}
                      >
                        Entry Fee
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "bold",
                          color: "#0f172a",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <PaymentsOutlinedIcon
                          style={{ fontSize: "13px", color: "#16a34a" }}
                        />{" "}
                        {Number(firstCategory?.entryFee || 0).toLocaleString()}{" "}
                        MMK
                      </div>
                    </div>
                  </div>
                </div>

                {/* View & Manage Button */}
                <button
                  onClick={() =>
                    navigate(`/admin/tournament/${tournament.id}`)
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "#0f172a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "background 0.2s",
                  }}
                >
                  View & Manage{" "}
                  <ArrowForwardIcon style={{ fontSize: "14px" }} />
                </button>
              </div>
            </div>
            );
          })
        ) : (
          <div
            style={{
              gridColumn: "span 3",
              padding: "40px",
              textAlign: "center",
              color: "#64748b",
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            {errorMessage
              ? "Tournament data is unavailable."
              : "No tournaments found matching your filter criteria."}
          </div>
        )}
      </div>
      {!isLoading && pageCount > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={page === 1}
            style={{
              padding: "8px 14px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              background: page === 1 ? "#f1f5f9" : "#fff",
              color: page === 1 ? "#94a3b8" : "#334155",
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>
          <span>
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(current + 1, pageCount))
            }
            disabled={page === pageCount}
            style={{
              padding: "8px 14px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              background: page === pageCount ? "#f1f5f9" : "#fff",
              color: page === pageCount ? "#94a3b8" : "#334155",
              cursor: page === pageCount ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
