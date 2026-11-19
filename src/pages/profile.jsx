import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import SportsTennisRoundedIcon from "@mui/icons-material/SportsTennisRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { useAuth } from "../features/auth/useAuth";
import { resolveApiAssetUrl } from "../core/api/apiClient";

const initialCategories = ["U-13 Singles", "U-13 Doubles", "U-15 Singles"];

const availableCategories = [
  "U-11 Singles",
  "U-11 Doubles",
  "U-13 Singles",
  "U-13 Doubles",
  "U-15 Singles",
  "U-15 Doubles",
  "U-17 Singles",
  "U-17 Doubles",
];

const tournaments = [
  {
    name: "Mandalay Open 2026",
    date: "Oct 12, 2026",
    category: "U-15 Singles",
    result: "CHAMPION",
    points: "+1,200",
    status: "champion",
  },
  {
    name: "Yangon Super Series",
    date: "Aug 20, 2026",
    category: "U-13 Doubles",
    result: "RUNNER-UP",
    points: "+950",
    status: "runner",
  },
  {
    name: "Bago National Cup",
    date: "May 15, 2026",
    category: "U-13 Singles",
    result: "SEMI-FINALIST",
    points: "+750",
    status: "semi",
  },
];

const paymentSlipsHistory = [
  {
    id: "slip-1",
    tournament: "Mandalay Open Championship 2026",
    gateway: "KBZ Pay",
    amount: "25,000 MMK",
    enrollId: "#YGN-8842",
    date: "Nov 12, 2026",
    status: "Paid & Verified",
    file: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "slip-2",
    tournament: "Yangon Summer Cup 2026",
    gateway: "Wave Pay",
    amount: "25,000 MMK",
    enrollId: "#YGN-8105",
    date: "Aug 15, 2026",
    status: "Paid & Verified",
    file: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
  },
];

export default function Profile() {
  const navigate = useNavigate();
  const { session, refreshUser, signOut } = useAuth();
  const user = session?.user;
  const isAuthenticated = Boolean(session?.token);
  const [loading, setLoading] = useState(true);

  const initialPlayer = {
    fullName: user?.name || "",
    phone: user?.phno || "",
    email: user?.email || "",
    gender: user?.gender || "",
    club: "",
    address: "",
  };
  const [player, setPlayer] = useState(initialPlayer);
  const [categories, setCategories] = useState(initialCategories);

  const [profileImage, setProfileImage] = useState(() =>
    resolveApiAssetUrl(user?.profileImageUrl),
  );

  const [showImageMenu, setShowImageMenu] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  // Modals States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [showPass3, setShowPass3] = useState(false);

  const [showSavePasswordModal, setShowSavePasswordModal] = useState(false);
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!isAuthenticated) {
        navigate("/", { replace: true });
        return;
      }

      setLoading(true);
      try {
        const currentUser = await refreshUser();
        if (cancelled) return;

        setPlayer((previous) => ({
          ...previous,
          fullName: currentUser.name || "",
          phone: currentUser.phno || "",
          email: currentUser.email || "",
          gender: currentUser.gender || "",
        }));
        setProfileImage(resolveApiAssetUrl(currentUser.profileImageUrl));
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? `Unable to load profile: ${error.message}`
              : "Unable to load profile.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate, refreshUser]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Server logout failed after clearing the local session.", error);
    } finally {
      navigate("/", { replace: true });
    }
  };

  const updateField = (field, value) => {
    setPlayer((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfileImage(reader.result);
      setShowImageMenu(false);
      setMessage("Profile photo updated successfully.");
    };
    reader.readAsDataURL(file);
  };

  const addCategory = (category) => {
    if (!category || categories.includes(category)) return;
    if (categories.length >= 3) {
      setMessage("Maximum 3 competition categories are allowed.");
      return;
    }
    setCategories((prev) => [...prev, category]);
    setSaved(false);
  };

  const removeCategory = (category) => {
    setCategories((prev) => prev.filter((item) => item !== category));
    setSaved(false);
  };

  const handleSaveClick = () => {
    if (
      !player.fullName.trim() ||
      !player.phone.trim() ||
      !player.email.trim() ||
      !player.club.trim() ||
      !player.address.trim()
    ) {
      setMessage("Please fill in all personal information fields.");
      return;
    }
    if (categories.length === 0) {
      setMessage("Please select at least one competition category.");
      return;
    }
    setShowSavePasswordModal(true);
  };

  const verifyAndSave = (e) => {
    e.preventDefault();
    if (!confirmPasswordInput) {
      alert("Please enter your account password to confirm changes.");
      return;
    }
    setShowSavePasswordModal(false);
    setConfirmPasswordInput("");
    setSaved(true);
    setMessage(
      "Profile changes saved successfully with password verification.",
    );
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f7f8fa",
          fontSize: "16px",
          fontWeight: "800",
          color: "#64748b",
        }}
      >
        Loading Profile...
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",

        background: "#f7f8fa",
        color: "#172033",
        fontFamily: "'Inter', sans-serif",
        boxSizing: "border-box",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          boxSizing: "border-box",
        }}
      >
        {/* Profile Header */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #eef0f3",
            borderRadius: "16px",
            padding: "24px 16px",
            boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            boxSizing: "border-box",
          }}
        >
          <div style={{ position: "relative", marginBottom: "14px" }}>
            <div
              onClick={() => setShowImageMenu(!showImageMenu)}
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "50%",
                background: "#0f172a",
                border: "3px solid #ae1236",
                overflow: "hidden",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                position: "relative",
              }}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{ color: "#fff", fontSize: "28px", fontWeight: "900" }}
                >
                  {(player.fullName || "Player")
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>

            <div
              style={{
                position: "absolute",
                bottom: "2px",
                right: "2px",
                background: "#21865b",
                color: "#fff",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "grid",
                placeItems: "center",
                border: "2px solid #fff",
              }}
            >
              <VerifiedRoundedIcon style={{ fontSize: "14px" }} />
            </div>

            {showImageMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "105px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "8px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  zIndex: 50,
                  width: "160px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  <ImageRoundedIcon style={{ fontSize: "16px" }} /> Change Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    style={{ display: "none" }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setProfileImage("");
                    setShowImageMenu(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: "8px",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#dc2626",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <DeleteOutlineRoundedIcon style={{ fontSize: "16px" }} />{" "}
                  Remove Photo
                </button>
              </div>
            )}
          </div>

          <h1
            style={{
              fontSize: "20px",
              fontWeight: "900",
              color: "#172033",
              margin: "0 0 4px",
            }}
          >
            {player.fullName}
          </h1>
          <div
            style={{
              fontSize: "12.5px",
              color: "#64748b",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "14px",
            }}
          >
            <ShieldRoundedIcon style={{ fontSize: "16px", color: "#ae1236" }} />{" "}
            {player.club || `${user?.role || "Player"} account`}
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                background: "#fff5f7",
                color: "#ae1236",
                border: "1px solid #f8d7da",
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "11.5px",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <EmojiEventsRoundedIcon style={{ fontSize: "15px" }} /> Rank #1
              Global
            </div>
            <div
              style={{
                background: "#f8f9fa",
                color: "#334155",
                border: "1px solid #cbd5e1",
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "11.5px",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <VerifiedRoundedIcon
                style={{ fontSize: "15px", color: "#21865b" }}
              />{" "}
              Official Athlete
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "12px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #eef0f3",
              borderRadius: "14px",
              padding: "16px",
              textAlign: "center",
              boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
            }}
          >
            <div
              style={{ fontSize: "20px", fontWeight: "900", color: "#172033" }}
            >
              4,850
            </div>
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: "800",
                color: "#64748b",
                marginTop: "4px",
              }}
            >
              TOTAL RANKING POINTS
            </div>
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #eef0f3",
              borderRadius: "14px",
              padding: "16px",
              textAlign: "center",
              boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
            }}
          >
            <div
              style={{ fontSize: "20px", fontWeight: "900", color: "#21865b" }}
            >
              16W - 1L
            </div>
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: "800",
                color: "#64748b",
                marginTop: "4px",
              }}
            >
              CAREER RECORD
            </div>
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #eef0f3",
              borderRadius: "14px",
              padding: "16px",
              textAlign: "center",
              boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
            }}
          >
            <div
              style={{ fontSize: "20px", fontWeight: "900", color: "#ae1236" }}
            >
              94.1%
            </div>
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: "800",
                color: "#64748b",
                marginTop: "4px",
              }}
            >
              WIN RATE
            </div>
          </div>
        </div>

        {/* SECTION A: Personal Information & Event Categories */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #eef0f3",
            borderRadius: "16px",
            padding: "20px 16px",
            boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "900",
                  color: "#172033",
                  margin: "0 0 3px",
                }}
              >
                A. Personal Information & Event Categories
              </h2>
              <p
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  margin: 0,
                  fontWeight: "600",
                }}
              >
                Update your certified athlete details and competition divisions.
              </p>
            </div>
            <span
              style={{
                background: "#f8f9fa",
                border: "1px solid #cbd5e1",
                padding: "5px 10px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "800",
                color: "#334155",
              }}
            >
              NYX ID: #YGN-8842
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
              boxSizing: "border-box",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: "800",
                  color: "#334155",
                  marginBottom: "5px",
                }}
              >
                Full Name
              </label>
              <input
                type="text"
                value={player.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Gender
              </label>
              <input
                type="text"
                value={player.gender}
                onChange={(e) => updateField("gender", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  fontWeight: "700",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Gender
              </label>
              <input
                type="text"
                value={player.gender}
                onChange={(e) => updateField("gender", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  fontWeight: "700",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: "800",
                  color: "#334155",
                  marginBottom: "5px",
                }}
              >
                Phone Number
              </label>
              <input
                type="text"
                value={player.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: "800",
                  color: "#334155",
                  marginBottom: "5px",
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                value={player.email}
                onChange={(e) => updateField("email", e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: "800",
                  color: "#334155",
                  marginBottom: "5px",
                }}
              >
                Team / Club Name
              </label>
              <input
                type="text"
                value={player.club}
                onChange={(e) => updateField("club", e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: "800",
                  color: "#334155",
                  marginBottom: "5px",
                }}
              >
                Full Address
              </label>
              <input
                type="text"
                value={player.address}
                onChange={(e) => updateField("address", e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <label
                style={{
                  fontSize: "12.5px",
                  fontWeight: "900",
                  color: "#172033",
                }}
              >
                Competition Categories (Max 3 Allowed)
              </label>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: "800",
                  color: "#ae1236",
                }}
              >
                {categories.length}/3 Selected
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              {categories.map((cat) => (
                <div
                  key={cat}
                  style={{
                    background: "#fff5f7",
                    border: "1px solid #f8d7da",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "800",
                    color: "#ae1236",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <SportsTennisRoundedIcon style={{ fontSize: "15px" }} /> {cat}
                  <button
                    type="button"
                    onClick={() => removeCategory(cat)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ae1236",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <CloseRoundedIcon style={{ fontSize: "15px" }} />
                  </button>
                </div>
              ))}
            </div>
            {categories.length < 3 && (
              <select
                value=""
                onChange={(e) => addCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px dashed #cbd5e1",
                  fontSize: "12.5px",
                  fontWeight: "800",
                  color: "#475569",
                  background: "#f8f9fa",
                  cursor: "pointer",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="">+ Add Competition Category</option>
                {availableCategories
                  .filter((c) => !categories.includes(c))
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            )}
          </div>
        </div>

        {/* SECTION B: Verified ID Documents (Front & Back NRC Previews) */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #eef0f3",
            borderRadius: "16px",
            padding: "20px 16px",
            boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
            boxSizing: "border-box",
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              fontWeight: "900",
              color: "#172033",
              margin: "0 0 3px",
            }}
          >
            B. Verified ID Documents (Front & Back NRC / Birth Certificate)
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "#64748b",
              margin: "0 0 16px",
              fontWeight: "600",
            }}
          >
            Official verified identification documents for BWF age group
            placement.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
              marginBottom: "18px",
              boxSizing: "border-box",
            }}
          >
            {/* Front Card Preview */}
            <div
              style={{
                background: "#f8f9fa",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "900",
                    color: "#172033",
                  }}
                >
                  Front Side Photo Preview
                </span>
                <span
                  style={{
                    fontSize: "10.5px",
                    color: "#21865b",
                    fontWeight: "800",
                    background: "#e7f7ee",
                    padding: "2px 6px",
                    borderRadius: "6px",
                  }}
                >
                  ✔ Verified
                </span>
              </div>
              <div
                onClick={() =>
                  setSelectedDocument({
                    title: "Front Side Photo Preview",
                    file: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
                  })
                }
                style={{
                  width: "100%",
                  height: "130px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80"
                  alt="Front ID"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedDocument({
                    title: "Front Side Photo Preview",
                    file: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
                  })
                }
                style={{
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "8px",
                  fontSize: "11.5px",
                  fontWeight: "900",
                  color: "#ae1236",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <OpenInNewRoundedIcon style={{ fontSize: "15px" }} /> View Full
                Document
              </button>
            </div>

            {/* Back Card Preview */}
            <div
              style={{
                background: "#f8f9fa",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "900",
                    color: "#172033",
                  }}
                >
                  Back Side Photo Preview
                </span>
                <span
                  style={{
                    fontSize: "10.5px",
                    color: "#21865b",
                    fontWeight: "800",
                    background: "#e7f7ee",
                    padding: "2px 6px",
                    borderRadius: "6px",
                  }}
                >
                  ✔ Verified
                </span>
              </div>
              <div
                onClick={() =>
                  setSelectedDocument({
                    title: "Back Side Photo Preview",
                    file: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
                  })
                }
                style={{
                  width: "100%",
                  height: "130px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80"
                  alt="Back ID"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedDocument({
                    title: "Back Side Photo Preview",
                    file: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
                  })
                }
                style={{
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "8px",
                  fontSize: "11.5px",
                  fontWeight: "900",
                  color: "#ae1236",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <OpenInNewRoundedIcon style={{ fontSize: "15px" }} /> View Full
                Document
              </button>
            </div>
          </div>

          {/* Cancel & Save Changes Buttons placed properly under Section B */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              borderTop: "1px solid #eef0f3",
              paddingTop: "16px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setPlayer(initialPlayer);
                setCategories(initialCategories);
                setMessage("Changes have been cancelled.");
              }}
              style={{
                background: "#f1f5f9",
                color: "#334155",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: "900",
                cursor: "pointer",
                flex: "1 1 auto",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              style={{
                background: "#ae1236",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "10px 22px",
                fontSize: "13px",
                fontWeight: "900",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 14px rgba(174,18,54,0.3)",
                flex: "2 1 auto",
              }}
            >
              <SaveRoundedIcon style={{ fontSize: "17px" }} /> Save Changes
            </button>
          </div>

          {message && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: saved ? "#e7f7ee" : "#fff5f7",
                color: saved ? "#21865b" : "#ae1236",
                fontSize: "12.5px",
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              {message}
            </div>
          )}
        </div>

        {/* SECTION C: Tournament Payment Proof Slips History */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #eef0f3",
            borderRadius: "16px",
            padding: "20px 16px",
            boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "900",
                  color: "#172033",
                  margin: "0 0 3px",
                }}
              >
                C. Tournament Payment Proof Slips History
              </h2>
              <p
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  margin: 0,
                  fontWeight: "600",
                }}
              >
                All transaction receipts submitted for tournament enrollments
              </p>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "800",
                color: "#21865b",
                background: "#e7f7ee",
                padding: "4px 8px",
                borderRadius: "6px",
              }}
            >
              {paymentSlipsHistory.length} Verified
            </span>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {paymentSlipsHistory.map((slip) => (
              <div
                key={slip.id}
                style={{
                  background: "#f8f9fa",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flex: "1 1 200px",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      background: "#fff5f7",
                      color: "#ae1236",
                      borderRadius: "10px",
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid #f8d7da",
                      flexShrink: 0,
                    }}
                  >
                    <ReceiptLongRoundedIcon style={{ fontSize: "20px" }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "900",
                        color: "#172033",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {slip.tournament}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        fontWeight: "700",
                        marginTop: "2px",
                      }}
                    >
                      {slip.gateway} •{" "}
                      <span style={{ color: "#ae1236" }}>{slip.amount}</span> •{" "}
                      {slip.enrollId}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      color: "#21865b",
                      background: "#e7f7ee",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <CheckCircleRoundedIcon style={{ fontSize: "13px" }} />{" "}
                    Verified
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDocument({
                        title: `Payment Slip (${slip.gateway})`,
                        file: slip.file,
                      })
                    }
                    style={{
                      background: "#172033",
                      color: "#fff",
                      border: "none",
                      padding: "7px 12px",
                      borderRadius: "8px",
                      fontSize: "11.5px",
                      fontWeight: "800",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    View Slip{" "}
                    <OpenInNewRoundedIcon style={{ fontSize: "13px" }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION D: Past Tournament History & Earned Points */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #eef0f3",
            borderRadius: "16px",
            padding: "20px 16px",
            boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "900",
                  color: "#172033",
                  margin: "0 0 3px",
                }}
              >
                D. Past Tournament History & Earned Points
              </h2>
              <p
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  margin: 0,
                  fontWeight: "600",
                }}
              >
                Official BWF Grade 2 Sanctioned Circuits & Results
              </p>
            </div>
            <span
              style={{
                background: "#f8f9fa",
                border: "1px solid #cbd5e1",
                padding: "5px 10px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "800",
                color: "#334155",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <CalendarMonthRoundedIcon
                style={{ fontSize: "15px", color: "#ae1236" }}
              />{" "}
              Season 2026
            </span>
          </div>

          <div style={{ width: "100%", overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                minWidth: "600px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "2px solid #eef0f3",
                    color: "#64748b",
                    fontSize: "10.5px",
                    fontWeight: "900",
                  }}
                >
                  <th style={{ padding: "10px" }}>TOURNAMENT NAME</th>
                  <th style={{ padding: "10px" }}>EVENT DATE</th>
                  <th style={{ padding: "10px" }}>CATEGORY</th>
                  <th style={{ padding: "10px" }}>RESULT</th>
                  <th style={{ padding: "10px" }}>POINTS EARNED</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((t, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#172033",
                    }}
                  >
                    <td style={{ padding: "12px 10px" }}>{t.name}</td>
                    <td style={{ padding: "12px 10px", color: "#64748b" }}>
                      {t.date}
                    </td>
                    <td style={{ padding: "12px 10px" }}>{t.category}</td>
                    <td style={{ padding: "12px 10px" }}>
                      <span
                        style={{
                          background:
                            t.status === "champion" ? "#e7f7ee" : "#f1f5f9",
                          color:
                            t.status === "champion" ? "#21865b" : "#475569",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "10.5px",
                          fontWeight: "900",
                        }}
                      >
                        {t.result}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 10px",
                        color: "#ae1236",
                        fontWeight: "900",
                      }}
                    >
                      {t.points} PTS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Account Bottom Actions (Password & Logout) */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            borderTop: "1px solid #eef0f3",
            paddingTop: "16px",
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            style={{
              background: "#fff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "11px 18px",
              fontSize: "12.5px",
              fontWeight: "900",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flex: "1 1 auto",
              justifyContent: "center",
            }}
          >
            <LockResetRoundedIcon style={{ fontSize: "18px" }} /> Change
            Password
          </button>
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            style={{
              background: "#fff5f7",
              color: "#dc2626",
              border: "1px solid #f8d7da",
              borderRadius: "10px",
              padding: "11px 18px",
              fontSize: "14px",
              fontWeight: "900",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flex: "1 1 auto",
              justifyContent: "center",
            }}
          >
            <LogoutRoundedIcon style={{ fontSize: "17px" }} /> Log Out of
            Account
          </button>
        </div>
      </div>

      {/* MODALS (Password confirmation, document preview, change password, logout) */}
      {showSavePasswordModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(9, 17, 29, 0.6)",
            backdropFilter: "blur(5px)",
            display: "grid",
            placeItems: "center",
            padding: "16px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "380px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#fff5f7",
                color: "#ae1236",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 14px",
                border: "1px solid #f8d7da",
              }}
            >
              <LockResetRoundedIcon style={{ fontSize: "22px" }} />
            </div>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: "900",
                color: "#172033",
                margin: "0 0 6px",
              }}
            >
              Confirm Account Password
            </h2>
            <p
              style={{
                fontSize: "12.5px",
                color: "#64748b",
                margin: "0 0 16px",
                lineHeight: "1.4",
              }}
            >
              To ensure account security, please enter your password to save
              profile edits.
            </p>
            <form
              onSubmit={verifyAndSave}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Enter your account password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 40px 11px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                    display: "flex",
                  }}
                >
                  {showConfirmPassword ? (
                    <VisibilityOffOutlinedIcon style={{ fontSize: "18px" }} />
                  ) : (
                    <VisibilityOutlinedIcon style={{ fontSize: "18px" }} />
                  )}
                </button>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setShowSavePasswordModal(false)}
                  style={{
                    flex: 1,
                    background: "#f1f5f9",
                    color: "#334155",
                    border: "none",
                    padding: "11px",
                    borderRadius: "10px",
                    fontWeight: "900",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: "#ae1236",
                    color: "#fff",
                    border: "none",
                    padding: "11px",
                    borderRadius: "10px",
                    fontWeight: "900",
                    cursor: "pointer",
                  }}
                >
                  Confirm & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDocument && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(9, 17, 29, 0.7)",
            backdropFilter: "blur(5px)",
            display: "grid",
            placeItems: "center",
            padding: "16px",
            boxSizing: "border-box",
          }}
          onClick={() => setSelectedDocument(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "20px",
              maxWidth: "520px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: "900",
                  color: "#172033",
                  margin: 0,
                }}
              >
                {selectedDocument.title}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedDocument(null)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
              >
                <CloseRoundedIcon style={{ fontSize: "16px" }} />
              </button>
            </div>
            <div
              style={{
                width: "100%",
                maxHeight: "320px",
                borderRadius: "10px",
                overflow: "hidden",
                border: "1px solid #cbd5e1",
                background: "#f8f9fa",
                marginBottom: "14px",
              }}
            >
              <img
                src={selectedDocument.file}
                alt="Document Preview"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <button
              type="button"
              onClick={() => setSelectedDocument(null)}
              style={{
                width: "100%",
                background: "#172033",
                color: "#fff",
                border: "none",
                padding: "11px",
                borderRadius: "10px",
                fontWeight: "900",
                cursor: "pointer",
              }}
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(9, 17, 29, 0.6)",
            backdropFilter: "blur(5px)",
            display: "grid",
            placeItems: "center",
            padding: "16px",
            boxSizing: "border-box",
          }}
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "380px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              textAlign: "center",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#fff5f7",
                color: "#ae1236",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 14px",
                border: "1px solid #f8d7da",
              }}
            >
              <LockResetRoundedIcon style={{ fontSize: "22px" }} />
            </div>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: "900",
                color: "#172033",
                margin: "0 0 5px",
              }}
            >
              Change Account Password
            </h2>
            <p
              style={{
                fontSize: "12.5px",
                color: "#64748b",
                margin: "0 0 16px",
                fontWeight: "600",
              }}
            >
              Secure your account with a strong new password.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowPasswordModal(false);
                alert("Password updated successfully!");
              }}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type={showPass1 ? "text" : "password"}
                  required
                  placeholder="Current Password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 40px 11px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass1(!showPass1)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                    display: "flex",
                  }}
                >
                  {showPass1 ? (
                    <VisibilityOffOutlinedIcon style={{ fontSize: "18px" }} />
                  ) : (
                    <VisibilityOutlinedIcon style={{ fontSize: "18px" }} />
                  )}
                </button>
              </div>

              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type={showPass2 ? "text" : "password"}
                  required
                  placeholder="New Password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 40px 11px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass2(!showPass2)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                    display: "flex",
                  }}
                >
                  {showPass2 ? (
                    <VisibilityOffOutlinedIcon style={{ fontSize: "18px" }} />
                  ) : (
                    <VisibilityOutlinedIcon style={{ fontSize: "18px" }} />
                  )}
                </button>
              </div>

              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type={showPass3 ? "text" : "password"}
                  required
                  placeholder="Confirm New Password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 40px 11px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass3(!showPass3)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                    display: "flex",
                  }}
                >
                  {showPass3 ? (
                    <VisibilityOffOutlinedIcon style={{ fontSize: "18px" }} />
                  ) : (
                    <VisibilityOutlinedIcon style={{ fontSize: "18px" }} />
                  )}
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  style={{
                    flex: 1,
                    background: "#f1f5f9",
                    color: "#334155",
                    border: "none",
                    padding: "11px",
                    borderRadius: "10px",
                    fontWeight: "900",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: "#ae1236",
                    color: "#fff",
                    border: "none",
                    padding: "11px",
                    borderRadius: "10px",
                    fontWeight: "900",
                    cursor: "pointer",
                  }}
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(9, 17, 29, 0.6)",
            backdropFilter: "blur(5px)",
            display: "grid",
            placeItems: "center",
            padding: "16px",
            boxSizing: "border-box",
          }}
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "360px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#fff5f7",
                color: "#dc2626",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 12px",
                border: "1px solid #f8d7da",
              }}
            >
              <LogoutRoundedIcon style={{ fontSize: "22px" }} />
            </div>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: "900",
                color: "#172033",
                margin: "0 0 6px",
              }}
            >
              Log out of your account?
            </h2>
            <p
              style={{
                fontSize: "12.5px",
                color: "#64748b",
                margin: "0 0 18px",
                fontWeight: "600",
              }}
            >
              Are you sure you want to end your current session?
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={{
                  flex: 1,
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "none",
                  padding: "11px",
                  borderRadius: "10px",
                  fontWeight: "900",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                style={{
                  flex: 1,
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  padding: "11px",
                  borderRadius: "10px",
                  fontWeight: "900",
                  cursor: isLoggingOut ? "wait" : "pointer",
                }}
              >
                {isLoggingOut ? "Logging Out..." : "Log Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
