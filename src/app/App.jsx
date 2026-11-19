import { BrowserRouter as Router, useLocation } from "react-router-dom";
import PublicTopbar from "../layouts/PublicTopbar";
import PublicFooter from "../layouts/PublicFooter";
import AppRoutes from "./routes";
import AppProviders from "./providers/AppProviders";

// Public pages, including authentication, share the public header and footer.
function Layout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-gray-950 flex justify-center">
      <div className="w-full bg-[#f8f9fa] min-h-screen flex flex-col shadow-2xl relative">
        {!isAdminRoute && <PublicTopbar />}
        <main
          className={`flex-1 ${isAdminRoute ? "p-0" : "p-3 md:p-4"}`}
        >
          <AppRoutes />
        </main>
        {!isAdminRoute && <PublicFooter />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProviders>
      <Router>
        <Layout />
      </Router>
    </AppProviders>
  );
}
