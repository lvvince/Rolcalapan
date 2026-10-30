// frontend/src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  KeyRound,
  UsersRound,
  HeartHandshake,
  CalendarDays,
  HandHeart,
  Bell,
  Users,
  UserCheck,
  Moon,
  Wallet,
  ArrowRight,
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import "./AdminDashboard.css";

const LOGO_SRC = "/logo.png";
const API_BASE = import.meta.env.VITE_API_URL || "/api";

const roleMeta = {
  admin: { label: "Admin / Pastor", color: "#f2c14e" },
  staff: { label: "Church Staff", color: "#0b2e3a" },
  ministry_leader: { label: "Ministry Leaders", color: "#14b8a6" },
  member: { label: "Members", color: "#0e7490" },
};

const quick = [
  { to: "/admin/users", icon: KeyRound, title: "Users & Roles", desc: "Manage accounts and access", tone: "amber" },
  { to: "/admin/members", icon: UsersRound, title: "Members & Families", desc: "Member records and families", tone: "rose" },
  { to: "/admin/ministries", icon: HeartHandshake, title: "Ministries & Groups", desc: "Ministries and small groups", tone: "teal" },
  { to: "/admin/events", icon: CalendarDays, title: "Events & Schedules", desc: "Create and manage events", tone: "blue" },
  { to: "/admin/prayers", icon: HandHeart, title: "Prayer Requests", desc: "Follow up on prayer needs", tone: "violet" },
  { to: "/admin/notifications", icon: Bell, title: "Notifications", desc: "Send and manage notifications", tone: "green" },
];

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

const greeting = () => {
  // Oras sa Pilipinas, kahit iba ang timezone ng device
  const h = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Manila",
    }).format(new Date())
  ) % 24;

  if (h >= 5 && h < 11) return "Good morning,";    // 5:00 AM - 10:59 AM
  if (h >= 11 && h < 13) return "Good noon,";      // 11:00 AM - 12:59 PM
  if (h >= 13 && h < 18) return "Good afternoon,"; // 1:00 PM - 5:59 PM
  return "Good evening,";                          // 6:00 PM - 4:59 AM
};

const peso = (n) =>
  "₱" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "YYYY-MM" ng giving record (given_at ang field ng Giving page)
const givingMonthKey = (g) => {
  const raw = g.given_at || g.date || g.created_at;
  if (!raw) return "";
  const s = String(raw);
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const d = new Date(s);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const R = 70;
const C = 2 * Math.PI * R;
const GAP = 4;

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [giving, setGiving] = useState(null); // null = hindi pa nakuha
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [hover, setHover] = useState(null);
  const [logoOk, setLogoOk] = useState(Boolean(LOGO_SRC));

  // Profile (pangalan at larawan): parehong source ng My Profile page (/auth/me)
  useEffect(() => {
    api
      .get("/auth/me")
      .then((r) => setMe(r.data?.user || null))
      .catch((e) => console.error("AUTH ME failed:", e.response?.status, e.response?.data || e.message));
  }, []);

  // Stats (users, roles)
  useEffect(() => {
    api
      .get("/admin/stats")
      .then((r) => setStats(r.data))
      .catch((e) => setError(e.response?.data?.error || "Failed to load stats"));
  }, []);

  // Giving ngayong buwan: parehong endpoint ng Giving page (/resource?name=giving)
  useEffect(() => {
    let cancelled = false;

    api
      .get("/resource", { params: { name: "giving" } })
      .then((r) => {
        const rows = Array.isArray(r.data) ? r.data : [];
        const key = currentMonthKey();
        const sum = rows
          .filter((g) => givingMonthKey(g) === key)
          .reduce((t, g) => t + (Number(g.amount) || 0), 0);
        if (!cancelled) setGiving(sum);
      })
      .catch((e) => {
        console.error("GIVING failed:", e.response?.status, e.response?.data || e.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const name = me?.name || user?.name || "Admin";
  const photo = me?.photo || user?.photo;
  const pic = photo ? `${API_BASE}/avatar?f=${encodeURIComponent(photo)}` : "";
  const total = Number(stats?.total_users) || 0;
  const active = Number(stats?.active_users) || 0;
  const inactive = Math.max(total - active, 0);

  // Una: computed mula sa giving records. Fallback: stats.total_giving
  const givingTotal =
    giving !== null ? giving : stats?.total_giving != null ? Number(stats.total_giving) : 0;

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
        {pic ? (
          <div
            className="dsh-hero-avatar"
            style={{
              width: 72,
              height: 72,
              minWidth: 72,
              flex: "0 0 72px",
              aspectRatio: "1 / 1",
              borderRadius: "50%",
              overflow: "hidden",
              padding: 0,
            }}
          >
            <img src={pic} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", display: "block" }} />
          </div>
        ) : logoOk ? (
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
        <Link to="/admin/users" className="dsh-hero-btn">
          Manage users <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      {error && <div className="dsh-err">{error}</div>}
      {!stats && !error && <p className="dsh-muted">Loading...</p>}

      {stats && (
        <>
          <div className="dsh-stats">
            <div className="dsh-stat">
              <span className="dsh-tile tone-cyan"><Users size={22} aria-hidden="true" /></span>
              <div><strong>{total}</strong><span>Total Users</span></div>
            </div>
            <div className="dsh-stat">
              <span className="dsh-tile tone-green"><UserCheck size={22} aria-hidden="true" /></span>
              <div><strong>{active}</strong><span>Active Users · {pct(active, total)}%</span></div>
            </div>
            <div className="dsh-stat">
              <span className="dsh-tile tone-slate"><Moon size={22} aria-hidden="true" /></span>
              <div><strong>{inactive}</strong><span>Inactive Users · {pct(inactive, total)}%</span></div>
            </div>
            <Link to="/admin/giving" className="dsh-stat is-link">
              <span className="dsh-tile tone-amber"><Wallet size={22} aria-hidden="true" /></span>
              <div>
                <strong>{peso(givingTotal)}</strong>
                <span>Giving · This Month</span>
              </div>
            </Link>
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
        {quick.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.to} to={q.to} className="dsh-link">
              <span className={`dsh-tile tone-${q.tone}`}>
                <Icon size={22} aria-hidden="true" />
              </span>
              <span className="dsh-link-text">
                <strong>{q.title}</strong>
                <small>{q.desc}</small>
              </span>
              <span className="dsh-arrow" aria-hidden="true">
                <ArrowRight size={18} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}