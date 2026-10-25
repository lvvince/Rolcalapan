// frontend/src/components/RoleLayout.jsx
// Layout para sa Secretary, Ministry Leader, at Member. May chatbot widget ang Member.
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { roleMenus } from "../config/roleMenus";
import ChatWidget from "./ChatWidget";
import LanguageSwitcher from "./LanguageSwitcher";

export default function RoleLayout({ role }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menu = roleMenus[role];

  const doLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/logo.png"
            alt="River of Life Calapan logo"
            width={36}
            height={36}
            style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }}
          />
          <span>River of Life</span>
        </div>
        <nav>
          <NavLink to={menu.base} end className={({ isActive }) => (isActive ? "active" : "")}>
            {t("common.dashboard")}
          </NavLink>
          {menu.items.map((i) => (
            <NavLink key={i.path} to={`${menu.base}/${i.path}`} className={({ isActive }) => (isActive ? "active" : "")}>
              {t(`menu.label.${role}.${i.path}`, { defaultValue: i.label })}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <span>{t(`menu.title.${role}`, { defaultValue: menu.title })}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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