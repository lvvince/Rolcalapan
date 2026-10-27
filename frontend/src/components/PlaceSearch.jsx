// frontend/src/components/PlaceSearch.jsx
import { useEffect, useRef, useState } from "react";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const firstLast =
    parts.length > 1 ? `${parts[0]}, ${parts[parts.length - 1]}` : "";

  const list = [full, noAdmin, noRoad, firstLast, parts[0]];
  return [...new Set(list.filter((s) => s && s.length >= 3))].slice(0, 4);
}

/**
 * Location input with place suggestions (OpenStreetMap Nominatim).
 * - value / onChange : the location text
 * - onPick({ latitude, longitude, name }) : called when the user picks a suggestion
 */
export default function PlaceSearch({ value, onChange, onPick, placeholder }) {
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [note, setNote] = useState("");
  const touched = useRef(false);

  useEffect(() => {
    if (!touched.current) return;
    const q = (value || "").trim();
    if (q.length < 3) {
      setResults([]);
      setEmpty(false);
      setNote("");
      setBusy(false);
      return;
    }

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setBusy(true);
        setEmpty(false);
        setNote("");
        let data = [];
        let used = q;
        const tries = variants(q);

        for (let i = 0; i < tries.length; i++) {
          if (i > 0) await sleep(1100); // Nominatim: max ~1 request/second
          if (ctrl.signal.aborted) return;
          const url =
            "https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ph" +
            "&viewbox=120.7,13.6,121.6,12.2&q=" +
            encodeURIComponent(tries[i]);
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
        setEmpty(data.length === 0);
        if (data.length && used !== q) {
          setNote(`Walang exact match. Results para sa "${used}".`);
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          setResults([]);
          setEmpty(false);
          setNote(
            "Hindi ma-reach ang search service. Subukan ulit, o ilagay manually ang latitude/longitude."
          );
        }
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 600); // debounce

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  const pick = (p) => {
    touched.current = false; // don't search again for the picked name
    onChange(p.display_name);
    onPick({
      latitude: Number(p.lat).toFixed(7),
      longitude: Number(p.lon).toFixed(7),
      name: p.display_name,
    });
    setResults([]);
    setEmpty(false);
    setNote("");
  };

  const hint = { display: "block", marginTop: 4, fontSize: 12, opacity: 0.8 };

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value ?? ""}
        placeholder={placeholder || "Type a place, e.g. Lalud, Calapan"}
        autoComplete="off"
        onChange={(e) => {
          touched.current = true;
          setResults([]); // clear stale suggestions
          onChange(e.target.value);
        }}
      />
      {busy && <small style={hint}>Searching...</small>}
      {note && !busy && <small style={hint}>{note}</small>}
      {empty && !busy && (
        <small style={hint}>
          No match found. Try a shorter name (e.g. "Calapan" or "Lalud, Calapan"), or enter the
          latitude and longitude manually (right-click the spot in Google Maps to copy them).
        </small>
      )}
      {results.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 20,
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
  );
}