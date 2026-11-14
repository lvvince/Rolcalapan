// frontend/src/pages/ForgotPassword.jsx
// Gumagamit ng parehong layout at design ng Login/Register.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import api from "../api";
import { AuthField, AuthInput, LoginLayout, SubmitButton } from "../components/LoginLayout.jsx";
import "../components/portal.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot", { email });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || "Cannot connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginLayout
      mode="forgot"
      title="Forgot password?"
      subtitle="No worries. Enter your email and we will send you a link to reset it."
    >
      <form onSubmit={submit} noValidate={false}>
        {error && <div className="auth-alert error" role="alert">{error}</div>}
        {result && <div className="auth-alert ok" role="status">{result.message}</div>}

        {result?.debug_link && (
          <div className="auth-alert warn" role="status">
            <strong>Testing mode (localhost):</strong> the email was not sent{result.debug_note ? ` (${result.debug_note})` : ""}.
            Use this link instead:
            <p><a href={result.debug_link}>{result.debug_link}</a></p>
          </div>
        )}

        <AuthField id="email" label="Email">
          <AuthInput
            icon={Mail}
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={!!error}
            required
            autoFocus
          />
        </AuthField>

        <SubmitButton loading={loading} loadingText="Sending…">Send reset link</SubmitButton>

        <p className="auth-alt">
          Remembered it? <Link to="/login">Back to login</Link>
        </p>
      </form>
    </LoginLayout>
  );
}
