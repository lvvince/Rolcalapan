// frontend/src/components/DataPage.jsx
// Reusable CRUD page: table + add/edit modal. Role permissions ay nasa backend.
import { useEffect, useState } from "react";
import api from "../api";
import "./portal.css";

export const hm = (t) => (t ? String(t).slice(0, 5) : "");

export default function DataPage({
  title, resource, columns, fields,
  canCreate = true, canEdit = true, canDelete = true,
  lookups = {}, filter, defaults = {}, params = {}, refreshKey = 0, addLabel = "Add",
}) {
  const [rows, setRows] = useState([]);
  const [look, setLook] = useState({});
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/resource", { params: { name: resource, ...params } });
      setRows(data);
      const entries = await Promise.all(
        Object.entries(lookups).map(async ([k, l]) => {
          const r = await api.get("/resource", { params: { name: l.resource, ...(l.params || {}) } });
          return [k, r.data];
        })
      );
      setLook(Object.fromEntries(entries));
    } catch (e) {
      setError(e.response?.data?.error || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [resource, refreshKey]);

  const optionsFor = (f) => {
    if (f.options) return f.options;
    const l = lookups[f.lookup];
    let list = look[f.lookup] || [];
    if (l?.filter) list = list.filter(l.filter);
    const opts = list.map((r) => ({
      value: r[l?.value || "id"],
      label: typeof l?.label === "function" ? l.label(r) : r[l?.label || "name"],
    }));
    return [...(f.extra || []), ...opts];
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await api.post("/resource/save", { name: resource, ...form });
      setForm(null);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this record?")) return;
    try {
      await api.post("/resource/delete", { name: resource, id });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete");
    }
  };

  const shown = filter ? rows.filter((r) => filter(r, look)) : rows;
  const showActions = canEdit || canDelete;

  return (
    <>
      <div className="toolbar">
        <h3>{title}</h3>
        {canCreate && (
          <button className="btn" onClick={() => { setFormError(""); setForm({ ...defaults }); }}>
            + {addLabel}
          </button>
        )}
      </div>

      {error && <div className="msg err">{error}</div>}
      {loading ? (
        <p>Loading...</p>
      ) : shown.length === 0 ? (
        <div className="empty">No records yet.</div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {columns.map((c) => <th key={c.label}>{c.label}</th>)}
                {showActions && <th></th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  {columns.map((c) => (
                    <td key={c.label}>{c.render ? c.render(r, look) : r[c.key] ?? ""}</td>
                  ))}
                  {showActions && (
                    <td className="actions">
                      {canEdit && <button className="btn sm secondary" onClick={() => { setFormError(""); setForm({ ...r }); }}>Edit</button>}{" "}
                      {canDelete && <button className="btn sm danger" onClick={() => remove(r.id)}>Delete</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="modal" onClick={() => setForm(null)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h3>{form.id ? "Edit" : addLabel} {title}</h3>
            {formError && <div className="msg err">{formError}</div>}
            {fields.map((f) => (
              <div className="field" key={f.key}>
                <label>{f.label}{f.required ? " *" : ""}</label>
                {f.type === "textarea" ? (
                  <textarea rows={f.rows || 3} value={form[f.key] ?? ""} required={f.required}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                ) : f.type === "select" ? (
                  <select value={form[f.key] ?? ""} required={f.required}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">{f.required ? "-- select --" : "-- none --"}</option>
                    {optionsFor(f).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={f.type || "text"} step={f.step} placeholder={f.placeholder}
                    value={form[f.key] ?? ""} required={f.required}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                )}
              </div>
            ))}
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}