// frontend/src/components/MinistryDetails.jsx
// Tags at age range ng ministry (ginagamit ng Recommended). Admin: lahat. Ministry Leader: sariling ministries lang.
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import api from "../api";
import { useLang } from "../i18n/LanguageContext";

export default function MinistryDetails() {
  const { t } = useLang();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api
      .get("/portal/ministry-details")
      .then((r) => setRows(r.data))
      .catch((e) => {
        setRows([]);
        setMsg({ ok: false, text: e.response?.data?.error || "Could not load ministry details" });
      });
  }, []);

  const edit = (id, key, value) =>
    setRows((rs) => rs.map((r) => (r.ministry_id === id ? { ...r, [key]: value } : r)));

  const save = async (r) => {
    setBusy(r.ministry_id);
    setMsg(null);
    try {
      await api.post("/portal/ministry-details", {
        ministry_id: r.ministry_id,
        tags: r.tags || "",
        min_age: r.min_age === "" || r.min_age == null ? null : Number(r.min_age),
        max_age: r.max_age === "" || r.max_age == null ? null : Number(r.max_age),
      });
      setMsg({ ok: true, text: `${r.name}: saved.` });
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || "Something went wrong" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="panel" style={{ marginTop: 24 }}>
      <h4>{t("Recommendation settings")}</h4>
      <p className="muted">
        {t("Tags (comma-separated, e.g. music, worship, youth) and age range are used to recommend this ministry to members.")}
      </p>

      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.ok ? msg.text : t(msg.text)}</div>}

      {rows === null ? (
        <p>{t("Loading...")}</p>
      ) : rows.length === 0 ? (
        <p className="muted">{t("No ministries found.")}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: "8px" }}>{t("Ministry")}</th>
                <th style={{ padding: "8px" }}>{t("Tags")}</th>
                <th style={{ padding: "8px", width: 110 }}>{t("Min age")}</th>
                <th style={{ padding: "8px", width: 110 }}>{t("Max age")}</th>
                <th style={{ padding: "8px", width: 110 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ministry_id}>
                  <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{t(r.name)}</td>
                  <td style={{ padding: "8px" }}>
                    <div className="field">
                      <input
                        value={r.tags || ""}
                        placeholder="music, worship, singing"
                        onChange={(e) => edit(r.ministry_id, "tags", e.target.value)}
                      />
                    </div>
                  </td>
                  <td style={{ padding: "8px" }}>
                    <div className="field">
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={r.min_age ?? ""}
                        onChange={(e) => edit(r.ministry_id, "min_age", e.target.value)}
                      />
                    </div>
                  </td>
                  <td style={{ padding: "8px" }}>
                    <div className="field">
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={r.max_age ?? ""}
                        onChange={(e) => edit(r.ministry_id, "max_age", e.target.value)}
                      />
                    </div>
                  </td>
                  <td style={{ padding: "8px" }}>
                    <button
                      type="button"
                      className="btn sm"
                      disabled={busy === r.ministry_id}
                      onClick={() => save(r)}
                    >
                      <Save size={14} aria-hidden="true" /> {busy === r.ministry_id ? t("Saving...") : t("Save")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}