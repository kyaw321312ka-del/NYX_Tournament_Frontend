import { useEffect, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { apiAssetRequest } from "../../../core/api/apiClient";
import {
  getPendingPayments,
  rejectPayment,
  verifyPayment,
} from "../../payments/api/paymentApi";

const PAGE_SIZE = 20;

function mapPaymentStatusToTab(status) {
  switch (String(status || "").toLowerCase()) {
    case "submitted":
    case "pending":
      return "Pending";
    case "paid":
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return "Pending";
  }
}

function formatPaymentDate(date) {
  if (!date) return "Date not set";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Date not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(parsedDate);
}

function formatPaymentAmount(amount, currency) {
  const value = Number(amount);
  const formattedAmount = Number.isFinite(value)
    ? new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
      }).format(value)
    : String(amount || "0");
  return `${formattedAmount} ${currency || ""}`.trim();
}

function mapPendingPayment(payment) {
  const registration = payment.registration || {};
  const category = registration.category || {};
  const members = Array.isArray(registration.members)
    ? registration.members.map((member) => member?.name).filter(Boolean)
    : [];

  return {
    id: payment.id,
    playerName:
      members.join(" & ") || registration.creator?.name || "Unknown player",
    tournamentName: category.tournament?.title || "Unknown tournament",
    format: category.categoryName || category.categoryCode || "Unknown category",
    amount: formatPaymentAmount(payment.amount, payment.currency),
    date: formatPaymentDate(payment.createdAt),
    method: payment.paymentMethodName || "—",
    proofImageUrl: payment.proofImageUrl || "",
    status: payment.status || "submitted",
    reason: payment.rejectionReason || "",
  };
}

export default function EnrollmentsPage() {
  const [activeTab, setActiveTab] = useState("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = PAGE_SIZE;
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    pageCount: 1,
  });
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null);

  // Reject Modal States
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  // View Reason Modal States
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [currentReason, setCurrentReason] = useState("");

  // Payment Slip Preview Modal States
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageSrc, setCurrentImageSrc] = useState("");
  const [selectedProofPayment, setSelectedProofPayment] = useState(null);
  const [isLoadingProof, setIsLoadingProof] = useState(false);
  const [proofError, setProofError] = useState("");

  const [enrollments, setEnrollments] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPendingPayments() {
      setIsLoadingPayments(true);
      setLoadError("");
      try {
        const result = await getPendingPayments({
          page: currentPage,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;
        setEnrollments(result.payments.map(mapPendingPayment));
        setPagination(result.pagination);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load pending payments.",
          );
          setEnrollments([]);
        }
      } finally {
        if (!cancelled) setIsLoadingPayments(false);
      }
    }

    loadPendingPayments();
    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  useEffect(() => {
    if (!selectedProofPayment) return undefined;
    let cancelled = false;

    async function loadPaymentProof() {
      setIsLoadingProof(true);
      setProofError("");
      try {
        const blob = await apiAssetRequest(
          selectedProofPayment.proofImageUrl,
        );
        const imageUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(imageUrl);
          return;
        }
        setCurrentImageSrc(imageUrl);
      } catch (error) {
        if (!cancelled) {
          setProofError(
            error instanceof Error
              ? error.message
              : "Unable to load payment proof.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingProof(false);
      }
    }

    loadPaymentProof();
    return () => {
      cancelled = true;
    };
  }, [selectedProofPayment]);

  useEffect(
    () => () => {
      if (currentImageSrc.startsWith("blob:")) {
        URL.revokeObjectURL(currentImageSrc);
      }
    },
    [currentImageSrc],
  );

  const handleApprove = async (id) => {
    setUpdatingPaymentId(id);
    setActionError("");
    try {
      const updatedPayment = await verifyPayment(id);
      setEnrollments((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: updatedPayment.status,
                reason: updatedPayment.rejectionReason || "",
              }
            : item,
        ),
      );
      setPagination((current) => ({
        ...current,
        total: Math.max(Number(current.total) - 1, 0),
      }));
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to approve payment.",
      );
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const openRejectModal = (id) => {
    setSelectedEnrollmentId(id);
    setRejectReason("");
    setRejectError("");
    setActionError("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError("A rejection reason is required.");
      return;
    }

    setUpdatingPaymentId(selectedEnrollmentId);
    setRejectError("");
    setActionError("");
    try {
      const updatedPayment = await rejectPayment(
        selectedEnrollmentId,
        rejectReason,
      );
      setEnrollments((current) =>
        current.map((item) =>
          item.id === selectedEnrollmentId
            ? {
                ...item,
                status: updatedPayment.status,
                reason: updatedPayment.rejectionReason || rejectReason.trim(),
              }
            : item,
        ),
      );
      setPagination((current) => ({
        ...current,
        total: Math.max(Number(current.total) - 1, 0),
      }));
      setShowRejectModal(false);
      setSelectedEnrollmentId(null);
      setRejectReason("");
    } catch (error) {
      setRejectError(
        error instanceof Error
          ? error.message
          : "Unable to reject payment.",
      );
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const openPaymentProof = (payment) => {
    setSelectedProofPayment(payment);
    setCurrentImageSrc("");
    setProofError("");
    setShowImageModal(true);
  };

  const closePaymentProof = () => {
    setShowImageModal(false);
    setSelectedProofPayment(null);
    setCurrentImageSrc("");
    setProofError("");
  };

  const formatOptions = [
    ...new Set(
      [
        ...enrollments.map((item) => item.format),
        formatFilter === "All" ? "" : formatFilter,
      ].filter(Boolean),
    ),
  ];
  const filteredData = enrollments.filter((item) => {
    const matchesTab = mapPaymentStatusToTab(item.status) === activeTab;
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesSearch =
      item.playerName.toLowerCase().includes(normalizedQuery) ||
      item.tournamentName.toLowerCase().includes(normalizedQuery);
    const matchesFormat =
      formatFilter === "All" || item.format === formatFilter;
    return matchesTab && matchesSearch && matchesFormat;
  });
  const currentRows = isLoadingPayments ? [] : filteredData;
  const totalPages =
    activeTab === "Pending"
      ? Math.max(Number(pagination.pageCount) || 1, 1)
      : 1;
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const indexOfLastRow = indexOfFirstRow + currentRows.length;
  const emptyRowsCount =
    currentRows.length > 0
      ? Math.max(rowsPerPage - currentRows.length, 0)
      : 0;
  const firstVisiblePage = Math.max(
    Math.min(currentPage - 2, totalPages - 4),
    1,
  );
  const visiblePages = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, index) => firstVisiblePage + index,
  );

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#f8fafc",
        minHeight: "calc(100vh - 75px)",
        boxSizing: "border-box",
        fontFamily: "sans-serif",
      }}
    >
      {/* Filter Tabs & Format Filter & Search & Export Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Category Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            backgroundColor: "#e2e8f0",
            padding: "4px",
            borderRadius: "8px",
          }}
        >
          {["Pending", "Approved", "Rejected"].map((tab) => {
            const isActive = activeTab === tab;
            const count =
              tab === "Pending"
                ? pagination.total
                : enrollments.filter(
                    (item) => mapPaymentStatusToTab(item.status) === tab,
                  ).length;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: isActive ? "#ffffff" : "transparent",
                  color: isActive ? "#0f172a" : "#64748b",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: isActive ? "bold" : "600",
                  cursor: "pointer",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {tab}
                <span
                  style={{
                    fontSize: "10px",
                    backgroundColor: isActive ? "#0f172a" : "#cbd5e1",
                    color: "#fff",
                    padding: "2px 6px",
                    borderRadius: "999px",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Play Format Filter & Search & Export */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* Play Format Dropdown Filter */}
          <select
            value={formatFilter}
            onChange={(e) => {
              setFormatFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              fontSize: "12px",
              fontWeight: "600",
              color: "#334155",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="All">Format: All Play Formats</option>
            {formatOptions.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>

          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              width: "260px",
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
              placeholder="Search tournaments or players..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                padding: "9px 12px 9px 38px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "12px",
                outline: "none",
              }}
            />
          </div>

          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              backgroundColor: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            <FileDownloadOutlinedIcon style={{ fontSize: "16px" }} /> Export
          </button>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            color: "#b91c1c",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        >
          {actionError}
        </div>
      )}
      {activeTab !== "Pending" && (
        <div
          role="status"
          style={{
            marginBottom: "16px",
            padding: "10px 14px",
            color: "#475569",
            backgroundColor: "#f1f5f9",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        >
          Showing decisions made in this session. The pending-payments API does
          not provide historical approved or rejected payments.
        </div>
      )}

      {/* Enrollments Table Card */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
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
              <th style={{ padding: "14px 16px" }}>ID</th>
              <th style={{ padding: "14px 16px" }}>Player Name</th>
              <th style={{ padding: "14px 16px" }}>Tournament Name</th>
              <th style={{ padding: "14px 16px" }}>Play Format</th>
              <th style={{ padding: "14px 16px" }}>Payment Amount</th>
              <th style={{ padding: "14px 16px" }}>Submission Date</th>
              <th style={{ padding: "14px 16px" }}>Payment Method</th>
              <th style={{ padding: "14px 16px" }}>Payment Proof</th>
              <th style={{ padding: "14px 16px", textAlign: "center" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length > 0 ? (
              currentRows.map((row) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    color: "#334155",
                  }}
                >
                  <td style={{ padding: "14px 16px", fontWeight: "bold" }}>
                    {row.id}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontWeight: "600",
                      color: "#0f172a",
                    }}
                  >
                    {row.playerName}
                  </td>
                  <td style={{ padding: "14px 16px" }}>{row.tournamentName}</td>
                  <td style={{ padding: "14px 16px" }}>{row.format}</td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontWeight: "bold",
                      color: "#16a34a",
                    }}
                  >
                    {row.amount}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#64748b" }}>
                    {row.date}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        backgroundColor: "#f1f5f9",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    >
                      {row.method}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <button
                      type="button"
                      onClick={() => openPaymentProof(row)}
                      disabled={!row.proofImageUrl}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 9px",
                        backgroundColor: row.proofImageUrl ? "#eff6ff" : "#f1f5f9",
                        color: row.proofImageUrl ? "#1d4ed8" : "#94a3b8",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        cursor: row.proofImageUrl ? "pointer" : "not-allowed",
                        fontSize: "11px",
                      }}
                    >
                      <VisibilityOutlinedIcon style={{ fontSize: "14px" }} />
                      {row.proofImageUrl ? "View proof" : "No proof"}
                    </button>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    {activeTab === "Pending" && (
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          justifyContent: "center",
                        }}
                      >
                        <button
                          onClick={() => handleApprove(row.id)}
                          disabled={updatingPaymentId === row.id}
                          style={{
                            backgroundColor: "#16a34a",
                            color: "#fff",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            cursor: updatingPaymentId === row.id ? "wait" : "pointer",
                          }}
                        >
                          {updatingPaymentId === row.id ? "Saving..." : "Approve"}
                        </button>
                        <button
                          onClick={() => openRejectModal(row.id)}
                          disabled={updatingPaymentId === row.id}
                          style={{
                            backgroundColor: "#dc2626",
                            color: "#fff",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            cursor: updatingPaymentId === row.id ? "wait" : "pointer",
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {activeTab === "Approved" && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "#16a34a",
                          fontWeight: "bold",
                          backgroundColor: "#f0fdf4",
                          padding: "4px 10px",
                          borderRadius: "6px",
                        }}
                      >
                        <CheckCircleOutlineOutlinedIcon
                          style={{ fontSize: "14px" }}
                        />{" "}
                        Approved
                      </span>
                    )}

                    {activeTab === "Rejected" && (
                      <button
                        onClick={() => {
                          setCurrentReason(row.reason);
                          setShowReasonModal(true);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          backgroundColor: "#fef2f2",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          cursor: "pointer",
                        }}
                      >
                        <VisibilityOutlinedIcon style={{ fontSize: "14px" }} />{" "}
                        View Reason
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="9"
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  {isLoadingPayments
                    ? "Loading payments..."
                    : loadError
                      ? loadError
                      : "No payments found matching your filter criteria."}
                </td>
              </tr>
            )}

            {/* Empty Rows to keep table height consistent */}
            {Array.from({ length: emptyRowsCount }).map((_, idx) => (
              <tr
                key={`empty-${idx}`}
                style={{ borderBottom: "1px solid #f1f5f9", height: "47px" }}
              >
                <td
                  colSpan="9"
                  style={{ padding: "14px 16px", color: "transparent" }}
                >
                  -
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Footer */}
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
            Showing {currentRows.length > 0 ? indexOfFirstRow + 1 : 0} to{" "}
            {currentRows.length > 0 ? indexOfLastRow : 0} of{" "}
            {activeTab === "Pending" ? pagination.total : filteredData.length}{" "}
            entries
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
            {visiblePages.map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  width: "32px",
                  height: "32px",
                  backgroundColor:
                    currentPage === page ? "#0f172a" : "#fff",
                  color: currentPage === page ? "#fff" : "#334155",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: "6px 12px",
                backgroundColor: "#fff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "12px",
                cursor:
                  currentPage === totalPages
                    ? "not-allowed"
                    : "pointer",
                color:
                  currentPage === totalPages
                    ? "#94a3b8"
                    : "#334155",
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {/* PAYMENT SLIP PREVIEW MODAL */}
      {showImageModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "600px",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              position: "relative",
            }}
          >
            {/* Close X Icon at Top Right */}
            <button
              onClick={closePaymentProof}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              <CloseIcon style={{ fontSize: "20px" }} />
            </button>

            {/* Image Preview Container */}
            <div
              style={{
                margin: "16px 0 24px 0",
                maxHeight: "400px",
                overflow: "hidden",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {isLoadingProof ? (
                <p role="status" style={{ color: "#64748b" }}>
                  Loading payment proof...
                </p>
              ) : proofError ? (
                <p role="alert" style={{ color: "#b91c1c" }}>
                  {proofError}
                </p>
              ) : currentImageSrc ? (
                <img
                  src={currentImageSrc}
                  alt="Payment proof"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "380px",
                    objectFit: "contain",
                    borderRadius: "8px",
                  }}
                />
              ) : (
                <p style={{ color: "#64748b" }}>No payment proof available.</p>
              )}
            </div>

            {/* Bottom Action Bar with Close Preview Button aligned to the Right */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                width: "100%",
              }}
            >
              <button
                onClick={closePaymentProof}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT REASON MODAL */}
      {showRejectModal && (
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
              maxWidth: "480px",
              padding: "28px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowRejectModal(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              <CloseIcon style={{ fontSize: "18px" }} />
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  backgroundColor: "#fef2f2",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#dc2626",
                }}
              >
                <ErrorOutlineIcon style={{ fontSize: "20px" }} />
              </div>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#0f172a",
                  margin: "0",
                }}
              >
                Reject Reason <span style={{ color: "#dc2626" }}>*</span>
              </h2>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#334155",
                  }}
                >
                  Additional Note / Athlete Feedback
                </label>
                <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                  Max 600 characters
                </span>
              </div>
              <textarea
                rows="4"
                maxLength={600}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter additional note for the athlete... (e.g. Please re-upload a clear screenshot showing transaction time and bank reference number)"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              ></textarea>
              {rejectError && (
                <p
                  role="alert"
                  style={{ color: "#b91c1c", fontSize: "12px", margin: "8px 0 0" }}
                >
                  {rejectError}
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={() => setShowRejectModal(false)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  color: "#334155",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={updatingPaymentId === selectedEnrollmentId}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor:
                    updatingPaymentId === selectedEnrollmentId
                      ? "wait"
                      : "pointer",
                }}
              >
                {updatingPaymentId === selectedEnrollmentId
                  ? "Sending..."
                  : "Confirm & Send Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW REASON MODAL */}
      {showReasonModal && (
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
              padding: "28px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowReasonModal(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              <CloseIcon style={{ fontSize: "18px" }} />
            </button>

            <h2
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                color: "#0f172a",
                marginBottom: "12px",
              }}
            >
              Rejection Feedback Note
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#475569",
                backgroundColor: "#f8fafc",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                lineHeight: "1.5",
                margin: "0 0 20px 0",
              }}
            >
              {currentReason || "No specific feedback provided."}
            </p>

            <button
              onClick={() => setShowReasonModal(false)}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#0f172a",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
