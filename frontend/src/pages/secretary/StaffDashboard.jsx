import { useEffect, useState } from "react";
import {
  UsersRound,
  QrCode,
  ClipboardCheck,
  CalendarDays,
  MapPin,
  Clock,
  Wallet,
  BarChart3,
  Mic,
  ScanLine,
  X,
  LogIn,
  LocateFixed,
  Save,
  Printer,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import api from "../../api";
import DataPage, { hm } from "../../components/DataPage";
import QrView from "../../components/QrView";
import QrCameraScanner from "../../components/QrCameraScanner";
import MapPicker, { reverseGeocode } from "../../components/MapPicker";
import { StaffNotifications } from "../../components/Notifications";
import "../../components/portal.css";
import "./StaffPages.css";

export { StaffNotifications };

const money = (n) => Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });
const statusBadge = (s) => <span className={`badge ${s === "active" ? "ok" : "warn"}`}>{s}</span>;

function PageHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="sp-head">
      <span className="sp-head-icon"><Icon size={22} aria-hidden="true" /></span>
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  );
}

function Notice({ msg }) {
  if (!msg) return null;
  const Icon = msg.ok ? CheckCircle2 : AlertCircle;
  return (
    <div className={`sp-notice ${msg.ok ? "ok" : "err"}`} role="status">
      <Icon size={18} aria-hidden="true" />
      <span>{msg.text}</span>
    </div>
  );
}

/* ---------------------------------------------------------- Members */
export function StaffMembers() {
  return (
    <>
      <PageHeader icon={UsersRound} title="Members & Family Records" subtitle="Add and update member records." />
      <DataPage
        title="Members"
        resource="members"
        addLabel="Member"
        canDelete={false}
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
      <PageHeader icon={QrCode} title="Member QR Codes" subtitle="Select a member to view and print their QR code." />
      <div className="sp-card no-print">
        <div className="sp-field" style={{ maxWidth: 380 }}>
          <label htmlFor="qr-member">Select member</label>
          <select id="qr-member" value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">-- select --</option>
            {members.map((x) => <option key={x.id} value={x.id}>{x.full_name} ({x.member_code})</option>)}
          </select>
        </div>
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
    <form className="sp-card" onSubmit={submit}>
      <div className="sp-card-head">
        <span className="sp-tile"><ScanLine size={20} aria-hidden="true" /></span>
        <div>
          <h4>QR / Code Check-in</h4>
          <p>I-scan ang QR ng member (camera o USB scanner) o i-type ang member code.</p>
        </div>
      </div>

      <div className="sp-row">
        <div className="sp-field grow">
          <label htmlFor="ci-code">Member code</label>
          <input id="ci-code" autoFocus placeholder="ROL-XXXXXX" value={code}
            onChange={(e) => setCode(e.target.value)} required />
        </div>
        <div className="sp-field grow">
          <label htmlFor="ci-event">Event</label>
          <select id="ci-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value={0}>Sunday Service</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} ({ev.event_date})</option>)}
          </select>
        </div>
        <div className="sp-actions">
          <button className="sp-btn primary" type="submit">
            <LogIn size={16} aria-hidden="true" /> Check in
          </button>
          <button className="sp-btn" type="button" onClick={() => setCamera((c) => !c)}>
            {camera ? <X size={16} aria-hidden="true" /> : <ScanLine size={16} aria-hidden="true" />}
            {camera ? "Close camera" : "Scan with camera"}
          </button>
        </div>
      </div>

      {camera && (
        <div className="sp-camera">
          <QrCameraScanner onScan={(text) => checkin(text)} onClose={() => setCamera(false)} />
        </div>
      )}

      <Notice msg={msg} />
    </form>
  );
}

export function StaffAttendance() {
  const [k, setK] = useState(0);
  return (
    <>
      <PageHeader icon={ClipboardCheck} title="Attendance" subtitle="Check in members and review attendance records." />
      <CodeCheckin onDone={() => setK(k + 1)} />
      <DataPage
        title="Attendance Records"
        resource="attendance"
        addLabel="Manual entry"
        canEdit={false}
        canDelete={false}
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
      <PageHeader icon={CalendarDays} title="Events & Announcements" subtitle="Manage church events and post announcements." />
      <DataPage
        title="Events"
        resource="events"
        addLabel="Event"
        canDelete={false}
        lookups={{ ministries: { resource: "ministries", label: "name" } }}
        columns={eventColumns}
        fields={eventFields}
        defaults={{ event_type: "internal", radius_m: 100 }}
      />
      <DataPage
        title="Announcements"
        resource="announcements"
        addLabel="Announcement"
        canDelete={false}
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
// Basic sanity check so a wrong value (e.g. latitude -7, which is Indonesia) is caught.
function checkCoords(lat, lng, radius) {
  const la = Number(lat);
  const lo = Number(lng);
  if (lat === "" || lat == null || lng === "" || lng == null || Number.isNaN(la) || Number.isNaN(lo)) {
    return "Latitude and longitude are required.";
  }
  if (la < -90 || la > 90) return "Latitude must be between -90 and 90.";
  if (lo < -180 || lo > 180) return "Longitude must be between -180 and 180.";
  // Philippines is roughly lat 4 to 22, lng 116 to 127
  if (la < 4 || la > 22 || lo < 116 || lo > 127) {
    return "These coordinates are outside the Philippines. Check the latitude and longitude.";
  }
  const r = Number(radius);
  if (!r || r < 10) return "Geofence radius must be at least 10 meters.";
  return "";
}

export function Geofence() {
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState(null);
  const [locBusy, setLocBusy] = useState(null); // id of the event getting its location

  const load = () =>
    api.get("/resource", { params: { name: "events" } }).then((r) =>
      setEvents(r.data.filter((e) => e.event_type === "outside"))
    );
  useEffect(() => { load(); }, []);

  const set = (id, key, val) =>
    setEvents((list) => list.map((e) => (e.id === id ? { ...e, [key]: val } : e)));

  // From the map: pin click/drag or a picked search result.
  // Keep the old location name until a new name arrives.
  const applyPlace = (id, p) =>
    setEvents((list) =>
      list.map((e) =>
        e.id === id
          ? { ...e, lat: p.latitude, lng: p.longitude, location: p.name || e.location }
          : e
      )
    );

  const fillMyLocation = (id) => {
    if (!navigator.geolocation) {
      setMsg({ ok: false, text: "Hindi supported ng browser mo ang location." });
      return;
    }
    setLocBusy(id);
    setMsg({ ok: true, text: "Kinukuha ang location mo..." });

    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lat = p.coords.latitude.toFixed(7);
        const lng = p.coords.longitude.toFixed(7);
        setEvents((list) => list.map((e) => (e.id === id ? { ...e, lat, lng } : e)));

        const name = await reverseGeocode(lat, lng);
        if (name) {
          setEvents((list) => list.map((e) => (e.id === id ? { ...e, location: name } : e)));
        }

        setMsg({
          ok: true,
          text: `Nakuha na ang location. Accuracy: mga ${Math.round(p.coords.accuracy)} meters. I-drag ang pin kung kailangan i-adjust.`,
        });
        setLocBusy(null);
      },
      (err) => {
        const text = {
          1: "Na-block ang location permission. I-click ang lock icon sa address bar, i-allow ang Location, tapos i-refresh.",
          2: "Hindi ma-detect ang location. I-on ang Location sa Windows (Settings > Privacy & security > Location) o gamitin ang phone.",
          3: "Nag-timeout. Subukan ulit.",
        };
        setMsg({ ok: false, text: text[err.code] || "Hindi makuha ang location." });
        setLocBusy(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const save = async (e) => {
    const problem = checkCoords(e.lat, e.lng, e.radius_m);
    if (problem) {
      setMsg({ ok: false, text: problem });
      return;
    }
    try {
      await api.post("/resource/save", { name: "events", ...e });
      setMsg({ ok: true, text: `Saved geofence for "${e.title}"` });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || "Failed to save" });
    }
  };

  return (
    <>
      <PageHeader
        icon={MapPin}
        title="Geofence for Off-Site Events"
        subtitle='Gumawa muna ng event na type "Outside" sa Events & Announcements.'
      />
      <Notice msg={msg} />
      {events.length === 0 && (
        <div className="sp-empty">
          <MapPin size={28} aria-hidden="true" />
          <strong>No off-site events yet</strong>
          <span>Create an "Outside / Off-site" event first, then set its location here.</span>
        </div>
      )}
      <div className="sp-grid">
        {events.map((e) => (
          <div className="sp-card" key={e.id}>
            <div className="sp-card-head">
              <span className="sp-tile"><MapPin size={20} aria-hidden="true" /></span>
              <div>
                <h4>{e.title}</h4>
                <p>{e.event_date}</p>
              </div>
            </div>

            <div className="sp-field">
              <label>Search place o i-click ang mapa (auto-fills latitude, longitude, at location name)</label>
              <MapPicker
                latitude={e.lat}
                longitude={e.lng}
                radius={e.radius_m}
                onPick={(p) => applyPlace(e.id, p)}
              />
            </div>

            <div className="sp-field">
              <label>Location name</label>
              <input
                placeholder="e.g. Lalud, Calapan City"
                value={e.location ?? ""}
                onChange={(x) => set(e.id, "location", x.target.value)}
              />
            </div>

            <div className="sp-row">
              <div className="sp-field grow">
                <label>Latitude</label>
                <input placeholder="0.0000000" value={e.lat ?? ""} onChange={(x) => set(e.id, "lat", x.target.value)} />
              </div>
              <div className="sp-field grow">
                <label>Longitude</label>
                <input placeholder="0.0000000" value={e.lng ?? ""} onChange={(x) => set(e.id, "lng", x.target.value)} />
              </div>
              <div className="sp-field" style={{ width: 110 }}>
                <label>Radius (m)</label>
                <input placeholder="100" value={e.radius_m ?? ""} onChange={(x) => set(e.id, "radius_m", x.target.value)} />
              </div>
            </div>

            <div className="sp-actions">
              <button
                className="sp-btn"
                type="button"
                disabled={locBusy === e.id}
                onClick={() => fillMyLocation(e.id)}
              >
                <LocateFixed size={16} aria-hidden="true" />{" "}
                {locBusy === e.id ? "Kinukuha..." : "Use my location"}
              </button>
              <button className="sp-btn primary" type="button" onClick={() => save(e)}>
                <Save size={16} aria-hidden="true" /> Save
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* --------------------------------------------------- Ministry Schedules */
export function StaffSchedules() {
  return (
    <>
      <PageHeader icon={Clock} title="Ministry Schedules" subtitle="Plan ministry schedules and volunteers (conflicts are checked)." />
      <DataPage
        title="Schedules"
        resource="ministry_schedules"
        addLabel="Schedule"
        canDelete={false}
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
      <PageHeader icon={Wallet} title="Giving Records" subtitle="Record tithes, offerings, and other giving." />
      <DataPage
        title="Giving"
        resource="giving"
        addLabel="Record"
        canDelete={false}
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
    <div className="sp-card">
      <h4 className="sp-card-title">{title}</h4>
      {data.length === 0 && <span className="sp-muted">No data</span>}
      <div className="sp-bars">
        {data.map((d) => (
          <div className="sp-bar-row" key={d.label}>
            <span className="sp-bar-lbl" title={d.label}>{d.label}</span>
            <div className="sp-bar-track">
              <i style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <strong>{isMoney ? money(d.value) : d.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Reports() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get("/portal/reports").then((r) => setD(r.data)).catch((e) => setError(e.response?.data?.error || "Failed to load"));
  }, []);
  if (error) return <Notice msg={{ ok: false, text: error }} />;
  if (!d) return <p className="sp-muted">Loading...</p>;
  return (
    <>
      <PageHeader icon={BarChart3} title="Reports" subtitle="Attendance, giving, and ministry summaries." />
      <div className="sp-summary no-print">
        <div className="sp-pill"><strong>{d.members_total}</strong><span>Total members</span></div>
        <div className="sp-pill"><strong>{d.members_active}</strong><span>Active members</span></div>
        <button className="sp-btn primary" type="button" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Print report
        </button>
      </div>
      <div className="sp-grid">
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
      <PageHeader icon={Mic} title="Sermon Archive" subtitle="Upload sermons with transcript and summary." />
      <DataPage
        title="Sermons"
        resource="sermons"
        addLabel="Sermon"
        canDelete={false}
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