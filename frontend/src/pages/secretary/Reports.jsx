// frontend/src/pages/secretary/Reports.jsx
// Ginagamit ng /admin/reports at /staff/reports (re-export sa StaffDashboard.jsx)
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BarChart3,
  Printer,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import api from "../../api";
import { useLang } from "../../i18n/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import SecretaryPredictiveReport from "./SecretaryPredictiveReport";
import { exportCsv, exportPdf } from "./reportExport";
import { buildPrediction } from "../../lib/predictive";
import "../../components/portal.css";
import "./StaffPages.css";
import "./Reports.css";

const CHURCH = "River of Life Calapan";
const LOGO_SRC = "/logo.png";

const money = (n) => Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });
const statusBadge = (s, t) => <span className={`badge ${s === "active" ? "ok" : "warn"}`}>{t(s)}</span>;
const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

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
    if (slots.length > MAX_SLOTS) slots.splice(0, slots.length - MAX_SLOTS);
  } else {
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

/* ---- tabs ---- */
const TABS = [
  { key: "summary", label: "Summary" },
  { key: "att", label: "Attendance" },
  { key: "giv", label: "Giving" },
  { key: "members", label: "Members" },
  { key: "pred", label: "Predictive" },
];

const FILE_NAMES = {
  summary: "summary",
  att: "attendance",
  giv: "giving",
  members: "members",
  pred: "predictive",
};

const SUMMARY_SECTIONS = [
  { key: "att", label: "Attendance" },
  { key: "giv", label: "Giving" },
  { key: "type", label: "Giving by type" },
  { key: "method", label: "Attendance by method" },
  { key: "min", label: "Ministry sizes" },
];
const SUMMARY_DEFAULT = ["att", "giv", "min"];

const GIVING_TYPES = ["tithe", "offering", "mission", "building fund", "other"];

const RISK_LABEL = { high: "High risk", medium: "Medium risk", low: "Low risk" };

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

// Group by + From/To + quick range (may maliit na label sa taas ng bawat grupo)
function DateFilters({ t, period, setPeriod, from, setFrom, to, setTo }) {
  const activeRange = RANGES.find((r) => {
    const [a, b] = r.get();
    return a === from && b === to;
  })?.key;

  return (
    <>
      <div className="rp-group">
        <span className="rp-cap">{t("Group by")}</span>
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

      <div className="rp-group">
        <span className="rp-cap">{t("Quick range")}</span>
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
      </div>
    </>
  );
}

// Download CSV / Download PDF / Print
function ExportBar({ t, disabled, busy, onPdf, onCsv, showFiles = true }) {
  return (
    <div className="rp-group rp-actions">
      <span className="rp-cap">{t("Export")}</span>
      <div className="rp-actions-row">
        {showFiles && (
          <>
            <button type="button" className="rp-act" disabled={disabled || busy} onClick={onCsv}>
              <FileSpreadsheet size={16} aria-hidden="true" /> {t("Download CSV")}
            </button>
            <button type="button" className="rp-act" disabled={disabled || busy} onClick={onPdf}>
              <FileText size={16} aria-hidden="true" /> {busy ? t("Preparing...") : t("Download PDF")}
            </button>
          </>
        )}
        <button type="button" className="rp-act primary" disabled={disabled} onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> {t("Print report")}
        </button>
      </div>
    </div>
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

// Mga linya ng pirma (lumalabas sa screen, print, at PDF)
function SignatureBlock({ t, items }) {
  return (
    <div className="rp-sign" role="group" aria-label={t("Signatures")}>
      {items.map((s) => (
        <div className="rp-sign-slot" key={s.label}>
          <span className="rp-sign-cap">{s.label}</span>
          <div className="rp-sign-line" />
          <strong className="rp-sign-name">{s.name || "\u00a0"}</strong>
          <span className="rp-sign-role">{s.role || "\u00a0"}</span>
          <span className="rp-sign-date">{t("Date")}: ____________________</span>
        </div>
      ))}
    </div>
  );
}

// Pili: isama ang pirma, at sino ang pipirma
function SignatureOptions({ t, sign, setSign, preparedName }) {
  const upd = (k, v) => setSign({ ...sign, [k]: v });
  return (
    <div className="rp-signopts no-print">
      <label className="rp-check">
        <input type="checkbox" checked={sign.on} onChange={(e) => upd("on", e.target.checked)} />
        <span>{t("Add signature lines")}</span>
      </label>
      {sign.on && (
        <div className="rp-signgrid">
          <p className="rp-signnote">
            {t("Prepared by")}: <strong>{preparedName || "—"}</strong>
            <small>{t("Automatically uses the logged-in user.")}</small>
          </p>
          <div className="sp-field">
            <label htmlFor="rp-note">{t("Noted by")}</label>
            <input id="rp-note" value={sign.notedBy} placeholder={t("Name")} onChange={(e) => upd("notedBy", e.target.value)} />
          </div>
          <div className="sp-field">
            <label htmlFor="rp-note-role">{t("Position")}</label>
            <input id="rp-note-role" value={sign.notedRole} placeholder={t("e.g. Pastor")} onChange={(e) => upd("notedRole", e.target.value)} />
          </div>
        </div>
      )}
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
  const { user } = useAuth();
  const [me, setMe] = useState(null);

  // Kung sino ang naka-login, siya ang "Prepared by"
  useEffect(() => {
    api
      .get("/auth/me")
      .then((r) => setMe(r.data?.user || null))
      .catch(() => {});
  }, []);
  const [d, setD] = useState(null);
  const [att, setAtt] = useState([]);
  const [giv, setGiv] = useState([]);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState("");

  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab = TABS.some((x) => x.key === tabParam) ? tabParam : "summary";
  const setTab = (k) => setParams({ tab: k }, { replace: true });

  const [periodRaw, setPeriod] = usePersisted("rp-period", "week");
  const period = PERIODS.some((p) => p.key === periodRaw) ? periodRaw : "week";
  const [gTypeRaw, setGType] = usePersisted("rp-gtype", "all");
  const gType = ["all", ...GIVING_TYPES].includes(gTypeRaw) ? gTypeRaw : "all";
  const [mStatusRaw, setMStatus] = usePersisted("rp-mstatus", "all");
  const mStatus = ["all", "active", "inactive"].includes(mStatusRaw) ? mStatusRaw : "all";
  const [sumRaw, setSumSel] = usePersisted("rp-summary", {});
  const sumSel = Object.fromEntries(
    SUMMARY_SECTIONS.map((x) => [
      x.key,
      typeof sumRaw?.[x.key] === "boolean" ? sumRaw[x.key] : SUMMARY_DEFAULT.includes(x.key),
    ])
  );

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mQuery, setMQuery] = useState("");

  // Pirma: naaalala ang pinili at mga pangalan
  const [signRaw, setSign] = usePersisted("rp-sign", {});
  const str = (v, dflt) => (typeof v === "string" ? v : dflt);
  const sign = {
    on: signRaw?.on !== false,
    notedBy: str(signRaw?.notedBy, "Alvin Jester Culla"),
    notedRole: str(signRaw?.notedRole, "Pastor"),
  };

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
  const reportTitle = `${t("Church Report")} – ${tabLabel}`;

  // Prepared by = laging ang naka-login na nag-download/nag-print
  const preparedName = me?.name || me?.full_name || user?.name || user?.full_name || "";
  const roleKey = me?.role || user?.role;
  const roleLabels = { admin: "Admin / Pastor", staff: "Church Secretary", ministry_leader: "Ministry Leader" };
  const preparedRole = roleLabels[roleKey] ? t(roleLabels[roleKey]) : "";
  const signatures = sign.on
    ? [
        { label: t("Prepared by"), name: preparedName, role: preparedRole },
        { label: t("Noted by"), name: sign.notedBy.trim(), role: sign.notedRole.trim() },
      ]
    : [];

  /* ---------- Para sa PDF / CSV ---------- */
  const chart = (heading, headLabel, data, opts = {}) => ({
    heading,
    head: [headLabel, opts.money ? `${t("Amount")} (PHP)` : opts.valueLabel || t("Count")],
    rows: data.map((x) => [opts.translate ? t(x.label) : x.label, x.value]),
    values: data.map((x) => x.value),
    bars: true,
    moneyCols: opts.money ? [1] : [],
  });

  const getModel = () => {
    const lines = [];
    if (usesDates) {
      lines.push(`${t("Period")}: ${rangeText}`, `${t("Group by")}: ${periodName}`);
      if (tab === "giv" && gType !== "all") lines.push(`${t("Type")}: ${t(gType)}`);
    }
    if (tab === "members") {
      lines.push(`${t("Status")}: ${mStatus === "all" ? t("All") : t(mStatus)}`);
      if (q) lines.push(`${t("Search")}: "${mQuery.trim()}"`);
    }

    const attSec = chart(`${t("Attendance per")} ${periodName}`, t("Period"), attData);
    const givSec = (data) => chart(`${t("Giving per")} ${periodName} (PHP)`, t("Period"), data, { money: true });
    const typeSec = chart(t("Giving by type (PHP)"), t("Type"), givByType, { money: true, translate: true });
    const methodSec = chart(t("Attendance by method"), t("Method"), attByMethod, { translate: true });
    const minSec = chart(t("Ministry sizes"), t("Ministry"), d.ministry_sizes || [], { valueLabel: t("Members") });

    let stats = [];
    let sections = [];

    if (tab === "summary") {
      stats = [
        [t("Total members"), d.members_total],
        [t("Active members"), d.members_active],
      ];
      if (sumSel.att) sections.push(attSec);
      if (sumSel.giv) sections.push(givSec(givAll));
      if (sumSel.type) sections.push(typeSec);
      if (sumSel.method) sections.push(methodSec);
      if (sumSel.min) sections.push(minSec);
    } else if (tab === "att") {
      stats = [
        [t("Attendance records"), attCount],
        [t("Active members"), d.members_active],
      ];
      sections = [attSec, methodSec];
    } else if (tab === "giv") {
      stats = [
        [`${t("Total given")} (PHP)`, money(givTotal)],
        [t("Records"), givInRange.length],
      ];
      sections = [givSec(givTyped)];
      if (gType === "all") sections.push(typeSec);
    } else if (tab === "members") {
      stats = [
        [t("Shown"), shownMembers.length],
        [t("Total members"), d.members_total],
        [t("Active members"), d.members_active],
      ];
      sections = [
        {
          heading: `${t("Members list")} (${shownMembers.length})`,
          head: [t("Code"), t("Name"), t("Family"), t("Phone"), t("Status")],
          rows: shownMembers.map((m) => [
            m.member_code ?? "",
            m.full_name ?? "",
            m.family_name ?? "",
            m.phone ?? "",
            t(m.status || ""),
          ]),
        },
        minSec,
      ];
    }

    if (tab === "pred") {
      const p = buildPrediction(att, members);
      const totalPeople = p.members.length;
      const rate = totalPeople ? Math.round((p.predicted / totalPeople) * 100) : 0;
      const follow = p.members.filter((m) => m.risk !== "low");

      lines.push(
        p.weeks === 1 ? t("Based on the last service.") : t("Based on the last {n} services.", { n: p.weeks })
      );
      stats = [
        [t("Predicted turnout (next service)"), p.predicted],
        [t("Expected attendance rate"), `${rate}%`],
        [t("High risk"), p.counts.high],
        [t("Medium risk"), p.counts.medium],
      ];
      sections = [
        chart(t("Attendance per service"), t("Service"), p.trend),
        chart(
          t("Members by risk level"),
          t("Risk"),
          ["high", "medium", "low"].map((k) => ({ label: t(RISK_LABEL[k]), value: p.counts[k] }))
        ),
        {
          heading: `${t("Members to follow up")} (${follow.length})`,
          head: [
            t("Member"),
            t("Code"),
            t("Phone"),
            t("Attended"),
            t("Missed in a row"),
            t("Chance to attend"),
            t("Risk"),
          ],
          rows: follow.map((m) => [
            m.full_name ?? "",
            m.member_code ?? "",
            m.phone ?? "",
            `${m.attended}/${m.total}`,
            m.streak,
            `${Math.round(m.prob * 100)}%`,
            t(RISK_LABEL[m.risk]),
          ]),
        },
      ];
    }

    return { title: reportTitle, lines, stats, sections, signatures };
  };

  const fileBase = `river-of-life-${FILE_NAMES[tab]}-report-${ymd(new Date())}`;

  const doCsv = () => {
    setExportErr("");
    try {
      exportCsv(getModel(), `${fileBase}.csv`);
    } catch (e) {
      console.error("CSV export failed:", e);
      setExportErr(t("Could not create the CSV file."));
    }
  };

  const doPdf = async () => {
    setExportErr("");
    setExporting(true);
    try {
      await exportPdf(getModel(), `${fileBase}.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
      setExportErr(t("Could not create the PDF. Make sure jspdf and jspdf-autotable are installed."));
    } finally {
      setExporting(false);
    }
  };

  const exportProps = { t, busy: exporting, onPdf: doPdf, onCsv: doCsv };

  return (
    <div className="rp-page">
      <PageHeader icon={BarChart3} title={t("Reports")} subtitle={t("Choose a report, set the filters, then download or print.")} />

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

      <SignatureOptions t={t} sign={sign} setSign={setSign} preparedName={preparedName} />

      {/* Lumalabas lang sa print: logo, church, anong report at filter */}
      <div className="rp-print-head print-only">
        <img
          src={LOGO_SRC}
          alt=""
          className="rp-logo"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div>
          <h3>{CHURCH}</h3>
          <h4>{reportTitle}</h4>
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
      </div>

      <div id="rp-panel" role="tabpanel" aria-labelledby={`rp-tab-${tab}`}>
        {exportErr && <Notice msg={{ ok: false, text: exportErr }} />}
        {usesDates && badRange && <Notice msg={{ ok: false, text: t("The start date must be before the end date.") }} />}

        {/* ================= SUMMARY ================= */}
        {tab === "summary" && (
          <>
            <div className="rp-bar no-print">
              <DateFilters {...dateProps} />
              <ExportBar {...exportProps} disabled={sumCount === 0} />

              <div className="rp-sections">
                <span className="rp-cap">{t("Include")}</span>
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
              </div>
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
              <ExportBar {...exportProps} />
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
              <ExportBar {...exportProps} />
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
              <ExportBar {...exportProps} disabled={shownMembers.length === 0} />
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
                <div className="rp-table-wrap">
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
                </div>
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
              <ExportBar {...exportProps} />
            </div>
            <SecretaryPredictiveReport embedded />
          </>
        )}

        {sign.on && <SignatureBlock t={t} items={signatures} />}
      </div>
    </div>
  );
}