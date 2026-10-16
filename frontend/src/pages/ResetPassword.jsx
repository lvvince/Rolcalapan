// frontend/src/pages/ResetPassword.jsx
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import "../components/portal.css";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords do not match");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset", { token, password });
      navigate("/login", { replace: true, state: { message: data.message } });
    } catch (err) {
      setError(err.response?.data?.error || "Hindi makakonekta sa server.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h1>Reset Password</h1>
          <div className="alert">Invalid reset link.</div>
          <p style={{ textAlign: "center" }}><Link to="/forgot-password">Request a new link</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>New Password</h1>
        <p className="muted">Maglagay ng bagong password.</p>

        {error && <div className="alert">{error}</div>}

        <label>New password (min 6 characters)</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoFocus />

        <label>Confirm password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />

        <button type="submit" disabled={loading}>{loading ? "Saving..." : "Save password"}</button>

        <p style={{ textAlign: "center", fontSize: 14, marginBottom: 0 }}>
          <Link to="/forgot-password">Request a new link</Link>
        </p>
      </form>
    </div>
  );
}