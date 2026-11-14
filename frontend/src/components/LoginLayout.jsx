// frontend/src/components/LoginLayout.jsx
// Shared na layout ng Login at Register. Black & white, minimal, smooth.
//
// SWAP: sa desktop, nagpapalit ng pwesto ang brand panel at ang form (slide pakaliwa/pakanan)
// kapag pinindot ang "Sign up" / "Sign in". Magkaibang route ang Login at Register kaya ang slide
// ay nagpe-play MUNA bago mag-navigate; pagdating sa bagong pahina, tuloy ang galaw (walang fade).
//
// LARAWAN (optional): frontend/public/auth.jpg ang background ng brand panel. Kapag wala, hero.jpg.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import "./login.css";
import "./auth-extras.css";

const SWAP_MS = 700;
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
// Direksyon ng huling swap ("l" o "r"). Binabasa ng bagong pahina para ituloy ang galaw.
let lastGo = null;

/* Nilalaman ng brand panel. Ang brand panel ay laging nag-aanyaya sa KABILANG pahina. */
const COPY = {
  login: {
    side: "form-left",
    go: "l",
    kicker: "Welcome home",
    title: "There's always a seat for you.",
    body: "Create an account to share your prayers, join a ministry, and celebrate God's goodness together with your church family.",
    cta: "Sign up",
    to: "/register",
    verse: "So we, being many, are one body in Christ, and every one members one of another.",
    ref: "Romans 12:5",
  },
  register: {
    side: "form-right",
    go: "r",
    kicker: "Join the family",
    title: "God has been faithful.",
    body: "Sign in and pick up where you left off. Your church family has been praying for you, and we are glad you are home.",
    cta: "Sign in",
    to: "/login",
    verse: "Behold, how good and how pleasant it is for brethren to dwell together in unity!",
    ref: "Psalm 133:1",
  },
};

/* ---------- SWAP context ---------- */
const SwapContext = createContext(() => {});

/* Link na may swap animation. Normal na link pa rin kapag Ctrl/Cmd-click o kung reduced motion. */
export function SwapLink({ to, className, children, ...rest }) {
  const swapTo = useContext(SwapContext);
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    swapTo(to);
  };
  return <Link to={to} className={className} onClick={onClick} {...rest}>{children}</Link>;
}

function Logo() {
  return (
    <Link to="/" className="auth-logo" aria-label="River of Life Calapan, back to home">
      <img src="/logo.png" alt="" width={40} height={40} />
      <span>River of Life <em>Calapan</em></span>
    </Link>
  );
}

/* ---------- Layout ---------- */
export function LoginLayout({ mode = "login", title, subtitle, children }) {
  const copy = COPY[mode] || COPY.login;
  const navigate = useNavigate();
  const [swapping, setSwapping] = useState(false);
  const [photoSrc, setPhotoSrc] = useState("/auth.jpg"); // auth.jpg muna, kung wala ay hero.jpg
  const timer = useRef(0);
  const arrive = useRef(lastGo); // galing sa swap? ("l" | "r" | null)

  useEffect(() => { lastGo = null; }, []);

  // Tamang tab title sa bawat hakbang (Login, Register, Verify...)
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} · River of Life Calapan`;
    return () => { document.title = prev; };
  }, [title]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const swapTo = (to) => {
    if (swapping) return;
    if (prefersReducedMotion()) { navigate(to); return; }
    setSwapping(true);
    timer.current = setTimeout(() => { lastGo = copy.go; navigate(to); }, SWAP_MS);
  };

  return (
    <SwapContext.Provider value={swapTo}>
      <div
        className={`auth-page${swapping ? " is-swapping" : ""}`}
        data-side={copy.side}
        data-mode={mode}
        data-go={swapping ? copy.go : undefined}
        data-arrive={arrive.current || undefined}
      >
        <div className="auth-shell">
          {/* ============ BRAND PANEL ============ */}
          <aside className="auth-brand">
            <div className="auth-photo" aria-hidden="true">
              {photoSrc && (
                <img key={photoSrc} src={photoSrc} alt="" decoding="async" onError={() => setPhotoSrc(photoSrc === "/auth.jpg" ? "/hero.jpg" : "")} />
              )}
            </div>

            <div className="auth-brand-in">
              <Logo />
              <div className="auth-copy">
                <h2>{copy.title}</h2>
                <p>{copy.body}</p>
                <SwapLink to={copy.to} className="auth-ghost">
                  {copy.cta}<ArrowRight size={18} aria-hidden="true" />
                </SwapLink>
              </div>
              <figure className="auth-verse">
                <blockquote>“{copy.verse}”</blockquote>
                <figcaption>{copy.ref}</figcaption>
              </figure>
            </div>
          </aside>

          {/* ============ FORM PANEL ============ */}
          <main className="auth-main">
            <div className="auth-topbar">
              <Link to="/" className="auth-back"><ArrowLeft size={18} aria-hidden="true" />Back to home</Link>
              <ThemeToggle />
            </div>

            <div className="auth-card">
              <nav className="auth-tabs" data-on={swapping ? (mode === "login" ? "register" : "login") : mode} aria-label="Login or register">
                <SwapLink to="/login" className={mode === "login" ? "on" : undefined} aria-current={mode === "login" ? "page" : undefined}>Login</SwapLink>
                <SwapLink to="/register" className={mode === "register" ? "on" : undefined} aria-current={mode === "register" ? "page" : undefined}>Register</SwapLink>
                <i aria-hidden="true" />
              </nav>
              <p className="auth-kicker"><i aria-hidden="true" />{copy.kicker}</p>
              <h1>{title}</h1>
              <p className="auth-sub">{subtitle}</p>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SwapContext.Provider>
  );
}

/* ---------- Mga field ---------- */
// Kapag payak na <input> ang ipinasa (walang AuthInput), kusa itong ginagawang styled na may icon.
const iconFor = (p) => {
  if (p.type === "email") return Mail;
  if (p.type === "tel") return Phone;
  if (p.type === "password") return Lock;
  return /name/i.test(`${p.id || ""} ${p.name || ""} ${p.autoComplete || ""}`) ? User : null;
};
export function AuthField({ id, label, hint, children }) {
  const kids = Array.isArray(children) ? children : [children];
  const body = kids.map((c, i) =>
    c && c.type === "input" ? <AuthInput key={c.key ?? i} icon={iconFor(c.props)} {...c.props} /> : c
  );
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}{hint && <span className="hint"> {hint}</span>}</label>
      {body}
    </div>
  );
}

// Input na may icon sa kaliwa at animated na linya kapag naka-focus
export function AuthInput({ icon: Icon, right, placeholder, ...props }) { // walang placeholder, label lang ang gabay
  return (
    <div className="af">
      {Icon && <Icon className="af-ico" size={19} strokeWidth={1.75} aria-hidden="true" />}
      <input {...props} />
      {right}
      <i className="af-bar" aria-hidden="true" />
    </div>
  );
}

export function PasswordInput({ id, value, onChange, ...rest }) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const detectCaps = (e) => setCaps(!!e.getModifierState?.("CapsLock"));

  return (
    <>
      <AuthInput
        icon={Lock}
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        {...rest}
        onKeyDown={detectCaps}
        onKeyUp={detectCaps}
        onBlur={() => setCaps(false)}
        right={
          <button
            type="button"
            className="auth-pw-toggle"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? <EyeOff size={19} strokeWidth={1.75} aria-hidden="true" /> : <Eye size={19} strokeWidth={1.75} aria-hidden="true" />}
          </button>
        }
      />
      {caps && <p className="auth-caps" role="status">Caps Lock is on</p>}
    </>
  );
}

export function SubmitButton({ loading = false, loadingText = "Signing in…", children, ...rest }) {
  return (
    <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading} {...rest}>
      {loading ? <span className="auth-spinner" aria-hidden="true" /> : null}
      <span>{loading ? loadingText : children}</span>
      {!loading && <ArrowRight size={18} aria-hidden="true" />}
    </button>
  );
}
