// frontend/src/pages/admin/AdminLayout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const links = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/users", label: "Users & Roles" },
  { to: "/admin/members", label: "Members & Families" },
  { to: "/admin/ministries", label: "Ministries & Groups" },
  { to: "/admin/events", label: "Events & Schedules" },
  { to: "/admin/giving", label: "Giving" },
  { to: "/admin/attendance", label: "Attendance & Analytics" },
  { to: "/admin/prayers", label: "Prayer Requests" },
  { to: "/admin/chatbot", label: "Chatbot & Church Info" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">River of Life</div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "active" : "")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <span>Admin / Pastor</span>
          <div>
            <strong>{user?.name}</strong>
            <button className="ghost" onClick={doLogout}>Logout</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}