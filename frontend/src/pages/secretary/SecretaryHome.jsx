import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  UsersRound,
  UserCheck,
  CalendarCheck,
  CalendarDays,
  Wallet,
  QrCode,
  ClipboardCheck,
  MapPin,
  Clock,
  BarChart3,
  Mic,
  Bell,
  User,
  ArrowRight,
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../i18n/LanguageContext";
import "../admin/AdminDashboard.css"; // .dsh-* styles
import "./StaffPages.css";

const LOGO_SRC = "/logo.png";

const peso = (n) =>
  "₱" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

// "YYYY-MM-DD" sa local time
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Kunin ang records gamit ang parehong endpoint ng mga staff pages
const getResource = (name) =>
  api.get("/resource", { params: { name } }).then((r) => (Array.isArray(r.data) ? r.data : []));

const quick = [
  { to: "/staff/members", icon: UsersRound, title: "Members & Records", desc: "Add and update member records", tone: "rose" },
  { to: "/staff/qr", icon: QrCode, title: "QR Codes", desc: "Generate QR codes for members", tone: "violet" },
  { to: "/staff/attendance", icon: ClipboardCheck, title: "Attendance", desc: "Manage attendance records", tone: "green" },
  { to: "/staff/events", icon: CalendarDays, title: "Events & Announcements", desc: "Manage events and announcements", tone: "blue" },
  { to: "/staff/geofence", icon: MapPin, title: "Geofence", desc: "Set location for off-site events", tone: "teal" },
  { to: "/staff/schedules", icon: Clock, title: "Ministry Schedules", desc: "Manage ministry schedules", tone: "cyan" },
  { to: "/staff/giving", icon: Wallet, title: "Giving", desc: "Record giving transactions", tone: "amber" },
  { to: "/staff/reports", icon: BarChart3, title: "Reports", desc: "Generate reports", tone: "slate" },
  { to: "/staff/sermons", icon: Mic, title: "Sermon Archive", desc: "Upload audio for transcript and summary", tone: "violet" },
  { to: "/staff/notifications", icon: Bell, title: "Notifications", desc: "Send notifications", tone: "green" },
  { to: "/staff/profile", icon: User, title: "My Profile", desc: "Update your personal information", tone: "rose" },
];

export default function SecretaryHome() {
  const { t } = useLang();
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [member, setMember] = useState(null);
  const [error, setError] = useState("");
  const [logoOk, setLogoOk] = useState(true);

  useEffect(() => {
    api.get("/portal/me").then((r) => setMember(r.data.member)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getResource("members"),
      getResource("attendance"),
      getResource("events"),
      getResource("giving"),
    ])
      .then(([members, attendance, events, giving]) => {
        const today = ymd(new Date());
        const month = today.slice(0, 7);

        const next = {
          members: members.length,
          active_members: members.filter((m) => m.status === "active").length,
          checked_in_today: attendance.filter((a) => String(a.service_date).slice(0, 10) === today).length,
          upcoming_events: events.filter((e) => String(e.event_date).slice(0, 10) >= today).length,
          giving_this_month: giving
            .filter((g) => String(g.given_at).slice(0, 7) === month)
            .reduce((tot, g) => tot + (Number(g.amount) || 0), 0),
        };
        if (!cancelled) setS(next);
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
  const pic = member?.profile_pic;

  const stats = [
    { icon: UsersRound, tone: "cyan", value: s?.members ?? 0, label: "Members" },
    { icon: UserCheck, tone: "green", value: s?.active_members ?? 0, label: "Active Members" },
    { icon: CalendarCheck, tone: "violet", value: s?.checked_in_today ?? 0, label: "Checked in Today", to: "/staff/attendance" },
    { icon: CalendarDays, tone: "blue", value: s?.upcoming_events ?? 0, label: "Upcoming Events", to: "/staff/events" },
    { icon: Wallet, tone: "amber", value: peso(s?.giving_this_month), label: "Giving · This Month", to: "/staff/giving" },
  ];

  return (
    <div className="dsh">
      <div className="dsh-hero">
        {pic ? (
          <div className="dsh-hero-avatar">
            <img src={pic} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
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
          <span className="dsh-hero-tag">{t("CHURCH STAFF / SECRETARY")}</span>
        </div>
        <Link to="/staff/attendance" className="dsh-hero-btn">
          {t("Start check-in")} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      {error && <div className="dsh-err">{t(error)}</div>}
      {!s && !error && <p className="dsh-muted">{t("Loading...")}</p>}

      {s && (
        <div className="dsh-stats staff-stats">
          {stats.map((x) => {
            const Icon = x.icon;
            const body = (
              <>
                <span className={`dsh-tile tone-${x.tone}`}><Icon size={22} aria-hidden="true" /></span>
                <div><strong>{x.value}</strong><span>{t(x.label)}</span></div>
              </>
            );
            return x.to ? (
              <Link key={x.label} to={x.to} className="dsh-stat is-link">{body}</Link>
            ) : (
              <div key={x.label} className="dsh-stat">{body}</div>
            );
          })}
        </div>
      )}

      <div className="dsh-head">
        <h3>{t("Quick Links")}</h3>
      </div>
      <div className="dsh-links">
        {quick.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.to} to={q.to} className="dsh-link">
              <span className={`dsh-tile tone-${q.tone}`}><Icon size={22} aria-hidden="true" /></span>
              <span className="dsh-link-text">
                <strong>{t(q.title)}</strong>
                <small>{t(q.desc)}</small>
              </span>
              <span className="dsh-arrow" aria-hidden="true"><ArrowRight size={18} /></span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}