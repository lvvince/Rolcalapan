import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, Percent, Phone, Printer, TrendingUp, Users } from "lucide-react";
import api from "../../api";
import { useLang } from "../../i18n/LanguageContext";
import { buildPrediction } from "../../lib/predictive";
import "../../components/portal.css";
import "./StaffPages.css";
import "./PredictiveReport.css";

const RISK_LABEL = { high: "High risk", medium: "Medium risk", low: "Low risk" };

const initialsOf = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

export default function SecretaryPredictiveReport({ embedded = false }) {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("follow"); // follow = high + medium
  const [picked, setPicked] = useState(() => new Set()); // piniling member ids
  const [show, setShow] = useState({ stats: true, charts: true, list: true });

  useEffect(() => {
    Promise.all([
      api.get("/resource", { params: { name: "attendance" } }),
      api.get("/resource", { params: { name: "members" } }),
    ])
      .then(([a, m]) => setData(buildPrediction(a.data || [], m.data || [])))
      .catch((e) => setError(e.response?.data?.error || "Failed to load"));
  }, []);

  if (error) return <div className="sp-notice err">{t(error)}</div>;
  if (!data) return <p className="sp-muted">{t("Loading...")}</p>;

  const total = data.members.length;
  const rate = total ? Math.round((data.predicted / total) * 100) : 0;
  const followCount = data.counts.high + data.counts.medium;

  const shown = data.members.filter((m) =>
    filter === "follow" ? m.risk !== "low" : filter === "all" ? true : m.risk === filter
  );

  const shownPicked = shown.filter((m) => picked.has(m.id));
  const hasPick = shownPicked.length > 0;
  const allPicked = shown.length > 0 && shownPicked.length === shown.length;
  const printCount = hasPick ? shownPicked.length : shown.length;

  const max = Math.max(1, ...data.trend.map((d) => d.value));
  const riskTotal = Math.max(1, data.counts.high + data.counts.medium + data.counts.low);

  const stats = [
    { Icon: Users, tone: "primary", value: data.predicted, label: t("Predicted turnout (next service)") },
    { Icon: Percent, tone: "primary", value: `${rate}%`, label: t("Expected attendance rate") },
    { Icon: AlertCircle, tone: "high", value: data.counts.high, label: t("High risk") },
    { Icon: AlertCircle, tone: "medium", value: data.counts.medium, label: t("Medium risk") },
  ];

  const chips = [
    { key: "follow", label: t("Needs follow-up"), count: followCount },
    { key: "high", label: t("High risk only"), count: data.counts.high },
    { key: "medium", label: t("Medium risk only"), count: data.counts.medium },
    { key: "low", label: t("Low risk only"), count: data.counts.low },
    { key: "all", label: t("All active members"), count: total },
  ];

  const filterLabel = chips.find((c) => c.key === filter)?.label || "";

  const changeFilter = (key) => {
    setFilter(key);
    setPicked(new Set()); // reset ang pinili kapag nagpalit ng filter
  };

  const toggleOne = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(shown.map((m) => m.id)));

  const toggleSection = (k) => setShow((s) => ({ ...s, [k]: !s[k] }));

  const hide = (on) => (on ? "" : " pr-hide-print");

  return (
    <section className={`pr${embedded ? " pr-embedded" : ""}`}>
      {/* ---------- header ---------- */}
      <header className="pr-head">
        <span className="pr-head-icon"><TrendingUp size={22} aria-hidden="true" /></span>
        <div className="pr-head-text">
          <h3>{t("Predictive Attendance Report")}</h3>
          <p>
            {data.weeks === 1
              ? t("Based on the last service.")
              : t("Based on the last {n} services.", { n: data.weeks })}
          </p>
        </div>
        {!embedded && (
          <button className="sp-btn primary no-print" type="button" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" />{" "}
            {hasPick ? `${t("Print selected")} (${printCount})` : `${t("Print list")} (${printCount})`}
          </button>
        )}
      </header>

      {/* Lalabas lang sa papel */}
      <p className="pr-print-only">
        {t("Filter")}: {filterLabel}
        {hasPick ? ` · ${t("Selected")}: ${printCount}` : ""} · {t("Printed")}:{" "}
        {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      {/* ---------- print options ---------- */}
      {!embedded && (
        <div className="pr-options no-print" role="group" aria-label={t("Print options")}>
          <span className="pr-options-lbl">{t("Include in print")}:</span>
          <label><input type="checkbox" checked={show.stats} onChange={() => toggleSection("stats")} /> {t("Summary cards")}</label>
          <label><input type="checkbox" checked={show.charts} onChange={() => toggleSection("charts")} /> {t("Charts")}</label>
          <label><input type="checkbox" checked={show.list} onChange={() => toggleSection("list")} /> {t("Member list")}</label>
        </div>
      )}

      {data.weeks < 4 && (
        <p className="pr-note no-print">
          <Info size={16} aria-hidden="true" />
          <span>{t("Prediction gets more accurate as more services are recorded.")}</span>
        </p>
      )}

      {/* ---------- stat cards ---------- */}
      <div className={`pr-stats${hide(show.stats)}`}>
        {stats.map(({ Icon, tone, value, label }) => (
          <div className={`pr-stat ${tone}`} key={label}>
            <span className="pr-stat-icon"><Icon size={18} aria-hidden="true" /></span>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- charts ---------- */}
      <div className={`pr-charts${hide(show.charts)}`}>
        <div className="sp-card pr-card">
          <h4 className="sp-card-title">{t("Attendance per service")}</h4>
          <div className="pr-cols" role="img" aria-label={t("Attendance per service")}>
            {data.trend.map((d) => (
              <div className="pr-col" key={d.label}>
                <strong>{d.value}</strong>
                <div className="pr-col-track">
                  <i style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }} />
                </div>
                <span title={d.label}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sp-card pr-card">
          <h4 className="sp-card-title">{t("Members by risk level")}</h4>
          <div className="pr-stack" role="img" aria-label={t("Members by risk level")}>
            {["high", "medium", "low"].map(
              (k) =>
                data.counts[k] > 0 && (
                  <i key={k} className={k} style={{ width: `${(data.counts[k] / riskTotal) * 100}%` }} />
                )
            )}
          </div>
          <ul className="pr-legend">
            {["high", "medium", "low"].map((k) => (
              <li key={k}>
                <span className={`pr-dot ${k}`} aria-hidden="true" />
                <span className="pr-legend-lbl">{t(RISK_LABEL[k])}</span>
                <strong>{data.counts[k]}</strong>
                <small>{Math.round((data.counts[k] / riskTotal) * 100)}%</small>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---------- follow-up list ---------- */}
      <div className={`sp-card pr-card${hide(show.list)}`}>
        <div className="pr-list-head">
          <h4 className="sp-card-title">{t("Members to follow up")}</h4>
          <div className="pr-chips no-print" role="group" aria-label={t("Show")}>
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`pr-chip${filter === c.key ? " on" : ""}`}
                aria-pressed={filter === c.key}
                onClick={() => changeFilter(c.key)}
              >
                {c.label} <b>{c.count}</b>
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="pr-empty">
            <CheckCircle2 size={28} aria-hidden="true" />
            <strong>{t("No members to follow up.")}</strong>
            <span>{t("Everyone is attending regularly.")}</span>
          </div>
        ) : (
          <div className="pr-table-wrap">
            <table className="pr-table">
              <thead>
                <tr>
                  {!embedded && (
                    <th className="no-print pr-check">
                      <input
                        type="checkbox"
                        checked={allPicked}
                        onChange={toggleAll}
                        aria-label={t("Select all")}
                      />
                    </th>
                  )}
                  <th>{t("Member")}</th>
                  <th>{t("Phone")}</th>
                  <th>{t("Attended")}</th>
                  <th>{t("Missed in a row")}</th>
                  <th>{t("Chance to attend")}</th>
                  <th>{t("Risk")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => {
                  const pct = Math.round(m.prob * 100);
                  const isPicked = picked.has(m.id);
                  return (
                    <tr key={m.id} className={hasPick && !isPicked ? "pr-hide-print" : ""}>
                      {!embedded && (
                        <td className="no-print pr-check">
                          <input
                            type="checkbox"
                            checked={isPicked}
                            onChange={() => toggleOne(m.id)}
                            aria-label={`${t("Select")} ${m.full_name}`}
                          />
                        </td>
                      )}
                      <td>
                        <div className="pr-person">
                          <span className="pr-avatar" aria-hidden="true">{initialsOf(m.full_name)}</span>
                          <div>
                            <strong>{m.full_name}</strong>
                            <small>{m.member_code}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {m.phone ? (
                          <a className="pr-call" href={`tel:${m.phone}`}>
                            <Phone size={13} aria-hidden="true" /> {m.phone}
                          </a>
                        ) : (
                          <span className="pr-dash">-</span>
                        )}
                      </td>
                      <td>{m.attended}/{m.total}</td>
                      <td>{m.streak}</td>
                      <td>
                        <div className="pr-prob">
                          <div className="pr-prob-track"><i className={m.risk} style={{ width: `${pct}%` }} /></div>
                          <span>{pct}%</span>
                        </div>
                      </td>
                      <td><span className={`pr-badge ${m.risk}`}>{t(RISK_LABEL[m.risk])}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}