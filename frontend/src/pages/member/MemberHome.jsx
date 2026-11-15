// frontend/src/pages/member/MemberHome.jsx
// Dashboard ng Member: ibang disenyo kaysa sa Admin/Staff/Ministry (editorial na "Today" view, walang sidebar).
// Pareho pa rin ang endpoints at logic (join, overview, recommended, interests).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, ClipboardCheck, CalendarDays, QrCode, MapPin, HandHeart, FileText, HeartHandshake, Home, Sparkles, UserPlus, ArrowRight, ArrowUpRight, ScanLine } from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../i18n/LanguageContext";
import DailyVerse from "../../components/DailyVerse";
import EventCalendar from "../../components/EventCalendar";
import { Avatar, CountUp, Head, greeting, todayLabel } from "../../components/DashKit";

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
      .then((r) => setRecs((r.data || []).slice(0, 4)))
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
  const first = name.trim().split(/\s+/)[0];
  const pic = member?.profile_pic || user?.profile_pic;

  // Kulang ang profile kung walang birthdate o walang interests (kailangan ng Recommended)
  const missing = [];
  if (member && !member.birthdate) missing.push(t("birthdate"));
  if (interests !== null && interests.length === 0) missing.push(t("interests"));

  return (
    <div className="mp">
      {/* ---------- Hero: greeting + member pass ---------- */}
      <section className="mp-hero">
        <div className="mp-hero-text">
          <p className="mp-eyebrow">{todayLabel()}</p>
          <h2>
            {t(greeting())},
            <br />
            <em>{first}.</em>
          </h2>
          <p className="mp-hero-sub">{t("There is always a seat for you at River of Life Calapan.")}</p>
          <div className="mp-hero-actions">
            <Link to="/portal/events" className="pd-btn is-light">
              <CalendarDays size={16} aria-hidden="true" /> {t("Events & RSVP")}
            </Link>
            <Link to="/portal/prayers" className="pd-btn is-ghost-light">
              <HandHeart size={16} aria-hidden="true" /> {t("Prayer requests")}
            </Link>
          </div>
        </div>

        <Link to="/portal/qr" className="mp-pass" aria-label={t("Show my QR code")}>
          <div className="mp-pass-top">
            <Avatar src={pic} name={name} size={52} />
            <div>
              <strong>{name}</strong>
              <small>{member?.member_code || t("Member")}</small>
            </div>
          </div>
          <div className="mp-pass-qr" aria-hidden="true">
            <ScanLine size={34} strokeWidth={1.4} />
          </div>
          <div className="mp-pass-foot">
            <span>{t("Show my QR code")}</span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </div>
        </Link>
      </section>

      {/* ---------- Stats ---------- */}
      <div className="mp-stats">
        {(stats || []).map((s, i) => {
          const meta = STAT_META[s.label] || { to: "/portal", icon: Users };
          const Icon = meta.icon;
          return (
            <Link to={meta.to} className="mp-stat" key={s.label} style={{ "--i": i }}>
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              <strong>
                <CountUp value={s.value} />
              </strong>
              <span>{t(s.label)}</span>
            </Link>
          );
        })}
      </div>

      {/* ---------- Complete your profile ---------- */}
      {missing.length > 0 && (
        <div className="mp-note">
          <p>
            <strong>{t("Complete your profile")}</strong>
            <span>
              {t("Add your")} {missing.join(` ${t("and")} `)} {t("to get better ministry recommendations.")}
            </span>
          </p>
          <Link to="/portal/profile" className="pd-btn is-solid">
            {t("Update profile")} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* ---------- Daily Bible Verse ---------- */}
      <DailyVerse portal="member" />

      {/* ---------- Recommended (carousel) ---------- */}
      <Head title={t("Recommended for you")} to="/portal/ministries?tab=recommended" toLabel={t("View all")} />
      {msg && <div className="msg err">{t(msg)}</div>}

      {recs === null ? (
        <div className="pd-skel-block" style={{ height: 190 }} />
      ) : recs.length === 0 ? (
        <p className="pd-empty">{t("No recommendations right now. You may have joined everything!")}</p>
      ) : (
        <div className="mp-rail" role="list">
          {recs.map((m, i) => {
            const isGroup = m.type === "small_group";
            const similar = !String(m.reason || "").startsWith("Popular");
            return (
              <article className="mp-rec" role="listitem" key={m.id} style={{ "--i": i }}>
                <div className="mp-rec-top">
                  <span className="mp-rec-ico">{isGroup ? <Home size={20} aria-hidden="true" /> : <HeartHandshake size={20} aria-hidden="true" />}</span>
                  <span className="mp-rec-tag">{isGroup ? t("Small group") : t("Ministry")}</span>
                </div>
                <h4>{t(m.name)}</h4>
                <p>{t(m.description)}</p>
                <span className="mp-rec-why">
                  {similar ? <Sparkles size={14} aria-hidden="true" /> : <Users size={14} aria-hidden="true" />} {t(m.reason)}
                </span>
                <button type="button" className="mp-rec-join" disabled={busy === m.id} onClick={() => join(m.id)}>
                  <UserPlus size={15} aria-hidden="true" /> {busy === m.id ? t("Joining...") : t("Join")}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <EventCalendar />

      {/* ---------- Quick links ---------- */}
      <Head title={t("Quick links")} />
      <div className="mp-links">
        {LINKS.map((it, i) => {
          const Icon = it.icon;
          return (
            <Link to={it.to} className="mp-link" key={it.to} style={{ "--i": i }}>
              <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
              <strong>{t(it.name)}</strong>
              <small>{t(it.desc)}</small>
              <ArrowUpRight size={16} className="mp-link-go" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
