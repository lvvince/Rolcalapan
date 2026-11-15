// frontend/src/pages/ministry/MinistryHome.jsx
// Bagong disenyo ng Dashboard (itim at puti). Pareho pa rin ang endpoints na ginagamit.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Users, HandHelping, ClipboardList, ClipboardCheck, Bell, User, ArrowRight, ArrowUpRight, Clock, MapPin, Plus } from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { hm } from "../../components/DataPage";
import { useLang } from "../../i18n/LanguageContext";
import DailyVerse from "../../components/DailyVerse";
import EventCalendar from "../../components/EventCalendar";
import { Avatar, Head, LineChart, StatStrip, greeting, todayLabel } from "../../components/DashKit";

const QUICK = [
  { to: "/ministry/schedule", icon: CalendarDays, name: "Schedule", desc: "View your ministry schedule" },
  { to: "/ministry/members", icon: Users, name: "Members", desc: "Manage your ministry members" },
  { to: "/ministry/volunteers", icon: HandHelping, name: "Volunteers", desc: "Coordinate volunteers" },
  { to: "/ministry/activities", icon: ClipboardList, name: "Activities", desc: "Plan and track activities" },
  { to: "/ministry/events", icon: CalendarDays, name: "Events", desc: "Upcoming ministry events" },
  { to: "/ministry/attendance", icon: ClipboardCheck, name: "Attendance", desc: "Check ministry attendance" },
  { to: "/ministry/notifications", icon: Bell, name: "Notifications", desc: "View your notifications" },
  { to: "/ministry/profile", icon: User, name: "My Profile", desc: "Update your personal information" },
];

const getList = (name, extra = {}) =>
  api
    .get("/resource", { params: { name, ...extra } })
    .then((r) => (Array.isArray(r.data) ? r.data : []))
    .catch(() => []);

const short = (key) => new Date(`${key}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" });

export default function MinistryHome() {
  const { t } = useLang();
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [raw, setRaw] = useState(null);

  useEffect(() => {
    api.get("/portal/me").then((r) => setMember(r.data.member)).catch(() => {});
    Promise.all([getList("ministries", { mine: 1 }), getList("ministry_members"), getList("events"), getList("attendance")]).then(([mins, mm, ev, att]) =>
      setRaw({ mins, mm, ev, att })
    );
  }, []);

  const s = useMemo(() => {
    if (!raw) return null;
    const { mins, mm, ev, att } = raw;
    const ids = new Set(mins.map((m) => String(m.id)));
    const scoped = (r) => ids.size === 0 || ids.has(String(r.ministry_id));
    // Events na walang ministry (para sa buong simbahan) ay kasama rin
    const scopedEvent = (e) => !e.ministry_id || scoped(e);
    const today = new Date().toLocaleDateString("en-CA");
    const month = today.slice(0, 7);
    const mine = mm.filter(scoped);
    const upcoming = ev
      .filter(scopedEvent)
      .filter((e) => e.event_date >= today)
      .sort((a, b) => (a.event_date + (a.start_time || "")).localeCompare(b.event_date + (b.start_time || "")));
    const perDay = {};
    att.forEach((a) => {
      const k = String(a.service_date || "").slice(0, 10);
      if (k) perDay[k] = (perDay[k] || 0) + 1;
    });
    return {
      ministries: mins.length,
      members: mine.filter((r) => r.role !== "volunteer").length,
      volunteers: mine.filter((r) => r.role === "volunteer").length,
      upcoming,
      attendance: att.filter((a) => String(a.service_date || "").startsWith(month)).length,
      trend: Object.keys(perDay).sort().slice(-12).map((k) => ({ key: k, label: short(k), value: perDay[k] })),
    };
  }, [raw]);

  const name = member?.full_name || user?.full_name || user?.name || t("Ministry Leader");
  const first = name.trim().split(/\s+/)[0];
  const pic = member?.profile_pic || user?.profile_pic;
  const loading = !s;
  const next = s?.upcoming[0];
  const nd = next ? new Date(next.event_date + "T00:00:00") : null;

  const strip = [
    { icon: ClipboardList, label: t("My ministries"), value: s?.ministries ?? 0, loading, to: "/ministry/members" },
    { icon: Users, label: t("Members"), value: s?.members ?? 0, loading, to: "/ministry/members" },
    { icon: HandHelping, label: t("Volunteers"), value: s?.volunteers ?? 0, loading, to: "/ministry/volunteers" },
    { icon: ClipboardCheck, label: t("Attendance this month"), value: s?.attendance ?? 0, loading, to: "/ministry/attendance" },
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
          <p className="pd-sub">River of Life Calapan · {t("Ministry Leader")}</p>
        </div>
        <div className="pd-actions">
          <Link to="/ministry/events" className="pd-btn is-solid">
            <Plus size={16} aria-hidden="true" /> {t("Add Event")}
          </Link>
          <Link to="/ministry/add-ministry" className="pd-btn">
            {t("Add Ministry")}
          </Link>
          <Link to="/ministry/attendance" className="pd-btn">
            {t("Attendance")}
          </Link>
        </div>
      </section>

      <StatStrip items={strip} />

      <div className="pd-cols">
        <section className="pd-panel pd-chart-panel">
          <Head title={t("Attendance trend")} to="/ministry/attendance" toLabel={t("Details")} />
          {loading ? <div className="pd-skel-block" style={{ height: 260 }} /> : <LineChart data={s.trend} unit={` ${t("present")}`} emptyText={t("No attendance records yet")} />}
        </section>

        <aside className="pd-panel is-dark pd-next">
          <Head title={t("Next up")} />
          {loading ? (
            <span className="pd-skel" />
          ) : next ? (
            <>
              <div className="pd-next-date">
                <small>{nd.toLocaleDateString("en-US", { month: "short" })}</small>
                <strong>{nd.getDate()}</strong>
                <span>{nd.toLocaleDateString("en-US", { weekday: "long" })}</span>
              </div>
              <h4>{t(next.title)}</h4>
              <p className="pd-next-meta">
                <span>
                  <Clock size={14} aria-hidden="true" /> {next.start_time ? `${hm(next.start_time)}${next.end_time ? `–${hm(next.end_time)}` : ""}` : t("All day")}
                </span>
                {next.location && (
                  <span>
                    <MapPin size={14} aria-hidden="true" /> {next.location}
                  </span>
                )}
              </p>
              <Link to="/ministry/events" className="pd-btn is-light pd-block">
                {t("Manage event")} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <p className="pd-dim">{t("No upcoming events yet.")}</p>
              <Link to="/ministry/events" className="pd-btn is-light pd-block">
                <Plus size={16} aria-hidden="true" /> {t("Add Event")}
              </Link>
            </>
          )}
        </aside>
      </div>

      <section className="pd-panel">
        <Head title={t("Upcoming events")} to="/ministry/events" toLabel={t("View all")} />
        {loading ? (
          <div className="pd-skel-block" style={{ height: 150 }} />
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
              <Link to="/ministry/events" className="pd-tr cols-4" role="row" key={e.id ?? i} style={{ "--i": i }}>
                <strong data-label={t("Event")} role="cell">{t(e.title)}</strong>
                <span data-label={t("Date")} role="cell">{short(String(e.event_date).slice(0, 10))}</span>
                <span data-label={t("Time")} role="cell">{e.start_time ? `${hm(e.start_time)}${e.end_time ? ` – ${hm(e.end_time)}` : ""}` : t("All day")}</span>
                <span data-label={t("Where")} role="cell">{e.location || "—"} {e.event_type === "outside" && <b className="pd-tag">{t("Off-site")}</b>}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <DailyVerse portal="ministry" />
      <EventCalendar />

      <Head title={t("Quick links")} />
      <div className="pd-index">
        {QUICK.map((q, i) => {
          const Icon = q.icon;
          return (
            <Link key={q.to} to={q.to} className="pd-index-row" style={{ "--i": i }}>
              <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
              <span>
                <strong>{t(q.name)}</strong>
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
