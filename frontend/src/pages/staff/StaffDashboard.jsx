// frontend/src/pages/staff/StaffPages.jsx
import { useEffect, useState } from "react";
import api from "../../api";
import DataPage, { hm } from "../../components/DataPage";
import QrView from "../../components/QrView";
import { StaffNotifications } from "../../components/Notifications";
import "../../components/portal.css";

export { StaffNotifications };

const money = (n) => Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });
const statusBadge = (s) => <span className={`badge ${s === "active" ? "ok" : "warn"}`}>{s}</span>;

/* ---------------------------------------------------------- Members */
export function StaffMembers() {
  return (
    <>
      <h2>Members & Family Records</h2>
      <DataPage
        title="Members"
        resource="members"
        addLabel="Member"
        columns={[
          { key: "member_code", label: "Code" },
          { key: "full_name", label: "Name" },
          { key: "family_name", label: "Family" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { label: "Status", render: (r) => statusBadge(r.status) },
        ]}
        fields={[
          { key: "full_name", label: "Full name", required: true },
          { key: "family_name", label: "Family name" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email", type: "email" },
          { key: "address", label: "Address" },
          { key: "birthdate", label: "Birthdate", type: "date" },
          { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
        ]}
      />
    </>
  );
}

/* ---------------------------------------------------------- QR Codes */
export function QrCodes() {
  const [members, setMembers] = useState([]);
  const [sel, setSel] = useState("");
  useEffect(() => { api.get("/resource", { params: { name: "members" } }).then((r) => setMembers(r.data)); }, []);
  const m = members.find((x) => String(x.id) === String(sel));
  return (
    <>
      <h2>Member QR Codes</h2>
      <div className="field no-print" style={{ maxWidth: 360 }}>
        <label>Select member</label>
        <select value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">-- select --</option>
          {members.map((x) => <option key={x.id} value={x.id}>{x.full_name} ({x.member_code})</option>)}
        </select>
      </div>
      {m && <QrView code={m.member_code} name={m.full_name} />}
    </>
  );
}

/* -------------------------------------------------------- Attendance */
function CodeCheckin({ onDone }) {
  const [code, setCode] = useState("");
  const [eventId, setEventId] = useState(0);
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState(null);
  const [camera, setCamera] = useState(false);

  useEffect(() => { api.get("/resource", { params: { name: "events" } }).then((r) => setEvents(r.data)); }, []);

  const checkin = async (value) => {
    try {
      const { data } = await api.post("/portal/checkin", { code: value, event_id: Number(eventId) });
      setMsg({ ok: true, text: data.message });
      setCode("");
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || "Error" });
    }
  };

  const submit = (e) => {
    e.preventDefault();
    checkin(code);
  };

  return (
    <form className="panel" onSubmit={submit}>
      <h4>QR / Code Check-in</h4>
      <p className="muted" style={{ marginTop: 0 }}>I-scan ang QR ng member (camera o USB scanner) o i-type ang member code.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input autoFocus placeholder="ROL-XXXXXX" value={code} onChange={(e) => setCode(e.target.value)}
          style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} required />
        <select value={eventId} onChange={(e) => setEventId(e.target.value)}
          style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }}>
          <option value={0}>Sunday Service</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} ({ev.event_date})</option>)}
        </select>
        <button className="btn" type="submit">Check in</button>
        <button className="btn secondary" type="button" onClick={() => setCamera((c) => !c)}>
          {camera ? "Close camera" : "Scan with camera"}
        </button>
      </div>

      {camera && (
        <QrCameraScanner
          onScan={(text) => checkin(text)}
          onClose={() => setCamera(false)}
        />
      )}

      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
    </form>
  );
}

export function StaffAttendance() {
  const [k, setK] = useState(0);
  return (
    <>
      <h2>Attendance</h2>
      <CodeCheckin onDone={() => setK(k + 1)} />
      <DataPage
        title="Attendance Records"
        resource="attendance"
        addLabel="Manual entry"
        canEdit={false}
        refreshKey={k}
        lookups={{
          members: { resource: "members", label: "full_name" },
          events: { resource: "events", label: "title" },
        }}
        columns={[
          { key: "service_date", label: "Date" },
          { key: "member_name", label: "Member" },
          { label: "Event", render: (r) => r.event_title || "Sunday Service" },
          { label: "Method", render: (r) => <span className="badge">{r.method}</span> },
        ]}
        fields={[
          { key: "member_id", label: "Member", type: "select", lookup: "members", required: true },
          { key: "service_date", label: "Date", type: "date" },
          { key: "event_id", label: "Event", type: "select", lookup: "events", extra: [{ value: 0, label: "Sunday Service" }] },
        ]}
      />
    </>
  );
}

/* ------------------------------------------ Events & Announcements */
export const eventFields = [
  { key: "title", label: "Title", required: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "event_date", label: "Date", type: "date", required: true },
  { key: "start_time", label: "Start time", type: "time" },
  { key: "end_time", label: "End time", type: "time" },
  { key: "location", label: "Location" },
  { key: "event_type", label: "Type", type: "select", required: true, options: [{ value: "internal", label: "Internal (in church)" }, { value: "outside", label: "Outside / Off-site" }] },
  { key: "ministry_id", label: "Ministry (optional)", type: "select", lookup: "ministries" },
  { key: "lat", label: "Latitude (off-site)", type: "number", step: "any" },
  { key: "lng", label: "Longitude (off-site)", type: "number", step: "any" },
  { key: "radius_m", label: "Geofence radius (meters)", type: "number" },
];

export const eventColumns = [
  { key: "title", label: "Title" },
  { key: "event_date", label: "Date" },
  { label: "Time", render: (r) => (r.start_time ? `${hm(r.start_time)}-${hm(r.end_time)}` : "") },
  { key: "location", label: "Location" },
  { label: "Type", render: (r) => <span className={`badge ${r.event_type === "outside" ? "warn" : ""}`}>{r.event_type}</span> },
  { key: "ministry_name", label: "Ministry" },
];

export function EventsAnnouncements() {
  return (
    <>
      <h2>Events & Announcements</h2>
      <DataPage
        title="Events"
        resource="events"
        addLabel="Event"
        lookups={{ ministries: { resource: "ministries", label: "name" } }}
        columns={eventColumns}
        fields={eventFields}
        defaults={{ event_type: "internal", radius_m: 100 }}
      />
      <DataPage
        title="Announcements"
        resource="announcements"
        addLabel="Announcement"
        columns={[
          { key: "title", label: "Title" },
          { key: "body", label: "Message" },
          { key: "created_at", label: "Posted" },
        ]}
        fields={[
          { key: "title", label: "Title", required: true },
          { key: "body", label: "Message", type: "textarea", required: true, rows: 5 },
        ]}
      />
    </>
  );
}

/* ---------------------------------------------------------- Geofence */
export function Geofence() {
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState(null);

  const load = () =>
    api.get("/resource", { params: { name: "events" } }).then((r) =>
      setEvents(r.data.filter((e) => e.event_type === "outside"))
    );
  useEffect(() => { load(); }, []);

  const set = (id, key, val) => setEvents(events.map((e) => (e.id === id ? { ...e, [key]: val } : e)));

  const useMyLocation = (id) => {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setEvents((list) => list.map((e) => (e.id === id ? { ...e, lat: p.coords.latitude.toFixed(7), lng: p.coords.longitude.toFixed(7) } : e)));
      },
      () => setMsg({ ok: false, text: "Cannot get your location. Allow location access." })
    );
  };

  const save = async (e) => {
    try {
      await api.post("/resource/save", { name: "events", ...e });
      setMsg({ ok: true, text: `Saved geofence for "${e.title}"` });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || "Failed to save" });
    }
  };

  const inp = { padding: 6, border: "1px solid #cbd5e1", borderRadius: 6, width: 130 };

  return (
    <>
      <h2>Geofence for Off-Site Events</h2>
      <p className="muted">Gumawa muna ng event na type "Outside" sa Events & Announcements.</p>
      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      {events.length === 0 && <div className="empty">No off-site events yet.</div>}
      {events.map((e) => (
        <div className="item" key={e.id}>
          <h4>{e.title} <small className="muted">({e.event_date})</small></h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input style={inp} placeholder="Latitude" value={e.lat ?? ""} onChange={(x) => set(e.id, "lat", x.target.value)} />
            <input style={inp} placeholder="Longitude" value={e.lng ?? ""} onChange={(x) => set(e.id, "lng", x.target.value)} />
            <input style={{ ...inp, width: 100 }} placeholder="Radius (m)" value={e.radius_m ?? ""} onChange={(x) => set(e.id, "radius_m", x.target.value)} />
            <button className="btn secondary sm" onClick={() => useMyLocation(e.id)}>Use my location</button>
            <button className="btn sm" onClick={() => save(e)}>Save</button>
          </div>
        </div>
      ))}
    </>
  );
}

/* --------------------------------------------------- Ministry Schedules */
export function StaffSchedules() {
  return (
    <>
      <h2>Ministry Schedules</h2>
      <DataPage
        title="Schedules"
        resource="ministry_schedules"
        addLabel="Schedule"
        lookups={{
          ministries: { resource: "ministries", label: "name" },
          members: { resource: "members", label: "full_name" },
        }}
        columns={[
          { key: "ministry_name", label: "Ministry" },
          { key: "title", label: "Title" },
          { key: "schedule_date", label: "Date" },
          { label: "Time", render: (r) => `${hm(r.start_time)}-${hm(r.end_time)}` },
          { key: "location", label: "Location" },
          { key: "volunteer_name", label: "Volunteer" },
        ]}
        fields={[
          { key: "ministry_id", label: "Ministry", type: "select", lookup: "ministries", required: true },
          { key: "title", label: "Title", required: true },
          { key: "schedule_date", label: "Date", type: "date", required: true },
          { key: "start_time", label: "Start time", type: "time", required: true },
          { key: "end_time", label: "End time", type: "time", required: true },
          { key: "location", label: "Location" },
          { key: "volunteer_member_id", label: "Volunteer (conflict is checked)", type: "select", lookup: "members" },
        ]}
      />
    </>
  );
}

/* ------------------------------------------------------------- Giving */
export function Giving() {
  return (
    <>
      <h2>Giving Records</h2>
      <DataPage
        title="Giving"
        resource="giving"
        addLabel="Record"
        lookups={{ members: { resource: "members", label: "full_name" } }}
        columns={[
          { key: "given_at", label: "Date" },
          { label: "Member", render: (r) => r.member_name || "Anonymous" },
          { key: "type", label: "Type" },
          { label: "Amount (PHP)", render: (r) => money(r.amount) },
          { key: "notes", label: "Notes" },
        ]}
        fields={[
          { key: "member_id", label: "Member (blank = anonymous)", type: "select", lookup: "members" },
          { key: "amount", label: "Amount", type: "number", step: "0.01", required: true },
          { key: "type", label: "Type", type: "select", required: true, options: ["tithe", "offering", "mission", "building fund", "other"].map((x) => ({ value: x, label: x })) },
          { key: "given_at", label: "Date", type: "date", required: true },
          { key: "notes", label: "Notes" },
        ]}
        defaults={{ type: "tithe" }}
      />
    </>
  );
}

/* ------------------------------------------------------------ Reports */
function Bars({ title, data, money: isMoney }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="panel">
      <h4>{title}</h4>
      {data.length === 0 && <span className="muted">No data</span>}
      {data.map((d) => (
        <div className="bar-row" key={d.label}>
          <span className="lbl">{d.label}</span>
          <span className="bar" style={{ width: `${(d.value / max) * 60}%` }} />
          <span>{isMoney ? money(d.value) : d.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Reports() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get("/portal/reports").then((r) => setD(r.data)).catch((e) => setError(e.response?.data?.error || "Failed to load"));
  }, []);
  if (error) return <div className="msg err">{error}</div>;
  if (!d) return <p>Loading...</p>;
  return (
    <>
      <h2>Reports</h2>
      <p className="muted">Members: {d.members_total} total, {d.members_active} active</p>
      <div className="no-print" style={{ marginBottom: 12 }}><button className="btn" onClick={() => window.print()}>Print report</button></div>
      <div className="grid2">
        <Bars title="Attendance per week (last 8 weeks)" data={d.attendance_weekly} />
        <Bars title="Giving per month (PHP)" data={d.giving_monthly} money />
        <Bars title="Giving by type (PHP)" data={d.giving_by_type} money />
        <Bars title="Ministry sizes" data={d.ministry_sizes} />
        <Bars title="Attendance by method" data={d.attendance_method} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------ Sermons */
export function Sermons() {
  return (
    <>
      <h2>Sermon Archive</h2>
      <DataPage
        title="Sermons"
        resource="sermons"
        addLabel="Sermon"
        columns={[
          { key: "sermon_date", label: "Date" },
          { key: "title", label: "Title" },
          { key: "preacher", label: "Preacher" },
          { label: "Audio", render: (r) => (r.audio_url ? <a href={r.audio_url} target="_blank" rel="noreferrer">Open</a> : "") },
          { label: "Transcript", render: (r) => (r.transcript ? <span className="badge ok">yes</span> : <span className="badge">no</span>) },
          { label: "Summary", render: (r) => (r.summary ? <span className="badge ok">yes</span> : <span className="badge">no</span>) },
        ]}
        fields={[
          { key: "title", label: "Title", required: true },
          { key: "preacher", label: "Preacher" },
          { key: "sermon_date", label: "Date", type: "date", required: true },
          { key: "audio_url", label: "Audio link (URL)" },
          { key: "transcript", label: "Transcript", type: "textarea", rows: 6 },
          { key: "summary", label: "Summary", type: "textarea", rows: 4 },
        ]}
      />
    </>
  );
}