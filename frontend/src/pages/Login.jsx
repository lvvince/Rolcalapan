// frontend/src/pages/Login.jsx
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth, homeForRole } from "../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
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

        {error && <div className="alert">{error}</div>}

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
      </form>
    </div>
  );
}