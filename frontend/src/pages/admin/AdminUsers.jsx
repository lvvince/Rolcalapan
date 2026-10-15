// frontend/src/pages/admin/AdminUsers.jsx
import { useEffect, useState } from "react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import "../../components/portal.css";

const roles = [
  { value: "admin", label: "Admin / Pastor" },
  { value: "staff", label: "Church Staff / Secretary" },
  { value: "ministry_leader", label: "Ministry Leader" },
  { value: "member", label: "Member / Congregant / Volunteer" },
];
const roleLabel = (v) => roles.find((r) => r.value === v)?.label || v;
const empty = { id: null, full_name: "", email: "", role: "member", status: "active", password: "" };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (!confirm(`Delete ${u.full_name}? This cannot be undone.`)) return;
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

  const shown = rows.filter((r) =>
    (filter === "all" || r.role === filter) &&
    (`${r.full_name} ${r.email}`.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <div className="toolbar">
        <h2>Users & Roles</h2>
        <button className="btn" onClick={() => { setFormError(""); setForm({ ...empty }); }}>+ Add User</button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6, minWidth: 220 }} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }}>
          <option value="all">All roles</option>
          {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {error && <div className="msg err">{error}</div>}

      {shown.length === 0 ? (
        <div className="empty">No users found.</div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}{u.id === me?.id && <span className="badge" style={{ marginLeft: 6 }}>you</span>}</td>
                  <td>{u.email}</td>
                  <td><span className="badge">{roleLabel(u.role)}</span></td>
                  <td><span className={`badge ${u.status === "active" ? "ok" : "bad"}`}>{u.status}</span></td>
                  <td>{u.created_at}</td>
                  <td className="actions">
                    <button className="btn sm secondary" onClick={() => { setFormError(""); setForm({ ...u, password: "" }); }}>Edit</button>{" "}
                    {u.id !== me?.id && (
                      <>
                        <button className="btn sm secondary" onClick={() => toggle(u)}>{u.status === "active" ? "Deactivate" : "Activate"}</button>{" "}
                        <button className="btn sm danger" onClick={() => remove(u)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="modal" onClick={() => setForm(null)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h3>{form.id ? "Edit User" : "Add User"}</h3>
            {formError && <div className="msg err">{formError}</div>}

            <div className="field">
              <label>Full name *</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="field">
              <label>Role *</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="field">
              <label>{form.id ? "New password (leave blank to keep)" : "Password * (min 6 characters)"}</label>
              <input type="password" value={form.password} minLength={form.id && !form.password ? undefined : 6}
                required={!form.id} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>

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