import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  UsersRound,
  QrCode,
  CalendarDays,
  MapPin,
  Clock,
  Wallet,
  BarChart3,
  Mic,
  Megaphone,
  Save,
  Printer,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import api from "../../api";
import DataPage, { hm } from "../../components/DataPage";
import QrView from "../../components/QrView";
import MapPicker, { reverseGeocode } from "../../components/MapPicker";
import { StaffNotifications } from "../../components/Notifications";
import { useLang } from "../../i18n/LanguageContext";
import SecretaryPredictiveReport from "./SecretaryPredictiveReport";
import "../../components/portal.css";
import "./StaffPages.css";
import "./Geofence.css";

export { StaffNotifications };
export { StaffAttendance } from "./StaffAttendance";

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

export function EventsAnnouncements({ canDelete = false }) {
  const { t } = useLang();
  return (
    <>
      <PageHeader icon={CalendarDays} title={t("Events & Schedules")} subtitle={t("Manage church events.")} />
      <DataPage
        title={t("Events")}
        resource="events"
        addLabel={t("Event")}
        canDelete={canDelete}
        lookups={{ ministries: { resource: "ministries", label: "name" } }}
        columns={getEventColumns(t)}
        fields={getEventFields(t)}
        defaults={{ event_type: "internal", radius_m: 100 }}
      />
    </>
  );
}

/* ------------------------------------------------------ Announcements */
export function StaffAnnouncements() {
  const { t } = useLang();
  return (
    <>
      <PageHeader icon={Megaphone} title={t("Announcements")} subtitle={t("Post and manage church announcements.")} />
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
export function Giving({ canDelete = false }) {
  const { t } = useLang();
  return (
    <>
      <PageHeader icon={Wallet} title={t("Giving Records")} subtitle={t("Record tithes, offerings, and other giving.")} />
      <DataPage
        title={t("Giving")}
        resource="giving"
        addLabel={t("Record")}
        canDelete={canDelete}
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
            <div className="sp-bar-row" key={d.key || d.label}>
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

/* ---- period grouping (week / month / year) ---- */
const PERIODS = [
  { key: "week", label: "Week", n: 8 },
  { key: "month", label: "Month", n: 12 },
  { key: "year", label: "Year", n: 5 },
];

const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseDate = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const weekStart = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay()); // Sunday
  return x;
};

function bucketOf(d, period) {
  if (period === "week") {
    const w = weekStart(d);
    return { key: ymd(w), label: w.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
  }
  if (period === "month") {
    return {
      key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`,
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    };
  }
  return { key: String(d.getFullYear()), label: String(d.getFullYear()) };
}

// true kung nasa loob ng from/to (YYYY-MM-DD; walang laman = walang limit)
const inRange = (s, from, to) => {
  const v = String(s).slice(0, 10);
  return (!from || v >= from) && (!to || v <= to);
};

const nextSlot = (d, period) => {
  if (period === "week") return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
  if (period === "month") return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return new Date(d.getFullYear() + 1, 0, 1);
};

const MAX_SLOTS = 60;

function groupByPeriod(rows, dateKey, valueOf, period, from = "", to = "") {
  const slots = [];

  if (from || to) {
    // may date range: gumawa ng periods mula from hanggang to
    const dates = rows
      .filter((r) => r[dateKey])
      .map((r) => String(r[dateKey]).slice(0, 10))
      .sort();
    const startStr = from || dates[0] || ymd(new Date());
    const endStr = to || ymd(new Date());
    const end = parseDate(endStr);
    let cur = parseDate(startStr);
    if (period === "week") cur = weekStart(cur);
    else if (period === "month") cur = new Date(cur.getFullYear(), cur.getMonth(), 1);
    else cur = new Date(cur.getFullYear(), 0, 1);

    let guard = 0;
    while (cur <= end && guard++ < 1000) {
      slots.push({ ...bucketOf(cur, period), value: 0 });
      cur = nextSlot(cur, period);
    }
    // huling MAX_SLOTS lang para hindi sumobra ang bars
    if (slots.length > MAX_SLOTS) slots.splice(0, slots.length - MAX_SLOTS);
  } else {
    // default: huling N periods (kasama ang walang data = 0)
    const n = PERIODS.find((p) => p.key === period).n;
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      let d;
      if (period === "week") {
        d = weekStart(now);
        d.setDate(d.getDate() - 7 * i);
      } else if (period === "month") {
        d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      } else {
        d = new Date(now.getFullYear() - i, 0, 1);
      }
      slots.push({ ...bucketOf(d, period), value: 0 });
    }
  }

  const index = Object.fromEntries(slots.map((s, i) => [s.key, i]));
  rows.forEach((r) => {
    if (!r[dateKey] || !inRange(r[dateKey], from, to)) return;
    const b = bucketOf(parseDate(r[dateKey]), period);
    if (b.key in index) slots[index[b.key]].value += valueOf(r);
  });
  return slots;
}

/* ---- Reports: tabs ---- */
const TABS = [
  { key: "summary", label: "Summary" },
  { key: "att", label: "Attendance" },
  { key: "giv", label: "Giving" },
  { key: "members", label: "Members" },
  { key: "pred", label: "Predictive" },
];

// Mga seksyon na puwedeng piliin sa Summary tab
const SUMMARY_SECTIONS = [
  { key: "att", label: "Attendance" },
  { key: "giv", label: "Giving" },
  { key: "type", label: "Giving by type" },
  { key: "method", label: "Attendance by method" },
  { key: "min", label: "Ministry sizes" },
];
const SUMMARY_DEFAULT = ["att", "giv", "min"];

const GIVING_TYPES = ["tithe", "offering", "mission", "building fund", "other"];

// Mabilis na date range: [from, to]
const RANGES = [
  {
    key: "month",
    label: "This month",
    get: () => {
      const n = new Date();
      return [ymd(new Date(n.getFullYear(), n.getMonth(), 1)), ymd(n)];
    },
  },
  {
    key: "30",
    label: "Last 30 days",
    get: () => {
      const n = new Date();
      return [ymd(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 29)), ymd(n)];
    },
  },
  {
    key: "year",
    label: "This year",
    get: () => {
      const n = new Date();
      return [ymd(new Date(n.getFullYear(), 0, 1)), ymd(n)];
    },
  },
];

// Pag-total ayon sa category (loob lang ng date range)
function tally(rows, dateKey, keyOf, valueOf, from, to) {
  const m = {};
  rows.forEach((r) => {
    if (!r[dateKey] || !inRange(r[dateKey], from, to)) return;
    const k = keyOf(r) || "other";
    m[k] = (m[k] || 0) + valueOf(r);
  });
  return Object.entries(m)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

// Period (week/month/year) + From/To + quick range
function DateFilters({ t, period, setPeriod, from, setFrom, to, setTo }) {
  const activeRange = RANGES.find((r) => {
    const [a, b] = r.get();
    return a === from && b === to;
  })?.key;

  return (
    <>
      <div className="sp-seg" role="group" aria-label={t("Group by")}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={period === p.key ? "on" : ""}
            aria-pressed={period === p.key}
            onClick={() => setPeriod(p.key)}
          >
            {t(p.label)}
          </button>
        ))}
      </div>

      <div className="rp-dates">
        <div className="sp-field">
          <label htmlFor="rp-from">{t("From")}</label>
          <input id="rp-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="sp-field">
          <label htmlFor="rp-to">{t("To")}</label>
          <input id="rp-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="rp-quick" role="group" aria-label={t("Quick date range")}>
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`rp-quick-btn${activeRange === r.key ? " on" : ""}`}
            aria-pressed={activeRange === r.key}
            onClick={() => {
              const [a, b] = r.get();
              setFrom(a);
              setTo(b);
            }}
          >
            {t(r.label)}
          </button>
        ))}
        <button
          type="button"
          className="rp-quick-btn"
          disabled={!from && !to}
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          {t("Clear dates")}
        </button>
      </div>
    </>
  );
}

function PrintButton({ t, disabled }) {
  return (
    <button className="sp-btn primary rp-print" type="button" disabled={disabled} onClick={() => window.print()}>
      <Printer size={16} aria-hidden="true" /> {t("Print report")}
    </button>
  );
}

function Stat({ value, label }) {
  return (
    <div className="sp-pill">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

// State na naaalala kahit mag-refresh (localStorage)
function usePersisted(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  }, [key, v]);
  return [v, setV];
}

export function Reports() {
  const { t } = useLang();
  const [d, setD] = useState(null);
  const [att, setAtt] = useState([]);
  const [giv, setGiv] = useState([]);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");

  // Tab: nasa URL (?tab=giv) para hindi mawala sa refresh at puwedeng i-bookmark
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab = TABS.some((x) => x.key === tabParam) ? tabParam : "summary";
  const setTab = (k) => setParams({ tab: k }, { replace: true });

  // Mga napili: naaalala kahit mag-refresh
  const [periodRaw, setPeriod] = usePersisted("rp-period", "week");
  const period = PERIODS.some((p) => p.key === periodRaw) ? periodRaw : "week";
  const [gTypeRaw, setGType] = usePersisted("rp-gtype", "all"); // Giving tab
  const gType = ["all", ...GIVING_TYPES].includes(gTypeRaw) ? gTypeRaw : "all";
  const [mStatusRaw, setMStatus] = usePersisted("rp-mstatus", "all"); // Members tab
  const mStatus = ["all", "active", "inactive"].includes(mStatusRaw) ? mStatusRaw : "all";
  const [sumRaw, setSumSel] = usePersisted("rp-summary", {}); // Summary checkboxes
  const sumSel = Object.fromEntries(
    SUMMARY_SECTIONS.map((x) => [
      x.key,
      typeof sumRaw?.[x.key] === "boolean" ? sumRaw[x.key] : SUMMARY_DEFAULT.includes(x.key),
    ])
  );

  // Hindi sinasave: dates at search (para hindi luma ang range sa susunod na bukas)
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mQuery, setMQuery] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/portal/reports"),
      api.get("/resource", { params: { name: "attendance" } }),
      api.get("/resource", { params: { name: "giving" } }),
      api.get("/resource", { params: { name: "members" } }),
    ])
      .then(([r, a, g, m]) => {
        setD(r.data);
        setAtt(a.data || []);
        setGiv(g.data || []);
        setMembers(m.data || []);
      })
      .catch((e) => setError(e.response?.data?.error || "Failed to load"));
  }, []);

  if (error) return <Notice msg={{ ok: false, text: t(error) }} />;
  if (!d) return <p className="sp-muted">{t("Loading...")}</p>;

  const periodName = t(PERIODS.find((p) => p.key === period).label).toLowerCase();

  // ---- date range ----
  const badRange = Boolean(from && to && from > to);
  const rf = badRange ? "" : from;
  const rt = badRange ? "" : to;
  const rangeText = rf || rt ? `${rf || "…"} – ${rt || t("today")}` : t("Latest periods (default)");

  // ---- attendance ----
  const attData = groupByPeriod(att, "service_date", () => 1, period, rf, rt);
  const attByMethod = tally(att, "service_date", (r) => r.method, () => 1, rf, rt);
  const attCount = att.filter((r) => r.service_date && inRange(r.service_date, rf, rt)).length;

  // ---- giving ----
  const givAll = groupByPeriod(giv, "given_at", (r) => Number(r.amount) || 0, period, rf, rt);
  const givRowsTyped = gType === "all" ? giv : giv.filter((r) => r.type === gType);
  const givTyped = gType === "all" ? givAll : groupByPeriod(givRowsTyped, "given_at", (r) => Number(r.amount) || 0, period, rf, rt);
  const givByType = tally(giv, "given_at", (r) => r.type, (r) => Number(r.amount) || 0, rf, rt);
  const givInRange = givRowsTyped.filter((r) => r.given_at && inRange(r.given_at, rf, rt));
  const givTotal = givInRange.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // ---- members ----
  const q = mQuery.trim().toLowerCase();
  const shownMembers = members.filter(
    (m) =>
      (mStatus === "all" || m.status === mStatus) &&
      (!q ||
        [m.full_name, m.family_name, m.member_code].some((v) => String(v ?? "").toLowerCase().includes(q)))
  );

  // ---- summary ----
  const sumCount = SUMMARY_SECTIONS.filter((s) => sumSel[s.key]).length;
  const toggleSum = (k) => setSumSel({ ...sumSel, [k]: !sumSel[k] });
  const setSumPreset = (keys) =>
    setSumSel(Object.fromEntries(SUMMARY_SECTIONS.map((s) => [s.key, keys.includes(s.key)])));

  const tabLabel = t(TABS.find((x) => x.key === tab).label);
  const usesDates = tab === "summary" || tab === "att" || tab === "giv";
  const dateProps = { t, period, setPeriod, from, setFrom, to, setTo };

  return (
    <>
      <PageHeader icon={BarChart3} title={t("Reports")} subtitle={t("Choose a report, set the filters, then print.")} />

      {/* ================= Tabs ================= */}
      <div className="rp-tabs no-print" role="tablist" aria-label={t("Reports")}>
        {TABS.map((tb) => (
          <button
            key={tb.key}
            type="button"
            role="tab"
            id={`rp-tab-${tb.key}`}
            aria-selected={tab === tb.key}
            aria-controls="rp-panel"
            className={`rp-tab${tab === tb.key ? " on" : ""}`}
            onClick={() => setTab(tb.key)}
          >
            {t(tb.label)}
          </button>
        ))}
      </div>

      {/* Lumalabas lang sa print: anong report at anong filter ang ginamit */}
      <div className="rp-print-head print-only">
        <h3>{t("Church Report")} – {tabLabel}</h3>
        <p>
          {t("Printed on")} {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
        </p>
        {usesDates && (
          <p>
            {t("Period")}: {rangeText} · {t("Group by")}: {periodName}
            {tab === "giv" && gType !== "all" ? ` · ${t("Type")}: ${t(gType)}` : ""}
          </p>
        )}
      </div>

      <div id="rp-panel" role="tabpanel" aria-labelledby={`rp-tab-${tab}`}>
        {usesDates && badRange && <Notice msg={{ ok: false, text: t("The start date must be before the end date.") }} />}

        {/* ================= SUMMARY ================= */}
        {tab === "summary" && (
          <>
            <div className="rp-bar no-print">
              <DateFilters {...dateProps} />
              <div className="rp-chips">
                {SUMMARY_SECTIONS.map((s) => (
                  <label key={s.key} className={`rp-chip${sumSel[s.key] ? " on" : ""}`}>
                    <input type="checkbox" checked={sumSel[s.key]} onChange={() => toggleSum(s.key)} />
                    <span>{t(s.label)}</span>
                  </label>
                ))}
              </div>
              <div className="rp-quick" role="group" aria-label={t("Quick selection")}>
                <button type="button" className="rp-quick-btn" onClick={() => setSumPreset(SUMMARY_SECTIONS.map((s) => s.key))}>
                  {t("Select all")}
                </button>
                <button type="button" className="rp-quick-btn" disabled={sumCount === 0} onClick={() => setSumPreset([])}>
                  {t("Clear")}
                </button>
              </div>
              <PrintButton t={t} disabled={sumCount === 0} />
            </div>

            {sumCount === 0 ? (
              <div className="sp-empty">
                <BarChart3 size={28} aria-hidden="true" />
                <strong>{t("Nothing selected")}</strong>
                <span>{t("Choose at least one section above.")}</span>
              </div>
            ) : (
              <>
                <div className="rp-stats">
                  <Stat value={d.members_total} label={t("Total members")} />
                  <Stat value={d.members_active} label={t("Active members")} />
                </div>
                <div className="sp-grid">
                  {sumSel.att && <Bars title={`${t("Attendance per")} ${periodName}`} data={attData} />}
                  {sumSel.giv && <Bars title={`${t("Giving per")} ${periodName} (PHP)`} data={givAll} money />}
                  {sumSel.type && <Bars title={t("Giving by type (PHP)")} data={givByType} money translate />}
                  {sumSel.method && <Bars title={t("Attendance by method")} data={attByMethod} translate />}
                  {sumSel.min && <Bars title={t("Ministry sizes")} data={d.ministry_sizes} />}
                </div>
              </>
            )}
          </>
        )}

        {/* ================= ATTENDANCE ================= */}
        {tab === "att" && (
          <>
            <div className="rp-bar no-print">
              <DateFilters {...dateProps} />
              <PrintButton t={t} />
            </div>
            <div className="rp-stats">
              <Stat value={attCount} label={t("Attendance records")} />
              <Stat value={d.members_active} label={t("Active members")} />
            </div>
            <div className="sp-grid">
              <Bars title={`${t("Attendance per")} ${periodName}`} data={attData} />
              <Bars title={t("Attendance by method")} data={attByMethod} translate />
            </div>
          </>
        )}

        {/* ================= GIVING ================= */}
        {tab === "giv" && (
          <>
            <div className="rp-bar no-print">
              <DateFilters {...dateProps} />
              <div className="sp-field">
                <label htmlFor="rp-gtype">{t("Type")}</label>
                <select id="rp-gtype" value={gType} onChange={(e) => setGType(e.target.value)}>
                  <option value="all">{t("All")}</option>
                  {GIVING_TYPES.map((x) => (
                    <option key={x} value={x}>{t(x)}</option>
                  ))}
                </select>
              </div>
              <PrintButton t={t} />
            </div>
            <div className="rp-stats">
              <Stat value={money(givTotal)} label={`${t("Total given")} (PHP)`} />
              <Stat value={givInRange.length} label={t("Records")} />
            </div>
            <div className="sp-grid">
              <Bars title={`${t("Giving per")} ${periodName} (PHP)`} data={givTyped} money />
              {gType === "all" && <Bars title={t("Giving by type (PHP)")} data={givByType} money translate />}
            </div>
          </>
        )}

        {/* ================= MEMBERS ================= */}
        {tab === "members" && (
          <>
            <div className="rp-bar no-print">
              <div className="sp-field">
                <label htmlFor="rp-mstatus">{t("Status")}</label>
                <select id="rp-mstatus" value={mStatus} onChange={(e) => setMStatus(e.target.value)}>
                  <option value="all">{t("All")}</option>
                  <option value="active">{t("Active")}</option>
                  <option value="inactive">{t("Inactive")}</option>
                </select>
              </div>
              <div className="sp-field grow">
                <label htmlFor="rp-mq">{t("Search")}</label>
                <input id="rp-mq" value={mQuery} placeholder={t("Name, family, or code")} onChange={(e) => setMQuery(e.target.value)} />
              </div>
              <PrintButton t={t} disabled={shownMembers.length === 0} />
            </div>

            <div className="rp-stats">
              <Stat value={shownMembers.length} label={t("Shown")} />
              <Stat value={d.members_total} label={t("Total members")} />
              <Stat value={d.members_active} label={t("Active members")} />
            </div>

            <div className="sp-card rp-members">
              <h4 className="sp-card-title">{t("Members list")} ({shownMembers.length})</h4>
              <p className="rp-print-only-note print-only">
                {t("Status")}: {mStatus === "all" ? t("All") : t(mStatus)}
                {q ? ` · ${t("Search")}: "${mQuery.trim()}"` : ""}
              </p>

              {shownMembers.length === 0 ? (
                <span className="sp-muted">{t("No data")}</span>
              ) : (
                <table className="rp-table">
                  <thead>
                    <tr>
                      <th>{t("Code")}</th>
                      <th>{t("Name")}</th>
                      <th>{t("Family")}</th>
                      <th>{t("Phone")}</th>
                      <th>{t("Status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownMembers.map((m) => (
                      <tr key={m.id}>
                        <td>{m.member_code}</td>
                        <td>{m.full_name}</td>
                        <td>{m.family_name}</td>
                        <td>{m.phone}</td>
                        <td>{statusBadge(m.status, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="sp-grid">
              <Bars title={t("Ministry sizes")} data={d.ministry_sizes} />
            </div>
          </>
        )}

        {/* ================= PREDICTIVE ================= */}
        {tab === "pred" && (
          <>
            <div className="rp-bar no-print">
              <PrintButton t={t} />
            </div>
            <SecretaryPredictiveReport embedded />
          </>
        )}
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