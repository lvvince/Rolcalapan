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
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { hm } from "../../components/DataPage";
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

export default function MinistryHome() {
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get("/portal/me").then((r) => setMember(r.data.member)).catch(() => {});
    api.get("/resource", { params: { name: "events" } })
      .then((r) => {
        const today = new Date().toLocaleDateString("en-CA");
        setEvents(
          r.data
            .filter((e) => e.event_date >= today)
            .sort((a, b) => (a.event_date + (a.start_time || "")).localeCompare(b.event_date + (b.start_time || "")))
            .slice(0, 3)
        );
      })
      .catch(() => {});
  }, []);

  const name =
    member?.full_name ||
    user?.full_name ||
    user?.name ||
    "Ministry Leader";
  const pic = member?.profile_pic || user?.profile_pic;

  return (
    <>
      {/* Welcome banner */}
      <div className="dash-hero">
        <div className="dash-avatar">
          {pic ? <img src={pic} alt="" /> : <span>{name.charAt(0).toUpperCase()}</span>}
        </div>
        <div className="dash-hero-text">
          <small>{greeting()},</small>
          <h2>{name}</h2>
          <span className="dash-code">Ministry Leader</span>
        </div>
        <Link to="/ministry/attendance" className="dash-hero-btn">
          <ClipboardCheck size={16} aria-hidden="true" /> Attendance
        </Link>
      </div>

      {/* Upcoming events */}
      <div className="dash-section-head">
        <h3>Upcoming Events</h3>
        <Link to="/ministry/events" className="dash-viewall">
          View all <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {events.length === 0 ? (
        <div className="dash-empty">No upcoming events yet.</div>
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
                  <h4>{e.title}</h4>
                  <p className="dash-event-meta">
                    <span>
                      <Clock size={13} aria-hidden="true" />{" "}
                      {e.start_time ? `${hm(e.start_time)}-${hm(e.end_time)}` : "All day"}
                    </span>
                    {e.location && (
                      <span>
                        <MapPin size={13} aria-hidden="true" /> {e.location}
                      </span>
                    )}
                  </p>
                </div>
                {e.event_type === "outside" && <span className="badge warn">Off-site</span>}
              </Link>
            );
          })}
        </div>
      )}

      {/* Quick actions */}
      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className="dash-section-head"><h3>{g.title}</h3></div>
          <div className="dash-actions">
            {g.items.map((it) => {
              const Icon = it.icon;
              return (
                <Link to={it.to} className="dash-action" key={it.to}>
                  <span className="dash-action-icon">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{it.name}</strong>
                    <p>{it.desc}</p>
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