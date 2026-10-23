// frontend/src/pages/Register.jsx
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import api from "../api";
import { useAuth, homeForRole } from "../context/AuthContext";
import { LoginLayout, PasswordInput, SubmitButton } from "../components/LoginLayout.jsx";
import "../components/portal.css";

const EMPTY_FORM = { full_name: "", email: "", phone: "", password: "", confirm: "" };

export default function Register() {
  const { user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [debugNote, setDebugNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  const set = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const setPhone = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setForm((prev) => ({ ...prev, phone: digits }));
  };

  const submit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setMessageType("");
    setDebugNote("");

    if (!/^\d{11}$/.test(form.phone)) {
      setError("Phone number is required and must be exactly 11 digits (e.g. 09123456789).");
      return;
    }

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/register", {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });

      const data = response.data || {};

      if (data.email_sent === true) {
        setMessage(
          data.message ||
            "Registration successful! Please check your email and verify your account."
        );
        setMessageType("success");
      } else if (data.email_sent === false) {
        setMessage(
          "Your account was created, but the verification email could not be sent. Please check the error details or contact the administrator."
        );
        setMessageType("warning");
        setDebugNote(data.debug_note || data.message || "");
      } else {
        setMessage(
          "The server responded, but it did not confirm whether the verification email was sent. Please check the backend registration code."
        );
        setMessageType("warning");
        setDebugNote(`Backend response: ${JSON.stringify(data)}`);
      }
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.error || "Hindi makakonekta sa server. Pakisubukang muli.");
    } finally {
      setLoading(false);
    }
  };

  const passwordMismatch = error === "Passwords do not match.";

  return (
    <LoginLayout title="Member registration" subtitle="Create your River of Life Calapan account">
      <form onSubmit={submit}>
        {message && (
          <div className={`auth-alert ${messageType === "success" ? "ok" : "warn"}`} role="status">
            {message}
          </div>
        )}

        {debugNote && (
          <div className="auth-alert warn" role="alert">
            <strong>Registration details</strong>
            <p>{debugNote}</p>
          </div>
        )}

        {error && (
          <div className="auth-alert error" role="alert">
            {error}
          </div>
        )}

        {!message && (
          <>
            <div className="auth-field">
              <label htmlFor="full_name">Full name</label>
              <input
                id="full_name"
                value={form.full_name}
                onChange={set("full_name")}
                autoComplete="name"
                required
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="phone">
                Phone <span className="hint">(11 digits)</span>
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={11}
                minLength={11}
                pattern="[0-9]{11}"
                title="11 digits lang (e.g. 09123456789)"
                placeholder="09123456789"
                value={form.phone}
                onChange={setPhone}
                autoComplete="tel"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">
                Password <span className="hint">(at least 6 characters)</span>
              </label>
              <PasswordInput
                id="password"
                value={form.password}
                onChange={set("password")}
                autoComplete="new-password"
                minLength={6}
                aria-invalid={passwordMismatch}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="confirm">Confirm password</label>
              <PasswordInput
                id="confirm"
                value={form.confirm}
                onChange={set("confirm")}
                autoComplete="new-password"
                minLength={6}
                aria-invalid={passwordMismatch}
                required
              />
            </div>

            <SubmitButton loading={loading} loadingText="Creating account…">
              Create account
            </SubmitButton>
          </>
        )}

        <p className="auth-alt">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </LoginLayout>
  );
}