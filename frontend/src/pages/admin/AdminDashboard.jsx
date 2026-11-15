// frontend/src/pages/admin/AdminDashboard.jsx
// Bagong disenyo ng Dashboard (itim at puti). Pareho pa rin ang data/endpoints na ginagamit.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Users, UserCheck, HandHeart, UserRoundX, KeyRound, UsersRound, HeartHandshake, CalendarDays, TrendingUp, Bell, Wallet } from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../i18n/LanguageContext";
import DailyVerse from "../../components/DailyVerse";
import EventCalendar from "../../components/EventCalendar";
import { Avatar, BarList, CountUp, Head, LineChart, StatStrip, Tabs, greeting, peso, todayLabel } from "../../components/DashKit";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

// Mga pangalan ng resource para sa /resource?name=...
const RES_PRAYERS_CANDIDATES = ["prayer_requests"];
const RES_ATTENDANCE = "attendance";
const RES_MEMBERS = "members";

const FOLLOW_UP_DAYS = 21; // ilang araw na hindi dumalo bago ilista
const TREND_POINTS = 12; // ilang huling petsa ang nasa chart
const LIST_LIMIT = 6;

const roleLabel = { admin: "Admin / Pastor", staff: "Church Staff", ministry_leader: "Ministry Leaders", member: "Members" };

const quick = [
  { to: "/admin/users", icon: KeyRound, title: "Users & Roles", desc: "Manage accounts and access" },
  { to: "/admin/members", icon: UsersRound, title: "Members & Families", desc: "Member records and families" },
  { to: "/admin/ministries", icon: HeartHandshake, title: "Ministries & Groups", desc: "Ministries and small groups" },
  { to: "/admin/events", icon: CalendarDays, title: "Events & Schedules", desc: "Create and manage events" },
  { to: "/admin/reports", icon: TrendingUp, title: "Reports & Analytics", desc: "Trends and predicted turnout" },
  { to: "/admin/prayers", icon: HandHeart, title: "Prayer Requests", desc: "Follow up on prayer needs" },
  { to: "/admin/notifications", icon: Bell, title: "Notifications", desc: "Send and manage notifications" },
];

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

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

const monthKey = (offset = 0) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// null kapag pumalya ang request, para alam na "walang data" at hindi "walang laman"
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
      if (Array.isArray(r.data)) return r.data;
    } catch (e) {
      if (e.response?.status !== 404) {
        console.error(`RESOURCE ${name} failed:`, e.response?.status, e.response?.data || e.message);
        return null;
      }
    }
  }
  return null;
};

const toDate = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d) ? null : d;
};
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysSince = (d) => Math.floor((Date.now() - d.getTime()) / 86400000);
const shortDate = (key) => new Date(`${key}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
const attDate = (a) => toDate(a.date || a.attended_at || a.event_date || a.service_date || a.created_at);
const attMember = (a) => a.member_id ?? a.user_id ?? null;
const isPresent = (a) => !["absent", "no", "false", "0", "missed"].includes(String(a.status ?? "present").toLowerCase());

// Hindi na bukas ang prayed / answered / closed, kaya hindi na ipapakita
const isOpenPrayer = (p) => !["prayed", "answered", "closed", "resolved", "done", "archived"].includes(String(p.status || "open").toLowerCase());
// Urgent, mataas ang urgency, o kailangang i-review ng tao
const isHotPrayer = (p) => p.priority === "urgent" || p.urgency === "high" || Number(p.needs_review) === 1;

const agoLabel = (d) => {
  if (!d) return "";
  const n = daysSince(d);
  if (n <= 0) return "Today";
  if (n === 1) return "1 day ago";
  return `${n} days ago`;
};

export default function AdminDashboard() {
  const { t } = useLang();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [givingRows, setGivingRows] = useState(null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("prayers");
  const [watch, setWatch] = useState({ loaded: false, prayers: null, attendance: null, members: null });

  useEffect(() => {
    api
      .get("/auth/me")
      .then((r) => setMe(r.data?.user || null))
      .catch((e) => console.error("AUTH ME failed:", e.response?.status, e.response?.data || e.message));
    api
      .get("/admin/stats")
      .then((r) => setStats(r.data))
      .catch((e) => setError(e.response?.data?.error || "Failed to load stats"));
    api
      .get("/resource", { params: { name: "giving" } })
      .then((r) => setGivingRows(Array.isArray(r.data) ? r.data : []))
      .catch((e) => console.error("GIVING failed:", e.response?.status, e.response?.data || e.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchFirst(RES_PRAYERS_CANDIDATES), fetchList(RES_ATTENDANCE), fetchList(RES_MEMBERS)]).then(([prayers, attendance, members]) => {
      if (!cancelled) setWatch({ loaded: true, prayers, attendance, members });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const name = me?.name || user?.name || "Admin";
  const photo = me?.photo || user?.photo;
  const pic = photo ? `${API_BASE}/avatar?f=${encodeURIComponent(photo)}` : "";
  const first = name.trim().split(/\s+/)[0];

  const total = Number(stats?.total_users) || 0;
  const active = Number(stats?.active_users) || 0;
  const inactive = Math.max(total - active, 0);

  /* ---------- Giving: ngayong buwan vs nakaraang buwan ---------- */
  const sumFor = (key) => (givingRows || []).filter((g) => givingMonthKey(g) === key).reduce((tot, g) => tot + (Number(g.amount) || 0), 0);
  const thisMonth = givingRows ? sumFor(monthKey(0)) : stats?.total_giving != null ? Number(stats.total_giving) : 0;
  const lastMonth = givingRows ? sumFor(monthKey(-1)) : 0;
  const givingDelta = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
  const givingBar = Math.max(thisMonth, lastMonth, 1);

  const roles = Object.entries(stats?.by_role || {}).map(([key, count]) => ({
    key,
    value: Number(count) || 0,
    label: t(roleLabel[key] || key),
    to: `/admin/users?role=${key}`,
  }));

  /* ---------- Prayer requests (urgent muna, tapos pinakabago) ---------- */
  const openPrayers = useMemo(
    () =>
      (watch.prayers || [])
        .filter(isOpenPrayer)
        .map((p) => ({ ...p, _date: toDate(p.created_at || p.date), _hot: isHotPrayer(p) }))
        .sort((a, b) => Number(b._hot) - Number(a._hot) || (b._date?.getTime() || 0) - (a._date?.getTime() || 0)),
    [watch.prayers]
  );

  /* ---------- Attendance trend ---------- */
  const trend = useMemo(() => {
    const perDay = {};
    (watch.attendance || []).forEach((a) => {
      const d = attDate(a);
      if (!d || !isPresent(a)) return;
      const k = dayKey(d);
      perDay[k] = (perDay[k] || 0) + 1;
    });
    return Object.keys(perDay)
      .sort()
      .slice(-TREND_POINTS)
      .map((k) => ({ key: k, label: shortDate(k), value: perDay[k] }));
  }, [watch.attendance]);
  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const trendDelta = last && prev ? pct(last.value - prev.value, prev.value) : null;

  /* ---------- Members to follow up ---------- */
  const { followUp, hasSeen } = useMemo(() => {
    const lastSeen = {};
    (watch.attendance || []).forEach((a) => {
      const id = attMember(a);
      const d = attDate(a);
      if (id == null || !d || !isPresent(a)) return;
      if (!lastSeen[id] || d > lastSeen[id]) lastSeen[id] = d;
    });
    const list = (watch.members || [])
      .map((m) => {
        const seen = lastSeen[m.id] || lastSeen[m.user_id];
        return { ...m, _days: seen ? daysSince(seen) : null };
      })
      .filter((m) => m._days !== null && m._days >= FOLLOW_UP_DAYS)
      .sort((a, b) => b._days - a._days);
    return { followUp: list, hasSeen: Object.keys(lastSeen).length > 0 };
  }, [watch.attendance, watch.members]);

  const ready = Boolean(stats);
  const strip = [
    { icon: Users, label: t("Total users"), value: total, loading: !ready, to: "/admin/users", note: ready ? `${active} ${t("active")}` : "" },
    { icon: UserCheck, label: t("Active users"), value: active, loading: !ready, note: ready ? `${pct(active, total)}% ${t("of all users")}` : "" },
    { icon: UserRoundX, label: t("Inactive users"), value: inactive, loading: !ready, note: ready ? `${pct(inactive, total)}%` : "" },
    { icon: HandHeart, label: t("Open prayer requests"), value: openPrayers.length, loading: !watch.loaded, to: "/admin/prayers", note: openPrayers.some((p) => p._hot) ? `${openPrayers.filter((p) => p._hot).length} ${t("urgent")}` : "" },
  ];

  const tabItems = [
    { value: "prayers", label: t("Prayer requests"), count: watch.loaded && watch.prayers ? openPrayers.length : null },
    { value: "follow", label: t("Follow-ups"), count: watch.loaded && watch.members && watch.attendance ? followUp.length : null },
  ];

  return (
    <div className="pd">
      <section className="pd-intro">
        <Avatar src={pic} name={name} size={56} className="pd-intro-av" />
        <div className="pd-intro-text">
          <p className="pd-eyebrow">{todayLabel()}</p>
          <h2>
            {t(greeting())}, <em>{first}</em>
          </h2>
          <p className="pd-sub">River of Life Calapan · {t("Admin / Pastor")}</p>
        </div>
        <div className="pd-actions">
          <Link to="/admin/users" className="pd-btn is-solid">
            {t("Manage users")} <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link to="/admin/reports" className="pd-btn">
            {t("Reports")}
          </Link>
        </div>
      </section>

      {error && <div className="pd-err" role="alert">{t(error)}</div>}

      <StatStrip items={strip} />

      <div className="pd-cols">
        <section className="pd-panel pd-chart-panel">
          <Head title={t("Attendance trend")} to="/admin/reports" toLabel={t("Details")}>
            {last && (
              <span className="pd-figure">
                <strong>{last.value}</strong>
                <small>{t("latest")}</small>
                {trendDelta !== null && <span className={`pd-delta ${trendDelta >= 0 ? "up" : "down"}`}>{trendDelta >= 0 ? "▲" : "▼"} {Math.abs(trendDelta)}%</span>}
              </span>
            )}
          </Head>
          {!watch.loaded ? (
            <div className="pd-skel-block" style={{ height: 260 }} />
          ) : watch.attendance === null ? (
            <div className="pd-chart-empty" style={{ height: 260 }}>{t("Could not load attendance")}</div>
          ) : (
            <LineChart data={trend} unit={` ${t("present")}`} emptyText={t("No attendance records yet")} />
          )}
        </section>

        <aside className="pd-panel is-dark pd-giving">
          <Head title={t("Giving · This month")} />
          <p className="pd-big">
            {givingRows === null && stats?.total_giving == null ? <span className="pd-skel" /> : <CountUp value={thisMonth} format={peso} />}
          </p>
          {givingDelta !== null && (
            <p className="pd-giving-delta">
              <span className={givingDelta >= 0 ? "up" : "down"}>{givingDelta >= 0 ? "▲" : "▼"} {Math.abs(givingDelta)}%</span> {t("vs last month")}
            </p>
          )}
          <div className="pd-meter">
            <div>
              <span>{t("This month")}</span>
              <i style={{ "--w": `${(thisMonth / givingBar) * 100}%` }} />
            </div>
            <div>
              <span>{t("Last month")}</span>
              <i className="is-dim" style={{ "--w": `${(lastMonth / givingBar) * 100}%` }} />
            </div>
          </div>
          <Link to="/admin/giving" className="pd-btn is-light pd-block">
            <Wallet size={16} aria-hidden="true" /> {t("View giving records")} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </aside>
      </div>

      <div className="pd-cols is-wide-left">
        <section className="pd-panel">
          <Head title={t("Needs attention")}>
            <Tabs value={tab} onChange={setTab} items={tabItems} label={t("Needs attention")} />
          </Head>

          {!watch.loaded ? (
            <div className="pd-skel-block" style={{ height: 200 }} />
          ) : tab === "prayers" ? (
            watch.prayers === null ? (
              <p className="pd-empty">{t("Could not load prayer requests")}</p>
            ) : openPrayers.length === 0 ? (
              <p className="pd-empty">{t("No open prayer requests")}</p>
            ) : (
              <div className="pd-table" role="table">
                <div className="pd-tr is-head" role="row">
                  <span role="columnheader">{t("Request")}</span>
                  <span role="columnheader">{t("From")}</span>
                  <span role="columnheader">{t("When")}</span>
                  <span role="columnheader">{t("Status")}</span>
                </div>
                {openPrayers.slice(0, LIST_LIMIT).map((p, i) => (
                  <Link to="/admin/prayers" className="pd-tr" role="row" key={p.id ?? i} style={{ "--i": i }}>
                    <strong data-label={t("Request")} role="cell">{p.title || p.request || p.subject || p.message || t("Prayer request")}</strong>
                    <span data-label={t("From")} role="cell">{p.member || p.member_name || p.name || p.requester || t("Anonymous")}</span>
                    <span data-label={t("When")} role="cell">{p._date ? t(agoLabel(p._date)) : "—"}</span>
                    <span data-label={t("Status")} role="cell">
                      <b className={`pd-tag ${p._hot ? "is-alert" : ""}`}>{p._hot ? t("Urgent") : t("Open")}</b>
                    </span>
                  </Link>
                ))}
              </div>
            )
          ) : watch.members === null || watch.attendance === null ? (
            <p className="pd-empty">{t("Could not load members")}</p>
          ) : !hasSeen ? (
            <p className="pd-empty">{t("No attendance data to compare yet")}</p>
          ) : followUp.length === 0 ? (
            <p className="pd-empty">{t("Everyone is attending regularly")}</p>
          ) : (
            <div className="pd-table" role="table">
              <div className="pd-tr is-head cols-3" role="row">
                <span role="columnheader">{t("Member")}</span>
                <span role="columnheader">{t("Last attended")}</span>
                <span role="columnheader">{t("Away")}</span>
              </div>
              {followUp.slice(0, LIST_LIMIT).map((m, i) => (
                <Link to="/admin/members" className="pd-tr cols-3" role="row" key={m.id ?? i} style={{ "--i": i }}>
                  <strong data-label={t("Member")} role="cell" className="pd-who">
                    <Avatar name={m.name || m.full_name} size={28} />
                    {m.name || m.full_name || t("Member")}
                  </strong>
                  <span data-label={t("Last attended")} role="cell">{m._days} {t("days ago")}</span>
                  <span data-label={t("Away")} role="cell"><b className="pd-tag is-alert">{Math.floor(m._days / 7)} {t("wks")}</b></span>
                </Link>
              ))}
            </div>
          )}
          <Link to={tab === "prayers" ? "/admin/prayers" : "/admin/members"} className="pd-foot-link">
            {t("View all")} <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </section>

        <section className="pd-panel">
          <Head title={t("People by role")} hint={`${total} ${t("total")}`} />
          {!stats ? <div className="pd-skel-block" style={{ height: 180 }} /> : <BarList rows={roles} total={total} />}
        </section>
      </div>

      <DailyVerse portal="admin" />
      <EventCalendar />

      <Head title={t("Quick links")} />
      <div className="pd-index">
        {quick.map((q, i) => {
          const Icon = q.icon;
          return (
            <Link key={q.to} to={q.to} className="pd-index-row" style={{ "--i": i }}>
              <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
              <span>
                <strong>{t(q.title)}</strong>
                <small>{t(q.desc)}</small>
              </span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
