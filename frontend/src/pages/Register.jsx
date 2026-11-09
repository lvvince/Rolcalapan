// frontend/src/pages/Register.jsx
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth, homeForRole } from "../context/AuthContext";
import { LoginLayout, PasswordInput, SubmitButton } from "../components/LoginLayout.jsx";
import "../components/portal.css";

const EMPTY_FORM = { full_name: "", email: "", phone: "", password: "", confirm: "" };
const RESEND_SECONDS = 60;
const CODE_LENGTH = 6;
const NETWORK_ERROR = "Can't reach the server. Please try again.";

const STEPS = [
  ["form", "Account"],
  ["code", "Verify"],
  ["done", "Done"],
];

function Steps({ step }) {
  const idx = STEPS.findIndex(([key]) => key === step);
  const finished = step === "done";
  return (
    <ol className="auth-steps" aria-label="Registration progress">
      {STEPS.map(([key, label], i) => {
        const state = finished || i < idx ? "done" : i === idx ? "active" : "";
        return (
          <li key={key} className={state} aria-current={i === idx && !finished ? "step" : undefined}>
            <span className="num">{state === "done" ? "✓" : i + 1}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function passwordStrength(pw) {
  if (!pw) return { level: 0, label: "" };
  if (pw.length < 6) return { level: 0, label: "Too short (at least 6 characters)" };
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  const level = Math.min(4, 1 + (pw.length >= 8) + (classes >= 3) + (pw.length >= 12));
  return { level, label: ["", "Weak", "Okay", "Good", "Strong"][level] };
}

/* 6 hiwalay na kahon; sumusuporta sa paste at autofill galing email/SMS */
function OtpInput({ value, onChange, invalid, disabled }) {
  const refs = useRef([]);
  const focusBox = (i) => refs.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))]?.focus();

  const handleChange = (i, e) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      onChange(value.slice(0, i) + value.slice(i + 1)); // binura ang digit
      return;
    }
    const next = (value.slice(0, i) + digits + (digits.length === 1 ? value.slice(i + 1) : "")).slice(0, CODE_LENGTH);
    onChange(next);
    focusBox(next.length >= CODE_LENGTH ? CODE_LENGTH - 1 : Math.min(i + digits.length, next.length));
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      e.preventDefault();
      onChange(value.slice(0, i - 1));
      focusBox(i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  const handlePaste = (e) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!digits) return;
    e.preventDefault();
    onChange(digits);
    focusBox(digits.length >= CODE_LENGTH ? CODE_LENGTH - 1 : digits.length);
  };

  return (
    <div className={`otp${invalid ? " invalid" : ""}`} role="group" aria-label="6-digit verification code">
      {Array.from({ length: CODE_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className={value[i] ? "filled" : ""}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

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

  // Kusang i-verify kapag kumpleto na ang 6 digits
  useEffect(() => {
    if (step === "code" && code.length === CODE_LENGTH && !loading) verifyCode(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Pagkatapos ng verification, dalhin sa login
  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(
      () => navigate("/login", { state: { message: "Email verified! You can now log in." } }),
      2500
    );
    return () => clearTimeout(t);
  }, [step, navigate]);

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

  const clearAlerts = () => {
    setError("");
    setMessage("");
    setMessageType("");
    setDebugNote("");
  };

  // ------------------------------------------------------------ STEP 1
  const submit = async (e) => {
    e.preventDefault();
    clearAlerts();

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
      // Password lang ang binubura, para kung babalik ang user ay nandoon pa ang name/email/phone
      setForm((prev) => ({ ...prev, password: "", confirm: "" }));
      setStep("code");

      if (data.email_sent === false) {
        // Na-create ang account pero pumalya ang email. Pwede pa ring mag-resend.
        setMessage("Your account was created, but the code could not be sent. Tap “Resend code” to try again.");
        setMessageType("warning");
        setDebugNote(data.debug_code ? `Local debug code: ${data.debug_code}` : data.debug_note || "");
      } else {
        setMessage(`We sent a 6-digit code to ${email}. It expires in 15 minutes.`);
        setMessageType("success");
        setCooldown(RESEND_SECONDS);
      }
    } catch (err) {
      setError(err.response?.data?.error || NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------ STEP 2
  const verifyCode = async (value = code) => {
    setError("");

    if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(value)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/verify-code", { email: pendingEmail, code: value });
      setMessage("");
      setDebugNote("");
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.error || NETWORK_ERROR);
      setCode(""); // linisin para makapag-type ulit; babalik ang focus sa unang kahon
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
      setError(err.response?.data?.error || NETWORK_ERROR);
    }
  };

  const backToForm = () => {
    clearAlerts();
    setCode("");
    setCooldown(0);
    setStep("form");
  };

  const strength = passwordStrength(form.password);
  const passwordsMatch = form.password === form.confirm;
  const mismatchShown = !!form.confirm && !passwordsMatch;

  const heading = {
    form: ["Create your account", "Join the River of Life Calapan family"],
    code: ["Check your email", "Enter the 6-digit code we sent to your email"],
    done: ["You're all set", "Your email has been verified"],
  }[step];

  return (
    <LoginLayout title={heading[0]} subtitle={heading[1]}>
      <Steps step={step} />

      {message && step !== "done" && (
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
              title="11 digits only (e.g. 09123456789)"
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
              aria-describedby="pw-strength"
              required
            />
            {form.password && (
              <div id="pw-strength">
                <div className="pw-meter" data-level={strength.level} aria-hidden="true">
                  <span /><span /><span /><span />
                </div>
                <p className={`pw-hint${strength.level >= 2 ? " ok" : ""}`}>{strength.label}</p>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="confirm">Confirm password</label>
            <PasswordInput
              id="confirm"
              value={form.confirm}
              onChange={set("confirm")}
              autoComplete="new-password"
              minLength={6}
              aria-invalid={mismatchShown}
              aria-describedby="pw-match"
              required
            />
            {form.confirm && (
              <p id="pw-match" className={`pw-hint ${passwordsMatch ? "ok" : "bad"}`} role="status">
                {passwordsMatch ? "Passwords match" : "Passwords don't match yet"}
              </p>
            )}
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyCode();
          }}
        >
          <div className="auth-field">
            <label id="otp-label">Verification code</label>
            <OtpInput value={code} onChange={setCode} invalid={!!error} disabled={loading} />
          </div>

          <SubmitButton loading={loading} loadingText="Verifying…">
            Verify email
          </SubmitButton>

          <p className="auth-alt">
            Didn’t get a code?{" "}
            <button type="button" className="auth-linkbtn" onClick={resendCode} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </p>
          <p className="auth-alt">
            Wrong email?{" "}
            <button type="button" className="auth-linkbtn" onClick={backToForm}>
              Go back
            </button>
          </p>
        </form>
      )}

      {step === "done" && (
        <div className="auth-success" role="status">
          <svg className="auth-check" viewBox="0 0 52 52" width="64" height="64" aria-hidden="true">
            <circle cx="26" cy="26" r="24" />
            <path d="M15 27l8 8 14-16" />
          </svg>
          <p>Taking you to login…</p>
          <Link to="/login" className="auth-linkbtn">Go to login now</Link>
        </div>
      )}
    </LoginLayout>
  );
}