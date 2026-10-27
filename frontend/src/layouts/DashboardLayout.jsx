import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { logout as logoutRequest } from "../api/authApi";
import { authSession } from "../auth/authSession";

export function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      authSession.clear();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div
      className={`dashboard-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={logout}
      />
      <div className="dashboard-content">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open navigation"
            title="Open navigation"
          >
            <Menu size={22} />
          </button>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
