// frontend/src/pages/ministry/MinistryHome.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Users,
  HandHelping,
  ClipboardList,
  ClipboardCheck,
  Bell,
  User,
  ArrowRight,
  Clock,
  MapPin,
  Plus,
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { hm } from "../../components/DataPage";
import { useLang } from "../../i18n/LanguageContext";
import DailyVerse from "../../components/DailyVerse";
import EventCalendar from "../../components/EventCalendar";
import "../../components/portal.css";

const GROUPS = [
  {
    title: "Ministry",
    items: [
      { to: "/ministry/schedule", icon: CalendarDays, name: "Schedule", desc: "View your ministry schedule" },
      { to: "/ministry/members", icon: Users, name: "Members", desc: "Manage your ministry members" },
      { to: "/ministry/volunteers", icon: HandHelping, name: "Volunteers", desc: "Coordinate volunteers" },
      { to: "/ministry/activities", icon: ClipboardList, name: "Activities", desc: "Plan and track activities" },
      { to: "/ministry/events", icon: CalendarDays, name: "Events", desc: "Upcoming ministry events" },
      { to: "/ministry/attendance", icon: ClipboardCheck, name: "Attendance", desc: "Check ministry attendance" },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/ministry/notifications", icon: Bell, name: "Notifications", desc: "View your notifications" },
      { to: "/ministry/profile", icon: User, name: "My Profile", desc: "Update your personal information" },
    ],
  },
];

const greeting = () => {
  // Oras sa Pilipinas, kahit iba ang timezone ng device
  const h = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Manila",
    }).format(new Date())
  ) % 24;

  if (h >= 5 && h < 11) return "Good morning";
  if (h >= 11 && h < 13) return "Good noon";
  if (h >= 13 && h < 18) return "Good afternoon";
  return "Good evening";
};

const getList = (name, extra = {}) =>
  api
    .get("/resource", { params: { name, ...extra } })
    .then((r) => (Array.isArray(r.data) ? r.data : []))
    .catch(() => []);

export default function MinistryHome() {
  const { t } = useLang();
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);

  const loadStats = () =>
    Promise.all([
      getList("ministries", { mine: 1 }),
      getList("ministry_members"),
      getList("events"),
      getList("attendance"),
    ]).then(([mins, mm, ev, att]) => {
      const ids = new Set(mins.map((m) => String(m.id)));
      const scoped = (r) => ids.size === 0 || ids.has(String(r.ministry_id));
      // Events na walang ministry (para sa buong simbahan) ay kasama rin
      const scopedEvent = (e) => !e.ministry_id || scoped(e);

      const today = new Date().toLocaleDateString("en-CA");
      const month = today.slice(0, 7);

      const myMembers = mm.filter(scoped);
      const upcoming = ev
        .filter(scopedEvent)
        .filter((e) => e.event_date >= today)
        .sort((a, b) => (a.event_date + (a.start_time || "")).localeCompare(b.event_date + (b.start_time || "")));

      setEvents(upcoming.slice(0, 3));
      setStats({
        ministries: mins.length,
        members: myMembers.filter((r) => r.role !== "volunteer").length,
        volunteers: myMembers.filter((r) => r.role === "volunteer").length,
        events: upcoming.length,
        attendance: att.filter((a) => String(a.service_date || "").startsWith(month)).length,
      });
    });

  useEffect(() => {
    api.get("/portal/me").then((r) => setMember(r.data.member)).catch(() => {});
    loadStats();
  }, []);

  const name =
    member?.full_name ||
    user?.full_name ||
    user?.name ||
    t("Ministry Leader");
  const pic = member?.profile_pic || user?.profile_pic;

  const STAT_CARDS = [
    { to: "/ministry/members", icon: ClipboardList, label: "My Ministries", value: stats?.ministries },
    { to: "/ministry/members", icon: Users, label: "Members", value: stats?.members },
    { to: "/ministry/volunteers", icon: HandHelping, label: "Volunteers", value: stats?.volunteers },
    { to: "/ministry/events", icon: CalendarDays, label: "Upcoming Events", value: stats?.events },
    { to: "/ministry/attendance", icon: ClipboardCheck, label: "Attendance This Month", value: stats?.attendance },
  ];

  return (
    <>
      {/* Welcome banner */}
      <div className="dash-hero">
        <div className="dash-avatar">
          {pic ? <img src={pic} alt="" /> : <span>{name.charAt(0).toUpperCase()}</span>}
        </div>
        <div className="dash-hero-text">
          <small>{t(greeting())},</small>
          <h2>{name}</h2>
          <span className="dash-code">{t("Ministry Leader")}</span>
        </div>
        <div className="dash-hero-actions">
          <Link to="/ministry/add-ministry" className="dash-hero-btn">
            <Plus size={16} aria-hidden="true" /> {t("Add Ministry")}
          </Link>
          <Link to="/ministry/events" className="dash-hero-btn">
            <Plus size={16} aria-hidden="true" /> {t("Add Event")}
          </Link>
          <Link to="/ministry/attendance" className="dash-hero-btn">
            <ClipboardCheck size={16} aria-hidden="true" /> {t("Attendance")}
          </Link>
        </div>
      </div>

      {/* Overview stats */}
      <div className="dash-stats">
        {STAT_CARDS.map((s) => {
          const Icon = s.icon;
          return (
            <Link to={s.to} className="dash-stat" key={s.label}>
              <span className="dash-stat-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <div>
                <strong>{s.value ?? "-"}</strong>
                <p>{t(s.label)}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Daily Bible Verse */}
      <DailyVerse portal="ministry" />

      {/* Event calendar */}
      <EventCalendar />

      {/* Upcoming events */}
      <div className="dash-section-head">
        <h3>{t("Upcoming Events")}</h3>
        <Link to="/ministry/events" className="dash-viewall">
          {t("View all")} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {events.length === 0 ? (
        <div className="dash-empty">
          <p>{t("No upcoming events yet.")}</p>
          <Link to="/ministry/events" className="btn sm">
            <Plus size={14} aria-hidden="true" /> {t("Add Event")}
          </Link>
        </div>
      ) : (
        <div className="dash-events">
          {events.map((e) => {
            const d = new Date(e.event_date + "T00:00:00");
            return (
              <Link to="/ministry/events" className="dash-event" key={e.id}>
                <div className="dash-date">
                  <small>{d.toLocaleDateString("en-US", { month: "short" })}</small>
                  <strong>{d.getDate()}</strong>
                </div>
                <div className="dash-event-body">
                  <h4>{t(e.title)}</h4>
                  <p className="dash-event-meta">
                    <span>
                      <Clock size={13} aria-hidden="true" />{" "}
                      {e.start_time ? `${hm(e.start_time)}-${hm(e.end_time)}` : t("All day")}
                    </span>
                    {e.location && (
                      <span>
                        <MapPin size={13} aria-hidden="true" /> {e.location}
                      </span>
                    )}
                  </p>
                </div>
                {e.event_type === "outside" && <span className="badge warn">{t("Off-site")}</span>}
              </Link>
            );
          })}
        </div>
      )}

      {/* Quick actions */}
      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className="dash-section-head"><h3>{t(g.title)}</h3></div>
          <div className="dash-actions">
            {g.items.map((it) => {
              const Icon = it.icon;
              return (
                <Link to={it.to} className="dash-action" key={it.to}>
                  <span className="dash-action-icon">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{t(it.name)}</strong>
                    <p>{t(it.desc)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}