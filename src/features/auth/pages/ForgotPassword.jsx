import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BoltIcon from "@mui/icons-material/Bolt";
import LockResetIcon from "@mui/icons-material/LockReset";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  requestPasswordReset,
  resetPassword,
  verifyPasswordResetOtp,
} from "../api/authApi";
import {
  clearSession,
  SESSION_EXPIRED_EVENT,
} from "../utils/session";

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  backgroundColor: "#f8fafc",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "13px",
  color: "#0f172a",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  backgroundColor: "#b91c1c",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: "700",
  cursor: "pointer",
};

export default function ForgotPassword({ onBackToLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState("email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const backToLogin = () => {
    if (onBackToLogin) {
      onBackToLogin();
      return;
    }
    navigate("/login");
  };

  const handleRequestCode = async (event) => {
    event?.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setNotice("");
    try {
      await requestPasswordReset(email.trim());
      setOtp("");
      setStep("otp");
      setNotice(
        "If an account exists for this email, a six-digit reset code has been sent. The code expires in 5 minutes.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to request a reset code.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setNotice("");
    try {
      const token = await verifyPasswordResetOtp({
        email: email.trim(),
        otp,
      });
      setResetToken(token);
      setStep("password");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to verify the reset code.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setNotice("");
    if (newPassword !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({ resetToken, newPassword });
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      setResetToken("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setStep("complete");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to reset the password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = () => {
    setStep("email");
    setOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMessage("");
    setNotice("");
  };

  const stepContent = {
    email: {
      title: "Reset Your Password",
      description:
        "Enter your registered email address. If an account exists, we will send a six-digit reset code.",
      submitLabel: "SEND RESET CODE",
      submittingLabel: "SENDING...",
      onSubmit: handleRequestCode,
    },
    otp: {
      title: "Verify Your Reset Code",
      description: `Enter the six-digit code sent to ${email}. It expires in 5 minutes.`,
      submitLabel: "VERIFY CODE",
      submittingLabel: "VERIFYING...",
      onSubmit: handleVerifyOtp,
    },
    password: {
      title: "Choose a New Password",
      description: "Set a new password for your account.",
      submitLabel: "RESET PASSWORD",
      submittingLabel: "RESETTING...",
      onSubmit: handleResetPassword,
    },
    complete: {
      title: "Password Updated",
      description:
        "Your password has been reset. Sign in with your new password.",
    },
  }[step];

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
        boxSizing: "border-box",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "500px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          padding: "32px 36px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: 800,
              border: "1px solid #e2e8f0",
            }}
          >
            <BoltIcon style={{ fontSize: "14px", color: "#ef4444" }} />
            NYX BADMINTON
          </div>
          <div style={{ margin: "16px 0 12px" }}>
            <LockResetIcon style={{ color: "#dc2626", fontSize: "30px" }} />
          </div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#0f172a",
              margin: "0 0 6px",
            }}
          >
            {stepContent.title}
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "#64748b",
              lineHeight: 1.5,
              margin: "0 auto",
            }}
          >
            {stepContent.description}
          </p>
        </div>

        {step !== "complete" && (
          <form
            onSubmit={stepContent.onSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {step === "email" && (
              <label
                style={{
                  display: "grid",
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#1e293b",
                }}
              >
                Email address
                <span style={{ position: "relative", display: "flex" }}>
                  <AlternateEmailIcon
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "10px",
                      color: "#94a3b8",
                      fontSize: "16px",
                    }}
                  />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="player@example.com"
                    style={{ ...inputStyle, paddingLeft: "38px" }}
                  />
                </span>
              </label>
            )}

            {step === "otp" && (
              <>
                <label
                  style={{
                    display: "grid",
                    gap: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#1e293b",
                  }}
                >
                  Six-digit reset code
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="123456"
                    style={{ ...inputStyle, letterSpacing: "0.3em" }}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleStartOver}
                  style={{
                    alignSelf: "flex-start",
                    padding: 0,
                    border: 0,
                    background: "none",
                    color: "#b91c1c",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Use a different email
                </button>
              </>
            )}

            {step === "password" && (
              <>
                <label
                  style={{
                    display: "grid",
                    gap: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#1e293b",
                  }}
                >
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label
                  style={{
                    display: "grid",
                    gap: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#1e293b",
                  }}
                >
                  Confirm new password
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    style={inputStyle}
                  />
                </label>
              </>
            )}

            <button type="submit" disabled={isSubmitting} style={buttonStyle}>
              {isSubmitting ? stepContent.submittingLabel : stepContent.submitLabel}
            </button>
          </form>
        )}

        {(notice || errorMessage) && (
          <p
            role={errorMessage ? "alert" : "status"}
            style={{
              margin: "14px 0 0",
              color: errorMessage ? "#b91c1c" : "#166534",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            {errorMessage || notice}
          </p>
        )}

        {step === "complete" ? (
          <button
            type="button"
            onClick={backToLogin}
            style={{ ...buttonStyle, marginTop: "18px" }}
          >
            BACK TO SIGN IN
          </button>
        ) : step === "otp" ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleRequestCode}
            style={{
              display: "block",
              margin: "14px auto 0",
              padding: "4px",
              border: 0,
              background: "none",
              color: "#b91c1c",
              cursor: isSubmitting ? "wait" : "pointer",
              fontSize: "12px",
            }}
          >
            Resend reset code
          </button>
        ) : null}

        {step !== "complete" && (
          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <button
              type="button"
              onClick={backToLogin}
              style={{
                background: "none",
                border: "none",
                color: "#b91c1c",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                padding: "4px",
              }}
            >
              ← Return to Sign In
            </button>
          </div>
        )}

        <div
          style={{
            marginTop: "18px",
            backgroundColor: "#f8fafc",
            border: "1px solid #f1f5f9",
            borderRadius: "10px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <LockOutlinedIcon
            style={{ fontSize: "15px", color: "#64748b", marginTop: "2px" }}
          />
          <p
            style={{
              fontSize: "11px",
              color: "#64748b",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Reset codes expire in 5 minutes. The verified reset token is
            single-use and expires in 10 minutes.
          </p>
        </div>
      </section>
      <div
        style={{
          textAlign: "center",
          marginTop: "16px",
          fontSize: "11px",
          color: "#94a3b8",
        }}
      >
        © 2026 NYX Badminton
      </div>
    </main>
  );
}
