// frontend/src/components/DashKit.jsx
// Maliliit na reusable na piraso ng bagong dashboard (lahat ng portal): count-up, line chart, tabs, atbp.
// Walang dagdag na library: payak na SVG at CSS lang. Ang styles ay nasa ./portal-ui.css
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* ---------- Helpers ---------- */
export const greeting = () => {
  // Oras sa Pilipinas, kahit iba ang timezone ng device
  const h =
    Number(
      new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(new Date())
    ) % 24;
  if (h >= 5 && h < 11) return "Good morning";
  if (h >= 11 && h < 13) return "Good noon";
  if (h >= 13 && h < 18) return "Good afternoon";
  return "Good evening";
};

export const peso = (n) =>
  "₱" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pesoShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1e6) return "₱" + (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1e3) return "₱" + (v / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return "₱" + v.toLocaleString();
};

export const todayLabel = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" });

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------- Count-up (kusang humihinto kung reduced motion) ---------- */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString(), duration = 900 }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(reduced() ? target : 0);
  const from = useRef(0);

  useEffect(() => {
    if (reduced()) {
      setShown(target);
      return undefined;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      setShown(a + (target - a) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return <>{format(shown)}</>;
}

/* ---------- Section heading ---------- */
export function Head({ title, hint, to, toLabel, children }) {
  return (
    <div className="pd-head">
      <h3>{title}</h3>
      {hint && <span className="pd-hint">{hint}</span>}
      {children}
      {to && (
        <Link to={to} className="pd-more">
          {toLabel}
        </Link>
      )}
    </div>
  );
}

/* ---------- Segmented tabs na may sliding na indicator ---------- */
export function Tabs({ value, onChange, items, label }) {
  const ref = useRef(null);
  const [bar, setBar] = useState({ x: 0, w: 0 });

  useLayoutEffect(() => {
    const el = ref.current?.querySelector('[aria-selected="true"]');
    if (el) setBar({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value, items.length]);

  return (
    <div className="pd-tabs" role="tablist" aria-label={label} ref={ref}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          className={value === it.value ? "on" : ""}
          onClick={() => onChange(it.value)}
        >
          {it.label}
          {it.count != null && <em>{it.count}</em>}
        </button>
      ))}
      <i aria-hidden="true" style={{ transform: `translateX(${bar.x}px)`, width: bar.w }} />
    </div>
  );
}

/* ---------- Line chart (SVG, may hover/touch na tooltip tulad ng inspirasyon) ---------- */
const smooth = (pts) => {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const t = 0.18;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
};

export function LineChart({ data, unit = "", height = 260, emptyText = "No data yet" }) {
  const wrap = useRef(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    setW(el.clientWidth || 640);
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { l: 34, r: 16, t: 18, b: 30 };
  const geo = useMemo(() => {
    const max = Math.max(...data.map((d) => d.value), 1);
    const top = Math.ceil(max / 4) * 4 || 4; // maayos na itaas ng axis
    const iw = Math.max(w - pad.l - pad.r, 10);
    const ih = height - pad.t - pad.b;
    const pts = data.map((d, i) => [
      pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw),
      pad.t + ih - (d.value / top) * ih,
    ]);
    return { top, iw, ih, pts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, w, height]);

  if (!data.length) return <div className="pd-chart-empty" style={{ height }}>{emptyText}</div>;

  const { top, ih, pts } = geo;
  const line = smooth(pts);
  const area = `${line} L${pts[pts.length - 1][0]},${pad.t + ih} L${pts[0][0]},${pad.t + ih} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.ceil(data.length / Math.max(Math.floor(w / 70), 2));

  const move = (e) => {
    const r = wrap.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(p[0] - x) < Math.abs(pts[best][0] - x)) best = i;
    });
    setHover(best);
  };

  const h = hover != null ? { i: hover, p: pts[hover], d: data[hover] } : null;
  const last = pts.length - 1;
  const focus = h || { i: last, p: pts[last], d: data[last] };

  return (
    <div
      className="pd-chart"
      ref={wrap}
      style={{ height }}
      onPointerMove={move}
      onPointerDown={move}
      onPointerLeave={() => setHover(null)}
    >
      <svg width={w} height={height} role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id="pdFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity=".16" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => {
          const y = pad.t + ih - t * ih;
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} className="pd-grid" />
              <text x={pad.l - 10} y={y + 4} textAnchor="end" className="pd-axis">
                {Math.round(top * t)}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#pdFill)" className="pd-area" />
        <path d={line} className="pd-line" pathLength="1" />
        {data.map((d, i) =>
          (i % labelEvery === 0 && last - i >= labelEvery * 0.7) || i === last ? (
            <text key={i} x={pts[i][0]} y={height - 8} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} className="pd-axis">
              {d.label}
            </text>
          ) : null
        )}
        <g className={`pd-focus${h ? " is-live" : ""}`} style={{ transform: `translateX(${focus.p[0]}px)` }}>
          <line x1="0" x2="0" y1={pad.t} y2={pad.t + ih} />
        </g>
        <circle cx={focus.p[0]} cy={focus.p[1]} r="7" className="pd-dot-ring" />
        <circle cx={focus.p[0]} cy={focus.p[1]} r="3.5" className="pd-dot" />
      </svg>
      <div
        className={`pd-tip${h ? " is-live" : ""}`}
        style={{ left: Math.min(Math.max(focus.p[0], 56), w - 56), top: Math.max(focus.p[1] - 12, 6) }}
      >
        <span>{focus.d.label}</span>
        <strong>
          {focus.d.value.toLocaleString()}
          {unit && <small>{unit}</small>}
        </strong>
      </div>
    </div>
  );
}

/* ---------- Pahalang na bar list (hal. People by Role) ---------- */
export function BarList({ rows, total }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="pd-bars">
      {rows.map((r, i) => {
        const inner = (
          <>
            <span className="pd-bars-lbl">{r.label}</span>
            <span className="pd-bars-track">
              <i style={{ "--w": `${(r.value / max) * 100}%`, "--i": i }} />
            </span>
            <strong>{r.value}</strong>
            {total != null && <em>{total > 0 ? Math.round((r.value / total) * 100) : 0}%</em>}
          </>
        );
        return (
          <li key={r.key}>
            {r.to ? (
              <Link to={r.to} className="pd-bars-row">
                {inner}
              </Link>
            ) : (
              <div className="pd-bars-row">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Stat strip: numero, label, at optional na link ---------- */
export function StatStrip({ items }) {
  return (
    <div className="pd-stats" style={{ "--n": items.length }}>
      {items.map((s, i) => {
        const Icon = s.icon;
        const body = (
          <>
            <span className="pd-stat-ico">{Icon && <Icon size={18} strokeWidth={1.75} aria-hidden="true" />}</span>
            <span className="pd-stat-lbl">{s.label}</span>
            <strong className="pd-stat-val">
              {s.loading ? <span className="pd-skel" /> : <CountUp value={s.value} format={s.format} />}
            </strong>
            {s.note && <span className="pd-stat-note">{s.note}</span>}
          </>
        );
        return s.to ? (
          <Link key={s.label} to={s.to} className="pd-stat is-link" style={{ "--i": i }}>
            {body}
          </Link>
        ) : (
          <div key={s.label} className="pd-stat" style={{ "--i": i }}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Avatar na may fallback sa initials ---------- */
export function Avatar({ src, name = "", size = 40, className = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const ini =
    String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "?";
  return (
    <span className={`pd-avatar ${className}`} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {src && !failed ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : ini}
    </span>
  );
}
