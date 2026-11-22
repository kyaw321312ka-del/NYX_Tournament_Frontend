import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PhoneIcon from "@mui/icons-material/Phone";
import LanguageIcon from "@mui/icons-material/Language";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LogoImg from "../assets/hero.png";
import { getContactSupport } from "../features/payments/api/contactSupportApi";

export default function Footer() {
  const [contactSupport, setContactSupport] = useState(null);
  const [contactSupportError, setContactSupportError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadContactSupport() {
      try {
        const result = await getContactSupport();
        if (!cancelled) setContactSupport(result);
      } catch (error) {
        if (!cancelled) {
          setContactSupportError(
            error instanceof Error
              ? error.message
              : "Unable to load contact support information.",
          );
        }
      }
    }

    loadContactSupport();
    return () => {
      cancelled = true;
    };
  }, []);

  const contactValue = (value) =>
    contactSupportError
      ? "Contact details unavailable"
      : value || "Not provided";

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .nyx-footer-container {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 20px !important;
            padding: 24px 16px !important;
          }
          .nyx-footer-section {
            align-items: center !important;
            text-align: center !important;
          }
        }
      `}</style>
      <footer
        style={{
          backgroundColor: "#0b132b",
          color: "#94a3b8",
          borderTop: "1px solid #1e293b",
          width: "100%",
          marginTop: "auto",
        }}
      >
        <div
          className="nyx-footer-container"
          style={{
            width: "100%",
            padding: "24px 32px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "24px",
            boxSizing: "border-box",
          }}
        >
          {/* Left: Logo & Description */}
          <div
            className="nyx-footer-section"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxWidth: "320px",
            }}
          >
            <Link
              to="/"
              style={{
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
              }}
            >
              <img
                src={LogoImg}
                alt="NYX Logo"
                style={{
                  height: "42px",
                  width: "auto",
                  objectFit: "contain",
                  borderRadius: "6px",
                }}
              />
            </Link>
            <p
              style={{
                fontSize: "12.5px",
                margin: 0,
                lineHeight: 1.6,
                color: "#94a3b8",
              }}
            >
              The Ultimate Badminton Tournament & Management Platform. Play with
              passion. Rise through the ranks.
            </p>
          </div>

          {/* Middle: Contact & Support */}
          <div
            className="nyx-footer-section"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <h4
              style={{
                color: "#ffffff",
                fontSize: "17px",
                fontWeight: "800",
                margin: "0 0 4px 0",
              }}
            >
              Contact & Support
            </h4>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12.5px",
              }}
            >
              <PhoneIcon style={{ fontSize: 16, color: "#ff3366" }} />
              <span>{contactValue(contactSupport?.phone)}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12.5px",
              }}
            >
              <LanguageIcon style={{ fontSize: 16, color: "#ff3366" }} />
              <span>{contactValue(contactSupport?.website)}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12.5px",
              }}
            >
              <EmailIcon style={{ fontSize: 16, color: "#ff3366" }} />
              <span>{contactValue(contactSupport?.email)}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                fontSize: "12.5px",
              }}
            >
              <LocationOnIcon
                style={{
                  fontSize: 16,
                  color: "#ff3366",
                  marginTop: "2px",
                  flexShrink: 0,
                }}
              />
              <span>{contactValue(contactSupport?.address)}</span>
            </div>
            {contactSupportError && (
              <span role="alert" style={{ fontSize: "11px", color: "#fca5a5" }}>
                {contactSupportError}
              </span>
            )}
          </div>

          {/* Right: Association & Copyright */}
          <div
            className="nyx-footer-section"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              textAlign: "right",
            }}
          >
            <h4
              style={{
                color: "#ffffff",
                fontSize: "17px",
                fontWeight: "800",
                margin: "0 0 4px 0",
              }}
            >
              NYX Association
            </h4>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              © 2026 NYX Badminton. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
