// frontend/src/pages/member/MemberHome.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  ClipboardCheck,
  CalendarDays,
  QrCode,
  MapPin,
  HandHeart,
  FileText,
  HeartHandshake,
  Home,
  Sparkles,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../i18n/LanguageContext";
import DailyVerse from "../../components/DailyVerse";
import EventCalendar from "../../components/EventCalendar";
import "../../components/portal.css";

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

// label galing sa /portal/overview -> link at icon
const STAT_META = {
  "My Ministries & Groups": { to: "/portal/ministries", icon: Users },
  "Times Attended": { to: "/portal/events", icon: ClipboardCheck },
  "Upcoming Events": { to: "/portal/events", icon: CalendarDays },
};

const LINKS = [
  { to: "/portal/qr", icon: QrCode, name: "My QR Code", desc: "Show your QR code for check-in" },
  { to: "/portal/checkin", icon: MapPin, name: "GPS Check-in", desc: "Check in at off-site events" },
  { to: "/portal/events", icon: CalendarDays, name: "Events & RSVP", desc: "RSVP to events" },
  { to: "/portal/prayers", icon: HandHeart, name: "Prayer Requests", desc: "Submit a prayer request" },
  { to: "/portal/announcements", icon: FileText, name: "Announcements & Sermons", desc: "View announcements and sermons" },
  { to: "/portal/ministries", icon: HeartHandshake, name: "Ministries & Groups", desc: "Join ministries and small groups" },
];

export default function MemberHome() {
  const { t } = useLang();
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [stats, setStats] = useState(null);
  const [recs, setRecs] = useState(null);
  const [interests, setInterests] = useState(null); // null = hindi pa nakuha
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => {
    api
      .get("/portal/overview")
      .then((r) => setStats(r.data.stats || []))
      .catch(() => setStats([]));
    api
      .get("/portal/recommended")
      .then((r) => setRecs((r.data || []).slice(0, 3)))
      .catch(() => setRecs([]));
  };

  useEffect(() => {
    api.get("/portal/me").then((r) => setMember(r.data.member)).catch(() => {});
    api
      .get("/portal/interests")
      .then((r) => setInterests(r.data.interests || []))
      .catch(() => setInterests(null));
    load();
  }, []);

  const join = async (id) => {
    setBusy(id);
    try {
      await api.post("/portal/join", { ministry_id: id });
      setMsg(null);
      load();
    } catch (x) {
      setMsg(x.response?.data?.error || "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const name = member?.full_name || user?.full_name || user?.name || t("Member");
  const pic = member?.profile_pic || user?.profile_pic;

  // Kulang ang profile kung walang birthdate o walang interests (kailangan ng Recommended)
  const missing = [];
  if (member && !member.birthdate) missing.push(t("birthdate"));
  if (interests !== null && interests.length === 0) missing.push(t("interests"));

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
          <span className="dash-code">{member?.member_code || t("Member")}</span>
        </div>
        <div className="dash-hero-actions">
          <Link to="/portal/qr" className="dash-hero-btn">
            <QrCode size={16} aria-hidden="true" /> {t("My QR Code")}
          </Link>
          <Link to="/portal/events" className="dash-hero-btn">
            <CalendarDays size={16} aria-hidden="true" /> {t("Events & RSVP")}
          </Link>
        </div>
      </div>

      {/* Overview stats */}
      <div className="dash-stats">
        {(stats || []).map((s) => {
          const meta = STAT_META[s.label] || { to: "/portal", icon: Users };
          const Icon = meta.icon;
          return (
            <Link to={meta.to} className="dash-stat" key={s.label}>
              <span className="dash-stat-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <div>
                <strong>{s.value}</strong>
                <p>{t(s.label)}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Complete your profile */}
      {missing.length > 0 && (
        <div className="dash-empty" style={{ marginBottom: 16 }}>
          <p>
            <strong>{t("Complete your profile")}</strong>
            <br />
            {t("Add your")} {missing.join(` ${t("and")} `)} {t("to get better ministry recommendations.")}
          </p>
          <Link to="/portal/profile" className="btn sm">
            {t("Update profile")}
          </Link>
        </div>
      )}

      {/* Daily Bible Verse */}
      <DailyVerse portal="member" />

      {/* Recommended for you */}
      <div className="dash-section-head">
        <h3>{t("Recommended for You")}</h3>
        <Link to="/portal/recommended" className="dash-viewall">
          {t("View all")} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {msg && <div className="msg err">{t(msg)}</div>}

      {recs === null ? (
        <p>{t("Loading...")}</p>
      ) : recs.length === 0 ? (
        <div className="dash-empty">
          <p>{t("No recommendations right now. You may have joined everything!")}</p>
        </div>
      ) : (
        <div className="min-grid">
          {recs.map((m) => {
            const isGroup = m.type === "small_group";
            const similar = !String(m.reason || "").startsWith("Popular");
            return (
              <div className="min-card" key={m.id}>
                <div className="min-head">
                  <div className={`min-icon ${isGroup ? "group" : ""}`}>
                    {isGroup ? <Home size={22} aria-hidden="true" /> : <HeartHandshake size={22} aria-hidden="true" />}
                  </div>
                  <div>
                    <h4 className="min-title">{t(m.name)}</h4>
                    <div className="min-tags">
                      <span className={`min-tag ${isGroup ? "group" : ""}`}>
                        {isGroup ? t("Small group") : t("Ministry")}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="min-desc">{t(m.description)}</p>

                <div className={`min-reason ${similar ? "" : "popular"}`}>
                  {similar ? <Sparkles size={14} aria-hidden="true" /> : <Users size={14} aria-hidden="true" />}{" "}
                  {t(m.reason)}
                </div>

                <div className="min-foot">
                  <button className="min-btn" disabled={busy === m.id} onClick={() => join(m.id)}>
                    <UserPlus size={14} aria-hidden="true" /> {busy === m.id ? t("Joining...") : t("Join")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event calendar (kasama na ang Upcoming Events) */}
      <EventCalendar />

      {/* Quick links */}
      <div className="dash-section-head">
        <h3>{t("Quick Links")}</h3>
      </div>
      <div className="dash-actions">
        {LINKS.map((it) => {
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
    </>
  );
}