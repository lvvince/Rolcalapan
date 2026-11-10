// frontend/src/pages/Login.jsx
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth, homeForRole } from "../context/AuthContext";
import { LoginLayout, PasswordInput, SubmitButton } from "../components/LoginLayout.jsx";
import "../components/portal.css";

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  margin: "4px 0 18px",
};

const rememberStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: "0.9rem",
  fontWeight: 500,
  color: "inherit",
  cursor: "pointer",
  userSelect: "none",
  margin: 0,
};

const checkboxStyle = {
  width: 16,
  height: 16,
  margin: 0,
  padding: 0,
  flexShrink: 0,
  cursor: "pointer",
  accentColor: "#0b6b8a",
};

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(email.trim(), password, remember);
      navigate(homeForRole(u.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Can't reach the server right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginLayout title="Welcome back" subtitle="Sign in to River of Life Calapan Church Management System">
      <form onSubmit={submit}>
        {location.state?.message && (
          <div className="auth-alert ok" role="status">{location.state.message}</div>
        )}
        {error && <div className="auth-alert error" role="alert">{error}</div>}

        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={!!error}
            required
            autoFocus
          />
        </div>

        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            aria-invalid={!!error}
            required
          />
        </div>

        <div style={rowStyle}>
          <label htmlFor="remember" style={rememberStyle}>
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={checkboxStyle}
            />
            <span>Keep me logged in</span>
          </label>
          <Link to="/forgot-password" style={{ whiteSpace: "nowrap" }}>
            Forgot password?
          </Link>
        </div>

        <SubmitButton loading={loading}>Login</SubmitButton>

        <p className="auth-alt">
          New member here? <Link to="/register">Register here</Link>
        </p>
      </form>
    </LoginLayout>
  );
}