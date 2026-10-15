// frontend/src/pages/RoleDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { roleMenus } from "../config/roleMenus";

export default function RoleDashboard({ role }) {
  const { user } = useAuth();
  const menu = roleMenus[role];
  const [stats, setStats] = useState([]);

  useEffect(() => {
    api.get("/portal/overview").then((r) => setStats(r.data.stats)).catch(() => {});
  }, []);

  return (
    <>
      <h2>Welcome, {user?.name}</h2>
      <p className="muted">{menu.title}</p>

      {stats.length > 0 && (
        <div className="cards" style={{ marginBottom: 24 }}>
          {stats.map((s) => (
            <div className="card" key={s.label}><span>{s.label}</span><strong>{s.value}</strong></div>
          ))}
        </div>
      )}

      <div className="cards">
        {menu.items.map((i) => (
          <Link key={i.path} to={`${menu.base}/${i.path}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <strong style={{ fontSize: 16 }}>{i.label}</strong>
            <span>{i.desc}</span>
          </Link>
        ))}
      </div>
    </>
  );
}