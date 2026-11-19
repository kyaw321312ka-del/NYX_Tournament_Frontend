import { BrowserRouter as Router, useLocation } from "react-router-dom";
import Topbar from "../layouts/PublicTopbar";
import Footer from "../layouts/PublicFooter";
import AppRoutes from "./routes";
import AppProviders from "./providers/AppProviders";

// Main layout component to conditionally hide Topbar & Footer
function Layout() {
  const location = useLocation();

  // Topbar နှင့် Footer
  const hideLayoutPaths = [];
  const shouldHideLayout =
    hideLayoutPaths.includes(location.pathname) ||
    location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-gray-950 flex justify-center">
      <div className="w-full bg-[#f8f9fa] min-h-screen flex flex-col shadow-2xl relative">
        {!shouldHideLayout && <Topbar />}
        <main
          className={`flex-1 ${location.pathname.startsWith("/admin") ? "p-0" : "p-3 md:p-4"}`}
        >
          <AppRoutes />
        </main>
        {!shouldHideLayout && <Footer />}
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
