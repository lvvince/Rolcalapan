// frontend/src/pages/Register.jsx
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth, homeForRole } from "../context/AuthContext";
import { LoginLayout, PasswordInput, SubmitButton } from "../components/LoginLayout.jsx";
import "../components/portal.css";

const EMPTY_FORM = { full_name: "", email: "", phone: "", password: "", confirm: "" };
const RESEND_SECONDS = 60;

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState("form"); // "form" | "code" | "done"
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [debugNote, setDebugNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Countdown para sa "Resend code"
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

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

  const setCodeDigits = (e) => {
    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
  };

  // ------------------------------------------------------------ STEP 1
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
      const email = (data.email || form.email).trim().toLowerCase();

      setPendingEmail(email);
      setCode("");
      setForm(EMPTY_FORM);
      setStep("code");

      if (data.email_sent === false) {
        // Na-create ang account pero pumalya ang email. Pwede pa ring mag-resend.
        setMessage(
          "Your account was created, but the code could not be sent. Tap “Resend code” to try again."
        );
        setMessageType("warning");
        setDebugNote(data.debug_code ? `Local debug code: ${data.debug_code}` : data.debug_note || "");
      } else {
        setMessage(`We sent a 6-digit code to ${email}. It expires in 15 minutes.`);
        setMessageType("success");
        setCooldown(RESEND_SECONDS);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Hindi makakonekta sa server. Pakisubukang muli.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------ STEP 2
  const verifyCode = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/verify-code", {
        email: pendingEmail,
        code,
      });

      setMessage(response.data?.message || "Email verified! You can now log in.");
      setMessageType("success");
      setDebugNote("");
      setStep("done");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Hindi makakonekta sa server. Pakisubukang muli.");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (cooldown > 0) return;

    setError("");
    setDebugNote("");

    try {
      await api.post("/auth/resend-code", { email: pendingEmail });
      setMessage(`A new code was sent to ${pendingEmail}.`);
      setMessageType("success");
      setCode("");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err.response?.data?.error || "Hindi makakonekta sa server. Pakisubukang muli.");
    }
  };

  const passwordMismatch = error === "Passwords do not match.";

  return (
    <LoginLayout
      title={step === "form" ? "Member registration" : "Verify your email"}
      subtitle={
        step === "form"
          ? "Create your River of Life Calapan account"
          : "Enter the 6-digit code we sent to your email"
      }
    >
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

      {step === "form" && (
        <form onSubmit={submit}>
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

          <p className="auth-alt">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={verifyCode}>
          <div className="auth-field">
            <label htmlFor="code">Verification code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              placeholder="123456"
              value={code}
              onChange={setCodeDigits}
              style={{ letterSpacing: "0.4em", fontSize: "1.4rem", textAlign: "center" }}
              required
              autoFocus
            />
          </div>

          <SubmitButton loading={loading} loadingText="Verifying…">
            Verify email
          </SubmitButton>

          <p className="auth-alt">
            Didn’t get a code?{" "}
            <button
              type="button"
              onClick={resendCode}
              disabled={cooldown > 0}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
                color: "inherit",
                textDecoration: "underline",
                cursor: cooldown > 0 ? "not-allowed" : "pointer",
                opacity: cooldown > 0 ? 0.6 : 1,
              }}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </p>
        </form>
      )}

      {step === "done" && (
        <p className="auth-alt">
          Redirecting to login… <Link to="/login">Go to Login</Link>
        </p>
      )}
    </LoginLayout>
  );
}