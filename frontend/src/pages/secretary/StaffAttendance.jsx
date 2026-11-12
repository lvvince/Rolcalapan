// frontend/src/pages/secretary/StaffAttendance.jsx
import { useEffect, useState } from "react";
import {
  UsersRound,
  ClipboardCheck,
  ScanLine,
  X,
  LogIn,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import api from "../../api";
import DataPage from "../../components/DataPage";
import QrCameraScanner from "../../components/QrCameraScanner";
import { useLang } from "../../i18n/LanguageContext";
import "../../components/portal.css";
import "./StaffPages.css";
import "./Geofence.css"; // para sa .gf-link

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

// Toast-like: success nawawala agad, error mas matagal
function useAutoDismiss(msg, setMsg) {
  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(null), msg.ok ? 4000 : 8000);
    return () => clearTimeout(timer);
  }, [msg, setMsg]);
}

const todayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

/* ------------------------------------------------ QR / Code check-in */
function CodeCheckin({ eventId, onDone }) {
  const { t } = useLang();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState(null);
  const [camera, setCamera] = useState(false);

  useAutoDismiss(msg, setMsg);

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
          <input
            id="ci-code"
            autoFocus
            placeholder="ROL-XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
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

/* ------------------------------------------------ Manual entry (multiple) */
// Search -> piliin -> ilista -> confirm -> save lahat
function ManualAttendance({ eventId, eventLabel, date, refreshKey, onDone }) {
  const { t } = useLang();
  const [members, setMembers] = useState([]);
  const [recorded, setRecorded] = useState(new Set());
  const [picked, setPicked] = useState([]); // array ng member objects (ayon sa pagkakapili)
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState(null);

  useAutoDismiss(msg, setMsg);

  useEffect(() => {
    api.get("/resource", { params: { name: "members" } }).then((r) => setMembers(r.data || []));
  }, []);

  // Sino ang naka-record na sa napiling event + date (nagre-reload din after save)
  useEffect(() => {
    let cancelled = false;
    api.get("/resource", { params: { name: "attendance" } }).then((r) => {
      if (cancelled) return;
      const ids = (r.data || [])
        .filter(
          (a) =>
            Number(a.event_id || 0) === Number(eventId) &&
            String(a.service_date).slice(0, 10) === date
        )
        .map((a) => String(a.member_id));
      setRecorded(new Set(ids));
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, date, refreshKey]);

  // Reset LANG kapag nagpalit ng event o date (hindi kapag nag-refresh pagkatapos mag-save,
  // para manatili ang mga nag-fail at ma-retry)
  useEffect(() => {
    setPicked([]);
    setConfirming(false);
    setMsg(null);
    setQ("");
  }, [eventId, date]);

  const pickedIds = new Set(picked.map((m) => String(m.id)));
  const needle = q.trim().toLowerCase();

  // Suggestions: hindi pa naka-record, hindi pa napili, tugma sa search (max 8)
  const suggestions = members
    .filter((m) => !recorded.has(String(m.id)) && !pickedIds.has(String(m.id)))
    .filter(
      (m) =>
        !needle ||
        [m.full_name, m.family_name, m.member_code].some((v) =>
          String(v ?? "").toLowerCase().includes(needle)
        )
    )
    .slice(0, 8);

  const add = (m) => {
    setPicked((list) => [...list, m]);
    setQ("");
    setOpen(true);
    setConfirming(false);
  };

  const remove = (id) => {
    setPicked((list) => list.filter((m) => String(m.id) !== String(id)));
    setConfirming(false);
  };

  const clearAll = () => {
    setPicked([]);
    setConfirming(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[0]) add(suggestions[0]);
    }
    if (e.key === "Escape") setOpen(false);
  };

  const save = async () => {
    if (picked.length === 0 || busy) return;
    setConfirming(false);
    setBusy(true);
    setMsg(null);

    const batch = picked; // snapshot, para tugma ang index ng results
    const results = await Promise.allSettled(
      batch.map((m) =>
        api.post("/resource/save", {
          name: "attendance",
          member_id: Number(m.id),
          service_date: date,
          event_id: Number(eventId),
        })
      )
    );

    // Mga nag-fail lang ang matitira sa "Selected" para ma-retry
    const failed = batch.filter((_, i) => results[i].status === "rejected");
    const ok = batch.length - failed.length;
    setPicked(failed);

    if (failed.length === 0) {
      setMsg({ ok: true, text: `${ok} ${t("attendance saved")}` });
    } else {
      const firstErr = results.find((r) => r.status === "rejected")?.reason;
      const reason = firstErr?.response?.data?.error;
      setMsg({
        ok: false,
        text: `${ok} ${t("saved")}, ${failed.length} ${t("failed")}${reason ? ` (${t(reason)})` : ""}`,
      });
    }

    setBusy(false);
    onDone(); // nire-reload ang "recorded"; hindi na nito binubura ang picked
  };

  return (
    <div className="sp-card">
      <div className="sp-card-head">
        <span className="sp-tile"><UsersRound size={20} aria-hidden="true" /></span>
        <div>
          <h4>{t("Manual entry (multiple)")}</h4>
          <p>{t("Search a member, click to add, then save all at once.")}</p>
        </div>
      </div>

      {/* Search + suggestions */}
      <div className="ma-search">
        <div className="sp-field">
          <label htmlFor="ma-search">{t("Search member")}</label>
          <input
            id="ma-search"
            autoComplete="off"
            value={q}
            placeholder={t("Name, family, or code")}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
          />
        </div>

        {open && (
          <ul className="ma-suggest" role="listbox">
            {suggestions.length === 0 ? (
              <li className="ma-suggest-empty">{t("No matching members")}</li>
            ) : (
              suggestions.map((m) => (
                <li key={m.id} role="option">
                  {/* onMouseDown para hindi mawala ang focus ng input bago mag-click */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      add(m);
                    }}
                  >
                    <span className="ma-name">{m.full_name}</span>
                    <small>{m.member_code}</small>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Selected */}
      <div className="ma-selected">
        <div className="ma-selected-head">
          <strong>{t("Selected")} ({picked.length})</strong>
          <button
            type="button"
            className="gf-link"
            disabled={picked.length === 0 || busy}
            onClick={clearAll}
          >
            {t("Clear")}
          </button>
        </div>

        {picked.length === 0 ? (
          <div className="ma-empty">
            <UsersRound size={24} aria-hidden="true" />
            <span>{t("No members selected yet")}</span>
          </div>
        ) : (
          <ul className="ma-picked">
            {picked.map((m) => (
              <li key={m.id}>
                <span className="ma-name">{m.full_name}</span>
                <small>{m.member_code}</small>
                <button
                  type="button"
                  className="ma-x"
                  disabled={busy}
                  aria-label={`${t("Remove")} ${m.full_name}`}
                  onClick={() => remove(m.id)}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer: Save o Are you sure? */}
      {confirming ? (
        <div className="ma-confirm" role="alertdialog" aria-live="polite">
          <p>
            <strong>{t("Are you sure?")}</strong>{" "}
            {t("Mark {count} member(s) as present for {event} ({date})? This cannot be edited after saving.", {
              count: picked.length,
              event: eventLabel || t("this event"),
              date,
            })}
          </p>
          <div className="sp-actions">
            <button className="sp-btn" type="button" onClick={() => setConfirming(false)}>
              {t("Cancel")}
            </button>
            <button className="sp-btn primary" type="button" disabled={busy} onClick={save}>
              <Save size={16} aria-hidden="true" /> {t("Yes, save attendance")}
            </button>
          </div>
        </div>
      ) : (
        <div className="ma-foot">
          <span className="sp-muted">{recorded.size} {t("already recorded for this event")}</span>
          <button
            className="sp-btn primary"
            type="button"
            disabled={busy || picked.length === 0 || !date}
            onClick={() => setConfirming(true)}
          >
            <Save size={16} aria-hidden="true" />{" "}
            {busy ? t("Saving...") : `${t("Save attendance")} (${picked.length})`}
          </button>
        </div>
      )}

      <Notice msg={msg} />
    </div>
  );
}

/* ------------------------------------------------------------ Page */
export function StaffAttendance({ canDelete = false }) {
  const { t } = useLang();
  const [k, setK] = useState(0);
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(0); // 0 = Sunday Service
  const [date, setDate] = useState(todayStr());

  useEffect(() => {
    api.get("/resource", { params: { name: "events" } }).then((r) => setEvents(r.data || []));
  }, []);

  // Kapag nagpalit ng event, ilagay ang date ng event (kung meron)
  const pickEvent = (id) => {
    setEventId(id);
    const ev = events.find((e) => String(e.id) === String(id));
    const m = String(ev?.event_date || "").match(/^\d{4}-\d{2}-\d{2}/);
    setDate(m ? m[0] : todayStr());
  };

  const eventLabel =
    Number(eventId) === 0
      ? t("Sunday Service")
      : events.find((e) => String(e.id) === String(eventId))?.title || "";

  const refresh = () => setK((x) => x + 1);

  return (
    <>
      <PageHeader
        icon={ClipboardCheck}
        title={t("Attendance")}
        subtitle={t("Choose an event first, then record attendance.")}
      />

      {/* 1. Piliin muna ang event */}
      <div className="sp-card">
        <div className="sp-row">
          <div className="sp-field grow">
            <label htmlFor="att-event">{t("Event")}</label>
            <select id="att-event" value={eventId} onChange={(e) => pickEvent(e.target.value)}>
              <option value={0}>{t("Sunday Service")}</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title} ({ev.event_date})</option>
              ))}
            </select>
          </div>
          <div className="sp-field">
            <label htmlFor="att-date">{t("Date")}</label>
            <input id="att-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* 2. QR / code check-in para sa napiling event */}
      <CodeCheckin eventId={eventId} onDone={refresh} />

      {/* 3. Manual entry: search, multiple, may confirmation */}
      <ManualAttendance
        eventId={eventId}
        eventLabel={eventLabel}
        date={date}
        refreshKey={k}
        onDone={refresh}
      />

      {/* 4. Records ng napiling event */}
      <DataPage
        title={t("Attendance Records")}
        resource="attendance"
        canCreate={false}
        canEdit={false}
        canDelete={canDelete}
        refreshKey={k}
        filter={(r) => r.event_id === undefined || Number(r.event_id || 0) === Number(eventId)}
        columns={[
          { key: "service_date", label: t("Date") },
          { key: "member_name", label: t("Member") },
          { label: t("Event"), render: (r) => r.event_title || t("Sunday Service") },
          { label: t("Method"), render: (r) => <span className="badge">{t(r.method)}</span> },
        ]}
        fields={[]}
      />
    </>
  );
}