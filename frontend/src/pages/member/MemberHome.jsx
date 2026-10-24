// frontend/src/pages/member/MemberHome.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { hm } from "../../components/DataPage";
import "../../components/portal.css";

const GROUPS = [
  {
    title: "Attendance",
    items: [
      { to: "/portal/qr", icon: "🔳", name: "My QR Code", desc: "Show your QR code for check-in" },
      { to: "/portal/checkin", icon: "📍", name: "GPS Check-in", desc: "Check in at off-site events" },
    ],
  },
  {
    title: "Church Life",
    items: [
      { to: "/portal/announcements", icon: "📢", name: "Announcements & Sermons", desc: "Updates, transcripts and summaries" },
      { to: "/portal/events", icon: "📅", name: "Events & RSVP", desc: "RSVP to upcoming events" },
      { to: "/portal/ministries", icon: "🙌", name: "Ministries & Groups", desc: "Join ministries and small groups" },
      { to: "/portal/recommended", icon: "✨", name: "Recommended", desc: "Ministries picked for you" },
      { to: "/portal/prayers", icon: "🙏", name: "Prayer Requests", desc: "Submit a prayer request" },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/portal/profile", icon: "👤", name: "My Profile", desc: "Update your personal information" },
      { to: "/portal/language", icon: "🌐", name: "Language", desc: "Choose preferred language" },
      { to: "/portal/notifications", icon: "🔔", name: "Notifications", desc: "View your notifications" },
    ],
  },
];

const STAT_ICONS = ["🙌", "✅", "📅"];

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

export default function MemberHome() {
  const [member, setMember] = useState(null);
  const [stats, setStats] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/portal/me").then((r) => setMember(r.data.member)).catch(() => {});
    api.get("/portal/overview")
      .then((r) => setStats(r.data.stats || []))
      .catch((e) => setError(e.response?.data?.error || "Failed to load"));
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

  const name = member?.full_name || "Member";

  return (
    <>
      {error && <div className="msg err">{error}</div>}

      {/* Welcome banner */}
      <div className="dash-hero">
        <div className="dash-avatar">
          {member?.profile_pic ? <img src={member.profile_pic} alt="" /> : <span>{name.charAt(0).toUpperCase()}</span>}
        </div>
        <div className="dash-hero-text">
          <small>{greeting()},</small>
          <h2>{name}</h2>
          {member?.member_code && <span className="dash-code">{member.member_code}</span>}
        </div>
        <Link to="/portal/qr" className="dash-hero-btn">Show my QR</Link>
      </div>

      {/* Stats */}
      <div className="dash-stats">
        {stats.map((s, i) => (
          <div className="dash-stat" key={s.label}>
            <div className="dash-stat-icon">{STAT_ICONS[i % STAT_ICONS.length]}</div>
            <div>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming events */}
      <div className="dash-section-head">
        <h3>Upcoming Events</h3>
        <Link to="/portal/events">View all</Link>
      </div>
      {events.length === 0 ? (
        <div className="dash-empty">No upcoming events yet.</div>
      ) : (
        <div className="dash-events">
          {events.map((e) => {
            const d = new Date(e.event_date + "T00:00:00");
            return (
              <Link to="/portal/events" className="dash-event" key={e.id}>
                <div className="dash-date">
                  <small>{d.toLocaleDateString("en-US", { month: "short" })}</small>
                  <strong>{d.getDate()}</strong>
                </div>
                <div className="dash-event-body">
                  <h4>{e.title}</h4>
                  <p>
                    {e.start_time ? `${hm(e.start_time)}-${hm(e.end_time)}` : "All day"}
                    {e.location ? ` · ${e.location}` : ""}
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
            {g.items.map((it) => (
              <Link to={it.to} className="dash-action" key={it.to}>
                <span className="dash-action-icon">{it.icon}</span>
                <div>
                  <strong>{it.name}</strong>
                  <p>{it.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}