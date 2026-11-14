import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import ThemeToggle from "../../components/ThemeToggle";
import useNotifCount from "../../hooks/useNotifCount";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const links = [
  { to: "/admin", key: "nav.dashboard", end: true },
  { to: "/admin/profile", key: "nav.profile", fallback: "My Profile" },
  { to: "/admin/users", key: "nav.users" },
  { to: "/admin/members", key: "nav.members" },
  { to: "/admin/ministries", key: "nav.ministries" },
  { to: "/admin/events", key: "nav.events" },
  { to: "/admin/announcements", key: "nav.announcements", fallback: "Announcements" },
  { to: "/admin/giving", key: "nav.giving" },
  { to: "/admin/attendance", key: "nav.attendanceRecording", fallback: "Attendance" },
  { to: "/admin/reports", key: "nav.reportsAnalytics", fallback: "Reports & Analytics" },
  { to: "/admin/prayers", key: "nav.prayers" },
  { to: "/admin/notifications", key: "nav.notifications", fallback: "Notifications" },
];

const initialsOf = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

// Avatar na may fallback sa initials kapag walang larawan o hindi ma-load
function UserAvatar({ user }) {
  const src = user?.photo ? `${API_BASE}/avatar?f=${encodeURIComponent(user.photo)}` : "";
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span className="sb-avatar" aria-hidden="true">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        initialsOf(user?.name)
      )}
    </span>
  );
}

export default function AdminLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unread, toast, dismiss, markSeen } = useNotifCount(user?.id);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Kapag nasa Notifications page, ituring na nabasa na
  useEffect(() => {
    if (location.pathname === "/admin/notifications" && unread > 0) markSeen();
  }, [location.pathname, unread, markSeen]);

  // Esc para isara ang confirmation
  useEffect(() => {
    if (!confirmLogout) return;
    const onKey = (e) => e.key === "Escape" && setConfirmLogout(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmLogout]);

  const doLogout = () => {
    setConfirmLogout(false);
    logout();
    navigate("/login", { replace: true });
  };

  const roleTitle = t("menu.title.admin", { defaultValue: "Admin Portal" });

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

        <div className="sb-footer">
          <div className="sb-user">
            <UserAvatar user={user} />
            <div className="sb-user-text">
              <strong title={user?.name}>{user?.name}</strong>
              <small title={roleTitle}>{roleTitle}</small>
            </div>
          </div>
          <button type="button" className="sb-logout" onClick={() => setConfirmLogout(true)}>
            <LogOut size={16} aria-hidden="true" />
            <span>{t("common.logout")}</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span>{t("layout.adminPastor")}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <LanguageSwitcher />
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

      {/* Are you sure to logout? */}
      {confirmLogout && (
        <div className="modal" onClick={() => setConfirmLogout(false)}>
          <div
            className="modal-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 380 }}
          >
            <h3 id="logout-title">{t("logout.title", "Log out?")}</h3>
            <p>{t("logout.message", "Are you sure you want to log out?")}</p>
            <div className="modal-actions">
              <button type="button" className="btn secondary" autoFocus onClick={() => setConfirmLogout(false)}>
                {t("logout.cancel", "Cancel")}
              </button>
              <button type="button" className="btn" onClick={doLogout}>
                {t("logout.confirm", "Yes, log out")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}