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
  TrendingUp,
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../i18n/LanguageContext";
import DailyVerse from "../../components/DailyVerse";
import EventCalendar from "../../components/EventCalendar";
import "./AdminDashboard.css";

const LOGO_SRC = "/logo.png";
const API_BASE = import.meta.env.VITE_API_URL || "/api";

// Mga pangalan ng resource para sa /resource?name=... (baguhin dito kung iba ang nasa backend mo)
// Hindi "prayers" ang pangalan (404 sa console), kaya sinusubukan ang mga ito isa-isa
const RES_PRAYERS_CANDIDATES = ["prayer_requests"];
const RES_ATTENDANCE = "attendance";
const RES_MEMBERS = "members";

const FOLLOW_UP_DAYS = 21; // ilang araw na hindi dumalo bago ilista
const TREND_POINTS = 6;    // ilang huling petsa ang nasa chart
const LIST_LIMIT = 5;

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
  { to: "/admin/attendance-insights", icon: TrendingUp, title: "Attendance Insights", desc: "Trends and predicted turnout", tone: "teal" },
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

  if (h >= 5 && h < 11) return "Good morning";    // 5:00 AM - 10:59 AM
  if (h >= 11 && h < 13) return "Good noon";      // 11:00 AM - 12:59 PM
  if (h >= 13 && h < 18) return "Good afternoon"; // 1:00 PM - 5:59 PM
  return "Good evening";                          // 6:00 PM - 4:59 AM
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

/* ---------- Helpers para sa bagong cards ---------- */

// null kapag pumalya ang request, para alam ng card na "walang data" at hindi "walang laman"
const fetchList = (name) =>
  api
    .get("/resource", { params: { name } })
    .then((r) => (Array.isArray(r.data) ? r.data : []))
    .catch((e) => {
      console.error(`RESOURCE ${name} failed:`, e.response?.status, e.response?.data || e.message);
      return null;
    });

// Sinusubukan ang bawat pangalan hanggang may sumagot na hindi 404
const fetchFirst = async (names) => {
  for (const name of names) {
    try {
      const r = await api.get("/resource", { params: { name } });
      if (Array.isArray(r.data)) {
        return r.data;
      }
    } catch (e) {
      if (e.response?.status !== 404) {
        console.error(`RESOURCE ${name} failed:`, e.response?.status, e.response?.data || e.message);
        return null;
      }
    }
  }
  console.error("RESOURCE prayers: walang tumugma sa", names);
  return null;
};

const toDate = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d) ? null : d;
};

const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const daysSince = (d) => Math.floor((Date.now() - d.getTime()) / 86400000);

const shortDate = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" });

const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("") || "?";

const attDate = (a) => toDate(a.date || a.attended_at || a.event_date || a.created_at);
const attMember = (a) => a.member_id ?? a.user_id ?? null;
const isPresent = (a) => {
  const s = String(a.status ?? "present").toLowerCase();
  return !["absent", "no", "false", "0", "missed"].includes(s);
};

// Hindi na bukas ang prayed / answered / closed, kaya hindi na ipapakita sa dashboard
const isOpenPrayer = (p) =>
  !["prayed", "answered", "closed", "resolved", "done", "archived"].includes(
    String(p.status || "open").toLowerCase()
  );

// Urgent, mataas ang urgency, o kailangang i-review ng tao
const isHotPrayer = (p) =>
  p.priority === "urgent" || p.urgency === "high" || Number(p.needs_review) === 1;

const agoLabel = (d) => {
  if (!d) return "";
  const n = daysSince(d);
  if (n <= 0) return "Today";
  if (n === 1) return "1 day ago";
  return `${n} days ago`;
};

const R = 70;
const C = 2 * Math.PI * R;
const GAP = 4;

export default function AdminDashboard() {
  const { t } = useLang();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [giving, setGiving] = useState(null); // null = hindi pa nakuha
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [hover, setHover] = useState(null);
  const [logoOk, setLogoOk] = useState(Boolean(LOGO_SRC));
  const [watch, setWatch] = useState({ loaded: false, prayers: null, attendance: null, members: null });

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
          .reduce((tot, g) => tot + (Number(g.amount) || 0), 0);
        if (!cancelled) setGiving(sum);
      })
      .catch((e) => {
        console.error("GIVING failed:", e.response?.status, e.response?.data || e.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Prayer requests, attendance, members (para sa "Needs Attention" cards)
  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchFirst(RES_PRAYERS_CANDIDATES), fetchList(RES_ATTENDANCE), fetchList(RES_MEMBERS)]).then(
      ([prayers, attendance, members]) => {
        if (!cancelled) setWatch({ loaded: true, prayers, attendance, members });
      }
    );

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
    label: t(roleMeta[key]?.label || key),
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

  /* ---------- Open Prayer Requests (urgent muna, tapos pinakabago) ---------- */
  const openPrayers = (watch.prayers || [])
    .filter(isOpenPrayer)
    .map((p) => ({ ...p, _date: toDate(p.created_at || p.date), _hot: isHotPrayer(p) }))
    .sort(
      (a, b) =>
        Number(b._hot) - Number(a._hot) ||
        (b._date?.getTime() || 0) - (a._date?.getTime() || 0)
    );

  /* ---------- Attendance Trend ---------- */
  const perDay = {};
  (watch.attendance || []).forEach((a) => {
    const d = attDate(a);
    if (!d || !isPresent(a)) return;
    const k = dayKey(d);
    perDay[k] = (perDay[k] || 0) + 1;
  });
  const trend = Object.keys(perDay)
    .sort()
    .slice(-TREND_POINTS)
    .map((k) => ({ key: k, count: perDay[k] }));
  const trendMax = Math.max(...trend.map((x) => x.count), 1);
  const trendLast = trend[trend.length - 1];
  const trendPrev = trend[trend.length - 2];
  const trendDelta = trendLast && trendPrev ? pct(trendLast.count - trendPrev.count, trendPrev.count) : null;

  /* ---------- Members to Follow Up ---------- */
  const lastSeen = {};
  (watch.attendance || []).forEach((a) => {
    const id = attMember(a);
    const d = attDate(a);
    if (id == null || !d || !isPresent(a)) return;
    if (!lastSeen[id] || d > lastSeen[id]) lastSeen[id] = d;
  });
  const followUp = (watch.members || [])
    .map((m) => {
      const seen = lastSeen[m.id] || lastSeen[m.user_id];
      return { ...m, _days: seen ? daysSince(seen) : null };
    })
    .filter((m) => m._days !== null && m._days >= FOLLOW_UP_DAYS)
    .sort((a, b) => b._days - a._days);

  const weeksLabel = (days) => `${Math.floor(days / 7)} ${t("wks")}`;

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
          <small>{t(greeting())},</small>
          <h2>{name}</h2>
          <span className="dsh-hero-tag">{t("ADMIN / PASTOR")}</span>
        </div>
        <Link to="/admin/users" className="dsh-hero-btn">
          {t("Manage users")} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      {/* Daily Bible Verse */}
      <DailyVerse portal="admin" />

      {/* Event calendar (kasama na ang Upcoming Events) */}
      <EventCalendar />

      {error && <div className="dsh-err">{t(error)}</div>}
      {!stats && !error && <p className="dsh-muted">{t("Loading...")}</p>}

      {stats && (
        <>
          <div className="dsh-stats">
            <div className="dsh-stat">
              <span className="dsh-tile tone-cyan"><Users size={22} aria-hidden="true" /></span>
              <div><strong>{total}</strong><span>{t("Total Users")}</span></div>
            </div>
            <div className="dsh-stat">
              <span className="dsh-tile tone-green"><UserCheck size={22} aria-hidden="true" /></span>
              <div><strong>{active}</strong><span>{t("Active Users")} · {pct(active, total)}%</span></div>
            </div>
            <div className="dsh-stat">
              <span className="dsh-tile tone-slate"><Moon size={22} aria-hidden="true" /></span>
              <div><strong>{inactive}</strong><span>{t("Inactive Users")} · {pct(inactive, total)}%</span></div>
            </div>
            <Link to="/admin/giving" className="dsh-stat is-link">
              <span className="dsh-tile tone-amber"><Wallet size={22} aria-hidden="true" /></span>
              <div>
                <strong>{peso(givingTotal)}</strong>
                <span>{t("Giving · This Month")}</span>
              </div>
            </Link>
          </div>

          <div className="dsh-head">
            <h3>{t("People by Role")}</h3>
            <span className="dsh-pill">{total} {t("total")}</span>
          </div>

          <div className="dsh-panel">
            <div className="dsh-donut">
              <svg
                width="200"
                height="200"
                viewBox="0 0 200 200"
                role="img"
                aria-label={t("Role distribution")}
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
                <span>{hovered ? hovered.label : t("Total people")}</span>
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
                    title={`${t("View")} ${r.label}`}
                  >
                    <span className="dsh-row-lbl">
                      <i className="dsh-dot" style={{ background: r.color }} />
                      <span>
                        {r.label}
                        {r.count === 0 && <span className="dsh-note">{t("No users yet")}</span>}
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

      {/* ---------- Needs Attention ---------- */}
      <div className="dsh-head">
        <h3>{t("Needs Attention")}</h3>
      </div>

      <div className="dsh-grid">
        {/* Open Prayer Requests */}
        <section className="dsh-card">
          <div className="dsh-card-head">
            <h3>{t("Open Prayer Requests")}</h3>
            <Link to="/admin/prayers" className="dsh-card-more">{t("View all")}</Link>
          </div>
          {!watch.loaded ? (
            <p className="dsh-empty">{t("Loading...")}</p>
          ) : watch.prayers === null ? (
            <p className="dsh-empty">{t("Could not load prayer requests")}</p>
          ) : openPrayers.length === 0 ? (
            <p className="dsh-empty">{t("No open prayer requests")}</p>
          ) : (
            <ul>
              {openPrayers.slice(0, LIST_LIMIT).map((p, i) => (
                <li key={p.id ?? i}>
                  <Link to="/admin/prayers" className="dsh-item">
                    <span className="dsh-prayer-ico tone-rose"><HandHeart size={18} aria-hidden="true" /></span>
                    <div className="dsh-item-text">
                      <strong>{p.title || p.request || p.subject || p.message || t("Prayer request")}</strong>
                      <small>
                        {(p.member || p.member_name || p.name || p.requester || t("Anonymous"))}
                        {p._date ? ` · ${t(agoLabel(p._date))}` : ""}
                      </small>
                    </div>
                    {p._hot ? (
                      <span className="dsh-badge is-alert">{t("Urgent")}</span>
                    ) : (
                      <span className="dsh-badge is-warn">{t("Open")}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Attendance Trend */}
        <section className="dsh-card">
          <div className="dsh-card-head">
            <h3>{t("Attendance Trend")}</h3>
            <Link to="/admin/attendance-insights" className="dsh-card-more">{t("Details")}</Link>
          </div>
          {!watch.loaded ? (
            <p className="dsh-empty">{t("Loading...")}</p>
          ) : watch.attendance === null ? (
            <p className="dsh-empty">{t("Could not load attendance")}</p>
          ) : trend.length === 0 ? (
            <p className="dsh-empty">{t("No attendance records yet")}</p>
          ) : (
            <div className="dsh-trend">
              <div className="dsh-trend-summary">
                <strong>{trendLast.count}</strong>
                <span className="dsh-muted">{t("latest")}</span>
                {trendDelta !== null && (
                  <span className={`dsh-trend-delta ${trendDelta >= 0 ? "is-up" : "is-down"}`}>
                    {trendDelta >= 0 ? "▲" : "▼"} {Math.abs(trendDelta)}%
                  </span>
                )}
              </div>
              <div className="dsh-trend-bars">
                {trend.map((x, i) => (
                  <div
                    key={x.key}
                    className={`dsh-trend-col ${i === trend.length - 1 ? "is-latest" : ""}`}
                    title={`${shortDate(x.key)}: ${x.count}`}
                  >
                    <em>{x.count}</em>
                    <i style={{ height: `${Math.max((x.count / trendMax) * 100 - 14, 3)}%` }} />
                  </div>
                ))}
              </div>
              <div className="dsh-trend-labels">
                {trend.map((x) => (
                  <span key={x.key}>{shortDate(x.key)}</span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Members to Follow Up */}
        <section className="dsh-card">
          <div className="dsh-card-head">
            <h3>{t("Members to Follow Up")}</h3>
            <Link to="/admin/members" className="dsh-card-more">{t("View all")}</Link>
          </div>
          {!watch.loaded ? (
            <p className="dsh-empty">{t("Loading...")}</p>
          ) : watch.members === null || watch.attendance === null ? (
            <p className="dsh-empty">{t("Could not load members")}</p>
          ) : Object.keys(lastSeen).length === 0 ? (
            <p className="dsh-empty">{t("No attendance data to compare yet")}</p>
          ) : followUp.length === 0 ? (
            <p className="dsh-empty">{t("Everyone is attending regularly")}</p>
          ) : (
            <ul>
              {followUp.slice(0, LIST_LIMIT).map((m, i) => (
                <li key={m.id ?? i}>
                  <Link to="/admin/members" className="dsh-item">
                    <span className="dsh-avatar">{initials(m.name || m.full_name)}</span>
                    <div className="dsh-item-text">
                      <strong>{m.name || m.full_name || t("Member")}</strong>
                      <small>{t("Last attended")}: {m._days} {t("days ago")}</small>
                    </div>
                    <span className="dsh-badge is-alert">{weeksLabel(m._days)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="dsh-head">
        <h3>{t("Quick Links")}</h3>
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
                <strong>{t(q.title)}</strong>
                <small>{t(q.desc)}</small>
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