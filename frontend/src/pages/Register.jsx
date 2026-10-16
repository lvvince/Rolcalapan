// frontend/src/pages/Register.jsx
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import api from "../api";
import { useAuth, homeForRole } from "../context/AuthContext";
import "../components/portal.css";

export default function Register() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [debugNote, setDebugNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  const set = (key) => (e) => {
    setForm((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const clearForm = () => {
    setForm({
      full_name: "",
      email: "",
      phone: "",
      password: "",
      confirm: "",
    });
  };

  const submit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setMessageType("");
    setDebugNote("");

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
        clearForm();
      } else if (data.email_sent === false) {
        setMessage(
          "Your account was created, but the verification email could not be sent. Please check the error details or contact the administrator."
        );
        setMessageType("warning");
        setDebugNote(data.debug_note || data.message || "");
        clearForm();
      } else {
        setMessage(
          "The server responded, but it did not confirm whether the verification email was sent. Please check the backend registration code."
        );
        setMessageType("warning");
        setDebugNote(
          `Backend response: ${JSON.stringify(data)}`
        );
        clearForm();
      }
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
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>Member Registration</h1>
        <p className="muted">River of Life Calapan</p>

        {message && (
          <div
            className={
              messageType === "success" ? "msg ok" : "alert"
            }
            role="status"
          >
            {message}
          </div>
        )}

        {debugNote && (
          <div className="alert" role="alert">
            <strong>Registration details:</strong>
            <p>{debugNote}</p>
          </div>
        )}

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        {!message && (
          <>
            <label htmlFor="full_name">Full name *</label>
            <input
              id="full_name"
              value={form.full_name}
              onChange={set("full_name")}
              autoComplete="name"
              required
              autoFocus
            />

            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
              required
            />

            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              autoComplete="tel"
            />

            <label htmlFor="password">
              Password * (min 6 characters)
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete="new-password"
              minLength={6}
              required
            />

            <label htmlFor="confirm">Confirm password *</label>
            <input
              id="confirm"
              type="password"
              value={form.confirm}
              onChange={set("confirm")}
              autoComplete="new-password"
              minLength={6}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </button>
          </>
        )}

        <p
          style={{
            textAlign: "center",
            fontSize: 14,
            marginBottom: 0,
            marginTop: 16,
          }}
        >
          May account na? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}