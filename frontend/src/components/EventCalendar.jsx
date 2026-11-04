import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import api from "../api";
import { hm } from "./DataPage";
import { useLang } from "../i18n/LanguageContext";
import "./EventCalendar.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n) => String(n).padStart(2, "0");
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Araw ngayon sa oras ng Pilipinas (YYYY-MM-DD)
const manilaToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

const sortEvents = (a, b) =>
  (String(a.event_date).slice(0, 10) + (a.start_time || "")).localeCompare(
    String(b.event_date).slice(0, 10) + (b.start_time || "")
  );

// "9:00 AM-10:30 AM", or just "9:00 AM" kapag walang end time
const timeRange = (e) =>
  e.end_time ? `${hm(e.start_time)}-${hm(e.end_time)}` : hm(e.start_time);

export default function EventCalendar({ viewAllTo }) {
  const { t } = useLang();
  const [events, setEvents] = useState([]);
  const todayKey = manilaToday();
  const [view, setView] = useState(() => {
    const [y, m] = todayKey.split("-").map(Number);
    return { y, m: m - 1 };
  });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/resource", { params: { name: "events" } })
      .then((r) => {
        if (!cancelled) setEvents(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // { "YYYY-MM-DD": [events] }
  const byDate = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const k = String(e.event_date || "").slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(k)) (map[k] = map[k] || []).push(e);
    });
    return map;
  }, [events]);

  const firstDay = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const go = (delta) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(null);
  };

  const goToday = () => {
    const [y, m] = todayKey.split("-").map(Number);
    setView({ y, m: m - 1 });
    setSelected(null);
  };

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => String(e.event_date).slice(0, 10) >= todayKey)
        .sort(sortEvents)
        .slice(0, 5),
    [events, todayKey]
  );

  const list = selected ? [...(byDate[selected] || [])].sort(sortEvents) : upcoming;

  const selectedLabel = selected
    ? new Date(selected + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <section className="ec">
      {/* ---------- Kaliwa: calendar ---------- */}
      <div className="ec-cal">
        <div className="ec-top">
          <div>
            <span className="ec-label">{t("Event Calendar")}</span>
            <h3 className="ec-month">{t(MONTHS[view.m])} {view.y}</h3>
          </div>
          <div className="ec-nav">
            <button type="button" onClick={() => go(-1)} aria-label="Previous month">‹</button>
            <button type="button" onClick={goToday}>{t("Today")}</button>
            <button type="button" onClick={() => go(1)} aria-label="Next month">›</button>
          </div>
        </div>

        <div className="ec-grid">
          {DAYS.map((d) => (
            <div key={d} className="ec-dow">{t(d)}</div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const k = keyOf(view.y, view.m, day);
            const cls = [
              "ec-cell",
              byDate[k] ? "ec-has" : "",
              k === todayKey ? "ec-today" : "",
              k === selected ? "ec-sel" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div key={k} className="ec-cellwrap">
                <button
                  type="button"
                  className={cls}
                  onClick={() => setSelected(k === selected ? null : k)}
                  title={byDate[k] ? byDate[k].map((e) => e.title).join(", ") : ""}
                >
                  {day}
                </button>
              </div>
            );
          })}
        </div>

        <div className="ec-legend">
          <span><span className="ec-dot ec-has" />{t("Has event")}</span>
          <span><span className="ec-dot ec-today" />{t("Today")}</span>
        </div>
      </div>

      {/* ---------- Kanan: events ---------- */}
      <div className="ec-side">
        <div className="ec-side-head">
          <h4>{selected ? selectedLabel : t("Upcoming Events")}</h4>
          {viewAllTo && (
            <Link to={viewAllTo} className="ec-viewall">
              {t("View all")} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>

        {list.length === 0 ? (
          <div className="ec-empty">
            {selected ? t("No events.") : t("No upcoming events yet.")}
          </div>
        ) : (
          <div className="ec-events">
            {list.map((e) => {
              const d = new Date(String(e.event_date).slice(0, 10) + "T00:00:00");
              return (
                <div className="ec-ev" key={e.id}>
                  <div className="ec-badge">
                    <small>{d.toLocaleDateString("en-US", { month: "short" })}</small>
                    <strong>{d.getDate()}</strong>
                  </div>
                  <div className="ec-ev-body">
                    <h5>{t(e.title)}</h5>
                    <p className="ec-meta">
                      <span>
                        <Clock size={13} aria-hidden="true" />
                        {e.start_time ? timeRange(e) : t("All day")}
                      </span>
                      {e.location && (
                        <span>
                          <MapPin size={13} aria-hidden="true" /> {e.location}
                        </span>
                      )}
                    </p>
                  </div>
                  {e.event_type === "outside" && <span className="ec-tag">{t("Off-site")}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}