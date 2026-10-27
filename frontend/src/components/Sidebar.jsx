import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Users,
  ShieldCheck,
  X,
} from "lucide-react";
import qaLabLogo from "../assets/logo.png";
import { useAuthSession } from "../auth/useAuthSession";
import { SwitchRoleDialog } from "./SwitchRoleDialog";

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onLogout,
}) {
  const session = useAuthSession();
  const allowedActions = session.user?.allowedActions || [];
  const canViewUsers = allowedActions.includes("iam_users:view");
  const canViewRoles = allowedActions.includes("iam_roles:view");
  const canViewPermissions = allowedActions.includes("iam_permissions:view");
  const canViewIam = canViewUsers || canViewRoles || canViewPermissions;
  const canViewCustomers = allowedActions.includes("customers:view");
  const canViewProducts = allowedActions.includes("products:view");
  const canViewMasterData = canViewCustomers || canViewProducts;
  const canViewInvoices = allowedActions.includes("invoices:view");
  const canViewDashboard = allowedActions.includes("dashboard:view");
  const location = useLocation();
  const navigate = useNavigate();
  const [masterDataOpen, setMasterDataOpen] = useState(true);
  const [transactionsOpen, setTransactionsOpen] = useState(true);
  const [iamOpen, setIamOpen] = useState(true);
  const [switchRoleOpen, setSwitchRoleOpen] = useState(false);
  const switchRoleButton = useRef(null);

  const displayCollapsed = collapsed && !mobileOpen;
  const masterDataActive =
    location.pathname.startsWith("/customers") ||
    location.pathname.startsWith("/products");
  const iamActive =
    location.pathname.startsWith("/users") ||
    location.pathname.startsWith("/roles") ||
    location.pathname.startsWith("/permissions");
  const transactionsActive = location.pathname.startsWith("/invoices");
  const dashboardActive =
    location.pathname === "/" || location.pathname.startsWith("/dashboard");
  const apiDocsUrl = import.meta.env.VITE_API_DOCS_URL?.trim();

  useEffect(() => {
    if (masterDataActive) setMasterDataOpen(true);
    if (iamActive) setIamOpen(true);
    if (transactionsActive) setTransactionsOpen(true);
  }, [iamActive, masterDataActive, transactionsActive]);

  function openParent(setOpen) {
    if (displayCollapsed) {
      onToggleCollapse();
      setOpen(true);
      return;
    }
    setOpen((value) => !value);
  }

  function handleNavigate(path) {
    navigate(path);
    onCloseMobile();
  }

  function handleApiDocsClick(event) {
    if (!apiDocsUrl) {
      event.preventDefault();
      window.alert("API Documentation URL belum dikonfigurasi.");
      return;
    }

    onCloseMobile();
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={[
          "sidebar",
          displayCollapsed ? "sidebar-collapsed" : "",
          mobileOpen ? "sidebar-mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src={qaLabLogo} alt="QA Lab" className="sidebar-logo" />
          </div>
          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={onToggleCollapse}
            aria-label={
              displayCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            title={displayCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {displayCollapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            title="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {canViewDashboard && (
            <button
              type="button"
              className={`sidebar-item ${dashboardActive ? "active" : ""}`}
              onClick={() => handleNavigate("/")}
              title={displayCollapsed ? "Dashboard" : undefined}
              aria-label="Dashboard"
            >
              <LayoutDashboard size={20} />
              {!displayCollapsed && <span>Dashboard</span>}
            </button>
          )}

          {canViewIam && (
            <div className="sidebar-group">
              <button
                type="button"
                className={`sidebar-item sidebar-group-toggle ${iamActive ? "active-parent" : ""}`}
                onClick={() => openParent(setIamOpen)}
                aria-expanded={iamOpen}
              >
                <ShieldCheck size={20} />
                {!displayCollapsed && (
                  <>
                    <span>IAM</span>
                    {iamOpen ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </>
                )}
              </button>
              {!displayCollapsed && iamOpen && (
                <div className="sidebar-submenu">
                  {canViewUsers && (
                    <NavLink
                      to="/users"
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `sidebar-subitem ${isActive ? "active" : ""}`
                      }
                    >
                      <Users size={18} />
                      <span>Users</span>
                    </NavLink>
                  )}
                  {canViewRoles && (
                    <NavLink
                      to="/roles"
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `sidebar-subitem ${isActive ? "active" : ""}`
                      }
                    >
                      <ShieldCheck size={18} />
                      <span>Role</span>
                    </NavLink>
                  )}
                  {canViewPermissions && (
                    <NavLink
                      to="/permissions"
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `sidebar-subitem ${isActive ? "active" : ""}`
                      }
                    >
                      <FileText size={18} />
                      <span>Permission</span>
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          )}

          {canViewMasterData && (
            <div className="sidebar-group">
              <button
                type="button"
                className={`sidebar-item sidebar-group-toggle ${masterDataActive ? "active-parent" : ""}`}
                onClick={() => openParent(setMasterDataOpen)}
                title={displayCollapsed ? "Master Data" : undefined}
                aria-label="Master Data"
                aria-expanded={masterDataOpen}
              >
                <Database size={20} />
                {!displayCollapsed && (
                  <>
                    <span>Master Data</span>
                    {masterDataOpen ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </>
                )}
              </button>
              {!displayCollapsed && masterDataOpen && (
                <div className="sidebar-submenu">
                  {canViewCustomers && (
                    <NavLink
                      to="/customers"
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `sidebar-subitem ${isActive ? "active" : ""}`
                      }
                    >
                      <Users size={18} />
                      <span>Customers</span>
                    </NavLink>
                  )}
                  {canViewProducts && (
                    <NavLink
                      to="/products"
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `sidebar-subitem ${isActive ? "active" : ""}`
                      }
                    >
                      <Package size={18} />
                      <span>Products</span>
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          )}

          {canViewInvoices && (
            <div className="sidebar-group">
              <button
                type="button"
                className={`sidebar-item sidebar-group-toggle ${transactionsActive ? "active-parent" : ""}`}
                onClick={() => openParent(setTransactionsOpen)}
                title={displayCollapsed ? "Transactions" : undefined}
                aria-label="Transactions"
                aria-expanded={transactionsOpen}
              >
                <ReceiptText size={20} />
                {!displayCollapsed && (
                  <>
                    <span>Transactions</span>
                    {transactionsOpen ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </>
                )}
              </button>
              {!displayCollapsed && transactionsOpen && (
                <div className="sidebar-submenu">
                  <NavLink
                    to="/invoices"
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `sidebar-subitem ${isActive ? "active" : ""}`
                    }
                  >
                    <FileText size={18} />
                    <span>Invoices</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}

          <a
            href={apiDocsUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "sidebar-item",
              "sidebar-external-link",
              !apiDocsUrl ? "sidebar-item-disabled" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title={displayCollapsed ? "API Documentation" : undefined}
            aria-label="Open API documentation"
            aria-disabled={!apiDocsUrl}
            onClick={handleApiDocsClick}
          >
            <BookOpen size={20} />
            {!displayCollapsed && (
              <>
                <span>API Documentation</span>
                <ExternalLink
                  size={18}
                  className="sidebar-external-icon"
                  aria-hidden="true"
                />
              </>
            )}
          </a>
        </nav>

        <div className="sidebar-footer">
          <button
            ref={switchRoleButton}
            type="button"
            className="sidebar-item"
            onClick={() => setSwitchRoleOpen(true)}
            title={displayCollapsed ? "Switch role" : undefined}
            aria-label="Switch role"
          >
            <ShieldCheck size={20} />
            {!displayCollapsed && (
              <span>
                Role:{" "}
                {session.user?.role?.name ||
                  session.user?.role?.code ||
                  "Current role"}
              </span>
            )}
          </button>
          <button
            type="button"
            className="sidebar-logout"
            onClick={onLogout}
            title={displayCollapsed ? "Logout" : undefined}
            aria-label="Logout"
          >
            <LogOut size={20} />
            {!displayCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
      <SwitchRoleDialog
        open={switchRoleOpen}
        currentRole={session.user?.role?.name || session.user?.role?.code}
        user={session.user}
        openerRef={switchRoleButton}
        onClose={() => setSwitchRoleOpen(false)}
        onSwitched={(path) => {
          setSwitchRoleOpen(false);
          navigate(path, { replace: true });
          onCloseMobile();
        }}
      />
    </>
  );
}
