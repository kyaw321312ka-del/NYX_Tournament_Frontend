import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircleRounded,
  ContentCopyRounded,
  CloudUploadRounded,
  ArrowForwardRounded,
  CheckRounded,
  WarningRounded,
  GroupAddRounded,
} from "@mui/icons-material";
import { useAuth } from "../../auth/hooks/useAuth";
import { getEnrollmentPaymentMethods } from "../../payments/api/paymentApi";
import {
  createPartnerInvitation,
  createTournamentRegistration,
  getMyRegistrations,
  submitRegistrationPayment,
} from "../api/registrationApi";

export default function Enroll() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const tournamentData = location.state?.tournament;
  const categoryData = location.state?.category; // e.g. "Men's Singles" or "Mixed Doubles"
  const categoryName =
    typeof categoryData === "string"
      ? categoryData
      : categoryData?.categoryName || categoryData?.name || "";
  const tournamentCategoryId =
    typeof categoryData === "object"
      ? (categoryData?.id ?? categoryData?.tournamentCategoryId)
      : null;
  const categoryPairingType =
    typeof categoryData === "object" ? categoryData?.pairingType || "" : "";
  const parsedEntryFee = Number(categoryData?.entryFee);
  const enrollmentFee = Number.isFinite(parsedEntryFee)
    ? parsedEntryFee.toLocaleString()
    : "25,000";

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [paymentMethodsError, setPaymentMethodsError] = useState("");
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [copied, setCopied] = useState(false);
  const [slipFile, setSlipFile] = useState(null);
  const [transactionReference, setTransactionReference] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerInvitation, setPartnerInvitation] = useState(null);
  const [registrationId, setRegistrationId] = useState(null);
  const [partnerStatusMessage, setPartnerStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPaymentMethods() {
      setPaymentMethodsLoading(true);
      setPaymentMethodsError("");
      try {
        const methods = await getEnrollmentPaymentMethods();
        if (!cancelled) {
          const activeMethods = methods.filter((method) => method.isActive);
          setPaymentMethods(activeMethods);
          setSelectedGateway(activeMethods[0]?.id ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setPaymentMethods([]);
          setPaymentMethodsError(
            error?.message || "Unable to load payment methods.",
          );
        }
      } finally {
        if (!cancelled) {
          setPaymentMethodsLoading(false);
        }
      }
    }

    loadPaymentMethods();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedCategory = `${categoryName} ${categoryPairingType}`.toLowerCase();
  const isDoublesCategory =
    normalizedCategory.includes("doubles") ||
    normalizedCategory.includes("pair") ||
    normalizedCategory.includes("xd");

  const currentPayment =
    paymentMethods.find((method) => method.id === selectedGateway) || null;

  const handleCopy = async () => {
    if (!currentPayment) {
      return;
    }

    try {
      await navigator.clipboard.writeText(currentPayment.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMessage("Unable to copy the account number.");
      setShowErrorModal(true);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setSlipFile(null);
      setErrorMessage("Choose a PNG or JPEG payment screenshot.");
      setShowErrorModal(true);
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSlipFile(null);
      setErrorMessage("The payment screenshot must be 5 MB or smaller.");
      setShowErrorModal(true);
      e.target.value = "";
      return;
    }

    setSlipFile(file);
  };

  const handleCheckPartnerAcceptance = async () => {
    if (!partnerInvitation) {
      return;
    }

    if (session?.user?.id == null) {
      setErrorMessage("Sign in again before checking partner acceptance.");
      setShowErrorModal(true);
      return;
    }

    setIsSubmitting(true);
    setPartnerStatusMessage("");
    try {
      const registrations = await getMyRegistrations();
      const registration = registrations.find((item) => {
        const memberIds = Array.isArray(item.members)
          ? item.members.map((member) => String(member.userId))
          : [];
        return (
          String(item.tournamentCategoryId) ===
            String(tournamentCategoryId) &&
          memberIds.includes(String(session.user.id)) &&
          memberIds.includes(String(partnerInvitation.invitedUserId))
        );
      });

      if (registration?.id == null) {
        setPartnerStatusMessage(
          "The invitation is still pending. Check again after your partner accepts.",
        );
        return;
      }

      setRegistrationId(registration.id);
      setPartnerStatusMessage(
        `Your partner accepted. Registration #${registration.id} is ready for payment.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to check partner acceptance.",
      );
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (tournamentCategoryId == null) {
      setErrorMessage(
        "The tournament category ID is missing. Return to the tournament and choose a category again.",
      );
      setShowErrorModal(true);
      return;
    }

    if (isDoublesCategory && !partnerInvitation) {
      if (!partnerEmail.trim()) {
        setErrorMessage("Enter your partner's registered email address.");
        setShowErrorModal(true);
        return;
      }

      setIsSubmitting(true);
      try {
        const invitation = await createPartnerInvitation(
          tournamentCategoryId,
          partnerEmail.trim(),
        );
        setPartnerInvitation(invitation);
        setPartnerStatusMessage(
          `Invitation sent to ${partnerEmail.trim()}. Payment will be available after they accept.`,
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to send the partner invitation.",
        );
        setShowErrorModal(true);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (isDoublesCategory && registrationId == null) {
      if (partnerInvitation) {
        await handleCheckPartnerAcceptance();
      } else {
        setErrorMessage(
          "Your partner must accept the invitation before you can submit payment.",
        );
        setShowErrorModal(true);
      }
      return;
    }

    if (!currentPayment) {
      setErrorMessage("Choose an available payment method before continuing.");
      setShowErrorModal(true);
      return;
    }

    if (!slipFile) {
      setErrorMessage("Upload your payment screenshot or slip before submitting.");
      setShowErrorModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let activeRegistrationId = registrationId;
      if (activeRegistrationId == null) {
        const registration =
          await createTournamentRegistration(tournamentCategoryId);
        activeRegistrationId = registration.id;
        setRegistrationId(activeRegistrationId);
      }

      await submitRegistrationPayment({
        registrationId: activeRegistrationId,
        paymentMethodId: currentPayment.id,
        transactionReference,
        proof: slipFile,
      });
      setShowSuccessModal(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit enrollment payment. You can retry without creating another registration.",
      );
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        /* Responsive Grid & Layout Adjustments for Mobile */
        @media (max-width: 900px) {
          .nyx-summary-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .nyx-gateway-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .nyx-transfer-box {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 540px) {
          .nyx-summary-grid {
            grid-template-columns: 1fr !important;
          }
          .nyx-gateway-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <main
        style={{
          minHeight: "100vh",
          width: "100%",
          padding: "5px",
          background: "#f7f8fa",
          color: "#172033",
          fontFamily: "'Inter', sans-serif",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            margin: "0",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Header Info */}
          <div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "900",
                color: "#172033",
                margin: "0 0 4px",
              }}
            >
              Tournament Enrollment Portal
            </h1>
            <p
              style={{
                fontSize: "13.5px",
                color: "#596170",
                margin: 0,
                fontWeight: "600",
              }}
            >
              Secure your slot & complete registration fee payment for upcoming
              seeded brackets.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              width: "100%",
            }}
          >
            {/* 1. Registration Summary & Partner Selection */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #eef0f3",
                borderRadius: "12px",
                padding: "18px 24px",
                boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "900",
                    color: "#172033",
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      background: "#ae1236",
                      color: "#fff",
                      width: "5px",
                      height: "16px",
                      borderRadius: "3px",
                      display: "inline-block",
                    }}
                  ></span>
                  1. Registration Summary & Player Info
                </h3>
                <span
                  style={{
                    background: "#fde9ee",
                    color: "#ae1236",
                    fontSize: "11.5px",
                    fontWeight: "800",
                    padding: "3px 10px",
                    borderRadius: "6px",
                  }}
                >
                  {registrationId == null
                    ? "Registration pending"
                    : `Registration ID: ${registrationId}`}
                </span>
              </div>

              <div
                className="nyx-summary-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: "16px",
                  background: "#f8f9fa",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  border: "1px solid #edf0f3",
                  marginBottom: isDoublesCategory ? "16px" : "0",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "10.5px",
                      fontWeight: "800",
                      color: "#727987",
                      marginBottom: "3px",
                    }}
                  >
                    PRIMARY PLAYER
                  </div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "900",
                      color: "#172033",
                    }}
                  >
                    {session?.user?.name || "Signed-in player"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "10.5px",
                      fontWeight: "800",
                      color: "#727987",
                      marginBottom: "3px",
                    }}
                  >
                    TEAM / CLUB
                  </div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "900",
                      color: "#172033",
                    }}
                  >
                    📍 {session?.user?.clubName || "No club provided"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "10.5px",
                      fontWeight: "800",
                      color: "#727987",
                      marginBottom: "3px",
                    }}
                  >
                    TOURNAMENT
                  </div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "900",
                      color: "#172033",
                    }}
                  >
                    🏆 {tournamentData?.title || "Tournament unavailable"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "10.5px",
                      fontWeight: "800",
                      color: "#727987",
                      marginBottom: "3px",
                    }}
                  >
                    EVENT CATEGORY
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "800",
                      color: "#ae1236",
                      background: "#fde9ee",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      display: "inline-block",
                    }}
                  >
                    {categoryName || "Category unavailable"}
                  </div>
                </div>
              </div>

              {/* Doubles Partner Invitation */}
              {isDoublesCategory && (
                <div
                  style={{
                    background: "#fff9fa",
                    border: "1px dashed #ae1236",
                    borderRadius: "10px",
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
                    htmlFor="partner-email"
                    style={{
                      fontSize: "12.5px",
                      fontWeight: "900",
                      color: "#ae1236",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <GroupAddRounded style={{ fontSize: 18 }} />
                    Invite a partner for {categoryName}{" "}
                    <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <p
                    style={{
                      fontSize: "11.5px",
                      color: "#64748b",
                      margin: 0,
                      fontWeight: "600",
                    }}
                  >
                    Enter your partner's registered email. Registration is
                    created after they accept the invitation.
                  </p>
                  <input
                    id="partner-email"
                    type="email"
                    required={!partnerInvitation}
                    value={partnerEmail}
                    disabled={Boolean(partnerInvitation)}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    placeholder="partner@example.com"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: partnerInvitation ? "#f1f5f9" : "#fff",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#0f172a",
                      outline: "none",
                      marginTop: "4px",
                    }}
                  />
                  {partnerStatusMessage && (
                    <p
                      role="status"
                      style={{
                        margin: 0,
                        color: registrationId ? "#166534" : "#475569",
                        fontSize: "12px",
                        fontWeight: "700",
                      }}
                    >
                      {partnerStatusMessage}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 2. Choose Payment Gateway Method */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #eef0f3",
                borderRadius: "12px",
                padding: "18px 24px",
                boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "900",
                  color: "#172033",
                  margin: "0 0 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    background: "#ae1236",
                    color: "#fff",
                    width: "5px",
                    height: "16px",
                    borderRadius: "3px",
                    display: "inline-block",
                  }}
                ></span>
                2. Choose Payment Gateway Method
              </h3>

              {/* Gateway Cards Layout - Responsive Grid */}
              <div
                className="nyx-gateway-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                {paymentMethodsLoading && (
                  <div
                    role="status"
                    style={{ gridColumn: "1 / -1", color: "#64748b" }}
                  >
                    Loading payment methods...
                  </div>
                )}
                {!paymentMethodsLoading && paymentMethodsError && (
                  <div
                    role="alert"
                    style={{ gridColumn: "1 / -1", color: "#b91c1c" }}
                  >
                    {paymentMethodsError}
                  </div>
                )}
                {!paymentMethodsLoading &&
                  !paymentMethodsError &&
                  paymentMethods.length === 0 && (
                    <div
                      role="status"
                      style={{ gridColumn: "1 / -1", color: "#64748b" }}
                    >
                      No active payment methods are available.
                    </div>
                  )}
                {paymentMethods.map((method) => {
                  const isSelected = selectedGateway === method.id;
                  return (
                    <div
                      key={method.id}
                      onClick={() => setSelectedGateway(method.id)}
                      style={{
                        border: isSelected
                          ? "2px solid #ae1236"
                          : "1px solid #e2e8f0",
                        background: isSelected ? "#fff5f7" : "#f8f9fa",
                        borderRadius: "10px",
                        padding: "15px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.2s",
                      }}
                    >
                      <span
                        style={{
                          minWidth: 0,
                          fontWeight: "900",
                          fontSize: "15px",
                          color: "#172033",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {method.paymentMethodName}
                      </span>
                      {isSelected && (
                        <CheckCircleRounded
                          style={{
                            fontSize: 18,
                            color: "#ae1236",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Official Transfer Details Box - Responsive Grid */}
              {currentPayment ? (
                <div
                  className="nyx-transfer-box"
                  style={{
                    background: "#f8f9fa",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px 24px",
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: "30px",
                    alignItems: "center",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "900",
                          color: "#172033",
                        }}
                      >
                        {currentPayment.paymentMethodName} Transfer Details
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: "10.5px",
                          fontWeight: "900",
                          color: "#727987",
                        }}
                      >
                        ACCOUNT RECEIVER NAME
                      </div>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: "900",
                          color: "#172033",
                        }}
                      >
                        {currentPayment.accountName}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: "10.5px",
                          fontWeight: "800",
                          color: "#727987",
                        }}
                      >
                        {currentPayment.paymentMethodName.toUpperCase()} ACCOUNT
                        NUMBER
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "10px",
                          marginTop: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "15.5px",
                            fontWeight: "900",
                            color: "#172033",
                            background: "#fff",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          {currentPayment.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopy}
                          style={{
                            background: "#172033",
                            color: "#fff",
                            border: "none",
                            padding: "8px 14px",
                            borderRadius: "6px",
                            fontSize: "11.5px",
                            fontWeight: "800",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <ContentCopyRounded style={{ fontSize: 13 }} />{" "}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: "10.5px",
                          fontWeight: "800",
                          color: "#727987",
                        }}
                      >
                        TOTAL ENROLLMENT FEE
                      </div>
                      <div
                        style={{
                          fontSize: "22px",
                          fontWeight: "900",
                          color: "#ae1236",
                        }}
                      >
                        {enrollmentFee} MMK
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#fff5f7",
                        border: "1px solid #f8d7da",
                        borderRadius: "6px",
                        padding: "10px 14px",
                        fontSize: "12px",
                        color: "#991b1b",
                        fontWeight: "700",
                        wordBreak: "break-word",
                      }}
                    >
                      <b>Note:</b> Include your name and tournament name as the
                      transfer reference.
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  role={paymentMethodsError ? "alert" : "status"}
                  style={{
                    color: paymentMethodsError ? "#b91c1c" : "#64748b",
                    padding: "14px",
                    background: "#f8f9fa",
                    borderRadius: "10px",
                  }}
                >
                  {paymentMethodsLoading
                    ? "Loading payment account details..."
                    : paymentMethodsError ||
                      "No active payment methods are available."}
                </div>
              )}
            </div>

            {/* 3. Upload Payment Slip / Screenshot */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #eef0f3",
                borderRadius: "12px",
                padding: "18px 24px",
                boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: "900",
                  color: "#172033",
                  margin: "0 0 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    background: "#ae1236",
                    color: "#fff",
                    width: "5px",
                    height: "16px",
                    borderRadius: "3px",
                    display: "inline-block",
                  }}
                ></span>
                3. Upload Payment Slip / Screenshot{" "}
                <span style={{ color: "#ae1236" }}>*</span>
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "#727987",
                  margin: "0 0 12px",
                  fontWeight: "600",
                }}
              >
                Please upload your successful transaction screenshot or slip
                (JPG, PNG - Max 5MB).
              </p>

              <label
                htmlFor="transaction-reference"
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: "800",
                  color: "#475569",
                  marginBottom: "6px",
                }}
              >
                Transaction reference (optional)
              </label>
              <input
                id="transaction-reference"
                type="text"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                placeholder="e.g. TX-20261119-001"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  marginBottom: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />

              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  border: slipFile ? "2px solid #21865b" : "2px dashed #cbd5e1",
                  borderRadius: "10px",
                  padding: "22px",
                  background: slipFile ? "#e7f7ee" : "#f8f9fa",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                {slipFile ? (
                  <CheckCircleRounded
                    style={{ fontSize: 34, color: "#21865b" }}
                  />
                ) : (
                  <CloudUploadRounded
                    style={{ fontSize: 34, color: "#ae1236" }}
                  />
                )}
                <div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "900",
                      color: slipFile ? "#21865b" : "#172033",
                      wordBreak: "break-all",
                    }}
                  >
                    {slipFile
                      ? `Selected File: ${slipFile.name}`
                      : "Tap or Drag Payment Slip Screenshot here"}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#727987",
                      fontWeight: "600",
                      marginTop: "3px",
                    }}
                  >
                    {slipFile
                      ? "Click to change image"
                      : "High resolution clear capture of transaction ID & date"}
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            {/* Confirm & Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: "#ae1236",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                minHeight: "52px",
                fontSize: "14.5px",
                fontWeight: "900",
                cursor: isSubmitting ? "wait" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: "0 4px 16px rgba(174, 18, 54, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "background 0.2s",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {isSubmitting
                ? "PROCESSING..."
                : isDoublesCategory && !partnerInvitation
                  ? "SEND PARTNER INVITATION"
                  : isDoublesCategory && registrationId == null
                    ? "CHECK PARTNER ACCEPTANCE"
                    : registrationId == null
                      ? "CONFIRM ENROLLMENT & SUBMIT PAYMENT"
                      : "SUBMIT / RETRY PAYMENT"}
              {!isSubmitting && <ArrowForwardRounded style={{ fontSize: 18 }} />}
            </button>
          </form>
        </div>

        {/* SUCCESS MODAL */}
        {showSuccessModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(9, 17, 29, 0.6)",
              backdropFilter: "blur(5px)",
              display: "grid",
              placeItems: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "30px",
                maxWidth: "400px",
                width: "100%",
                textAlign: "center",
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "#e7f7ee",
                  color: "#21865b",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                }}
              >
                <CheckRounded style={{ fontSize: 32 }} />
              </div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "900",
                  color: "#172033",
                  margin: "0 0 8px",
                }}
              >
                Enrollment Successful!
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  margin: "0 0 24px",
                  lineHeight: "1.5",
                }}
              >
                Payment proof was submitted for registration #{registrationId}.
                {isDoublesCategory
                  ? " Your partner accepted the invitation."
                  : ""}{" "}
                The registration remains pending until payment is reviewed.
              </p>
              <button
                onClick={() => navigate("/tournaments")}
                style={{
                  width: "100%",
                  background: "#21865b",
                  color: "#fff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "10px",
                  fontWeight: "900",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Return to Tournaments
              </button>
            </div>
          </div>
        )}

        {/* ERROR MODAL */}
        {showErrorModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(9, 17, 29, 0.6)",
              backdropFilter: "blur(5px)",
              display: "grid",
              placeItems: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "30px",
                maxWidth: "400px",
                width: "100%",
                textAlign: "center",
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "#fef2f2",
                  color: "#dc2626",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                }}
              >
                <WarningRounded style={{ fontSize: 32 }} />
              </div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "900",
                  color: "#172033",
                  margin: "0 0 8px",
                }}
              >
                Action Required
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  margin: "0 0 24px",
                  lineHeight: "1.5",
                }}
              >
                {errorMessage}
              </p>
              <button
                onClick={() => setShowErrorModal(false)}
                style={{
                  width: "100%",
                  background: "#ae1236",
                  color: "#fff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "10px",
                  fontWeight: "900",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Got it, I'll Fix
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
