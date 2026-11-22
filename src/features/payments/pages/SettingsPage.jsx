import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import LanguageIcon from "@mui/icons-material/Language";
import PaymentsIcon from "@mui/icons-material/Payments";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import {
  createPaymentMethod,
  getPaymentMethods,
  updatePaymentMethodStatus,
} from "../api/paymentApi";
import {
  createContactSupport,
  deleteContactSupport,
  getContactSupport,
  updateContactSupport,
} from "../api/contactSupportApi";
import {
  createAgeGroup,
  deleteAgeGroup,
  getAgeGroup,
  getAgeGroups,
  updateAgeGroup,
} from "../../ageGroups/api/ageGroupApi";

export default function SettingsPage() {
  const outletContext = useOutletContext() || {};
  const { isDark: parentIsDark } = outletContext;
  const isDark = parentIsDark ?? false;

  const [contactSupport, setContactSupport] = useState({
    phone: "",
    website: "",
    email: "",
    address: "",
  });
  const [isLoadingContactSupport, setIsLoadingContactSupport] =
    useState(true);
  const [contactSupportBusy, setContactSupportBusy] = useState(false);
  const [contactSupportError, setContactSupportError] = useState("");

  const [payments, setPayments] = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [paymentLoadError, setPaymentLoadError] = useState("");
  const [paymentStatusError, setPaymentStatusError] = useState("");
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null);
  const [ageGroups, setAgeGroups] = useState([]);
  const [isLoadingAgeGroups, setIsLoadingAgeGroups] = useState(true);
  const [ageGroupLoadError, setAgeGroupLoadError] = useState("");
  const [ageGroupActionError, setAgeGroupActionError] = useState("");
  const [savingAgeGroup, setSavingAgeGroup] = useState(false);
  const [deletingAgeGroupId, setDeletingAgeGroupId] = useState(null);
  const [loadingAgeGroupId, setLoadingAgeGroupId] = useState(null);
  const [editingAgeGroupId, setEditingAgeGroupId] = useState(null);
  const [ageGroupForm, setAgeGroupForm] = useState({ name: "", age: "" });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEditPayment, setCurrentEditPayment] = useState(null);

  const [newPayment, setNewPayment] = useState({
    name: "",
    owner: "",
    accNo: "",
  });
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentCreateError, setPaymentCreateError] = useState("");

  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadContactSupport() {
      setIsLoadingContactSupport(true);
      setContactSupportError("");
      try {
        const result = await getContactSupport();
        if (cancelled) return;
        if (result) {
          setContactSupport(result);
        }
      } catch (error) {
        if (!cancelled) {
          setContactSupportError(
            error instanceof Error
              ? error.message
              : "Unable to load contact support information.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingContactSupport(false);
      }
    }

    loadContactSupport();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPaymentMethods() {
      setIsLoadingPayments(true);
      setPaymentLoadError("");
      try {
        const paymentMethods = await getPaymentMethods();
        if (cancelled) return;
        const loadedPayments = paymentMethods.map((paymentMethod) => ({
          id: paymentMethod.id,
          name: paymentMethod.paymentMethodName,
          owner: paymentMethod.accountName,
          accNo: paymentMethod.accountNumber,
          active: paymentMethod.isActive,
          qr: "",
        }));
        setPayments((currentPayments) => [
          ...loadedPayments,
          ...currentPayments.filter(
            (currentPayment) =>
              !loadedPayments.some(
                (loadedPayment) => loadedPayment.id === currentPayment.id,
              ),
          ),
        ]);
      } catch (error) {
        if (!cancelled) {
          setPaymentLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load payment methods.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingPayments(false);
      }
    }

    loadPaymentMethods();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAgeGroups() {
      setIsLoadingAgeGroups(true);
      setAgeGroupLoadError("");
      try {
        const result = await getAgeGroups();
        if (!cancelled) setAgeGroups(result);
      } catch (error) {
        if (!cancelled) {
          setAgeGroupLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load age groups.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingAgeGroups(false);
      }
    }

    loadAgeGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const handleAddPaymentSubmit = async (e) => {
    e.preventDefault();
    setIsCreatingPayment(true);
    setPaymentCreateError("");
    try {
      const paymentMethod = await createPaymentMethod({
        paymentMethodName: newPayment.name.trim(),
        accountName: newPayment.owner.trim(),
        accountNumber: newPayment.accNo.trim(),
      });
      setPayments((currentPayments) => [
        ...currentPayments,
        {
          id: paymentMethod.id,
          name: paymentMethod.paymentMethodName,
          owner: paymentMethod.accountName,
          accNo: paymentMethod.accountNumber,
          active: paymentMethod.isActive,
          qr: "",
        },
      ]);
      setNewPayment({ name: "", owner: "", accNo: "" });
      setShowAddModal(false);
      triggerToast("New payment gateway account added successfully.");
    } catch (error) {
      setPaymentCreateError(
        error instanceof Error
          ? error.message
          : "Unable to create payment method.",
      );
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleEditPaymentSubmit = (e) => {
    e.preventDefault();
    setPayments(
      payments.map((p) =>
        p.id === currentEditPayment.id ? currentEditPayment : p,
      ),
    );
    setShowEditModal(false);
    triggerToast("Payment gateway updated successfully.");
  };

  const handleDeletePayment = (id) => {
    setPayments(payments.filter((p) => p.id !== id));
    setShowEditModal(false);
    triggerToast("Payment gateway deleted.");
  };

  const handleToggleActive = async (id, isActive) => {
    setUpdatingPaymentId(id);
    setPaymentStatusError("");
    try {
      await updatePaymentMethodStatus(id, isActive);
      setPayments((currentPayments) =>
        currentPayments.map((payment) =>
          payment.id === id ? { ...payment, active: isActive } : payment,
        ),
      );
    } catch (error) {
      setPaymentStatusError(
        error instanceof Error
          ? error.message
          : "Unable to update payment method status.",
      );
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleAgeGroupSubmit = async (event) => {
    event.preventDefault();
    const name = ageGroupForm.name.trim();
    const age = Number(ageGroupForm.age);
    if (!name || !Number.isInteger(age) || age < 1) {
      setAgeGroupActionError("Enter an age group name and a positive whole-number age.");
      return;
    }

    setSavingAgeGroup(true);
    setAgeGroupActionError("");
    try {
      if (editingAgeGroupId == null) {
        const created = await createAgeGroup({ name, age });
        setAgeGroups((current) => [...current, { ...created, name, age }]);
        triggerToast("Age group added.");
      } else {
        const updated = await updateAgeGroup(editingAgeGroupId, { name, age });
        setAgeGroups((current) =>
          current.map((group) =>
            group.id === editingAgeGroupId
              ? { ...group, ...(updated || {}), id: group.id, name, age }
              : group,
          ),
        );
        triggerToast("Age group updated.");
      }
      setEditingAgeGroupId(null);
      setAgeGroupForm({ name: "", age: "" });
    } catch (error) {
      setAgeGroupActionError(
        error instanceof Error ? error.message : "Unable to save age group.",
      );
    } finally {
      setSavingAgeGroup(false);
    }
  };

  const handleEditAgeGroup = async (group) => {
    setLoadingAgeGroupId(group.id);
    setAgeGroupActionError("");
    try {
      const details = await getAgeGroup(group.id);
      setEditingAgeGroupId(group.id);
      setAgeGroupForm({
        name: details.name || "",
        age: String(details.age ?? ""),
      });
    } catch (error) {
      setAgeGroupActionError(
        error instanceof Error ? error.message : "Unable to load age group.",
      );
    } finally {
      setLoadingAgeGroupId(null);
    }
  };

  const handleCancelAgeGroupEdit = () => {
    setEditingAgeGroupId(null);
    setAgeGroupForm({ name: "", age: "" });
    setAgeGroupActionError("");
  };

  const handleDeleteAgeGroup = async (group) => {
    if (!window.confirm(`Delete age group "${group.name}"?`)) return;
    setDeletingAgeGroupId(group.id);
    setAgeGroupActionError("");
    try {
      await deleteAgeGroup(group.id);
      setAgeGroups((current) =>
        current.filter((item) => item.id !== group.id),
      );
      if (editingAgeGroupId === group.id) handleCancelAgeGroupEdit();
      triggerToast("Age group deleted.");
    } catch (error) {
      setAgeGroupActionError(
        error instanceof Error ? error.message : "Unable to delete age group.",
      );
    } finally {
      setDeletingAgeGroupId(null);
    }
  };

  const handleSaveSynchronize = () => {
    triggerToast(
      "✨ All system settings saved & synchronized with live public tournament website successfully!",
    );
  };

  const handleContactSupportAction = async (action) => {
    if (contactSupportBusy) return;

    const payload = {
      phone: contactSupport.phone.trim(),
      website: contactSupport.website.trim(),
      email: contactSupport.email.trim(),
      address: contactSupport.address.trim(),
    };
    if (
      action !== "delete" &&
      (!payload.phone ||
        !payload.website ||
        !payload.address ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))
    ) {
      setContactSupportError(
        "Enter a valid phone, website, email, and address before saving.",
      );
      return;
    }

    if (
      action === "delete" &&
      !window.confirm("Delete the contact support information?")
    ) {
      return;
    }

    setContactSupportBusy(true);
    setContactSupportError("");
    try {
      if (action === "create") {
        await createContactSupport(payload);
        triggerToast("Contact support information created.");
      } else if (action === "update") {
        await updateContactSupport(payload);
        triggerToast("Contact support information updated.");
      } else {
        await deleteContactSupport();
        setContactSupport({
          phone: "",
          website: "",
          email: "",
          address: "",
        });
        triggerToast("Contact support information deleted.");
      }
    } catch (error) {
      setContactSupportError(
        error instanceof Error
          ? error.message
          : `Unable to ${action} contact support information.`,
      );
    } finally {
      setContactSupportBusy(false);
    }
  };

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
    toast: {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      backgroundColor: "#0f172a",
      color: "#fff",
      padding: "12px 20px",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: "bold",
      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      border: "1px solid #334155",
    },
    card: {
      backgroundColor: isDark ? "#1a1c1e" : "#ffffff",
      borderRadius: "12px",
      border: `1px solid ${isDark ? "#2d3139" : "#e2e8f0"}`,
      padding: "24px",
      marginBottom: "24px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    },
    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderBottom: `1px solid ${isDark ? "#2d3139" : "#f1f5f9"}`,
      paddingBottom: "16px",
      marginBottom: "20px",
    },
    cardTitle: {
      fontSize: "15px",
      fontWeight: "bold",
      color: isDark ? "#ffffff" : "#0f172a",
      margin: "0 0 4px 0",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    cardDesc: {
      fontSize: "12px",
      color: "#64748b",
      margin: 0,
    },
    label: {
      fontSize: "11px",
      fontWeight: "bold",
      color: "#64748b",
      display: "block",
      marginBottom: "6px",
    },
    input: {
      width: "100%",
      padding: "11px 14px",
      borderRadius: "8px",
      border: `1px solid ${isDark ? "#2d3139" : "#cbd5e1"}`,
      backgroundColor: isDark ? "#24272b" : "#f8fafc",
      fontSize: "13px",
      fontWeight: "600",
      color: isDark ? "#ffffff" : "#0f172a",
      outline: "none",
      boxSizing: "border-box",
    },
    textarea: {
      width: "100%",
      padding: "11px 14px",
      borderRadius: "8px",
      border: `1px solid ${isDark ? "#2d3139" : "#cbd5e1"}`,
      backgroundColor: isDark ? "#24272b" : "#f8fafc",
      fontSize: "13px",
      fontWeight: "600",
      color: isDark ? "#ffffff" : "#0f172a",
      outline: "none",
      boxSizing: "border-box",
      minHeight: "80px",
      resize: "vertical",
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
      marginBottom: "16px",
    },
    paymentRow: (active) => ({
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: isDark ? "#24272b" : "#f8fafc",
      border: `1px solid ${isDark ? "#2d3139" : "#e2e8f0"}`,
      borderRadius: "10px",
      padding: "16px 20px",
      marginBottom: "12px",
      opacity: active ? 1 : 0.45,
      transition: "opacity 0.2s ease",
    }),
    btnPrimary: {
      backgroundColor: "#0F1C2C",
      color: "#fff",
      border: "none",
      padding: "10px 20px",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: "bold",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    btnSecondary: {
      backgroundColor: isDark ? "#24272b" : "#f1f5f9",
      color: isDark ? "#ffffff" : "#334155",
      border: `1px solid ${isDark ? "#2d3139" : "#cbd5e1"}`,
      padding: "10px 16px",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: "bold",
      cursor: "pointer",
    },
    footerActions: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: isDark ? "#1a1c1e" : "#ffffff",
      padding: "20px 24px",
      borderRadius: "12px",
      border: `1px solid ${isDark ? "#2d3139" : "#e2e8f0"}`,
      marginTop: "24px",
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1500,
      padding: "20px",
    },
    modalCard: {
      backgroundColor: isDark ? "#1a1c1e" : "#ffffff",
      borderRadius: "16px",
      width: "100%",
      maxWidth: "520px",
      padding: "28px",
      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
      position: "relative",
      color: isDark ? "#fff" : "#0f172a",
    },
  };

  return (
    <div style={styles.container}>
      {toastMessage && (
        <div style={styles.toast}>
          <CheckCircleOutlineOutlinedIcon
            style={{ color: "#4ade80", fontSize: "20px" }}
          />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. WEBSITE GENERAL INFORMATION */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>
              <LanguageIcon style={{ color: "#2563eb", fontSize: "25px" }} /> 1.
              Contact Support Information
            </h3>
            <p style={styles.cardDesc}>
              Manage the contact details displayed on the public website.
            </p>
          </div>
          <span
            style={{
              fontSize: "11px",
              backgroundColor: isDark ? "#24272b" : "#f1f5f9",
              color: "#64748b",
              padding: "4px 10px",
              borderRadius: "6px",
              fontWeight: "bold",
              border: `1px solid ${isDark ? "#2d3139" : "#cbd5e1"}`,
            }}
          >
            CONTACT SUPPORT
          </span>
        </div>

        {isLoadingContactSupport && (
          <p role="status" style={{ color: "#64748b", fontSize: "13px" }}>
            Loading contact support information...
          </p>
        )}
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>CONTACT PHONE NUMBER</label>
            <input
              type="text"
              style={styles.input}
              disabled={isLoadingContactSupport}
              value={contactSupport.phone}
              onChange={(event) =>
                setContactSupport({
                  ...contactSupport,
                  phone: event.target.value,
                })
              }
            />
          </div>
          <div>
            <label style={styles.label}>WEBSITE</label>
            <input
              type="text"
              style={styles.input}
              disabled={isLoadingContactSupport}
              value={contactSupport.website}
              onChange={(event) =>
                setContactSupport({
                  ...contactSupport,
                  website: event.target.value,
                })
              }
            />
          </div>
        </div>

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>OFFICIAL SUPPORT EMAIL</label>
            <input
              type="email"
              style={styles.input}
              disabled={isLoadingContactSupport}
              value={contactSupport.email}
              onChange={(event) =>
                setContactSupport({
                  ...contactSupport,
                  email: event.target.value,
                })
              }
            />
          </div>
          <div>
            <label style={styles.label}>
              CONTACT ADDRESS
            </label>
            <input
              type="text"
              style={styles.input}
              disabled={isLoadingContactSupport}
              value={contactSupport.address}
              onChange={(event) =>
                setContactSupport({
                  ...contactSupport,
                  address: event.target.value,
                })
              }
            />
          </div>
        </div>

        {contactSupportError && (
          <p role="alert" style={{ color: "#b91c1c", fontSize: "13px" }}>
            {contactSupportError}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <button
            type="button"
            onClick={() => handleContactSupportAction("create")}
            disabled={contactSupportBusy || isLoadingContactSupport}
            style={styles.btnPrimary}
          >
            {contactSupportBusy ? "Working..." : "Create Contact Support"}
          </button>
          <button
            type="button"
            onClick={() => handleContactSupportAction("update")}
            disabled={contactSupportBusy || isLoadingContactSupport}
            style={styles.btnSecondary}
          >
            Update Contact Support
          </button>
          <button
            type="button"
            onClick={() => handleContactSupportAction("delete")}
            disabled={contactSupportBusy || isLoadingContactSupport}
            style={{
              ...styles.btnSecondary,
              color: "#b91c1c",
              borderColor: isDark ? "#7f1d1d" : "#fecaca",
            }}
          >
            Delete Contact Support
          </button>
        </div>
      </div>

      {/* 2. PAYMENT GATEWAYS & QR ACCOUNTS */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>
              <PaymentsIcon style={{ color: "#16a34a", fontSize: "25px" }} /> 2.
              Payment Gateways & QR Accounts (For Player Enrollment Slips)
            </h3>
            <p style={styles.cardDesc}>
              Manage receiving merchant accounts where players transfer
              tournament entry fees.
            </p>
          </div>
          <span
            style={{
              fontSize: "11px",
              color: "#16a34a",
              backgroundColor: isDark ? "#064e3b" : "#f0fdf4",
              padding: "4px 10px",
              borderRadius: "6px",
              fontWeight: "bold",
              border: "1px solid #bbf7d0",
            }}
          >
            {payments.filter((p) => p.active).length} Active Gateways
          </span>
        </div>

        {paymentLoadError && (
          <p role="alert" style={{ color: "#b91c1c", fontSize: "13px" }}>
            Unable to load payment methods: {paymentLoadError}
          </p>
        )}
        {paymentStatusError && (
          <p role="alert" style={{ color: "#b91c1c", fontSize: "13px" }}>
            Unable to update payment method: {paymentStatusError}
          </p>
        )}

        {isLoadingPayments && (
          <p role="status" style={{ color: "#64748b", fontSize: "13px" }}>
            Loading payment methods...
          </p>
        )}

        {!isLoadingPayments &&
          !paymentLoadError &&
          payments.length === 0 && (
          <p style={{ color: "#64748b", fontSize: "13px" }}>
            No payment methods have been added yet.
          </p>
          )}

        {payments.map((p) => (
          <div key={p.id} style={styles.paymentRow(p.active)}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "8px",
                  backgroundColor: isDark ? "#1a1c1e" : "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  border: `1px solid ${isDark ? "#2d3139" : "#cbd5e1"}`,
                }}
              >
                {p.qr ? (
                  <img
                    src={p.qr}
                    alt="QR"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <PaymentsIcon style={{ color: "#64748b" }} />
                )}
              </div>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "bold",
                    color: isDark ? "#ffffff" : "#0f172a",
                    marginBottom: "3px",
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Acc No:{" "}
                  <span
                    style={{
                      fontWeight: "600",
                      color: isDark ? "#cbd5e1" : "#334155",
                    }}
                  >
                    {p.accNo}
                  </span>{" "}
                  • Name:{" "}
                  <span
                    style={{
                      fontWeight: "600",
                      color: isDark ? "#cbd5e1" : "#334155",
                    }}
                  >
                    {p.owner}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button
                type="button"
                onClick={() => {
                  setCurrentEditPayment(p);
                  setShowEditModal(true);
                }}
                style={{
                  backgroundColor: isDark ? "#1a1c1e" : "#f1f5f9",
                  border: `1px solid ${isDark ? "#2d3139" : "#cbd5e1"}`,
                  color: isDark ? "#fff" : "#0f172a",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <EditOutlinedIcon style={{ fontSize: "14px" }} /> Edit
              </button>

              {/* Fully Functional Switch Toggle Button */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "44px",
                    height: "22px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={p.active}
                    disabled={updatingPaymentId === p.id}
                    onChange={(event) =>
                      handleToggleActive(p.id, event.target.checked)
                    }
                    style={{
                      opacity: 0,
                      width: 0,
                      height: 0,
                      cursor: "pointer",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      cursor: "pointer",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: p.active ? "#16a34a" : "#cbd5e1",
                      transition: ".3s",
                      borderRadius: "22px",
                      pointerEvents: "none",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        content: "''",
                        height: "16px",
                        width: "16px",
                        left: p.active ? "24px" : "3px",
                        bottom: "3px",
                        backgroundColor: "white",
                        transition: ".3s",
                        borderRadius: "50%",
                      }}
                    ></span>
                  </span>
                </label>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: p.active ? "#16a34a" : "#94a3b8",
                    width: "55px",
                  }}
                >
                  {updatingPaymentId === p.id
                    ? "SAVING"
                    : p.active
                      ? "ACTIVE"
                      : "INACTIVE"}
                </span>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: isDark ? "#24272b" : "#f8fafc",
            border: `2px dashed ${isDark ? "#2d3139" : "#cbd5e1"}`,
            borderRadius: "10px",
            color: isDark ? "#ffffff" : "#0f172a",
            fontSize: "13px",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            marginTop: "16px",
          }}
        >
          <AddCircleOutlineOutlinedIcon style={{ fontSize: "18px" }} /> Add New
          Payment Gateway Account
        </button>
      </div>

      {/* 3. AGE GROUP MANAGEMENT */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>
              <CategoryOutlinedIcon
                style={{ color: "#7c3aed", fontSize: "25px" }}
              />{" "}
              3. Age Group Management
            </h3>
            <p style={styles.cardDesc}>
              Create and maintain the age groups available for tournament
              registration.
            </p>
          </div>
          <span
            style={{
              fontSize: "11px",
              backgroundColor: isDark ? "#2e1065" : "#f5f3ff",
              color: "#7c3aed",
              padding: "4px 10px",
              borderRadius: "6px",
              fontWeight: "bold",
              border: "1px solid #ddd6fe",
            }}
          >
            {ageGroups.length} AGE GROUPS
          </span>
        </div>

        {ageGroupLoadError && (
          <p role="alert" style={{ color: "#b91c1c", fontSize: "13px" }}>
            Unable to load age groups: {ageGroupLoadError}
          </p>
        )}
        {ageGroupActionError && (
          <p role="alert" style={{ color: "#b91c1c", fontSize: "13px" }}>
            {ageGroupActionError}
          </p>
        )}

        <form
          onSubmit={handleAgeGroupSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            alignItems: "end",
            marginBottom: "20px",
          }}
        >
          <div>
            <label style={styles.label} htmlFor="age-group-name">
              AGE GROUP NAME
            </label>
            <input
              id="age-group-name"
              type="text"
              required
              maxLength={50}
              placeholder="e.g. U12"
              style={styles.input}
              value={ageGroupForm.name}
              onChange={(event) =>
                setAgeGroupForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <label style={styles.label} htmlFor="age-group-age">
              MAXIMUM AGE
            </label>
            <input
              id="age-group-age"
              type="number"
              required
              min="1"
              step="1"
              placeholder="e.g. 12"
              style={styles.input}
              value={ageGroupForm.age}
              onChange={(event) =>
                setAgeGroupForm((current) => ({
                  ...current,
                  age: event.target.value,
                }))
              }
            />
          </div>
          <div style={{ display: "flex", gap: "8px", gridColumn: "1 / -1" }}>
            <button
              type="submit"
              disabled={savingAgeGroup}
              style={styles.btnPrimary}
            >
              <AddCircleOutlineOutlinedIcon style={{ fontSize: "17px" }} />
              {savingAgeGroup
                ? "Saving..."
                : editingAgeGroupId == null
                  ? "Add Age Group"
                  : "Save Changes"}
            </button>
            {editingAgeGroupId != null && (
              <button
                type="button"
                onClick={handleCancelAgeGroupEdit}
                disabled={savingAgeGroup}
                style={styles.btnSecondary}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {isLoadingAgeGroups ? (
          <p role="status" style={{ color: "#64748b", fontSize: "13px" }}>
            Loading age groups...
          </p>
        ) : !ageGroupLoadError && ageGroups.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: "13px" }}>
            No age groups have been added yet.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "10px",
              maxHeight: "420px",
              overflowY: "auto",
              paddingRight: "8px",
            }}
          >
            {ageGroups.map((group) => (
              <div
                key={group.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  padding: "14px 16px",
                  backgroundColor: isDark ? "#24272b" : "#f8fafc",
                  border: `1px solid ${isDark ? "#2d3139" : "#e2e8f0"}`,
                  borderRadius: "10px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: isDark ? "#fff" : "#0f172a",
                    }}
                  >
                    {group.name}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginTop: "3px",
                    }}
                  >
                    Maximum age: {group.age}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleEditAgeGroup(group)}
                    disabled={
                      savingAgeGroup ||
                      deletingAgeGroupId != null ||
                      loadingAgeGroupId != null
                    }
                    style={styles.btnSecondary}
                  >
                    <EditOutlinedIcon
                      style={{ fontSize: "15px", verticalAlign: "middle" }}
                    />{" "}
                    {loadingAgeGroupId === group.id ? "Loading..." : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAgeGroup(group)}
                    disabled={
                      deletingAgeGroupId != null ||
                      savingAgeGroup ||
                      loadingAgeGroupId != null
                    }
                    aria-label={`Delete ${group.name}`}
                    style={{
                      ...styles.btnSecondary,
                      color: "#b91c1c",
                      borderColor: isDark ? "#7f1d1d" : "#fecaca",
                    }}
                  >
                    <DeleteOutlineOutlinedIcon
                      style={{ fontSize: "16px", verticalAlign: "middle" }}
                    />{" "}
                    {deletingAgeGroupId === group.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div style={styles.footerActions}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: "#dc2626",
            fontWeight: "bold",
          }}
        >
          <WarningAmberIcon style={{ fontSize: "18px" }} /> Unsaved changes will
          affect live user portal instantly upon saving.
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            onClick={() => triggerToast("Changes discarded.")}
            style={styles.btnSecondary}
          >
            Discard Changes
          </button>
          <button
            type="button"
            onClick={handleSaveSynchronize}
            style={{ ...styles.btnPrimary, backgroundColor: "#991b1b" }}
          >
            Save & Synchronize Website
          </button>
        </div>
      </div>

      {/* MODAL 1: ADD NEW PAYMENT GATEWAY */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
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
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                marginBottom: "4px",
              }}
            >
              Add New Payment Gateway Account
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginBottom: "20px",
              }}
            >
              TOURNAMENT ENTRY COLLECTIONS
            </p>

            <form onSubmit={handleAddPaymentSubmit}>
              <div style={{ marginBottom: "14px" }}>
                <label style={styles.label}>
                  PAYMENT SERVICE PROVIDER NAME *
                </label>
                <input
                  type="text"
                  placeholder="e.g., AYA Pay / KBZPay"
                  style={styles.input}
                  value={newPayment.name}
                  onChange={(e) =>
                    setNewPayment({ ...newPayment, name: e.target.value })
                  }
                  required
                />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={styles.label}>ACCOUNT OWNER NAME *</label>
                <input
                  type="text"
                  placeholder="e.g., NYX Badminton Official"
                  style={styles.input}
                  value={newPayment.owner}
                  onChange={(e) =>
                    setNewPayment({ ...newPayment, owner: e.target.value })
                  }
                  required
                />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={styles.label}>ACCOUNT NO. / PHONE *</label>
                <input
                  type="text"
                  placeholder="e.g., 09450123789"
                  style={styles.input}
                  value={newPayment.accNo}
                  onChange={(e) =>
                    setNewPayment({ ...newPayment, accNo: e.target.value })
                  }
                  required
                />
              </div>
              {paymentCreateError && (
                <p
                  role="alert"
                  style={{
                    margin: "0 0 16px",
                    color: "#b91c1c",
                    fontSize: "12px",
                  }}
                >
                  Unable to create payment method: {paymentCreateError}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setPaymentCreateError("");
                  }}
                  disabled={isCreatingPayment}
                  style={styles.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPayment}
                  style={styles.btnPrimary}
                >
                  {isCreatingPayment
                    ? "Creating..."
                    : "Save & Create Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PAYMENT GATEWAY */}
      {showEditModal && currentEditPayment && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
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
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                marginBottom: "4px",
              }}
            >
              Edit Payment Gateway
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginBottom: "20px",
              }}
            >
              GATEWAY CONFIGURATION
            </p>

            <form onSubmit={handleEditPaymentSubmit}>
              <div style={{ marginBottom: "14px" }}>
                <label style={styles.label}>
                  PAYMENT SERVICE PROVIDER NAME *
                </label>
                <input
                  type="text"
                  style={styles.input}
                  value={currentEditPayment.name}
                  onChange={(e) =>
                    setCurrentEditPayment({
                      ...currentEditPayment,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={styles.label}>ACCOUNT OWNER NAME *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={currentEditPayment.owner}
                  onChange={(e) =>
                    setCurrentEditPayment({
                      ...currentEditPayment,
                      owner: e.target.value,
                    })
                  }
                />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={styles.label}>ACCOUNT / PHONE *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={currentEditPayment.accNo}
                  onChange={(e) =>
                    setCurrentEditPayment({
                      ...currentEditPayment,
                      accNo: e.target.value,
                    })
                  }
                />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={styles.label}>
                  CURRENT PAYMENT QR CODE PHOTO
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    backgroundColor: isDark ? "#24272b" : "#f8fafc",
                    padding: "10px",
                    borderRadius: "8px",
                    border: `1px solid ${isDark ? "#2d3139" : "#e2e8f0"}`,
                  }}
                >
                  <img
                    src={currentEditPayment.qr}
                    alt="QR"
                    style={{
                      width: "50px",
                      height: "50px",
                      objectFit: "cover",
                      borderRadius: "6px",
                    }}
                  />
                  <label
                    style={{
                      backgroundColor: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      color: "#0f172a",
                    }}
                  >
                    Replace / Upload QR
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          setCurrentEditPayment({
                            ...currentEditPayment,
                            qr: URL.createObjectURL(e.target.files[0]),
                          });
                          triggerToast("QR code updated.");
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleDeletePayment(currentEditPayment.id)}
                  style={{
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <DeleteOutlineOutlinedIcon style={{ fontSize: "16px" }} />{" "}
                  Delete Account
                </button>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    style={styles.btnSecondary}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={styles.btnPrimary}>
                    Save Updates
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
