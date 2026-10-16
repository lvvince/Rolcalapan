
import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth, homeForRole } from "../context/AuthContext";
import "./login.css";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loggedInUser = await login(email.trim(), password);
      navigate(homeForRole(loggedInUser.role), { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Hindi makakonekta sa server. Pakisubukang muli."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand-content">
          <img
            className="church-logo"
            src="/images/rol-logo.png"
            alt="River of Life Calapan logo"
          />

          <h1>River of Life</h1>
          <p className="brand-subtitle">
            Calapan Church Management System
          </p>

          <div className="verse-divider" />

          <blockquote className="bible-verse">
            “He has made everything beautiful in its time.
            He has also set eternity in the human heart.”
          </blockquote>

          <p className="verse-reference">ECCLESIASTES 3:11</p>
        </div>
      </section>

      <section className="login-form-section">
        <form className="login-card" onSubmit={submit}>
          <div className="login-heading">
            <span className="welcome-label">WELCOME BACK</span>
            <h2>Sign in to your account</h2>
            <p>Continue your journey with River of Life.</p>
          </div>

          {location.state?.message && (
            <div className="login-message success" role="status">
              {location.state.message}
            </div>
          )}

          {error && (
            <div className="login-message error" role="alert">
              {error}
            </div>
          )}

          <div className="login-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>

            <div className="password-wrapper">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="forgot-password">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button
            className="login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          <div className="login-register">
            <span>New member?</span>{" "}
            <Link to="/register">Register here</Link>
          </div>

          <p className="login-footer">
            River of Life Calapan · Faith. Community. Service.
          </p>
        </form>
      </section>
    </main>
  );
}
