import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import api from "../../api";
import { useLang } from "../../i18n/LanguageContext";
import { buildPrediction } from "../../lib/predictive";
import "../secretary/StaffPages.css";

export default function AdminAttendanceInsights() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

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

  const max = Math.max(1, ...data.trend.map((d) => d.value));
  const total = data.members.length || 1;
  const risk = [
    { label: t("High risk"), value: data.counts.high },
    { label: t("Medium risk"), value: data.counts.medium },
    { label: t("Low risk"), value: data.counts.low },
  ];
  const rmax = Math.max(1, ...risk.map((r) => r.value));

  return (
    <>
      <div className="sp-head">
        <span className="sp-head-icon"><TrendingUp size={22} aria-hidden="true" /></span>
        <div>
          <h2>{t("Attendance Insights")}</h2>
          <p>{t("Based on the last {n} services.", { n: data.weeks })}</p>
        </div>
      </div>

      <div className="sp-summary">
        <div className="sp-pill"><strong>{data.predicted}</strong><span>{t("Predicted turnout (next service)")}</span></div>
        <div className="sp-pill"><strong>{Math.round((data.predicted / total) * 100)}%</strong><span>{t("Expected attendance rate")}</span></div>
        <div className="sp-pill"><strong>{data.counts.high + data.counts.medium}</strong><span>{t("At-risk members")}</span></div>
      </div>

      <div className="sp-grid">
        <div className="sp-card">
          <h4 className="sp-card-title">{t("Attendance trend")}</h4>
          <div className="sp-bars">
            {data.trend.map((d) => (
              <div className="sp-bar-row" key={d.label}>
                <span className="sp-bar-lbl">{d.label}</span>
                <div className="sp-bar-track"><i style={{ width: `${(d.value / max) * 100}%` }} /></div>
                <strong>{d.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="sp-card">
          <h4 className="sp-card-title">{t("Members by risk level")}</h4>
          <div className="sp-bars">
            {risk.map((r) => (
              <div className="sp-bar-row" key={r.label}>
                <span className="sp-bar-lbl">{r.label}</span>
                <div className="sp-bar-track"><i style={{ width: `${(r.value / rmax) * 100}%` }} /></div>
                <strong>{r.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}