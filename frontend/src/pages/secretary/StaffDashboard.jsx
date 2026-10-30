import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { useLang } from "../../i18n/LanguageContext";
import "../../components/portal.css";
import "./StaffPages.css";
import "./Geofence.css";

export { StaffNotifications };

const money = (n) => Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });
const statusBadge = (s, t) => <span className={`badge ${s === "active" ? "ok" : "warn"}`}>{t(s)}</span>;

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

// Ang msg.text ay dapat naisalin na bago ipasa dito
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
  const { t } = useLang();
  return (
    <>
      <PageHeader icon={UsersRound} title={t("Members & Family Records")} subtitle={t("Add and update member records.")} />
      <DataPage
        title={t("Members")}
        resource="members"
        addLabel={t("Member")}
        canDelete={false}
        columns={[
          { key: "member_code", label: t("Code") },
          { key: "full_name", label: t("Name") },
          { key: "family_name", label: t("Family") },
          { key: "phone", label: t("Phone") },
          { key: "email", label: t("Email") },
          { label: t("Status"), render: (r) => statusBadge(r.status, t) },
        ]}
        fields={[
          { key: "full_name", label: t("Full name"), required: true },
          { key: "family_name", label: t("Family name") },
          { key: "phone", label: t("Phone") },
          { key: "email", label: t("Email"), type: "email" },
          { key: "address", label: t("Address") },
          { key: "birthdate", label: t("Birthdate"), type: "date" },
          { key: "status", label: t("Status"), type: "select", options: [{ value: "active", label: t("Active") }, { value: "inactive", label: t("Inactive") }] },
        ]}
      />
    </>
  );
}

/* ---------------------------------------------------------- QR Codes */
export function QrCodes() {
  const { t } = useLang();
  const [members, setMembers] = useState([]);
  const [sel, setSel] = useState("");
  useEffect(() => { api.get("/resource", { params: { name: "members" } }).then((r) => setMembers(r.data)); }, []);
  const m = members.find((x) => String(x.id) === String(sel));
  return (
    <>
      <PageHeader icon={QrCode} title={t("Member QR Codes")} subtitle={t("Select a member to view and print their QR code.")} />
      <div className="sp-card no-print">
        <div className="sp-field" style={{ maxWidth: 380 }}>
          <label htmlFor="qr-member">{t("Select member")}</label>
          <select id="qr-member" value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">{t("-- select --")}</option>
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
  const { t } = useLang();
  const [code, setCode] = useState("");
  const [eventId, setEventId] = useState(0);
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState(null);
  const [camera, setCamera] = useState(false);

  useEffect(() => { api.get("/resource", { params: { name: "events" } }).then((r) => setEvents(r.data)); }, []);

  const checkin = async (value) => {
    try {
      const { data } = await api.post("/portal/checkin", { code: value, event_id: Number(eventId) });
      setMsg({ ok: true, text: t(data.message) });
      setCode("");
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: t(err.response?.data?.error || "Error") });
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
          <h4>{t("QR / Code Check-in")}</h4>
          <p>{t("Scan the member's QR (camera or USB scanner) or type the member code.")}</p>
        </div>
      </div>

      <div className="sp-row">
        <div className="sp-field grow">
          <label htmlFor="ci-code">{t("Member code")}</label>
          <input id="ci-code" autoFocus placeholder="ROL-XXXXXX" value={code}
            onChange={(e) => setCode(e.target.value)} required />
        </div>
        <div className="sp-field grow">
          <label htmlFor="ci-event">{t("Event")}</label>
          <select id="ci-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value={0}>{t("Sunday Service")}</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} ({ev.event_date})</option>)}
          </select>
        </div>
        <div className="sp-actions">
          <button className="sp-btn primary" type="submit">
            <LogIn size={16} aria-hidden="true" /> {t("Check in")}
          </button>
          <button className="sp-btn" type="button" onClick={() => setCamera((c) => !c)}>
            {camera ? <X size={16} aria-hidden="true" /> : <ScanLine size={16} aria-hidden="true" />}
            {camera ? t("Close camera") : t("Scan with camera")}
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
  const { t } = useLang();
  const [k, setK] = useState(0);
  return (
    <>
      <PageHeader icon={ClipboardCheck} title={t("Attendance")} subtitle={t("Check in members and review attendance records.")} />
      <CodeCheckin onDone={() => setK(k + 1)} />
      <DataPage
        title={t("Attendance Records")}
        resource="attendance"
        addLabel={t("Manual entry")}
        canEdit={false}
        canDelete={false}
        refreshKey={k}
        lookups={{
          members: { resource: "members", label: "full_name" },
          events: { resource: "events", label: "title" },
        }}
        columns={[
          { key: "service_date", label: t("Date") },
          { key: "member_name", label: t("Member") },
          { label: t("Event"), render: (r) => r.event_title || t("Sunday Service") },
          { label: t("Method"), render: (r) => <span className="badge">{t(r.method)}</span> },
        ]}
        fields={[
          { key: "member_id", label: t("Member"), type: "select", lookup: "members", required: true },
          { key: "service_date", label: t("Date"), type: "date" },
          { key: "event_id", label: t("Event"), type: "select", lookup: "events", extra: [{ value: 0, label: t("Sunday Service") }] },
        ]}
      />
    </>
  );
}

/* ------------------------------------------ Events & Announcements */
// Ginawang function para magamit ang t(). Ginagamit din ito ng MinistryDashboard.
export const getEventFields = (t) => [
  { key: "title", label: t("Title"), required: true },
  { key: "description", label: t("Description"), type: "textarea" },
  { key: "event_date", label: t("Date"), type: "date", required: true },
  { key: "start_time", label: t("Start time"), type: "time" },
  { key: "end_time", label: t("End time"), type: "time" },
  { key: "location", label: t("Location") },
  { key: "event_type", label: t("Type"), type: "select", required: true, options: [{ value: "internal", label: t("Internal (in church)") }, { value: "outside", label: t("Outside / Off-site") }] },
  { key: "ministry_id", label: t("Ministry (optional)"), type: "select", lookup: "ministries" },
  { key: "lat", label: t("Latitude (off-site)"), type: "number", step: "any" },
  { key: "lng", label: t("Longitude (off-site)"), type: "number", step: "any" },
  { key: "radius_m", label: t("Geofence radius (meters)"), type: "number" },
];

export const getEventColumns = (t) => [
  { key: "title", label: t("Title") },
  { key: "event_date", label: t("Date") },
  { label: t("Time"), render: (r) => (r.start_time ? `${hm(r.start_time)}-${hm(r.end_time)}` : "") },
  { key: "location", label: t("Location") },
  { label: t("Type"), render: (r) => <span className={`badge ${r.event_type === "outside" ? "warn" : ""}`}>{t(r.event_type)}</span> },
  { key: "ministry_name", label: t("Ministry") },
];

export function EventsAnnouncements() {
  const { t } = useLang();
  return (
    <>
      <PageHeader icon={CalendarDays} title={t("Events & Announcements")} subtitle={t("Manage church events and post announcements.")} />
      <DataPage
        title={t("Events")}
        resource="events"
        addLabel={t("Event")}
        canDelete={false}
        lookups={{ ministries: { resource: "ministries", label: "name" } }}
        columns={getEventColumns(t)}
        fields={getEventFields(t)}
        defaults={{ event_type: "internal", radius_m: 100 }}
      />
      <DataPage
        title={t("Announcements")}
        resource="announcements"
        addLabel={t("Announcement")}
        canDelete={false}
        columns={[
          { key: "title", label: t("Title") },
          { key: "body", label: t("Message") },
          { key: "created_at", label: t("Posted") },
        ]}
        fields={[
          { key: "title", label: t("Title"), required: true },
          { key: "body", label: t("Message"), type: "textarea", required: true, rows: 5 },
        ]}
      />
    </>
  );
}

/* ---------------------------------------------------------- Geofence */
// Basic sanity check so a wrong value (e.g. latitude -7, which is Indonesia) is caught.
function checkCoords(lat, lng, radius, t) {
  const la = Number(lat);
  const lo = Number(lng);
  if (lat === "" || lat == null || lng === "" || lng == null || Number.isNaN(la) || Number.isNaN(lo)) {
    return t("Latitude and longitude are required.");
  }
  if (la < -90 || la > 90) return t("Latitude must be between -90 and 90.");
  if (lo < -180 || lo > 180) return t("Longitude must be between -180 and 180.");
  // Philippines is roughly lat 4 to 22, lng 116 to 127
  if (la < 4 || la > 22 || lo < 116 || lo > 127) {
    return t("These coordinates are outside the Philippines. Check the latitude and longitude.");
  }
  const r = Number(radius);
  if (!r || r < 10) return t("Geofence radius must be at least 10 meters.");
  return "";
}

const getGF = (t) => ({
  title: t("Geofence for Off-Site Events"),
  subtitle: t('Create an event with type "Outside" first in Events & Announcements.'),
  listTitle: t("Off-site events"),
  chipSet: t("Geofence set"),
  chipNone: t("Not set"),
  chipDirty: t("Unsaved changes"),
  emptyTitle: t("No off-site events yet"),
  emptyText: t('Create an "Outside / Off-site" event first, then set its location here.'),
  emptyLink: t("Go to Events & Announcements"),
  locationName: t("Location name"),
  locationPh: t("e.g. Lalud, Calapan City"),
  radius: t("Check-in radius"),
  coords: t("Coordinates"),
  coordsNone: t("Not set. Click the map or search a place."),
  editManual: t("Edit manually"),
  done: t("Done"),
  lat: t("Latitude"),
  lng: t("Longitude"),
  save: t("Save geofence"),
  saving: t("Saving..."),
  saved: t("Saved"),
});

const RADIUS_PRESETS = [50, 100, 200, 500];

const hasPoint = (e) =>
  [e.lat, e.lng].every((v) => v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v)));

// What counts as "changed since last save"
const snap = (e) => JSON.stringify([e.lat ?? "", e.lng ?? "", e.radius_m ?? "", e.location ?? ""]);

export function Geofence() {
  const { t } = useLang();
  const GF = getGF(t);
  const [events, setEvents] = useState([]);
  const [saved, setSaved] = useState({}); // id -> snap() of the last saved/loaded state
  const [selId, setSelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [locBusy, setLocBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    api
      .get("/resource", { params: { name: "events" } })
      .then((r) => {
        const list = r.data.filter((e) => e.event_type === "outside");
        setEvents(list);
        setSaved(Object.fromEntries(list.map((e) => [e.id, snap(e)])));
        setSelId(list[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Toast-like: success disappears by itself, errors stay a bit longer
  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(null), msg.ok ? 4000 : 8000);
    return () => clearTimeout(timer);
  }, [msg]);

  const ev = events.find((e) => e.id === selId);

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
      setMsg({ ok: false, text: t("Your browser does not support location.") });
      return;
    }
    setLocBusy(true);
    setMsg({ ok: true, text: t("Getting your location...") });

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
          text: t("Location found. Accuracy: about {meters} meters. Drag the pin to adjust.", {
            meters: Math.round(p.coords.accuracy),
          }),
        });
        setLocBusy(false);
      },
      (err) => {
        const text = {
          1: t("Location permission is blocked. Click the lock icon in the address bar, allow Location, then refresh."),
          2: t("Cannot detect your location. Turn on Location in Windows (Settings > Privacy & security > Location) or use your phone."),
          3: t("Timed out. Please try again."),
        };
        setMsg({ ok: false, text: text[err.code] || t("Cannot get your location.") });
        setLocBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const save = async (e) => {
    const problem = checkCoords(e.lat, e.lng, e.radius_m, t);
    if (problem) {
      setMsg({ ok: false, text: problem });
      return;
    }
    setSaving(true);
    try {
      await api.post("/resource/save", { name: "events", ...e });
      // no reload, so unsaved edits on the other events are not lost
      setSaved((s) => ({ ...s, [e.id]: snap(e) }));
      setMsg({ ok: true, text: t('Saved geofence for "{title}"', { title: e.title }) });
    } catch (err) {
      setMsg({ ok: false, text: t(err.response?.data?.error || "Failed to save") });
    } finally {
      setSaving(false);
    }
  };

  const chip = (e) => {
    if (saved[e.id] !== snap(e)) return { cls: "warn", text: GF.chipDirty, Icon: AlertCircle };
    if (hasPoint(e)) return { cls: "ok", text: GF.chipSet, Icon: CheckCircle2 };
    return { cls: "none", text: GF.chipNone, Icon: MapPin };
  };

  const radiusNum = Number(ev?.radius_m) || 0;
  const dirty = ev ? saved[ev.id] !== snap(ev) : false;

  return (
    <>
      <PageHeader icon={MapPin} title={GF.title} subtitle={GF.subtitle} />
      <Notice msg={msg} />

      {loading && <p className="sp-muted">{t("Loading...")}</p>}

      {!loading && events.length === 0 && (
        <div className="sp-empty">
          <MapPin size={28} aria-hidden="true" />
          <strong>{GF.emptyTitle}</strong>
          <span>{GF.emptyText}</span>
          {/* change the path if your Events & Announcements route is different */}
          <Link to="/staff/events" className="gf-link">{GF.emptyLink}</Link>
        </div>
      )}

      {ev && (
        <div className="gf">
          {/* ---------- left: event list ---------- */}
          <nav className="gf-list" aria-label={GF.listTitle}>
            <p className="gf-list-title">{GF.listTitle}</p>
            {events.map((e) => {
              const c = chip(e);
              return (
                <button
                  key={e.id}
                  type="button"
                  className={`gf-item${e.id === selId ? " active" : ""}`}
                  aria-current={e.id === selId ? "true" : undefined}
                  onClick={() => {
                    setSelId(e.id);
                    setManual(false);
                  }}
                >
                  <strong>{e.title}</strong>
                  <small>{e.event_date}</small>
                  <span className={`gf-chip ${c.cls}`}>
                    <c.Icon size={13} aria-hidden="true" /> {c.text}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* ---------- right: editor ---------- */}
          <section className="gf-editor">
            <header className="gf-editor-head">
              <span className="sp-tile"><MapPin size={20} aria-hidden="true" /></span>
              <div>
                <h4>{ev.title}</h4>
                <p>{ev.event_date}</p>
              </div>
            </header>

            <div className="gf-editor-grid">
              <div className="gf-map-col">
                {/* key = remount per event so the map starts at that event's pin */}
                <MapPicker
                  key={ev.id}
                  latitude={ev.lat}
                  longitude={ev.lng}
                  radius={ev.radius_m}
                  onPick={(p) => applyPlace(ev.id, p)}
                  onLocate={() => fillMyLocation(ev.id)}
                  locating={locBusy}
                />
              </div>

              <div className="gf-form">
                {hasPoint(ev) && radiusNum >= 10 && (
                  <p className="gf-summary">
                    <MapPin size={16} aria-hidden="true" />
                    <span>
                      {t("Members can only check in within {radius} m of {place}.", {
                        radius: radiusNum,
                        place: ev.location || t("the selected spot"),
                      })}
                    </span>
                  </p>
                )}

                <div className="gf-field">
                  <label htmlFor="gf-loc">{GF.locationName}</label>
                  <input
                    id="gf-loc"
                    className="gf-ellipsis"
                    placeholder={GF.locationPh}
                    title={ev.location ?? ""}
                    value={ev.location ?? ""}
                    onChange={(x) => set(ev.id, "location", x.target.value)}
                  />
                </div>

                <div className="gf-field">
                  <div className="gf-label-row">
                    <label htmlFor="gf-radius-num">{GF.radius}</label>
                    <span className="gf-num">
                      <input
                        id="gf-radius-num"
                        type="number"
                        min="10"
                        inputMode="numeric"
                        value={ev.radius_m ?? ""}
                        onChange={(x) => set(ev.id, "radius_m", x.target.value)}
                      />
                      <span>m</span>
                    </span>
                  </div>
                  <input
                    className="gf-range"
                    type="range"
                    min="50"
                    max="1000"
                    step="10"
                    aria-label={GF.radius}
                    value={Math.min(1000, Math.max(50, radiusNum || 100))}
                    onChange={(x) => set(ev.id, "radius_m", x.target.value)}
                  />
                  <div className="gf-presets">
                    {RADIUS_PRESETS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`gf-preset${radiusNum === r ? " on" : ""}`}
                        onClick={() => set(ev.id, "radius_m", String(r))}
                      >
                        {r} m
                      </button>
                    ))}
                  </div>
                </div>

                <div className="gf-field">
                  <div className="gf-label-row">
                    <span className="gf-label">{GF.coords}</span>
                    <button type="button" className="gf-link" onClick={() => setManual((m) => !m)}>
                      {manual ? GF.done : GF.editManual}
                    </button>
                  </div>
                  {!manual &&
                    (hasPoint(ev) ? (
                      <code className="gf-coords">
                        {Number(ev.lat).toFixed(6)}, {Number(ev.lng).toFixed(6)}
                      </code>
                    ) : (
                      <span className="gf-muted">{GF.coordsNone}</span>
                    ))}
                  {manual && (
                    <div className="gf-coords-edit">
                      <input
                        aria-label={GF.lat}
                        placeholder={GF.lat}
                        inputMode="decimal"
                        value={ev.lat ?? ""}
                        onChange={(x) => set(ev.id, "lat", x.target.value)}
                      />
                      <input
                        aria-label={GF.lng}
                        placeholder={GF.lng}
                        inputMode="decimal"
                        value={ev.lng ?? ""}
                        onChange={(x) => set(ev.id, "lng", x.target.value)}
                      />
                    </div>
                  )}
                </div>

                <button
                  className="sp-btn primary gf-save"
                  type="button"
                  disabled={saving || !hasPoint(ev) || !dirty}
                  onClick={() => save(ev)}
                >
                  {saving ? (
                    <span className="gf-spin on-primary" aria-hidden="true" />
                  ) : (
                    <Save size={16} aria-hidden="true" />
                  )}{" "}
                  {saving ? GF.saving : dirty || !hasPoint(ev) ? GF.save : GF.saved}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

/* --------------------------------------------------- Ministry Schedules */
export function StaffSchedules() {
  const { t } = useLang();
  return (
    <>
      <PageHeader icon={Clock} title={t("Ministry Schedules")} subtitle={t("Plan ministry schedules and volunteers (conflicts are checked).")} />
      <DataPage
        title={t("Schedules")}
        resource="ministry_schedules"
        addLabel={t("Schedule")}
        canDelete={false}
        lookups={{
          ministries: { resource: "ministries", label: "name" },
          members: { resource: "members", label: "full_name" },
        }}
        columns={[
          { key: "ministry_name", label: t("Ministry") },
          { key: "title", label: t("Title") },
          { key: "schedule_date", label: t("Date") },
          { label: t("Time"), render: (r) => `${hm(r.start_time)}-${hm(r.end_time)}` },
          { key: "location", label: t("Location") },
          { key: "volunteer_name", label: t("Volunteer") },
        ]}
        fields={[
          { key: "ministry_id", label: t("Ministry"), type: "select", lookup: "ministries", required: true },
          { key: "title", label: t("Title"), required: true },
          { key: "schedule_date", label: t("Date"), type: "date", required: true },
          { key: "start_time", label: t("Start time"), type: "time", required: true },
          { key: "end_time", label: t("End time"), type: "time", required: true },
          { key: "location", label: t("Location") },
          { key: "volunteer_member_id", label: t("Volunteer (conflict is checked)"), type: "select", lookup: "members" },
        ]}
      />
    </>
  );
}

/* ------------------------------------------------------------- Giving */
export function Giving() {
  const { t } = useLang();
  return (
    <>
      <PageHeader icon={Wallet} title={t("Giving Records")} subtitle={t("Record tithes, offerings, and other giving.")} />
      <DataPage
        title={t("Giving")}
        resource="giving"
        addLabel={t("Record")}
        canDelete={false}
        lookups={{ members: { resource: "members", label: "full_name" } }}
        columns={[
          { key: "given_at", label: t("Date") },
          { label: t("Member"), render: (r) => r.member_name || t("Anonymous") },
          { label: t("Type"), render: (r) => t(r.type) },
          { label: t("Amount (PHP)"), render: (r) => money(r.amount) },
          { key: "notes", label: t("Notes") },
        ]}
        fields={[
          { key: "member_id", label: t("Member (blank = anonymous)"), type: "select", lookup: "members" },
          { key: "amount", label: t("Amount"), type: "number", step: "0.01", required: true },
          { key: "type", label: t("Type"), type: "select", required: true, options: ["tithe", "offering", "mission", "building fund", "other"].map((x) => ({ value: x, label: t(x) })) },
          { key: "given_at", label: t("Date"), type: "date", required: true },
          { key: "notes", label: t("Notes") },
        ]}
        defaults={{ type: "tithe" }}
      />
    </>
  );
}

/* ------------------------------------------------------------ Reports */
function Bars({ title, data, money: isMoney, translate }) {
  const { t } = useLang();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="sp-card">
      <h4 className="sp-card-title">{title}</h4>
      {data.length === 0 && <span className="sp-muted">{t("No data")}</span>}
      <div className="sp-bars">
        {data.map((d) => {
          const lbl = translate ? t(d.label) : d.label;
          return (
            <div className="sp-bar-row" key={d.label}>
              <span className="sp-bar-lbl" title={lbl}>{lbl}</span>
              <div className="sp-bar-track">
                <i style={{ width: `${(d.value / max) * 100}%` }} />
              </div>
              <strong>{isMoney ? money(d.value) : d.value}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Reports() {
  const { t } = useLang();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get("/portal/reports").then((r) => setD(r.data)).catch((e) => setError(e.response?.data?.error || "Failed to load"));
  }, []);
  if (error) return <Notice msg={{ ok: false, text: t(error) }} />;
  if (!d) return <p className="sp-muted">{t("Loading...")}</p>;
  return (
    <>
      <PageHeader icon={BarChart3} title={t("Reports")} subtitle={t("Attendance, giving, and ministry summaries.")} />
      <div className="sp-summary no-print">
        <div className="sp-pill"><strong>{d.members_total}</strong><span>{t("Total members")}</span></div>
        <div className="sp-pill"><strong>{d.members_active}</strong><span>{t("Active members")}</span></div>
        <button className="sp-btn primary" type="button" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> {t("Print report")}
        </button>
      </div>
      <div className="sp-grid">
        <Bars title={t("Attendance per week (last 8 weeks)")} data={d.attendance_weekly} />
        <Bars title={t("Giving per month (PHP)")} data={d.giving_monthly} money />
        <Bars title={t("Giving by type (PHP)")} data={d.giving_by_type} money translate />
        <Bars title={t("Ministry sizes")} data={d.ministry_sizes} />
        <Bars title={t("Attendance by method")} data={d.attendance_method} translate />
      </div>
    </>
  );
}

/* ------------------------------------------------------------ Sermons */
export function Sermons() {
  const { t } = useLang();
  return (
    <>
      <PageHeader icon={Mic} title={t("Sermon Archive")} subtitle={t("Upload sermons with transcript and summary.")} />
      <DataPage
        title={t("Sermons")}
        resource="sermons"
        addLabel={t("Sermon")}
        canDelete={false}
        columns={[
          { key: "sermon_date", label: t("Date") },
          { key: "title", label: t("Title") },
          { key: "preacher", label: t("Preacher") },
          { label: t("Audio"), render: (r) => (r.audio_url ? <a href={r.audio_url} target="_blank" rel="noreferrer">{t("Open")}</a> : "") },
          { label: t("Transcript"), render: (r) => (r.transcript ? <span className="badge ok">{t("yes")}</span> : <span className="badge">{t("no")}</span>) },
          { label: t("Summary"), render: (r) => (r.summary ? <span className="badge ok">{t("yes")}</span> : <span className="badge">{t("no")}</span>) },
        ]}
        fields={[
          { key: "title", label: t("Title"), required: true },
          { key: "preacher", label: t("Preacher") },
          { key: "sermon_date", label: t("Date"), type: "date", required: true },
          { key: "audio_url", label: t("Audio link (URL)") },
          { key: "transcript", label: t("Transcript"), type: "textarea", rows: 6 },
          { key: "summary", label: t("Summary"), type: "textarea", rows: 4 },
        ]}
      />
    </>
  );
}