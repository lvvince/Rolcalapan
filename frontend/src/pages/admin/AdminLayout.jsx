// frontend/src/pages/admin/AdminLayout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import ThemeToggle from "../../components/ThemeToggle";

const links = [
  { to: "/admin", key: "nav.dashboard", end: true },
  { to: "/admin/users", key: "nav.users" },
  { to: "/admin/members", key: "nav.members" },
  { to: "/admin/ministries", key: "nav.ministries" },
  { to: "/admin/events", key: "nav.events" },
  { to: "/admin/giving", key: "nav.giving" },
  { to: "/admin/attendance", key: "nav.attendance" },
  { to: "/admin/prayers", key: "nav.prayers" },
  { to: "/admin/chatbot", key: "nav.chatbot" },
];

export default function AdminLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          {/* Same logo file as RoleLayout (member/staff/ministry) */}
          <img
            src="/logo.png"
            alt="River of Life Calapan logo"
            width={36}
            height={36}
          />
          <span>River of Life</span>
        </div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "active" : "")}>
              {t(l.key)}
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
            <strong>{user?.name}</strong>
            <button className="ghost" onClick={doLogout}>{t("common.logout")}</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}