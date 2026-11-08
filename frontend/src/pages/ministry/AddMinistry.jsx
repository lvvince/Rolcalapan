// frontend/src/pages/ministry/AddMinistry.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import api from "../../api";
import { useLang } from "../../i18n/LanguageContext";

const EMPTY = { name: "", type: "ministry", description: "", tags: "", min_age: "", max_age: "" };

export default function AddMinistry({ onSaved }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);

    const min = form.min_age === "" ? null : Number(form.min_age);
    const max = form.max_age === "" ? null : Number(form.max_age);
    if (min !== null && max !== null && min > max) {
      setMsg({ ok: false, text: "Min age cannot be greater than max age." });
      return;
    }

    setSaving(true);
    try {
      await api.post("/portal/ministry-save", {
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim(),
        tags: form.tags.trim(),
        min_age: min,
        max_age: max,
      });
      setMsg({ ok: true, text: "Ministry added. You are now its leader." });
      setForm(EMPTY);
      if (onSaved) onSaved();
      setTimeout(() => navigate("/ministry"), 900);
    } catch (x) {
      console.error("ministry-save failed:", x.response?.status, x.response?.data || x.message);
      const status = x.response?.status;
      setMsg({
        ok: false,
        text:
          x.response?.data?.error ||
          (status ? `Request failed (${status}). Check the backend route/controller.` : "Cannot reach the server."),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="panel" style={{ marginTop: 24 }} onSubmit={submit}>
      <h4>{t("Add Ministry or Small Group")}</h4>
      <div className="pf-grid">
        <div className="field">
          <label>{t("Name")} *</label>
          <input value={form.name} onChange={set("name")} required maxLength={100} />
        </div>
        <div className="field">
          <label>{t("Type")} *</label>
          <select value={form.type} onChange={set("type")}>
            <option value="ministry">{t("Ministry")}</option>
            <option value="small_group">{t("Small group (cell group)")}</option>
          </select>
        </div>
        <div className="field full">
          <label>{t("Description")}</label>
          <textarea rows={3} value={form.description} onChange={set("description")} />
        </div>
        <div className="field full">
          <label>{t("Tags (comma-separated, e.g. music, worship, youth)")}</label>
          <input value={form.tags} onChange={set("tags")} placeholder="music, worship, singing" />
        </div>
        <div className="field">
          <label>{t("Min age")}</label>
          <input type="number" min="0" max="120" value={form.min_age} onChange={set("min_age")} />
        </div>
        <div className="field">
          <label>{t("Max age")}</label>
          <input type="number" min="0" max="120" value={form.max_age} onChange={set("max_age")} />
        </div>
      </div>

      <div className="pf-actions">
        {msg ? <div className={`msg ${msg.ok ? "ok" : "err"}`}>{t(msg.text)}</div> : <span />}
        <button className="btn" type="submit" disabled={saving}>
          <Plus size={16} aria-hidden="true" /> {saving ? t("Saving...") : t("Add")}
        </button>
      </div>
    </form>
  );
}