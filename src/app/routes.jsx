import { Routes, Route } from "react-router-dom";
import Home from "../features/tournaments/pages/HomePage";
import Tournaments from "../features/tournaments/pages/TournamentsPage";
import TournamentDetails from "../features/tournaments/pages/PublicTournamentDetailsPage";
import Matches from "../features/matches/pages/PublicMatchesPage";
import Leaderboard from "../features/rankings/pages/LeaderboardPage";
import Enroll from "../features/registrations/pages/EnrollPage";
import Profile from "../features/players/pages/ProfilePage";
import Register from "../features/auth/pages/RegisterPage";
import RegisterAccount from "../features/auth/pages/RegisterAccountPage";
import RegisterVerify from "../features/auth/pages/RegisterVerifyPage";
import Login from "../features/auth/pages/LoginPage";
import AdminDashboard from "../layouts/AdminLayout";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tournaments" element={<Tournaments />} />
      <Route
        path="/tournament-details/:id"
        element={<TournamentDetails />}
      />
      <Route path="/enroll" element={<Enroll />} />
      <Route path="/matches" element={<Matches />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register/account" element={<RegisterAccount />} />
      <Route path="/signin-3" element={<RegisterVerify />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin/*" element={<AdminDashboard />} />
    </Routes>
  );
}
