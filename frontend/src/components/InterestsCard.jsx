// frontend/src/components/InterestsCard.jsx
// Interests ng member (ginagamit ng Recommended). Self-contained: nag-load at nag-save mismo.
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import api from "../api";
import { useLang } from "../i18n/LanguageContext";

const OPTIONS = [
  "music", "worship", "singing", "instruments", "sports", "tech", "media", "arts",
  "teaching", "bible study", "prayer", "hospitality", "outreach", "youth", "kids", "fellowship",
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function InterestsCard() {
  const { t } = useLang();
  const [picked, setPicked] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api
      .get("/portal/interests")
      .then((r) => setPicked(r.data.interests || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggle = (o) =>
    setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await api.post("/portal/interests", { interests: picked });
      setMsg({ ok: true, text: "Interests saved." });
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel">
      <h4>{t("My Interests")}</h4>
      <p className="muted">{t("Pick what you enjoy. We use this to recommend ministries and groups.")}</p>

      {!loaded ? (
        <p>{t("Loading...")}</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" }}>
          {OPTIONS.map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={picked.includes(o)}
              className={`btn sm ${picked.includes(o) ? "" : "secondary"}`}
              onClick={() => toggle(o)}
            >
              {t(cap(o))}
            </button>
          ))}
        </div>
      )}

      <div className="pf-actions">
        {msg ? <div className={`msg ${msg.ok ? "ok" : "err"}`}>{t(msg.text)}</div> : <span />}
        <button className="btn" type="button" onClick={save} disabled={saving || !loaded}>
          <Save size={16} aria-hidden="true" /> {saving ? t("Saving...") : t("Save interests")}
        </button>
      </div>
    </div>
  );
}