// frontend/src/pages/Login.jsx
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth, homeForRole } from "../context/AuthContext";
import "../components/portal.css";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(email, password);
      navigate(homeForRole(u.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Hindi makakonekta sa server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>River of Life</h1>
        <p className="muted">Calapan Church Management System</p>

        {location.state?.message && <div className="msg ok">{location.state.message}</div>}
        {error && <div className="alert">{error}</div>}

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <div style={{ textAlign: "right", marginTop: 8, fontSize: 14 }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>

        <p style={{ textAlign: "center", fontSize: 14, marginBottom: 0 }}>
          Bagong member? <Link to="/register">Register here</Link>
        </p>
      </form>
    </div>
  );
}