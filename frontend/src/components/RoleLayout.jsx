// frontend/src/components/RoleLayout.jsx
// Layout para sa Secretary, Ministry Leader, at Member. May chatbot widget ang Member.
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { roleMenus } from "../config/roleMenus";
import Icon from "./Icon";
import ChatWidget from "./ChatWidget";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";

// path ng menu item -> pangalan ng icon sa components/Icon.jsx
const menuIcons = {
  // Secretary / Staff
  members: "users",
  qr: "qr",
  "qr-codes": "qr",
  attendance: "check",
  events: "calendar",
  geofence: "pin",
  schedules: "clock",
  giving: "gift",
  reports: "chart",
  sermons: "mic",
  announcements: "message",
  notifications: "bell",

  // Ministry Leader
  schedule: "calendar",
  volunteers: "heart",
  activities: "check",

  // Member
  profile: "member",
  rsvp: "calendar",
  prayer: "heart",
  prayers: "heart",
  checkin: "pin",
  ministries: "users",
  donate: "gift",
};

const getMenuIcon = (item) => item.icon || menuIcons[item.path] || "dashboard";

export default function RoleLayout({ role }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menu = roleMenus[role];

  const doLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }) => (isActive ? "active" : "");

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="River of Life Calapan logo" width={36} height={36} />
          <span>River of Life</span>
        </div>

        <nav>
          <NavLink to={menu.base} end className={linkClass}>
            <Icon name="dashboard" />
            <span>{t("common.dashboard")}</span>
          </NavLink>

          {menu.items.map((i) => (
            <NavLink key={i.path} to={`${menu.base}/${i.path}`} className={linkClass}>
              <Icon name={getMenuIcon(i)} />
              <span>{t(`menu.label.${role}.${i.path}`, { defaultValue: i.label })}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <span>{t(`menu.title.${role}`, { defaultValue: menu.title })}</span>
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

      {role === "member" && <ChatWidget userId={user?.id} />}
    </div>
  );
}