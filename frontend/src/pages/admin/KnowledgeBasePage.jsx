import { useEffect, useState } from "react";
import api from "../../api";

const empty = { id: null, category: "FAQ", question: "", answer: "", keywords: "", is_active: 1 };

export default function KnowledgeBasePage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/chatbot/kb");
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : null;
      if (!list) {
        setItems([]);
        setError(
          typeof data === "string" && data.trim().startsWith("<")
            ? "Server returned HTML instead of JSON. Check .htaccess /api routing."
            : "Unexpected response format from /chatbot/kb."
        );
        return;
      }
      setItems(list);
      setError("");
    } catch (err) {
      setItems([]);
      setError(err.response?.data?.message || `Failed to load (${err.response?.status || "network error"}).`);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/chatbot/kb", {
        id: form.id || 0,
        category: form.category.trim() || "FAQ",
        question: form.question.trim(),
        answer: form.answer.trim(),
        intent: form.keywords.trim(),
        is_active: form.is_active,
      });
      setForm(empty);
      setError("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await api.post("/chatbot/kb/delete", { id });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete.");
    }
  };

  const edit = (it) => {
    setForm({
      id: it.id,
      category: it.category || "FAQ",
      question: it.question || "",
      answer: it.answer || "",
      keywords: it.intent || "",
      is_active: Number(it.is_active),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const input = { width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6, marginBottom: 8, boxSizing: "border-box" };

  return (
    <div style={{ maxWidth: 900 }}>
      <h2>Chatbot Knowledge Base</h2>

      {error && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 10, borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={save} style={{ marginBottom: 24 }}>
        <input style={input} placeholder="Category (Schedule, Ministry, FAQ...)" maxLength={50} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input style={input} placeholder="Question" maxLength={500} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required />
        <textarea style={input} rows={3} maxLength={2000} placeholder="Answer (English)" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} required />
        <input style={input} placeholder="Keywords (space separated)" maxLength={255} value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
        <label style={{ display: "block", marginBottom: 8 }}>
          <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} /> Active
        </label>
        <button type="submit" disabled={saving} style={{ padding: "8px 16px", background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 6 }}>
          {saving ? "Saving..." : form.id ? "Update" : "Add"}
        </button>
        {form.id && <button type="button" onClick={() => setForm(empty)} style={{ marginLeft: 8, padding: "8px 16px" }}>Cancel</button>}
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
            <th style={{ padding: 8 }}>Category</th><th>Question</th><th>Active</th><th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: 8 }}>{it.category}</td>
              <td>{it.question}</td>
              <td>{Number(it.is_active) ? "Yes" : "No"}</td>
              <td>
                <button onClick={() => edit(it)}>Edit</button>{" "}
                <button onClick={() => remove(it.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}