import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ScoreboardIcon from "@mui/icons-material/Scoreboard";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import LogoImg from "../assets/hero.png";
import { useAuth } from "../features/auth/hooks/useAuth";
import { resolveApiAssetUrl } from "../core/api/apiClient";

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [showName, setShowName] = useState(false);
  const displayName = session?.user?.name || "Player";
  const profileImageUrl = resolveApiAssetUrl(session?.user?.profileImageUrl);
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isTournamentDetails = location.pathname.startsWith(
    "/tournament-details",
  );
  const isEnrollPage = location.pathname === "/enroll";
  const isProfilePage = location.pathname === "/profile";
  const isAdminPage = location.pathname.startsWith("/admin");

  const showBackIcon = isTournamentDetails || isEnrollPage;
  const hideNavTabs = isEnrollPage || isTournamentDetails || isAdminPage;

  const navLinks = [
    { name: "Home", path: "/", icon: <HomeIcon style={{ fontSize: 18 }} /> },
    {
      name: "Tournaments",
      path: "/tournaments",
      icon: <EmojiEventsIcon style={{ fontSize: 18 }} />,
    },
    {
      name: "Matches",
      path: "/matches",
      icon: <ScoreboardIcon style={{ fontSize: 18 }} />,
    },
    {
      name: "Leaderboard",
      path: "/leaderboard",
      icon: <LeaderboardIcon style={{ fontSize: 18 }} />,
    },
  ];

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .nyx-topbar-container {
            padding: 0 6px !important;
            height: 54px !important;
            gap: 4px !important;
          }
          .nyx-nav-links {
            padding: 2px !important;
            gap: 2px !important;
          }
          .nyx-nav-link {
            padding: 6px 8px !important;
            font-size: 11px !important;
          }
          /* မနှိပ်ထားသော (inactive) tab များတွင် icon ကိုသာပြပြီး စာသားကို ဖုံးမည် */
          .nyx-nav-link:not(.nyx-tab-active) .nyx-nav-text {
            display: none !important;
          }
          /* နှိပ်ထားသော (active) tab တွင် icon ကိုဖုံးပြီး စာသားကိုသာပြမည် */
          .nyx-nav-link.nyx-tab-active .nyx-nav-icon {
            display: none !important;
          }
          .nyx-logo-img {
            height: 28px !important;
          }
          .nyx-profile-avatar {
            width: 28px !important;
            height: 28px !important;
          }
        }
      `}</style>
      <header
        style={{
          backgroundColor: isAdminPage ? "#0f172a" : "#0b132b",
          color: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid #1e293b",
          width: "100%",
        }}
      >
        <div
          className="nyx-topbar-container"
          style={{
            maxWidth: "100%",
            margin: "0 auto",
            padding: "0 14px",
            height: "60px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* ဘယ်ဘက်ခြမ်း: Back Icon နှင့် Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              flexShrink: 0,
            }}
          >
            {showBackIcon && (
              <button
                onClick={() => navigate(-1)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  transition: "background 0.2s",
                }}
                title="Go Back"
              >
                <ChevronLeftRoundedIcon style={{ fontSize: 20 }} />
              </button>
            )}

            <Link
              to="/"
              style={{
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              <img
                src={LogoImg}
                alt="NYX Logo"
                className="nyx-logo-img"
                style={{
                  height: "34px",
                  width: "auto",
                  objectFit: "contain",
                  borderRadius: "6px",
                }}
              />
            </Link>
          </div>

          {/* အလယ်ပိုင်း: Navigation Tabs */}
          {!hideNavTabs && (
            <nav
              className="nyx-nav-links"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                backgroundColor: "#070b19",
                padding: "4px",
                borderRadius: "10px",
                border: "1px solid #1e293b",
              }}
            >
              {navLinks.map((link) => {
                const isActive =
                  !isProfilePage && location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`nyx-nav-link ${isActive ? "nyx-tab-active" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "6px 10px",
                      borderRadius: "7px",
                      fontSize: "12.5px",
                      fontWeight: "600",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s",
                      backgroundColor: isActive ? "#ff3366" : "transparent",
                      color: isActive ? "#ffffff" : "#94a3b8",
                    }}
                  >
                    <span
                      className="nyx-nav-icon"
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      {link.icon}
                    </span>
                    <span className="nyx-nav-text">{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {isAdminPage && (
            <div
              style={{
                fontSize: "13px",
                fontWeight: "800",
                color: "#ff3366",
                letterSpacing: "0.5px",
              }}
            >
              🛡️ ADMIN PANEL
            </div>
          )}

          {!isAdminPage && !session && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Link
                to="/login"
                style={{
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: "700",
                  padding: "8px 10px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Login
              </Link>
              <Link
                to="/register"
                style={{
                  backgroundColor: "#ff3366",
                  borderRadius: "7px",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: "700",
                  padding: "8px 12px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Register
              </Link>
            </div>
          )}

          {!isAdminPage && session && (
            <div
              onClick={() => navigate("/profile")}
              onMouseEnter={() => setShowName(true)}
              onMouseLeave={() => setShowName(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                padding: "2px 6px 2px 2px",
                borderRadius: "20px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
              title="View Profile"
            >
              <div
                className="nyx-profile-avatar"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#ae1236",
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "12px",
                  fontWeight: "900",
                  boxShadow: "0 2px 6px rgba(174, 18, 54, 0.4)",
                  overflow: "hidden",
                }}
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={displayName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  initials
                )}
              </div>

              {showName && (
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: "#ffffff",
                    paddingRight: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayName}
                </span>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
