import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

// Pages Import (သသင့်ရဲ့ folder structure အတိုင်း path များကို စစ်ပါ)
import ForgotPassword from "../features/auth/pages/ForgotPassword";
import TournamentPage from "../features/tournaments/pages/TournamentPage";
import CreateTournamentPage from "../features/tournaments/pages/CreateTournamentPage";
import TournamentDetailsPage from "../features/tournaments/pages/TournamentDetailsPage";
import EnrollmentsPage from "../features/registrations/pages/EnrollmentsPage";
import MatchesPage from "../features/matches/pages/MatchesPage";
import PlayersPage from "../features/players/pages/PlayersPage";
import PlayerDetailsPage from "../features/players/pages/PlayerDetailsPage";
import RankingPage from "../features/rankings/pages/RankingPage";
import SettingsPage from "../features/payments/pages/SettingsPage";

// Sidebar Component
import Sidebar from "./AdminSidebar";
import { useAuth } from "../features/auth/hooks/useAuth";
import ProtectedRoute from "../features/auth/components/ProtectedRoute";

// Dashboard Layout Component with conditional Top Header rendering
function DashboardLayout({
  children,
  activeTitle,
  activeSubtitle,
  onLogout,
  showHeader = true,
}) {
  const { session } = useAuth();
  const adminUser = session?.user;
  const displayName = adminUser?.name || "Admin";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "sans-serif",
      }}
    >
      <Sidebar onLogout={onLogout} />

      <div
        style={{
          flex: "1",
          display: "flex",
          flexDirection: "column",
          minWidth: "0",
        }}
      >
        {/* Conditional Top Header */}
        {showHeader && (
          <div
            style={{
              height: "75px",
              backgroundColor: "#ffffff",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 32px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "#0f172a",
                  margin: "0 0 2px 0",
                }}
              >
                {activeTitle}
              </h1>
              <p
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  margin: "0",
                  fontWeight: "500",
                }}
              >
                {activeSubtitle}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "#f8fafc",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  backgroundColor: "#0f172a",
                  color: "#fff",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                }}
              >
                {initials}
              </div>
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#0f172a",
                  }}
                >
                  Administrator
                </div>
                <div style={{ fontSize: "9px", color: "#64748b" }}>
                  {displayName}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Page Content */}
        <div style={{ flex: "1", overflowY: "auto" }}>{children}</div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 32px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            textAlign: "center",
            fontSize: "11px",
            color: "#94a3b8",
          }}
        >
          © 2026 NYX Badminton Admin Management System. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Server logout failed after clearing the local session.", error);
    } finally {
      navigate("/", { replace: true });
    }
  };

  return (
    <Routes>
      {/* Forgot Password Route */}
      <Route
        path="forgot-password"
        element={<ForgotPassword onBackToLogin={() => navigate("/login")} />}
      />

      {/* ================= PROTECTED DASHBOARD ROUTES ================= */}

      <Route
        path="overview"
        element={<Navigate to="/admin/tournament" replace />}
      />

      {/* 2. Tournament Management */}
      <Route
        path="tournament"
        element={
          <ProtectedRoute session={session}>
            <DashboardLayout
              activeTitle="Tournament Management"
              activeSubtitle="Manage, create, and oversee all badminton tournaments across the platform."
              onLogout={handleLogout}
            >
              <TournamentPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 3. Create Tournament */}
      <Route
        path="tournament/create"
        element={
          <ProtectedRoute session={session}>
            <DashboardLayout onLogout={handleLogout} showHeader={false}>
              <CreateTournamentPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 4. Tournament Details */}
      <Route
        path="tournament/:id"
        element={
          <ProtectedRoute session={session}>
            <DashboardLayout onLogout={handleLogout} showHeader={false}>
              <TournamentDetailsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 5. Enrollments */}
      <Route
        path="enrollments"
        element={
          <ProtectedRoute session={session}>
            <DashboardLayout
              activeTitle="Player Tournament Enrollments"
              activeSubtitle="Review athlete registration requests, inspect payment slips, and manage approval statuses."
              onLogout={handleLogout}
            >
              <EnrollmentsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 6. Matches */}
      <Route
        path="matches"
        element={
          <ProtectedRoute session={session}>
            <DashboardLayout
              activeTitle="Tournament Matches & Bracket Management"
              activeSubtitle="Configure knockout brackets, assign player pairings, schedule match courts, and input official set scores."
              onLogout={handleLogout}
            >
              <MatchesPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 7. Players Directory */}
      <Route
        path="players"
        element={
          <ProtectedRoute session={session}>
            <DashboardLayout
              activeTitle="Registered Players Directory"
              activeSubtitle="Manage registered athlete profiles, account statuses, and view complete personal and tournament records."
              onLogout={handleLogout}
            >
              <PlayersPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 8. Player Details */}
      <Route
        path="players/:id"
        element={
          <ProtectedRoute session={session}>
            <DashboardLayout onLogout={handleLogout} showHeader={false}>
              <PlayerDetailsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 9. Ranking */}
      <Route
        path="ranking"
        element={
          <ProtectedRoute session={session}>
            <DashboardLayout
              activeTitle="Tournament Category Leaderboards"
              activeSubtitle="Review finalized player placements and ranking points by tournament category."
              onLogout={handleLogout}
            >
              <RankingPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 10. Settings */}
      <Route
        path="settings"
        element={
          <ProtectedRoute session={session}>
            <DashboardLayout
              activeTitle="System & Website Settings"
              activeSubtitle="Configure global website information, payment gateway accounts, and administrator security credentials."
              onLogout={handleLogout}
            >
              <SettingsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Default Fallback Redirect to Tournament Management */}
      <Route path="*" element={<Navigate to="tournament" replace />} />
    </Routes>
  );
}
