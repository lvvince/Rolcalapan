// frontend/src/pages/admin/AdminUsers.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../i18n/LanguageContext";
import "../../components/portal.css";

const roles = [
  { value: "admin", label: "Admin / Pastor", short: "Admin", badge: "warn" },
  { value: "staff", label: "Church Staff / Secretary", short: "Staff", badge: "" },
  { value: "ministry_leader", label: "Ministry Leader", short: "Ministry Leader", badge: "" },
  { value: "member", label: "Member / Congregant / Volunteer", short: "Member", badge: "" },
];
const roleOf = (v) => roles.find((r) => r.value === v);
const validRole = (v) => (roles.some((r) => r.value === v) ? v : "all");
const empty = { id: null, full_name: "", email: "", role: "member", status: "active", password: "" };

const fmtDate = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x) ? d : x.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export default function AdminUsers() {
  const { t } = useLang();
  const { user: me } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);
  const filter = validRole(searchParams.get("role"));
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const setFilter = (v) => {
    if (v === "all") setSearchParams({}, { replace: true });
    else setSearchParams({ role: v }, { replace: true });
  };

  const load = async () => {
    try {
      const { data } = await api.get("/admin/users");
      setRows(data);
      setError("");
    } catch (e) {
      setError(e.response?.data?.error || "Failed to load users");
    }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!form) return;
    const onKey = (e) => e.key === "Escape" && setForm(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await api.post("/admin/users/save", form);
      setForm(null);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u) => {
    if (!confirm(t("Delete {name}? This cannot be undone.", { name: u.full_name }))) return;
    try {
      await api.post("/admin/users/delete", { id: u.id });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete");
    }
  };

  const toggle = async (u) => {
    try {
      await api.post("/admin/users/save", { ...u, status: u.status === "active" ? "inactive" : "active", password: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update");
    }
  };

  const all = rows || [];
  const countFor = (v) => (v === "all" ? all.length : all.filter((r) => r.role === v).length);
  const shown = all.filter((r) =>
    (filter === "all" || r.role === filter) &&
    `${r.full_name} ${r.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="toolbar" style={{ marginTop: 4 }}>
        <h2>{t("Users & Roles")}</h2>
        <button
          className="btn"
          onClick={() => {
            setFormError("");
            setForm({ ...empty, role: filter === "all" ? "member" : filter });
          }}
        >
          + {t("Add User")}
        </button>
      </div>

      <div className="min-toolbar">
        <input
          className="min-search"
          placeholder={t("Search name or email...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="min-pills">
          {[{ value: "all", short: "All" }, ...roles].map((r) => (
            <button
              key={r.value}
              type="button"
              className={`min-pill ${filter === r.value ? "active" : ""}`}
              onClick={() => setFilter(r.value)}
            >
              {t(r.short)} ({countFor(r.value)})
            </button>
          ))}
        </div>
      </div>

      {error && <div className="msg err">{t(error)}</div>}

      {rows === null && !error ? (
        <p>{t("Loading...")}</p>
      ) : shown.length === 0 ? (
        <div className="empty">{t("No users found.")}</div>
      ) : (
        <>
          <div className="min-summary">
            {t("Showing {shown} of {total} users", { shown: shown.length, total: all.length })}
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Name")}</th>
                  <th>{t("Role")}</th>
                  <th>{t("Status")}</th>
                  <th>{t("Created")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>
                        {u.full_name}
                        {u.id === me?.id && <span className="badge" style={{ marginLeft: 8 }}>{t("you")}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{u.email}</div>
                    </td>
                    <td>
                      <span className={`badge ${roleOf(u.role)?.badge || ""}`}>
                        {roleOf(u.role) ? t(roleOf(u.role).short) : u.role}
                      </span>
                    </td>
                    <td><span className={`badge ${u.status === "active" ? "ok" : "bad"}`}>{t(u.status)}</span></td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td className="actions">
                      <button className="btn sm secondary" onClick={() => { setFormError(""); setForm({ ...u, password: "" }); }}>{t("Edit")}</button>{" "}
                      {u.id !== me?.id && (
                        <>
                          <button className="btn sm secondary" onClick={() => toggle(u)}>{u.status === "active" ? t("Deactivate") : t("Activate")}</button>{" "}
                          <button className="btn sm danger" onClick={() => remove(u)}>{t("Delete")}</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {form && (
        <div className="modal" onClick={() => setForm(null)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h3>{form.id ? t("Edit User") : t("Add User")}</h3>
            {formError && <div className="msg err">{t(formError)}</div>}

            <div className="field">
              <label>{t("Full name")} *</label>
              <input autoFocus value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="field">
              <label>{t("Email")} *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="field">
              <label>{t("Role")} *</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {roles.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>{t("Status")}</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">{t("Active")}</option>
                <option value="inactive">{t("Inactive")}</option>
              </select>
            </div>
            <div className="field">
              <label>{form.id ? t("New password (leave blank to keep)") : t("Password * (min 6 characters)")}</label>
              <input type="password" value={form.password} minLength={form.id && !form.password ? undefined : 6}
                required={!form.id} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={() => setForm(null)}>{t("Cancel")}</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? t("Saving...") : t("Save")}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}