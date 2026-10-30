import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import ThemeToggle from "../../components/ThemeToggle";
import useNotifCount from "../../hooks/useNotifCount";

const links = [
  { to: "/admin", key: "nav.dashboard", end: true },
  { to: "/admin/profile", key: "nav.profile", fallback: "My Profile" },
  { to: "/admin/users", key: "nav.users" },
  { to: "/admin/members", key: "nav.members" },
  { to: "/admin/ministries", key: "nav.ministries" },
  { to: "/admin/events", key: "nav.events" },
  { to: "/admin/giving", key: "nav.giving" },
  { to: "/admin/attendance", key: "nav.attendance" },
  { to: "/admin/prayers", key: "nav.prayers" },
  { to: "/admin/notifications", key: "nav.notifications", fallback: "Notifications" },
];

export default function AdminLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unread, toast, dismiss, markSeen } = useNotifCount(user?.id);

  // Kapag nasa Notifications page, ituring na nabasa na
  useEffect(() => {
    if (location.pathname === "/admin/notifications" && unread > 0) markSeen();
  }, [location.pathname, unread, markSeen]);

  const doLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="River of Life Calapan logo" width={36} height={36} />
          <span>River of Life</span>
        </div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "active" : "")}>
              {l.fallback ? t(l.key, l.fallback) : t(l.key)}
              {l.to === "/admin/notifications" && unread > 0 && (
                <span className="nav-badge">{unread > 99 ? "99+" : unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <span>{t("layout.adminPastor")}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <LanguageSwitcher />
            <NavLink
              to="/admin/profile"
              title="My Profile"
              style={{ fontWeight: 700, textDecoration: "none", color: "inherit" }}
            >
              {user?.name}
            </NavLink>
            <button className="ghost" onClick={doLogout}>{t("common.logout")}</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>

        {toast && (
          <div
            className="toast"
            onClick={() => {
              dismiss();
              navigate("/admin/notifications");
            }}
          >
            <strong>{toast.title || "New notification"}</strong>
            {toast.message && <p>{toast.message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}