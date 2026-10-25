// frontend/src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import "./AdminDashboard.css";

// Palitan ng src na gamit sa member dashboard (file sa frontend/public)
const LOGO_SRC = "/logo.png";

const roleMeta = {
  admin: { label: "Admin / Pastor", color: "#f2c14e" },
  staff: { label: "Church Staff", color: "#0b2e3a" },
  ministry_leader: { label: "Ministry Leaders", color: "#14b8a6" },
  member: { label: "Members", color: "#0e7490" },
};

const quick = [
  { to: "/admin/users", icon: "🔑", title: "Users & Roles", desc: "Manage accounts and access", tone: "amber" },
  { to: "/admin/members", icon: "👨‍👩‍👧", title: "Members & Families", desc: "Member records and families", tone: "rose" },
  { to: "/admin/ministries", icon: "🙌", title: "Ministries & Groups", desc: "Ministries and small groups", tone: "teal" },
  { to: "/admin/events", icon: "📅", title: "Events & Schedules", desc: "Create and manage events", tone: "blue" },
  { to: "/admin/prayers", icon: "🙏", title: "Prayer Requests", desc: "Follow up on prayer needs", tone: "violet" },
  { to: "/admin/chatbot", icon: "🤖", title: "Chatbot & Church Info", desc: "Update what the chatbot knows", tone: "cyan" },
];

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning," : h < 18 ? "Good afternoon," : "Good evening,";
};

const R = 70;
const C = 2 * Math.PI * R;
const GAP = 4;

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [hover, setHover] = useState(null);
  const [logoOk, setLogoOk] = useState(Boolean(LOGO_SRC));

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((r) => setStats(r.data))
      .catch((e) => setError(e.response?.data?.error || "Failed to load stats"));
  }, []);

  const name = user?.name || "Admin";
  const total = Number(stats?.total_users) || 0;
  const active = Number(stats?.active_users) || 0;
  const inactive = Math.max(total - active, 0);

  const roles = Object.entries(stats?.by_role || {}).map(([key, count]) => ({
    key,
    count: Number(count) || 0,
    label: roleMeta[key]?.label || key,
    color: roleMeta[key]?.color || "#94a3b8",
  }));
  const maxRole = Math.max(...roles.map((r) => r.count), 1);

  let acc = 0;
  const segments = roles
    .filter((r) => r.count > 0)
    .map((r) => {
      const len = (r.count / total) * C;
      const seg = { ...r, len, offset: acc };
      acc += len;
      return seg;
    });

  const hovered = roles.find((r) => r.key === hover);

  return (
    <div className="dsh">
      <div className="dsh-hero">
        {logoOk ? (
          <div className="dsh-hero-logo">
            <img src={LOGO_SRC} alt="River of Life" onError={() => setLogoOk(false)} />
          </div>
        ) : (
          <div className="dsh-hero-avatar">{name.trim().charAt(0).toUpperCase()}</div>
        )}
        <div className="dsh-hero-text">
          <span className="dsh-hero-church">River of Life Calapan</span>
          <small>{greeting()}</small>
          <h2>{name}</h2>
          <span className="dsh-hero-tag">ADMIN / PASTOR</span>
        </div>
        <Link to="/admin/users" className="dsh-hero-btn">Manage users →</Link>
      </div>

      {error && <div className="dsh-err">{error}</div>}
      {!stats && !error && <p className="dsh-muted">Loading...</p>}

      {stats && (
        <>
          <div className="dsh-stats">
            <div className="dsh-stat">
              <span className="dsh-tile tone-cyan">👥</span>
              <div><strong>{total}</strong><span>Total Users</span></div>
            </div>
            <div className="dsh-stat">
              <span className="dsh-tile tone-green">✅</span>
              <div><strong>{active}</strong><span>Active Users · {pct(active, total)}%</span></div>
            </div>
            <div className="dsh-stat">
              <span className="dsh-tile tone-slate">💤</span>
              <div><strong>{inactive}</strong><span>Inactive Users · {pct(inactive, total)}%</span></div>
            </div>
          </div>

          <div className="dsh-head">
            <h3>People by Role</h3>
            <span className="dsh-pill">{total} total</span>
          </div>

          <div className="dsh-panel">
            <div className="dsh-donut">
              <svg
                width="200"
                height="200"
                viewBox="0 0 200 200"
                role="img"
                aria-label="Role distribution"
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle className="dsh-track" cx="100" cy="100" r={R} fill="none" stroke="#e3edef" strokeWidth="26" />
                {segments.map((s) => {
                  const dash = Math.max(s.len - (segments.length > 1 ? GAP : 0), 0);
                  return (
                    <circle
                      key={s.key}
                      cx="100"
                      cy="100"
                      r={R}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="26"
                      strokeDasharray={`${dash} ${C - dash}`}
                      strokeDashoffset={-s.offset}
                      className={hover === s.key ? "is-hover" : ""}
                      style={{ opacity: hover && hover !== s.key ? 0.3 : 1 }}
                    />
                  );
                })}
              </svg>
              <div className="dsh-donut-center">
                <strong>{hovered ? hovered.count : total}</strong>
                <span>{hovered ? hovered.label : "Total people"}</span>
              </div>
            </div>

            <ul className="dsh-rlist">
              {roles.map((r) => (
                <li key={r.key}>
                  <Link
                    to={`/admin/users?role=${r.key}`}
                    className={`dsh-row ${r.count === 0 ? "is-empty" : ""}`}
                    onMouseEnter={() => setHover(r.key)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(r.key)}
                    onBlur={() => setHover(null)}
                    title={`View ${r.label}`}
                  >
                    <span className="dsh-row-lbl">
                      <i className="dsh-dot" style={{ background: r.color }} />
                      <span>
                        {r.label}
                        {r.count === 0 && <span className="dsh-note">No users yet</span>}
                      </span>
                    </span>
                    <div className="dsh-bar">
                      <i style={{ width: `${(r.count / maxRole) * 100}%`, background: r.color }} />
                    </div>
                    <strong>{r.count}</strong>
                    <em>{pct(r.count, total)}%</em>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="dsh-head">
        <h3>Quick Links</h3>
      </div>
      <div className="dsh-links">
        {quick.map((q) => (
          <Link key={q.to} to={q.to} className="dsh-link">
            <span className={`dsh-tile tone-${q.tone}`}>{q.icon}</span>
            <span className="dsh-link-text">
              <strong>{q.title}</strong>
              <small>{q.desc}</small>
            </span>
            <span className="dsh-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}