// frontend/src/components/RoleLayout.jsx
// Layout para sa Staff, Ministry Leader, at Member. May chatbot widget ang Member.
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { roleMenus } from "../config/roleMenus";
import ChatWidget from "./ChatWidget";

export default function RoleLayout({ role }) {
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
        <div className="brand">River of Life</div>
        <nav>
          <NavLink to={menu.base} end className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
          {menu.items.map((i) => (
            <NavLink key={i.path} to={`${menu.base}/${i.path}`} className={({ isActive }) => (isActive ? "active" : "")}>
              {i.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <span>{menu.title}</span>
          <div>
            <strong>{user?.name}</strong>
            <button className="ghost" onClick={doLogout}>Logout</button>
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