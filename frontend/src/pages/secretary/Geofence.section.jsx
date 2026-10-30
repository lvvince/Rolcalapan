// =====================================================================
// frontend/src/pages/staff/StaffPages.jsx
//
// 1) Imports at the top of the file:
//      - add:     import { Link } from "react-router-dom";
//      - add:     import "./Geofence.css";
//      - remove:  LocateFixed from the lucide-react import (it now lives in MapPicker)
//
// 2) Keep checkCoords() as it is. Replace ONLY `export function Geofence() {...}`
//    with everything below.
// =====================================================================

/* ---------------------------------------------------------- Geofence */
// Text is collected here so it is easy to move into your translation keys later.
const GF = {
  title: "Geofence for Off-Site Events",
  subtitle: 'Gumawa muna ng event na type "Outside" sa Events & Announcements.',
  listTitle: "Off-site events",
  chipSet: "Geofence set",
  chipNone: "Not set",
  chipDirty: "Unsaved changes",
  emptyTitle: "No off-site events yet",
  emptyText: 'Create an "Outside / Off-site" event first, then set its location here.',
  emptyLink: "Go to Events & Announcements",
  locationName: "Location name",
  locationPh: "e.g. Lalud, Calapan City",
  radius: "Check-in radius",
  coords: "Coordinates",
  coordsNone: "Not set. Click the map or search a place.",
  editManual: "Edit manually",
  done: "Done",
  lat: "Latitude",
  lng: "Longitude",
  save: "Save geofence",
  saving: "Saving...",
  saved: "Saved",
};

const RADIUS_PRESETS = [50, 100, 200, 500];

const hasPoint = (e) =>
  [e.lat, e.lng].every((v) => v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v)));

// What counts as "changed since last save"
const snap = (e) => JSON.stringify([e.lat ?? "", e.lng ?? "", e.radius_m ?? "", e.location ?? ""]);

export function Geofence() {
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
    const t = setTimeout(() => setMsg(null), msg.ok ? 4000 : 8000);
    return () => clearTimeout(t);
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
      setMsg({ ok: false, text: "Hindi supported ng browser mo ang location." });
      return;
    }
    setLocBusy(true);
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
        setLocBusy(false);
      },
      (err) => {
        const text = {
          1: "Na-block ang location permission. I-click ang lock icon sa address bar, i-allow ang Location, tapos i-refresh.",
          2: "Hindi ma-detect ang location. I-on ang Location sa Windows (Settings > Privacy & security > Location) o gamitin ang phone.",
          3: "Nag-timeout. Subukan ulit.",
        };
        setMsg({ ok: false, text: text[err.code] || "Hindi makuha ang location." });
        setLocBusy(false);
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
    setSaving(true);
    try {
      await api.post("/resource/save", { name: "events", ...e });
      // no reload, so unsaved edits on the other events are not lost
      setSaved((s) => ({ ...s, [e.id]: snap(e) }));
      setMsg({ ok: true, text: `Saved geofence for "${e.title}"` });
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || "Failed to save" });
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

      {loading && <p className="sp-muted">Loading...</p>}

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
                      Members can only check in within <strong>{radiusNum} m</strong> of{" "}
                      <strong>{ev.location || "the selected spot"}</strong>.
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