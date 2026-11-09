// frontend/src/components/LoginLayout.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./login.css";
import "./auth-extras.css";

function Logo({ className = "" }) {
  const onLight = className.includes("on-light");
  return (
    <Link to="/" className={`auth-logo ${className}`}>
      <img
        src="/logo.png"
        alt="River of Life Calapan logo"
        width={44}
        height={44}
        style={{
          width: 44,
          height: 44,
          objectFit: "contain",
          flexShrink: 0,
          filter: onLight ? "invert(1)" : "none",
        }}
      />
      <span className="auth-logo-text">
        River of Life <strong>Calapan</strong>
      </span>
    </Link>
  );
}

/* Two repeating waves; the SVG is 200% wide and slides by exactly one period. */
const WAVE = "M0,50 C100,10 200,10 300,50 S500,90 600,50 S800,10 900,50 S1100,90 1200,50 V140 H0 Z";

function Waves() {
  return (
    <div className="auth-waves" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <svg key={n} className={`auth-wave auth-wave-${n}`} viewBox="0 0 1200 140" preserveAspectRatio="none">
          <path d={WAVE} />
        </svg>
      ))}
    </div>
  );
}

export function LoginLayout({ title, subtitle, children }) {
  // Tamang tab title sa bawat hakbang (Login, Register, Verify...)
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} · River of Life Calapan`;
    return () => {
      document.title = prev;
    };
  }, [title]);

  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <Logo className="on-dark" />

        <div className="auth-hero">
          <h2>Let your life flow with God&apos;s love.</h2>
          <p className="lead">A church family where everyone is welcome.</p>
        </div>

        <figure className="auth-verse">
          <blockquote>
            “He has made everything beautiful in its time. He has also set eternity in the human heart; yet no one can
            fathom what God has done from beginning to end.” (NIV)
          </blockquote>
          <figcaption>Ecclesiastes 3:11</figcaption>
        </figure>

        <Waves />
      </aside>

      <main className="auth-main">
        <Link to="/" className="auth-back">
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <div className="auth-card">
          {/* Only visible on small screens, where the brand panel is hidden */}
          <Logo className="on-light" />
          <h1>{title}</h1>
          <p className="auth-sub">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

function EyeIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

export function PasswordInput({ id, value, onChange, ...rest }) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const detectCaps = (e) => setCaps(!!e.getModifierState?.("CapsLock"));

  return (
    <>
      <div className="auth-pw">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          {...rest}
          onKeyDown={detectCaps}
          onKeyUp={detectCaps}
          onBlur={() => setCaps(false)}
        />
        <button
          type="button"
          className="auth-pw-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          <EyeIcon off={show} />
        </button>
      </div>
      {caps && (
        <p className="auth-caps" role="status">
          Caps Lock is on
        </p>
      )}
    </>
  );
}

/* Optional: swap your <button className="auth-submit"> for this to get a loading spinner */
export function SubmitButton({ loading = false, loadingText = "Signing in…", children, ...rest }) {
  return (
    <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading} {...rest}>
      {loading && <span className="auth-spinner" aria-hidden="true" />}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
}