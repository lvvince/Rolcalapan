// frontend/src/pages/member/MemberPages.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import ProfilePicture from "../../components/ProfilePicture";
import DataPage, { hm } from "../../components/DataPage";
import { useTranslation } from "react-i18next";
import QrView from "../../components/QrView";
import NotificationsView from "../../components/Notifications";
import "../../components/portal.css";

const err = (e) => e.response?.data?.error || "Something went wrong";

/* ----------------------------------------------------------- Profile */
export function Profile() {
  const [form, setForm] = useState(null);
  const [mins, setMins] = useState([]);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/portal/me").then((r) => { setForm(r.data.member); setMins(r.data.ministries); }).catch((e) => setMsg({ ok: false, text: err(e) }));
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

  if (!form) return msg ? <div className="msg err">{msg.text}</div> : <p>Loading...</p>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <h2>My Profile</h2>
      <div className="pf-page">
        {/* LEFT: profile card */}
        <aside className="panel pf-card">
          <ProfilePicture
            name={form.full_name}
            currentPic={form.profile_pic}
            onUploaded={(pic) => setForm((f) => ({ ...f, profile_pic: pic }))}
          />
          <h3 className="pf-name">{form.full_name || "Member"}</h3>
          {form.family_name && <div className="pf-family">{form.family_name} family</div>}
          <span className="pf-code">{form.member_code}</span>

          <div className="pf-stats">
            <div><strong>{mins.length}</strong><span>{mins.length === 1 ? "Ministry" : "Ministries"}</span></div>
          </div>

          <Link to="/portal/qr" className="btn sm secondary pf-qr">View my QR code</Link>
        </aside>

        {/* RIGHT: form + ministries */}
        <div className="pf-main">
          <form className="panel" onSubmit={save}>
            <h4>Personal Information</h4>
            <div className="pf-grid">
              <div className="field"><label>Full name *</label><input value={form.full_name || ""} onChange={set("full_name")} required /></div>
              <div className="field"><label>Family name</label><input value={form.family_name || ""} onChange={set("family_name")} /></div>
              <div className="field">
                <label>Phone</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  pattern="[0-9]{11}"
                  title="11 digits (e.g. 09123456789)"
                  placeholder="09123456789"
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                />
              </div>
              <div className="field"><label>Birthdate</label><input type="date" value={form.birthdate || ""} onChange={set("birthdate")} /></div>
              <div className="field full"><label>Address</label><input value={form.address || ""} onChange={set("address")} /></div>
            </div>

            <div className="pf-actions">
              {msg ? <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div> : <span />}
              <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
            </div>
          </form>

          <div className="panel">
            <h4>My Ministries &amp; Groups</h4>
            {mins.length === 0 ? (
              <div className="pf-empty">
                <span className="muted">You have not joined any yet.</span>
                <Link to="/portal/ministries" className="btn sm">Browse ministries</Link>
              </div>
            ) : (
              <div className="pf-chips">
                {mins.map((m) => (
                  <span className="pf-chip" key={m.id}>{m.name}{m.role && <span className="badge">{m.role}</span>}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- My QR */
export function MyQr() {
  const [m, setM] = useState(null);
  useEffect(() => { api.get("/portal/me").then((r) => setM(r.data.member)); }, []);
  if (!m) return <p>Loading...</p>;
  return (
    <>
      <h2>My QR Code</h2>
      <p className="muted">Show this to the admin, secretary or staff at the entrance for attendance verification.</p>
      <QrView code={m.member_code} name={m.full_name} photo={m.profile_pic} guide />
    </>
  );
}

/* --------------------------------------------------------- GPS Check-in */
export function GpsCheckin() {
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);
  const today = new Date().toLocaleDateString("en-CA");

  useEffect(() => {
    api.get("/resource", { params: { name: "events" } }).then((r) => setEvents(r.data.filter((e) => e.event_type === "outside")));
  }, []);

  const checkin = (ev) => {
    setMsg(null);
    if (!navigator.geolocation) return setMsg({ ok: false, text: "Geolocation is not supported on this device." });
    setBusy(ev.id);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          const { data } = await api.post("/portal/checkin", { event_id: ev.id, lat: p.coords.latitude, lng: p.coords.longitude });
          setMsg({ ok: true, text: data.message });
        } catch (x) {
          setMsg({ ok: false, text: err(x) });
        } finally {
          setBusy(null);
        }
      },
      () => { setBusy(null); setMsg({ ok: false, text: "Cannot get your location. Please allow location access." }); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <>
      <h2>GPS Check-in (Off-Site Events)</h2>
      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      {events.length === 0 && <div className="empty">No off-site events.</div>}
      {events.map((ev) => (
        <div className="item" key={ev.id}>
          <h4>{ev.title}</h4>
          <p>{ev.event_date} {ev.start_time ? `· ${hm(ev.start_time)}-${hm(ev.end_time)}` : ""} · {ev.location}</p>
          <button className="btn" disabled={ev.event_date !== today || busy === ev.id} onClick={() => checkin(ev)}>
            {busy === ev.id ? "Checking location..." : ev.event_date === today ? "Check in with GPS" : "Available on event day"}
          </button>
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------- Prayer Requests */
export function Prayers() {
  return (
    <>
      <h2>Prayer Requests</h2>
      <DataPage
        title="My Prayer Requests"
        resource="prayer_requests"
        addLabel="Request"
        canEdit={false}
        canDelete={false}
        columns={[
          { key: "created_at", label: "Date" },
          { key: "request", label: "Request" },
          { label: "Status", render: (r) => <span className={`badge ${r.status === "prayed" ? "ok" : ""}`}>{r.status}</span> },
        ]}
        fields={[{ key: "request", label: "Your prayer request", type: "textarea", rows: 5, required: true }]}
      />
    </>
  );
}

/* ---------------------------------------------- Announcements & Sermons */
export function AnnouncementsSermons() {
  const [ann, setAnn] = useState([]);
  const [ser, setSer] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.get("/resource", { params: { name: "announcements" } }).then((r) => setAnn(r.data));
    api.get("/resource", { params: { name: "sermons" } }).then((r) => setSer(r.data));
  }, []);

  return (
    <>
      <h2>Announcements</h2>
      {ann.length === 0 && <div className="empty">No announcements.</div>}
      {ann.map((a) => (
        <div className="item" key={a.id}><h4>{a.title}</h4><p>{a.body}</p><small className="muted">{a.created_at}</small></div>
      ))}

      <h2 style={{ marginTop: 28 }}>Sermons</h2>
      {ser.length === 0 && <div className="empty">No sermons yet.</div>}
      {ser.map((s) => (
        <div className="item" key={s.id}>
          <h4>{s.title}</h4>
          <small className="muted">{s.sermon_date}{s.preacher ? ` · ${s.preacher}` : ""}</small>
          {s.summary && <p><strong>Summary:</strong> {s.summary}</p>}
          <div className="row-actions">
            {s.audio_url && <a className="btn sm secondary" href={s.audio_url} target="_blank" rel="noreferrer">Listen</a>}
            {s.transcript && <button className="btn sm secondary" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? "Hide transcript" : "Transcript"}</button>}
          </div>
          {open === s.id && <p style={{ marginTop: 10 }}>{s.transcript}</p>}
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------- Events & RSVP */
export function EventsRsvp() {
  const [events, setEvents] = useState([]);
  const [rsvps, setRsvps] = useState({});
  const [msg, setMsg] = useState(null);

  const load = async () => {
    const [e, r] = await Promise.all([
      api.get("/resource", { params: { name: "events" } }),
      api.get("/resource", { params: { name: "rsvps" } }),
    ]);
    setEvents(e.data);
    setRsvps(Object.fromEntries(r.data.map((x) => [x.event_id, x.response])));
  };
  useEffect(() => { load(); }, []);

  const respond = async (event_id, response) => {
    try {
      await api.post("/resource/save", { name: "rsvps", event_id, response });
      setMsg(null);
      load();
    } catch (x) {
      setMsg({ ok: false, text: err(x) });
    }
  };

  const today = new Date().toLocaleDateString("en-CA");
  const upcoming = events.filter((e) => e.event_date >= today);

  return (
    <>
      <h2>Events & RSVP</h2>
      {msg && <div className={`msg err`}>{msg.text}</div>}
      {upcoming.length === 0 && <div className="empty">No upcoming events.</div>}
      {upcoming.map((e) => (
        <div className="item" key={e.id}>
          <h4>{e.title} <span className={`badge ${e.event_type === "outside" ? "warn" : ""}`}>{e.event_type}</span></h4>
          <p>{e.event_date} {e.start_time ? `· ${hm(e.start_time)}-${hm(e.end_time)}` : ""} {e.location ? `· ${e.location}` : ""}</p>
          {e.description && <p>{e.description}</p>}
          <div className="row-actions">
            {["going", "maybe", "no"].map((r) => (
              <button key={r} className={`btn sm ${rsvps[e.id] === r ? "" : "secondary"}`} onClick={() => respond(e.id, r)}>
                {r === "going" ? "Going" : r === "maybe" ? "Maybe" : "Not going"}
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/* ----------------------------------------------- Ministries & Groups */
export function Ministries() {
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(null);

  const load = () => api.get("/portal/ministries").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

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
    if (window.confirm(`Leave "${m.name}"?`)) act("leave", m.id);
  };

  const pills = [
    { key: "all", label: "All" },
    { key: "ministry", label: "Ministries" },
    { key: "small_group", label: "Small groups" },
    { key: "joined", label: "Joined" },
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
      <h2>Ministries & Small Groups</h2>
      <p className="min-summary">
        {list.length} available · You joined {joinedCount}
      </p>

      {msg && <div className="msg err">{msg.text}</div>}

      <div className="min-toolbar">
        <input
          className="min-search"
          placeholder="Search ministries or groups..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
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
        <div className="min-empty">Walang nahanap na ministry o group.</div>
      ) : (
        <div className="min-grid">
          {shown.map((m) => {
            const isGroup = m.type === "small_group";
            return (
              <div className={`min-card ${m.joined ? "joined" : ""}`} key={m.id}>
                <div className="min-head">
                  <div className={`min-icon ${isGroup ? "group" : ""}`}>{isGroup ? "🏠" : "🙌"}</div>
                  <div>
                    <h4 className="min-title">{m.name}</h4>
                    <div className="min-tags">
                      <span className={`min-tag ${isGroup ? "group" : ""}`}>{isGroup ? "Small group" : "Ministry"}</span>
                      {m.joined && <span className="min-tag joined">✓ Joined</span>}
                    </div>
                  </div>
                </div>

                <p className="min-desc">{m.description}</p>

                <div className="min-meta">
                  <span>👥 {m.member_count} {m.member_count === 1 ? "member" : "members"}</span>
                  {m.leader_name && <span>⭐ {m.leader_name}</span>}
                </div>

                <div className="min-foot">
                  {m.joined ? (
                    <button className="min-btn leave" disabled={busy === m.id} onClick={() => leave(m)}>
                      {busy === m.id ? "Please wait..." : "Leave"}
                    </button>
                  ) : (
                    <button className="min-btn" disabled={busy === m.id} onClick={() => act("join", m.id)}>
                      {busy === m.id ? "Joining..." : "Join"}
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
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => api.get("/portal/recommended").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

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
      <h2>Recommended for You</h2>
      <p className="min-summary">
        Mga ministry at group na bagay sa iyo, batay sa mga sinalihan at dinaluhan mong events.
      </p>

      {msg && <div className="msg err">{msg.text}</div>}

      {list.length === 0 ? (
        <div className="min-empty">No recommendations right now. You may have joined everything!</div>
      ) : (
        <div className="min-grid">
          {list.map((m, i) => {
            const isGroup = m.type === "small_group";
            const similar = m.reason.startsWith("Similar");
            const pct = Math.max(5, Math.round((m.score / maxScore) * 100));
            return (
              <div className="min-card" key={m.id}>
                <div className="min-head">
                  <div className={`min-icon ${isGroup ? "group" : ""}`}>{isGroup ? "🏠" : "🙌"}</div>
                  <div>
                    <h4 className="min-title">{m.name}</h4>
                    <div className="min-tags">
                      <span className={`min-tag ${isGroup ? "group" : ""}`}>{isGroup ? "Small group" : "Ministry"}</span>
                      {i === 0 && similar && <span className="min-tag top">★ Top pick</span>}
                    </div>
                  </div>
                </div>

                <p className="min-desc">{m.description}</p>

                <div className={`min-reason ${similar ? "" : "popular"}`}>
                  {similar ? "✨" : "👥"} {m.reason}
                </div>

                {similar && (
                  <div className="min-match" title={`Match score ${m.score}`}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                )}

                <div className="min-meta">
                  <span>👥 {m.member_count} {m.member_count === 1 ? "member" : "members"}</span>
                </div>

                <div className="min-foot">
                  <button className="min-btn" disabled={busy === m.id} onClick={() => join(m.id)}>
                    {busy === m.id ? "Joining..." : "Join"}
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
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language || "en");
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api.get("/portal/me").then((r) => setLang(r.data.member.language || "en"));
  }, []);

  const save = async () => {
    try {
      await api.post("/portal/me", { language: lang });
      localStorage.setItem("language", lang);
      // en at tl lang ang may translation file; ang iba ay English muna
      i18n.changeLanguage(lang === "tl" ? "tl" : "en");
      setMsg({ ok: true, text: t("language.saved") });
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
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {langs.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <p className="muted">{t("language.note")}</p>
        {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
        <button className="btn" onClick={save}>{t("common.save")}</button>
      </div>
    </>
  );
}

export function MemberNotifications() {
  return (
    <>
      <h2>Notifications</h2>
      <NotificationsView />
    </>
  );
}