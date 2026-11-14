// frontend/src/pages/ResetPassword.jsx
// Gumagamit ng parehong layout at design ng Login/Register.
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { AuthField, LoginLayout, PasswordInput, SubmitButton } from "../components/LoginLayout.jsx";
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
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset", { token, password });
      navigate("/login", { replace: true, state: { message: data.message } });
    } catch (err) {
      setError(err.response?.data?.error || "Cannot connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <LoginLayout mode="reset" title="Link expired" subtitle="This reset link is invalid or has already been used.">
        <div className="auth-alert error" role="alert">Invalid reset link.</div>
        <Link to="/forgot-password" className="auth-submit" style={{ textDecoration: "none" }}>Request a new link</Link>
      </LoginLayout>
    );
  }

  return (
    <LoginLayout mode="reset" title="Set a new password" subtitle="Choose a password you will remember. At least 6 characters.">
      <form onSubmit={submit}>
        {error && <div className="auth-alert error" role="alert">{error}</div>}

        <AuthField id="password" label="New password" hint="(at least 6 characters)">
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
            autoFocus
          />
        </AuthField>

        <AuthField id="confirm" label="Confirm password">
          <PasswordInput
            id="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            aria-invalid={!!confirm && confirm !== password}
            required
          />
        </AuthField>

        <SubmitButton loading={loading} loadingText="Saving…">Save password</SubmitButton>

        <p className="auth-alt">
          Link not working? <Link to="/forgot-password">Request a new link</Link>
        </p>
      </form>
    </LoginLayout>
  );
}
