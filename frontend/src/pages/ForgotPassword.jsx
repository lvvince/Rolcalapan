// frontend/src/pages/ForgotPassword.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import "../components/portal.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot", { email });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || "Hindi makakonekta sa server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>Forgot Password</h1>
        <p className="muted">Ilagay ang email ng account mo. Magpapadala kami ng reset link.</p>

        {error && <div className="alert">{error}</div>}
        {result && <div className="msg ok">{result.message}</div>}

        {result?.debug_link && (
          <div className="msg err" style={{ background: "#fef3c7", color: "#92400e", wordBreak: "break-all" }}>
            <strong>Testing mode (localhost):</strong> hindi na-send ang email{result.debug_note ? ` (${result.debug_note})` : ""}.
            Gamitin ang link na ito: <br />
            <a href={result.debug_link}>{result.debug_link}</a>
          </div>
        )}

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />

        <button type="submit" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</button>

        <p style={{ textAlign: "center", fontSize: 14, marginBottom: 0 }}>
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  );
}