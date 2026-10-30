// frontend/src/components/MapPicker.jsx
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, LocateFixed, X } from "lucide-react";

const CALAPAN = [13.4117, 121.1803];
const NOM = "https://nominatim.openstreetmap.org";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LIGHT_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

// Own SVG pin (no image files needed, so it never shows a broken icon)
const pinIcon = L.divIcon({
  className: "",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="#0e7490" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="#fff"/></svg>`,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
});

// lat/lng -> readable address (OpenStreetMap Nominatim)
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `${NOM}/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`
    );
    if (!res.ok) return "";
    const j = await res.json();
    return j.display_name || "";
  } catch {
    return "";
  }
}

const NOISE = /\b(\d{4}|oriental mindoro|mimaropa|philippines|pilipinas)\b/gi;
const ADMIN = /\b(city|municipality|barangay|brgy\.?|province)\b/gi;
const ROAD =
  /\b(national highway|highway|hiway|road|rd\.?|street|avenue|ave\.?|boulevard|blvd\.?)\b/gi;

// "Lalud Highway, Calapan City, 5200 Oriental Mindoro"
//  -> full, "Lalud Highway, Calapan", "Lalud, Calapan", "Lalud"
function variants(q) {
  const tidy = (s) =>
    s
      .split(",")
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(", ");
  const full = tidy(q);
  const noAdmin = tidy(q.replace(NOISE, " ").replace(ADMIN, " "));
  const noRoad = tidy(noAdmin.replace(ROAD, " "));
  const parts = noRoad.split(", ").filter(Boolean);
  const firstLast = parts.length > 1 ? `${parts[0]}, ${parts[parts.length - 1]}` : "";
  return [
    ...new Set([full, noAdmin, noRoad, firstLast, parts[0]].filter((s) => s && s.length >= 3)),
  ].slice(0, 4);
}

const validNum = (v) => v !== "" && v !== null && v !== undefined && !isNaN(parseFloat(v));

// Dark mode detection. Adjust this if your theme toggle uses something other than
// a "dark" class or data-theme="dark" on <html> / <body>.
const isDarkNow = () =>
  typeof document !== "undefined" &&
  [document.documentElement, document.body].some(
    (el) => el.classList.contains("dark") || el.dataset.theme === "dark"
  );

function useDarkMode() {
  const [dark, setDark] = useState(isDarkNow);
  useEffect(() => {
    const o = new MutationObserver(() => setDark(isDarkNow()));
    [document.documentElement, document.body].forEach((el) =>
      o.observe(el, { attributes: true, attributeFilter: ["class", "data-theme"] })
    );
    return () => o.disconnect();
  }, []);
  return dark;
}

/**
 * Props:
 * - latitude, longitude : current values (string or number)
 * - radius              : geofence radius in meters (default 100)
 * - onPick({ latitude, longitude, name })
 *      Pin click/drag first sends name "" then sends the address once it is found.
 * - onLocate            : optional. Shows a floating "Use my location" button.
 * - locating            : true while onLocate is working.
 *
 * The component fills its parent: give the parent a height.
 */
export default function MapPicker({
  latitude,
  longitude,
  radius = 100,
  onPick,
  onLocate,
  locating = false,
}) {
  const mapEl = useRef(null);
  const map = useRef(null);
  const tiles = useRef(null);
  const marker = useRef(null);
  const circle = useRef(null);
  const onPickRef = useRef(onPick);
  const radiusRef = useRef(radius);
  const touched = useRef(false);
  const moveId = useRef(0);

  const dark = useDarkMode();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  onPickRef.current = onPick;
  radiusRef.current = radius;

  const hasPoint = validNum(latitude) && validNum(longitude);

  const emit = (lat, lng, name = "") =>
    onPickRef.current?.({
      latitude: Number(lat).toFixed(7),
      longitude: Number(lng).toFixed(7),
      name,
    });

  // Pin + circle are only on the map once a location exists.
  // Returns true if they were just added.
  const ensureLayers = () => {
    const m = map.current;
    if (!m || m.hasLayer(marker.current)) return false;
    marker.current.addTo(m);
    circle.current.addTo(m);
    return true;
  };

  // Zoom/fit so the whole circle is visible. Without `force` it only moves
  // the view when the circle is cut off, so the slider doesn't jitter the map.
  const fitCircle = (force = false) => {
    const m = map.current;
    const ci = circle.current;
    if (!m || !ci || !m.hasLayer(ci)) return;
    const b = ci.getBounds();
    if (force || !m.getBounds().pad(-0.1).contains(b)) {
      m.fitBounds(b, { padding: [40, 40], maxZoom: 18 });
    }
  };

  // ---------- init map (once) ----------
  useEffect(() => {
    const has = validNum(latitude) && validNum(longitude);
    const startLL = has ? [parseFloat(latitude), parseFloat(longitude)] : CALAPAN;

    const m = L.map(mapEl.current, { zoomControl: false }).setView(startLL, has ? 16 : 14);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    map.current = m;

    const mk = L.marker(startLL, { draggable: true, icon: pinIcon });
    const ci = L.circle(startLL, {
      radius: Number(radiusRef.current) || 100,
      color: "#0e7490",
      fillColor: "#0e7490",
      fillOpacity: 0.18,
    });
    marker.current = mk;
    circle.current = ci;
    if (has) {
      mk.addTo(m);
      ci.addTo(m);
    }

    const move = (ll) => {
      ensureLayers();
      mk.setLatLng(ll);
      ci.setLatLng(ll);
      fitCircle(false);
      emit(ll.lat, ll.lng, "");

      // auto-fill the location name (ignore if the pin moved again meanwhile)
      const id = ++moveId.current;
      reverseGeocode(ll.lat, ll.lng).then((name) => {
        if (name && id === moveId.current) emit(ll.lat, ll.lng, name);
      });
    };

    m.on("click", (e) => move(e.latlng));
    mk.on("dragend", () => move(mk.getLatLng()));

    // fix gray/partial tiles when the container size changes
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(mapEl.current);
    const t = setTimeout(() => {
      m.invalidateSize();
      if (has) fitCircle(true);
    }, 200);

    return () => {
      clearTimeout(t);
      ro.disconnect();
      m.remove();
      map.current = null;
      tiles.current = null;
      marker.current = null;
      circle.current = null;
    };
    // eslint-disable-next-line
  }, []);

  // ---------- tiles (light / dark) ----------
  useEffect(() => {
    if (!map.current) return;
    tiles.current?.remove();
    tiles.current = L.tileLayer(dark ? DARK_TILES : LIGHT_TILES, {
      maxZoom: 19,
      subdomains: "abcd",
      attribution: dark
        ? "&copy; OpenStreetMap contributors &copy; CARTO"
        : "&copy; OpenStreetMap contributors",
    }).addTo(map.current);
  }, [dark]);

  // ---------- sync from outside (Use my location, manual lat/lng, radius) ----------
  useEffect(() => {
    if (!map.current) return;
    let added = false;
    if (validNum(latitude) && validNum(longitude)) {
      const ll = L.latLng(parseFloat(latitude), parseFloat(longitude));
      added = ensureLayers();
      const cur = marker.current.getLatLng();
      // 1e-6 deg (~0.1 m) so the 7-decimal rounding of our own picks doesn't re-pan the map
      if (Math.abs(cur.lat - ll.lat) > 1e-6 || Math.abs(cur.lng - ll.lng) > 1e-6) {
        marker.current.setLatLng(ll);
        circle.current.setLatLng(ll);
        map.current.panTo(ll);
      }
    }
    circle.current.setRadius(Number(radius) || 100);
    fitCircle(added);
    // eslint-disable-next-line
  }, [latitude, longitude, radius]);

  // ---------- search (Nominatim) ----------
  useEffect(() => {
    if (!touched.current) return;
    const text = q.trim();
    if (text.length < 3) {
      setResults([]);
      setMsg("");
      setBusy(false);
      return;
    }

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setBusy(true);
        setMsg("");
        let data = [];
        let used = text;
        const tries = variants(text);

        for (let i = 0; i < tries.length; i++) {
          if (i > 0) await sleep(1100); // Nominatim: max ~1 request/second
          if (ctrl.signal.aborted) return;
          const url =
            `${NOM}/search?format=json&limit=5&countrycodes=ph` +
            `&viewbox=120.7,13.6,121.6,12.2&q=${encodeURIComponent(tries[i])}`;
          const res = await fetch(url, { signal: ctrl.signal });
          if (!res.ok) throw new Error("http " + res.status);
          const json = await res.json();
          data = Array.isArray(json) ? json : [];
          if (data.length) {
            used = tries[i];
            break;
          }
        }

        if (ctrl.signal.aborted) return;
        setResults(data);
        if (!data.length) {
          setMsg("Walang nahanap. I-click na lang ang mapa o i-drag ang pin sa exact spot.");
        } else if (used !== text) {
          setMsg(`Walang exact match. Results para sa "${used}".`);
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          setResults([]);
          setMsg("Hindi ma-reach ang search. I-click na lang ang mapa.");
        }
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 700); // debounce

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const pick = (p) => {
    touched.current = false; // don't search again for the picked name
    moveId.current++; // cancel any pending reverse lookup
    const ll = L.latLng(Number(p.lat), Number(p.lon));
    ensureLayers();
    marker.current.setLatLng(ll);
    circle.current.setLatLng(ll);
    map.current.setView(ll, 17);
    fitCircle(true);
    emit(ll.lat, ll.lng, p.display_name);
    setQ(p.display_name);
    setResults([]);
    setMsg("");
  };

  const clearSearch = () => {
    touched.current = false;
    setQ("");
    setResults([]);
    setMsg("");
  };

  const showPop = results.length > 0 || (msg && !busy);

  return (
    <div className="gf-map">
      <div ref={mapEl} className="gf-map-canvas" />

      <div className="gf-map-top">
        <div className="gf-search-wrap">
          <div className="gf-search">
            <Search size={16} aria-hidden="true" />
            <input
              value={q}
              placeholder="Search place, e.g. Lalud, Calapan"
              aria-label="Search place"
              autoComplete="off"
              onChange={(e) => {
                touched.current = true;
                setResults([]); // clear stale suggestions
                setQ(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault(); // don't submit the form
                if (e.key === "Escape") setResults([]);
              }}
              onBlur={() => setResults([])}
            />
            {busy ? (
              <span className="gf-spin" role="status" aria-label="Searching" />
            ) : (
              q && (
                <button type="button" className="gf-icon-btn" aria-label="Clear search" onClick={clearSearch}>
                  <X size={14} aria-hidden="true" />
                </button>
              )
            )}
          </div>

          {showPop && (
            <div className="gf-pop">
              {msg && !busy && <p className="gf-pop-msg">{msg}</p>}
              {results.length > 0 && (
                <ul role="listbox">
                  {results.map((p) => (
                    <li
                      key={p.place_id}
                      role="option"
                      aria-selected="false"
                      // mousedown (not click) so it fires before the input's blur closes the list
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        pick(p);
                      }}
                    >
                      {p.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {onLocate && (
          <button
            type="button"
            className={`gf-locate${locating ? " busy" : ""}`}
            onClick={onLocate}
            disabled={locating}
            title="Use my location"
            aria-label="Use my location"
          >
            <LocateFixed size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="gf-map-hint">
        {hasPoint ? "Drag the pin to fine-tune" : "Click the map or search to place the pin"}
      </div>
    </div>
  );
}