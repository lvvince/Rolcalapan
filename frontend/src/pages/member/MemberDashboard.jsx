// frontend/src/pages/member/MemberDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  HeartHandshake,
  Check,
  Users,
  Star,
  Sparkles,
  QrCode,
  MapPin,
  Search,
  Headphones,
  FileText,
  Calendar,
  Clock,
  Save,
  LogOut,
  UserPlus,
  Compass,
} from "lucide-react";
import api from "../../api";
import ProfilePicture from "../../components/ProfilePicture";
import DataPage, { hm } from "../../components/DataPage";
import { useLang } from "../../i18n/LanguageContext";
import QrView from "../../components/QrView";
import NotificationsView from "../../components/Notifications";
import InterestsCard from "../../components/InterestsCard";
import "../../components/portal.css";

const err = (e) => e.response?.data?.error || "Something went wrong";

/* Maliit na helper para pare-pareho ang laki ng icons */
const Ico = ({ icon: Icon, size = 16 }) => <Icon size={size} aria-hidden="true" />;

/* ----------------------------------------------------------- Profile */
export function Profile() {
  const { t } = useLang();
  const [form, setForm] = useState(null);
  const [mins, setMins] = useState([]);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/portal/me")
      .then((r) => {
        setForm(r.data.member);
        setMins(r.data.ministries);
      })
      .catch((e) => setMsg({ ok: false, text: err(e) }));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { profile_pic, ...payload } = form; // hindi isinasama ang pic
      await api.post("/portal/me", payload);
      setMsg({ ok: true, text: "Profile saved." });
    } catch (x) {
      setMsg({ ok: false, text: err(x) });
    } finally {
      setSaving(false);
    }
  };

  if (!form) return msg ? <div className="msg err">{t(msg.text)}</div> : <p>{t("Loading...")}</p>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <h2>{t("My Profile")}</h2>
      <div className="pf-page">
        {/* LEFT: profile card */}
        <aside className="panel pf-card">
          <ProfilePicture
            name={form.full_name}
            currentPic={form.profile_pic}
            onUploaded={(pic) => setForm((f) => ({ ...f, profile_pic: pic }))}
          />
          <h3 className="pf-name">{form.full_name || t("Member")}</h3>
          {form.family_name && <div className="pf-family">{form.family_name} {t("family")}</div>}
          <span className="pf-code">{form.member_code}</span>

          <div className="pf-stats">
            <div>
              <strong>{mins.length}</strong>
              <span>{mins.length === 1 ? t("Ministry") : t("Ministries")}</span>
            </div>
          </div>

          <Link to="/portal/qr" className="btn sm secondary pf-qr">
            <Ico icon={QrCode} /> {t("View my QR code")}
          </Link>
        </aside>

        {/* RIGHT: form + ministries + interests */}
        <div className="pf-main">
          <form className="panel" onSubmit={save}>
            <h4>{t("Personal Information")}</h4>
            <div className="pf-grid">
              <div className="field">
                <label>{t("Full name")} *</label>
                <input value={form.full_name || ""} onChange={set("full_name")} required />
              </div>
              <div className="field">
                <label>{t("Family name")}</label>
                <input value={form.family_name || ""} onChange={set("family_name")} />
              </div>
              <div className="field">
                <label>{t("Phone")}</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  pattern="[0-9]{11}"
                  title={t("11 digits (e.g. 09123456789)")}
                  placeholder="09123456789"
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                />
              </div>
              <div className="field">
                <label>{t("Birthdate")}</label>
                <input type="date" value={form.birthdate || ""} onChange={set("birthdate")} />
              </div>
              <div className="field full">
                <label>{t("Address")}</label>
                <input value={form.address || ""} onChange={set("address")} />
              </div>
            </div>

            <div className="pf-actions">
              {msg ? <div className={`msg ${msg.ok ? "ok" : "err"}`}>{t(msg.text)}</div> : <span />}
              <button className="btn" type="submit" disabled={saving}>
                <Ico icon={Save} /> {saving ? t("Saving...") : t("Save profile")}
              </button>
            </div>
          </form>

          <div className="panel">
            <h4>{t("My Ministries & Groups")}</h4>
            {mins.length === 0 ? (
              <div className="pf-empty">
                <span className="muted">{t("You have not joined any yet.")}</span>
                <Link to="/portal/ministries" className="btn sm">
                  <Ico icon={Compass} /> {t("Browse ministries")}
                </Link>
              </div>
            ) : (
              <div className="pf-chips">
                {mins.map((m) => (
                  <span className="pf-chip" key={m.id}>
                    {t(m.name)}
                    {m.role && <span className="badge">{t(m.role)}</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Interests (ginagamit ng Recommended) */}
          <InterestsCard />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- My QR */
export function MyQr() {
  const { t } = useLang();
  const [m, setM] = useState(null);
  useEffect(() => {
    api.get("/portal/me").then((r) => setM(r.data.member));
  }, []);
  if (!m) return <p>{t("Loading...")}</p>;
  return (
    <>
      <h2>{t("My QR Code")}</h2>
      <p className="muted">
        {t("Show this to the admin, secretary or staff at the entrance for attendance verification.")}
      </p>
      <QrView code={m.member_code} name={m.full_name} photo={m.profile_pic} guide />
    </>
  );
}

/* --------------------------------------------------------- GPS Check-in */
export function GpsCheckin() {
  const { t } = useLang();
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);
  const today = new Date().toLocaleDateString("en-CA");

  useEffect(() => {
    api
      .get("/resource", { params: { name: "events" } })
      .then((r) => setEvents(r.data.filter((e) => e.event_type === "outside")));
  }, []);

  const checkin = (ev) => {
    setMsg(null);
    if (!navigator.geolocation) return setMsg({ ok: false, text: "Geolocation is not supported on this device." });
    setBusy(ev.id);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          const { data } = await api.post("/portal/checkin", {
            event_id: ev.id,
            lat: p.coords.latitude,
            lng: p.coords.longitude,
          });
          setMsg({ ok: true, text: data.message });
        } catch (x) {
          setMsg({ ok: false, text: err(x) });
        } finally {
          setBusy(null);
        }
      },
      () => {
        setBusy(null);
        setMsg({ ok: false, text: "Cannot get your location. Please allow location access." });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <>
      <h2>{t("GPS Check-in (Off-Site Events)")}</h2>
      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{t(msg.text)}</div>}
      {events.length === 0 && <div className="empty">{t("No off-site events.")}</div>}
      {events.map((ev) => (
        <div className="item" key={ev.id}>
          <h4>{t(ev.title)}</h4>
          <p className="ico-line">
            <span><Ico icon={Calendar} size={14} /> {ev.event_date}</span>
            {ev.start_time && (
              <span><Ico icon={Clock} size={14} /> {hm(ev.start_time)}-{hm(ev.end_time)}</span>
            )}
            {ev.location && <span><Ico icon={MapPin} size={14} /> {ev.location}</span>}
          </p>
          <button className="btn" disabled={ev.event_date !== today || busy === ev.id} onClick={() => checkin(ev)}>
            <Ico icon={MapPin} />{" "}
            {busy === ev.id
              ? t("Checking location...")
              : ev.event_date === today
              ? t("Check in with GPS")
              : t("Available on event day")}
          </button>
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------- Prayer Requests */
export function Prayers() {
  const { t } = useLang();
  return (
    <>
      <h2>{t("Prayer Requests")}</h2>
      <DataPage
        title={t("My Prayer Requests")}
        resource="prayer_requests"
        addLabel={t("Request")}
        canEdit={false}
        canDelete={false}
        columns={[
          { key: "created_at", label: t("Date") },
          { key: "request", label: t("Request") },
          {
            label: t("Status"),
            render: (r) => <span className={`badge ${r.status === "prayed" ? "ok" : ""}`}>{t(r.status)}</span>,
          },
        ]}
        fields={[{ key: "request", label: t("Your prayer request"), type: "textarea", rows: 5, required: true }]}
      />
    </>
  );
}

/* ---------------------------------------------- Announcements & Sermons */
export function AnnouncementsSermons() {
  const { t } = useLang();
  const [ann, setAnn] = useState([]);
  const [ser, setSer] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.get("/resource", { params: { name: "announcements" } }).then((r) => setAnn(r.data));
    api.get("/resource", { params: { name: "sermons" } }).then((r) => setSer(r.data));
  }, []);

  return (
    <>
      <h2>{t("Announcements")}</h2>
      {ann.length === 0 && <div className="empty">{t("No announcements.")}</div>}
      {ann.map((a) => (
        <div className="item" key={a.id}>
          <h4>{t(a.title)}</h4>
          <p>{t(a.body)}</p>
          <small className="muted">{a.created_at}</small>
        </div>
      ))}

      <h2 style={{ marginTop: 28 }}>{t("Sermons")}</h2>
      {ser.length === 0 && <div className="empty">{t("No sermons yet.")}</div>}
      {ser.map((s) => (
        <div className="item" key={s.id}>
          <h4>{s.title}</h4>
          <small className="muted">
            {s.sermon_date}
            {s.preacher ? ` · ${s.preacher}` : ""}
          </small>
          {s.summary && (
            <p>
              <strong>{t("Summary:")}</strong> {s.summary}
            </p>
          )}
          <div className="row-actions">
            {s.audio_url && (
              <a className="btn sm secondary" href={s.audio_url} target="_blank" rel="noreferrer">
                <Ico icon={Headphones} /> {t("Listen")}
              </a>
            )}
            {s.transcript && (
              <button className="btn sm secondary" onClick={() => setOpen(open === s.id ? null : s.id)}>
                <Ico icon={FileText} /> {open === s.id ? t("Hide transcript") : t("Transcript")}
              </button>
            )}
          </div>
          {open === s.id && <p style={{ marginTop: 10 }}>{s.transcript}</p>}
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------- Events & RSVP */
const RSVP_META = {
  going: { label: "Going", cls: "going", toast: "Great! You're going to {title} 🎉" },
  maybe: { label: "Maybe", cls: "maybe", toast: "Noted! Please confirm before the event." },
  no: { label: "Not going", cls: "no", toast: "Thanks for letting us know." },
};

const pad = (n) => String(n).padStart(2, "0");
const toIcsStamp = (date, time) => {
  const [y, m, d] = date.split("-");
  const [hh = "00", mm = "00"] = (time || "00:00").split(":");
  return `${y}${m}${d}T${hh}${mm}00`;
};

function downloadIcs(e) {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `SUMMARY:${e.title}`,
    `DTSTART:${toIcsStamp(e.event_date, e.start_time)}`,
    `DTEND:${toIcsStamp(e.event_date, e.end_time || e.start_time)}`,
    `LOCATION:${e.location || ""}`,
    `DESCRIPTION:${(e.description || "").replace(/\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.title}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function EventsRsvp() {
  const { t } = useLang();
  const [events, setEvents] = useState([]);
  const [rsvps, setRsvps] = useState({});
  const [msg, setMsg] = useState(null); // {ok, text}
  const [busy, setBusy] = useState(null); // event id na nagse-save
  const [savedAt, setSavedAt] = useState({}); // event_id -> Date

  const load = async () => {
    const [e, r] = await Promise.all([
      api.get("/resource", { params: { name: "events" } }),
      api.get("/resource", { params: { name: "rsvps" } }),
    ]);
    setEvents(e.data);
    setRsvps(Object.fromEntries(r.data.map((x) => [x.event_id, x.response])));
  };
  useEffect(() => {
    load().catch((x) => setMsg({ ok: false, text: err(x) }));
  }, []);

  // auto-hide ng toast
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(id);
  }, [msg]);

  const respond = async (ev, response) => {
    const prev = rsvps[ev.id];
    if (busy || prev === response) return;

    if (prev === "going" && response === "no") {
      if (!window.confirm(t("Change your RSVP to Not going?"))) return;
    }

    setBusy(ev.id);
    setRsvps((r) => ({ ...r, [ev.id]: response })); // optimistic
    try {
      await api.post("/resource/save", { name: "rsvps", event_id: ev.id, response });
      setSavedAt((s) => ({ ...s, [ev.id]: new Date() }));
      setMsg({ ok: true, text: RSVP_META[response].toast.replace("{title}", ev.title) });
    } catch (x) {
      setRsvps((r) => ({ ...r, [ev.id]: prev })); // rollback
      setMsg({ ok: false, text: err(x) });
    } finally {
      setBusy(null);
    }
  };

  const today = new Date().toLocaleDateString("en-CA");
  const upcoming = events
    .filter((e) => e.event_date >= today)
    .sort((a, b) => `${a.event_date} ${a.start_time || ""}`.localeCompare(`${b.event_date} ${b.start_time || ""}`));

  const statusLine = (e) => {
    const r = rsvps[e.id];
    if (!r) return t("You haven't responded yet.");
    const time = e.start_time ? ` · ${hm(e.start_time)}` : "";
    if (r === "going") return `${t("You're going")}${time}`;
    if (r === "maybe") return t("You're undecided. Please confirm before the event.");
    return t("You're not going.");
  };

  return (
    <>
      <h2>{t("Events & RSVP")}</h2>

      {msg && (
        <div className={`rsvp-toast ${msg.ok ? "ok" : "err"}`} role="status" aria-live="polite">
          {msg.ok ? <Check size={16} aria-hidden="true" /> : null} {t(msg.text)}
        </div>
      )}

      {upcoming.length === 0 && <div className="empty">{t("No upcoming events.")}</div>}

      {upcoming.map((e) => {
        const current = rsvps[e.id];
        const saving = busy === e.id;
        return (
          <div className="item" key={e.id}>
            <h4>
              {t(e.title)}{" "}
              <span className={`badge ${e.event_type === "outside" ? "warn" : ""}`}>{t(e.event_type)}</span>
            </h4>
            <p className="ico-line">
              <span><Ico icon={Calendar} size={14} /> {e.event_date}</span>
              {e.start_time && (
                <span><Ico icon={Clock} size={14} /> {hm(e.start_time)}-{hm(e.end_time)}</span>
              )}
              {e.location && <span><Ico icon={MapPin} size={14} /> {e.location}</span>}
            </p>
            {e.description && <p>{t(e.description)}</p>}

            <div className="row-actions">
              {Object.entries(RSVP_META).map(([r, meta]) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={current === r}
                  disabled={saving}
                  className={`btn sm rsvp-btn ${current === r ? `active ${meta.cls}` : "secondary"}`}
                  onClick={() => respond(e, r)}
                >
                  {current === r && <Check size={14} aria-hidden="true" />} {t(meta.label)}
                </button>
              ))}
            </div>

            {/* current status */}
            <small className={`rsvp-status ${current || ""}`}>
              {saving ? t("Saving...") : statusLine(e)}
              {savedAt[e.id] && !saving && ` · ${t("Saved")} ${pad(savedAt[e.id].getHours())}:${pad(savedAt[e.id].getMinutes())}`}
            </small>

            {/* extra actions kapag Going */}
            {current === "going" && (
              <div className="row-actions rsvp-extra">
                <button type="button" className="btn sm secondary" onClick={() => downloadIcs(e)}>
                  <Ico icon={Calendar} size={14} /> {t("Add to calendar")}
                </button>
                {e.event_type === "outside" && e.location && (
                  <a
                    className="btn sm secondary"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}`}
                  >
                    <Ico icon={MapPin} size={14} /> {t("Open in Maps")}
                  </a>
                )}
                {e.event_type === "outside" && (
                  <Link to="/portal/checkin" className="btn sm secondary">
                    <Ico icon={Compass} size={14} /> {t("GPS Check-in")}
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ----------------------------------------------- Ministries & Groups */
export function Ministries() {
  const { t } = useLang();
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(null);

  const load = () => api.get("/portal/ministries").then((r) => setList(r.data));
  useEffect(() => {
    load();
  }, []);

  const act = async (path, id) => {
    setBusy(id);
    try {
      await api.post(`/portal/${path}`, { ministry_id: id });
      setMsg(null);
      await load();
    } catch (x) {
      setMsg({ ok: false, text: err(x) });
    } finally {
      setBusy(null);
    }
  };

  const leave = (m) => {
    if (window.confirm(t('Leave "{name}"?', { name: m.name }))) act("leave", m.id);
  };

  const pills = [
    { key: "all", label: t("All") },
    { key: "ministry", label: t("Ministries") },
    { key: "small_group", label: t("Small groups") },
    { key: "joined", label: t("Joined") },
  ];

  const shown = list.filter((m) => {
    if (filter === "ministry" && m.type !== "ministry") return false;
    if (filter === "small_group" && m.type !== "small_group") return false;
    if (filter === "joined" && !m.joined) return false;
    const s = q.trim().toLowerCase();
    if (s && !`${m.name} ${m.description || ""}`.toLowerCase().includes(s)) return false;
    return true;
  });

  const joinedCount = list.filter((m) => m.joined).length;

  return (
    <>
      <h2>{t("Ministries & Small Groups")}</h2>
      <p className="min-summary">
        {t("{count} available · You joined {joined}", { count: list.length, joined: joinedCount })}
      </p>

      {msg && <div className="msg err">{t(msg.text)}</div>}

      <div className="min-toolbar">
        <div className="min-searchwrap">
          <Search size={16} aria-hidden="true" />
          <input
            className="min-search"
            placeholder={t("Search ministries or groups...")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="min-pills">
          {pills.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`min-pill ${filter === p.key ? "active" : ""}`}
              onClick={() => setFilter(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="min-empty">{t("No ministries or groups found.")}</div>
      ) : (
        <div className="min-grid">
          {shown.map((m) => {
            const isGroup = m.type === "small_group";
            return (
              <div className={`min-card ${m.joined ? "joined" : ""}`} key={m.id}>
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
                      {m.joined && (
                        <span className="min-tag joined">
                          <Check size={12} aria-hidden="true" /> {t("Joined")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="min-desc">{t(m.description)}</p>

                <div className="min-meta">
                  <span>
                    <Users size={14} aria-hidden="true" /> {m.member_count}{" "}
                    {m.member_count === 1 ? t("member") : t("members")}
                  </span>
                  {m.leader_name && (
                    <span>
                      <Star size={14} aria-hidden="true" /> {m.leader_name}
                    </span>
                  )}
                </div>

                <div className="min-foot">
                  {m.joined ? (
                    <button className="min-btn leave" disabled={busy === m.id} onClick={() => leave(m)}>
                      <LogOut size={14} aria-hidden="true" /> {busy === m.id ? t("Please wait...") : t("Leave")}
                    </button>
                  ) : (
                    <button className="min-btn" disabled={busy === m.id} onClick={() => act("join", m.id)}>
                      <UserPlus size={14} aria-hidden="true" /> {busy === m.id ? t("Joining...") : t("Join")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------- Recommended */
export function Recommended() {
  const { t } = useLang();
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => api.get("/portal/recommended").then((r) => setList(r.data));
  useEffect(() => {
    load();
  }, []);

  const join = async (id) => {
    setBusy(id);
    try {
      await api.post("/portal/join", { ministry_id: id });
      setMsg(null);
      await load();
    } catch (x) {
      setMsg({ ok: false, text: err(x) });
    } finally {
      setBusy(null);
    }
  };

  const maxScore = Math.max(0.01, ...list.map((m) => m.score));

  return (
    <>
      <h2>{t("Recommended for You")}</h2>
      <p className="min-summary">
        {t("Ministries and groups that fit you, based on your interests, your age, and the ones you joined.")}
      </p>

      {msg && <div className="msg err">{t(msg.text)}</div>}

      {list.length === 0 ? (
        <div className="min-empty">{t("No recommendations right now. You may have joined everything!")}</div>
      ) : (
        <div className="min-grid">
          {list.map((m, i) => {
            const isGroup = m.type === "small_group";
            const similar = !String(m.reason || "").startsWith("Popular");
            const pct = Math.max(5, Math.round((m.score / maxScore) * 100));
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
                      {i === 0 && similar && (
                        <span className="min-tag top">
                          <Star size={12} aria-hidden="true" /> {t("Top pick")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="min-desc">{t(m.description)}</p>

                <div className={`min-reason ${similar ? "" : "popular"}`}>
                  {similar ? <Sparkles size={14} aria-hidden="true" /> : <Users size={14} aria-hidden="true" />}{" "}
                  {t(m.reason)}
                </div>

                {similar && (
                  <div className="min-match" title={t("Match score {score}", { score: m.match ?? m.score })}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                )}

                <div className="min-meta">
                  <span>
                    <Users size={14} aria-hidden="true" /> {m.member_count}{" "}
                    {m.member_count === 1 ? t("member") : t("members")}
                  </span>
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
    </>
  );
}

/* ------------------------------------------------------------ Language */

const langs = [
  { value: "en", label: "English" },
  { value: "tl", label: "Filipino (Tagalog)" },
  { value: "ceb", label: "Cebuano" },
  { value: "ilo", label: "Ilocano" },
];

export function Language() {
  const { lang, setLang, t } = useLang();
  const [selected, setSelected] = useState(lang);
  const [msg, setMsg] = useState(null);

  // sumusunod sa dropdown sa header (at sa kasalukuyang wika ng app)
  useEffect(() => {
    setSelected(lang);
  }, [lang]);

  const save = async () => {
    setLang(selected); // ito ang nagpapalit ng buong app at ng header
    localStorage.setItem("language", selected);
    try {
      await api.post("/portal/me", { language: selected });
      setMsg({ ok: true, saved: true });
    } catch (x) {
      setMsg({ ok: false, text: err(x) });
    }
  };

  return (
    <>
      <h2>{t("language.title")}</h2>
      <div className="panel" style={{ maxWidth: 420 }}>
        <div className="field">
          <label>{t("language.label")}</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {langs.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <p className="muted">{t("language.note")}</p>
        {msg && (
          <div className={`msg ${msg.ok ? "ok" : "err"}`}>
            {msg.saved ? t("language.saved") : t(msg.text)}
          </div>
        )}
        <button className="btn" onClick={save}>
          <Ico icon={Save} /> {t("common.save")}
        </button>
      </div>
    </>
  );
}

export function MemberNotifications() {
  const { t } = useLang();
  return (
    <>
      <h2>{t("Notifications")}</h2>
      <NotificationsView />
    </>
  );
}