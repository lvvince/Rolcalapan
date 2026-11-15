// frontend/src/pages/ResetPassword.jsx
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { AuthField, LoginLayout, PasswordInput, SubmitButton } from "../components/LoginLayout.jsx";
import "../components/portal.css";

// Tumatanggap ng buong link O ng code lang, ibinabalik ang code.
function extractToken(value) {
  const v = (value || "").trim();
  if (!v) return "";
  const m = v.match(/[?&]token=([^&#\s]+)/);
  if (!m) return v;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

// Gawing malinis ang code: walang espasyo, uppercase
const normalizeCode = (value) => extractToken(value).replace(/\s+/g, "").toUpperCase();

const TOKEN_ERROR = /token|expired|invalid|code|link|used/i;

const codeInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 14px",
  border: "1.5px solid #cbd5e1",
  borderRadius: 10,
  font: "inherit",
  fontSize: 14,
  letterSpacing: "0.08em",
  background: "#f8fafc",
  color: "#0f172a",
  outline: "none",
};

const hintErrorStyle = {
  display: "block",
  marginTop: 4,
  fontSize: "0.8rem",
  color: "#b91c1c",
};

const linkButtonStyle = {
  background: "none",
  border: 0,
  padding: 0,
  color: "inherit",
  textDecoration: "underline",
  cursor: "pointer",
  font: "inherit",
};

export default function ResetPassword() {
  const [params] = useSearchParams();
  const urlToken = extractToken(params.get("token") || "");
  const navigate = useNavigate();

  const [code, setCode] = useState(urlToken);
  const [editCode, setEditCode] = useState(!urlToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const token = normalizeCode(code);
  const mismatch = !!confirm && confirm !== password;

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");

    if (!token) {
      setEditCode(true);
      return setError("Please enter your reset code.");
    }
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset", { token, password });
      navigate("/login", {
        replace: true,
        state: { message: data?.message || "Password updated. You can now log in." },
      });
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.error || err.response?.data?.message || "";

      if (!err.response) {
        setError("Cannot connect to the server. Please try again.");
      } else if (status === 429) {
        setError(serverMsg || "Too many attempts. Please wait a few minutes.");
      } else if (status === 410 || status === 404 || TOKEN_ERROR.test(serverMsg)) {
        setEditCode(true);
        setError(serverMsg || "This reset code is invalid or has expired. Request a new one below.");
      } else {
        setError(serverMsg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginLayout
      mode="reset"
      title="Set a new password"
      subtitle="Enter the code from your email and choose a new password."
    >
      <form onSubmit={submit} noValidate>
        {error && <div className="auth-alert error" role="alert">{error}</div>}

        {editCode ? (
          <AuthField id="code" label="Reset code" hint="(from the email we sent you)">
            <input
              id="code"
              type="text"
              style={codeInputStyle}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus={!urlToken}
              required
            />
          </AuthField>
        ) : (
          <p className="auth-alt" style={{ marginTop: 0 }}>
            Reset code detected.{" "}
            <button type="button" onClick={() => setEditCode(true)} style={linkButtonStyle}>
              Use a different code
            </button>
          </p>
        )}

        <AuthField id="password" label="New password" hint="(at least 6 characters)">
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
            autoFocus={!!urlToken}
          />
        </AuthField>

        <AuthField id="confirm" label="Confirm password">
          <PasswordInput
            id="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            aria-invalid={mismatch}
            required
          />
          {mismatch && (
            <small style={hintErrorStyle} role="alert">Passwords do not match.</small>
          )}
        </AuthField>

        <SubmitButton loading={loading} loadingText="Saving…">Save password</SubmitButton>

        <p className="auth-alt">
          Code not working? <Link to="/forgot-password">Request a new code</Link>
        </p>
      </form>
    </LoginLayout>
  );
}