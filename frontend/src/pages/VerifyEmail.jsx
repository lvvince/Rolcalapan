import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";
import "../components/portal.css";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const called = useRef(false);

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    async function verify() {
      if (!token) {
        setStatus("error");
        setMessage("Missing verification token.");
        return;
      }

      try {
        const response = await api.get("/auth/verify-email", {
          params: { token },
        });
        setStatus("success");
        setMessage(response.data.message || "Your email has been verified.");
      } catch (err) {
        setStatus("error");
        setMessage(
          err.response?.data?.error ||
            "Unable to verify your email. Please try again."
        );
      }
    }

    verify();
  }, [token]);

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>River of Life</h1>
        <p className="muted">Email Verification</p>

        {status === "loading" && <p role="status">{message}</p>}

        {status === "success" && (
          <div className="msg ok" role="status">{message}</div>
        )}

        {status === "error" && (
          <div className="alert" role="alert">{message}</div>
        )}

        {status !== "loading" && (
          <p style={{ textAlign: "center", marginBottom: 0 }}>
            <Link to="/login">Go to Login</Link>
          </p>
        )}
      </div>
    </div>
  );
}