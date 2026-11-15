// frontend/src/pages/secretary/SecretaryHome.jsx
// Bagong disenyo ng Dashboard (itim at puti). Pareho pa rin ang endpoints na ginagamit.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, UsersRound, UserCheck, CalendarCheck, CalendarDays, Wallet, QrCode, ClipboardCheck, MapPin, Clock, BarChart3, Mic, Bell, User } from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../i18n/LanguageContext";
import DailyVerse from "../../components/DailyVerse";
import EventCalendar from "../../components/EventCalendar";
import { Avatar, CountUp, Head, LineChart, StatStrip, greeting, peso, todayLabel } from "../../components/DashKit";
import "./StaffPages.css";

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthOf = (offset = 0) => {
  const n = new Date();
  return ymd(new Date(n.getFullYear(), n.getMonth() + offset, 1)).slice(0, 7);
};
const short = (key) => new Date(`${key}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
const hm = (v) => {
  if (!v) return "";
  const [h, m] = String(v).split(":");
  const H = Number(h);
  return `${((H + 11) % 12) + 1}:${m} ${H >= 12 ? "PM" : "AM"}`;
};

// Kunin ang records gamit ang parehong endpoint ng mga staff pages
const getResource = (name) => api.get("/resource", { params: { name } }).then((r) => (Array.isArray(r.data) ? r.data : []));

const quick = [
  { to: "/staff/members", icon: UsersRound, title: "Members & Records", desc: "Add and update member records" },
  { to: "/staff/qr", icon: QrCode, title: "QR Codes", desc: "Generate QR codes for members" },
  { to: "/staff/attendance", icon: ClipboardCheck, title: "Attendance", desc: "Manage attendance records" },
  { to: "/staff/events", icon: CalendarDays, title: "Events & Schedules", desc: "Manage events and announcements" },
  { to: "/staff/geofence", icon: MapPin, title: "Geofence", desc: "Set location for off-site events" },
  { to: "/staff/schedules", icon: Clock, title: "Ministry Schedules", desc: "Manage ministry schedules" },
  { to: "/staff/giving", icon: Wallet, title: "Giving", desc: "Record giving transactions" },
  { to: "/staff/reports", icon: BarChart3, title: "Reports", desc: "Generate reports" },
  { to: "/staff/sermons", icon: Mic, title: "Sermon Archive", desc: "Upload audio for transcript and summary" },
  { to: "/staff/notifications", icon: Bell, title: "Notifications", desc: "Send notifications" },
  { to: "/staff/profile", icon: User, title: "My Profile", desc: "Update your personal information" },
];

export default function SecretaryHome() {
  const { t } = useLang();
  const { user } = useAuth();
  const [data, setData] = useState(null); // { members, attendance, events, giving }
  const [member, setMember] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/portal/me").then((r) => setMember(r.data.member)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getResource("members"), getResource("attendance"), getResource("events"), getResource("giving")])
      .then(([members, attendance, events, giving]) => {
        if (!cancelled) setData({ members, attendance, events, giving });
      })
      .catch((e) => {
        console.error("SECRETARY STATS failed:", e.response?.status, e.response?.data || e.message);
        if (!cancelled) setError(e.response?.data?.error || "Failed to load stats");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const name = member?.full_name || user?.name || t("Church Staff");
  const first = name.trim().split(/\s+/)[0];
  const pic = member?.profile_pic;

  const s = useMemo(() => {
    if (!data) return null;
    const today = ymd(new Date());
    const given = (key) => data.giving.filter((g) => String(g.given_at).slice(0, 7) === key).reduce((tot, g) => tot + (Number(g.amount) || 0), 0);
    const perDay = {};
    data.attendance.forEach((a) => {
      const k = String(a.service_date || "").slice(0, 10);
      if (k) perDay[k] = (perDay[k] || 0) + 1;
    });
    const upcoming = data.events
      .filter((e) => String(e.event_date).slice(0, 10) >= today)
      .sort((a, b) => (String(a.event_date) + (a.start_time || "")).localeCompare(String(b.event_date) + (b.start_time || "")));
    return {
      members: data.members.length,
      active: data.members.filter((m) => m.status === "active").length,
      today: perDay[today] || 0,
      upcoming,
      thisMonth: given(monthOf(0)),
      lastMonth: given(monthOf(-1)),
      trend: Object.keys(perDay).sort().slice(-12).map((k) => ({ key: k, label: short(k), value: perDay[k] })),
    };
  }, [data]);

  const loading = !s;
  const strip = [
    { icon: UsersRound, label: t("Members"), value: s?.members ?? 0, loading, to: "/staff/members", note: s ? `${s.active} ${t("active")}` : "" },
    { icon: UserCheck, label: t("Active members"), value: s?.active ?? 0, loading },
    { icon: CalendarCheck, label: t("Checked in today"), value: s?.today ?? 0, loading, to: "/staff/attendance" },
    { icon: CalendarDays, label: t("Upcoming events"), value: s?.upcoming.length ?? 0, loading, to: "/staff/events" },
  ];

  const delta = s && s.lastMonth > 0 ? Math.round(((s.thisMonth - s.lastMonth) / s.lastMonth) * 100) : null;
  const gmax = Math.max(s?.thisMonth || 0, s?.lastMonth || 0, 1);
  const last = s?.trend[s.trend.length - 1];

  return (
    <div className="pd">
      <section className="pd-intro">
        <Avatar src={pic} name={name} size={56} className="pd-intro-av" />
        <div className="pd-intro-text">
          <p className="pd-eyebrow">{todayLabel()}</p>
          <h2>
            {t(greeting())}, <em>{first}</em>
          </h2>
          <p className="pd-sub">River of Life Calapan · {t("Church Staff / Secretary")}</p>
        </div>
        <div className="pd-actions">
          <Link to="/staff/attendance" className="pd-btn is-solid">
            {t("Start check-in")} <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link to="/staff/members" className="pd-btn">
            {t("Members")}
          </Link>
        </div>
      </section>

      {error && <div className="pd-err" role="alert">{t(error)}</div>}

      <StatStrip items={strip} />

      <div className="pd-cols">
        <section className="pd-panel pd-chart-panel">
          <Head title={t("Attendance trend")} to="/staff/attendance" toLabel={t("Details")}>
            {last && (
              <span className="pd-figure">
                <strong>{last.value}</strong>
                <small>{t("latest")}</small>
              </span>
            )}
          </Head>
          {loading ? <div className="pd-skel-block" style={{ height: 260 }} /> : <LineChart data={s.trend} unit={` ${t("present")}`} emptyText={t("No attendance records yet")} />}
        </section>

        <aside className="pd-panel is-dark pd-giving">
          <Head title={t("Giving · This month")} />
          <p className="pd-big">{loading ? <span className="pd-skel" /> : <CountUp value={s.thisMonth} format={peso} />}</p>
          {delta !== null && (
            <p className="pd-giving-delta">
              <span className={delta >= 0 ? "up" : "down"}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%</span> {t("vs last month")}
            </p>
          )}
          <div className="pd-meter">
            <div>
              <span>{t("This month")}</span>
              <i style={{ "--w": `${((s?.thisMonth || 0) / gmax) * 100}%` }} />
            </div>
            <div>
              <span>{t("Last month")}</span>
              <i className="is-dim" style={{ "--w": `${((s?.lastMonth || 0) / gmax) * 100}%` }} />
            </div>
          </div>
          <Link to="/staff/giving" className="pd-btn is-light pd-block">
            <Wallet size={16} aria-hidden="true" /> {t("Record giving")} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </aside>
      </div>

      <section className="pd-panel">
        <Head title={t("Upcoming events")} to="/staff/events" toLabel={t("View all")} />
        {loading ? (
          <div className="pd-skel-block" style={{ height: 160 }} />
        ) : s.upcoming.length === 0 ? (
          <p className="pd-empty">{t("No upcoming events yet.")}</p>
        ) : (
          <div className="pd-table" role="table">
            <div className="pd-tr is-head cols-4" role="row">
              <span role="columnheader">{t("Event")}</span>
              <span role="columnheader">{t("Date")}</span>
              <span role="columnheader">{t("Time")}</span>
              <span role="columnheader">{t("Where")}</span>
            </div>
            {s.upcoming.slice(0, 6).map((e, i) => (
              <Link to="/staff/events" className="pd-tr cols-4" role="row" key={e.id ?? i} style={{ "--i": i }}>
                <strong data-label={t("Event")} role="cell">{t(e.title)}</strong>
                <span data-label={t("Date")} role="cell">{short(String(e.event_date).slice(0, 10))}</span>
                <span data-label={t("Time")} role="cell">{e.start_time ? `${hm(e.start_time)}${e.end_time ? ` – ${hm(e.end_time)}` : ""}` : t("All day")}</span>
                <span data-label={t("Where")} role="cell">{e.location || "—"} {e.event_type === "outside" && <b className="pd-tag">{t("Off-site")}</b>}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <DailyVerse portal="staff" />
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
