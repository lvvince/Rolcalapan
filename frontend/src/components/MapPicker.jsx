// frontend/src/components/MapPicker.jsx
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CALAPAN = [13.4117, 121.1803];
const NOM = "https://nominatim.openstreetmap.org";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/**
 * Props:
 * - latitude, longitude : current values (string or number)
 * - radius              : geofence radius in meters (default 100)
 * - onPick({ latitude, longitude, name })
 *      Pin click/drag first sends name "" then sends the address once it is found.
 */
export default function MapPicker({ latitude, longitude, radius = 100, onPick }) {
  const mapEl = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const circle = useRef(null);
  const onPickRef = useRef(onPick);
  const radiusRef = useRef(radius);
  const touched = useRef(false);
  const moveId = useRef(0);

  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  onPickRef.current = onPick;
  radiusRef.current = radius;

  const emit = (lat, lng, name = "") =>
    onPickRef.current?.({
      latitude: Number(lat).toFixed(7),
      longitude: Number(lng).toFixed(7),
      name,
    });

  // ---------- init map (once) ----------
  useEffect(() => {
    const startLL =
      validNum(latitude) && validNum(longitude)
        ? [parseFloat(latitude), parseFloat(longitude)]
        : CALAPAN;

    const m = L.map(mapEl.current).setView(startLL, 16);
    map.current = m;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(m);

    const mk = L.marker(startLL, { draggable: true, icon: pinIcon }).addTo(m);
    const ci = L.circle(startLL, {
      radius: Number(radiusRef.current) || 100,
      color: "#0e7490",
      fillColor: "#0e7490",
      fillOpacity: 0.18,
    }).addTo(m);
    marker.current = mk;
    circle.current = ci;

    const move = (ll) => {
      mk.setLatLng(ll);
      ci.setLatLng(ll);
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
    const t = setTimeout(() => m.invalidateSize(), 200);

    return () => {
      clearTimeout(t);
      ro.disconnect();
      m.remove();
      map.current = null;
      marker.current = null;
      circle.current = null;
    };
    // eslint-disable-next-line
  }, []);

  // ---------- sync from outside (Use my location, manual lat/lng, radius) ----------
  useEffect(() => {
    if (!map.current) return;
    if (validNum(latitude) && validNum(longitude)) {
      const ll = L.latLng(parseFloat(latitude), parseFloat(longitude));
      const cur = marker.current.getLatLng();
      if (Math.abs(cur.lat - ll.lat) > 1e-9 || Math.abs(cur.lng - ll.lng) > 1e-9) {
        marker.current.setLatLng(ll);
        circle.current.setLatLng(ll);
        map.current.panTo(ll);
      }
    }
    circle.current.setRadius(Number(radius) || 100);
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
    marker.current.setLatLng(ll);
    circle.current.setLatLng(ll);
    map.current.setView(ll, 17);
    emit(ll.lat, ll.lng, p.display_name);
    setQ(p.display_name);
    setResults([]);
    setMsg("");
  };

  const hint = { display: "block", marginTop: 4, fontSize: 12, opacity: 0.8 };

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 8 }}>
        <input
          value={q}
          placeholder="Search place, e.g. Lalud, Calapan"
          autoComplete="off"
          style={{ width: "100%", boxSizing: "border-box" }}
          onChange={(e) => {
            touched.current = true;
            setResults([]); // clear stale suggestions
            setQ(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault(); // don't submit the form
            if (e.key === "Escape") setResults([]);
          }}
        />
        {busy && <small style={hint}>Searching...</small>}
        {msg && !busy && <small style={hint}>{msg}</small>}
        {results.length > 0 && (
          <ul
            role="listbox"
            style={{
              position: "absolute",
              zIndex: 1000,
              left: 0,
              right: 0,
              margin: "4px 0 0",
              padding: 0,
              listStyle: "none",
              background: "var(--card, #fff)",
              color: "inherit",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              maxHeight: 220,
              overflowY: "auto",
              boxShadow: "0 6px 18px rgba(0,0,0,.12)",
            }}
          >
            {results.map((p) => (
              <li
                key={p.place_id}
                role="option"
                onClick={() => pick(p)}
                style={{ padding: "8px 12px", cursor: "pointer", fontSize: 14 }}
              >
                {p.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        ref={mapEl}
        style={{
          width: "100%",
          height: 340,
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          position: "relative",
          zIndex: 0,
        }}
      />
      <small style={hint}>I-click ang mapa o i-drag ang pin para ilagay ang exact spot.</small>
    </div>
  );
}