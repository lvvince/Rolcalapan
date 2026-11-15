// frontend/src/components/LoginLayout.jsx
// Shared na layout ng Login at Register. Black & white, minimal, smooth.
//
// SWAP: sa desktop, nagpapalit ng pwesto ang brand panel at ang form (slide pakaliwa/pakanan)
// kapag pinindot ang "Sign up" / "Sign in". Magkaibang route ang Login at Register kaya ang slide
// ay nagpe-play MUNA bago mag-navigate; pagdating sa bagong pahina, tuloy ang galaw (walang fade).
//
// LARAWAN (optional): frontend/public/auth.jpg ang background ng brand panel. Kapag wala, hero.jpg.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import "./login.css";
import "./auth-extras.css";

const PATHS = { login: "/login", register: "/register", forgot: "/forgot-password", reset: "/reset-password" };
const MODES = { "/login": "login", "/register": "register", "/forgot-password": "forgot" };
const DEPTH = { login: 0, register: 0, forgot: 1, reset: 2 };
// Direksyon ng huling swap ("l" o "r"). Binabasa ng bagong pahina para ituloy ang galaw.
let lastGo = null;
let ghost = null; // ang kopyang umaalis; aalisin kapag nakapasok na ang bagong pahina
const FADE_AT = { swap: 320, slide: 500, "soft-f": 200, "soft-b": 200 }; // ms bago itago ang kopya
let lastGoAt = 0; // oras ng huling swap, para maisabay ang animation ng bagong pahina
// Larawang gumana na (auth.jpg o hero.jpg). Naaalala para hindi mag-flash ang larawan kapag nagpalit ng pahina.
let knownPhoto = null;

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
  forgot: {
    side: "form-left",
    kicker: "Account recovery",
    title: "Lost your way? We'll walk you back.",
    body: "Enter the email you registered with and we'll send a link to set a new password. You are never locked out of your church family.",
    cta: "Back to login",
    to: "/login",
    verse: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
    ref: "Matthew 11:28",
  },
  reset: {
    side: "form-left",
    kicker: "Almost there",
    title: "A fresh start.",
    body: "Choose a new password you will remember. Use at least 6 characters, then sign in again.",
    cta: "Back to login",
    to: "/login",
    verse: "Behold, I make all things new.",
    ref: "Revelation 21:5",
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

/* Link papunta sa /login o /register. Nagsli-slide kapag pinindot (tingnan ang onLinkClick sa LoginLayout). */
export function SwapLink({ to, className, children, ...rest }) {
  // Ang slide mismo ay hawak ng LoginLayout (event delegation), kaya payak na Link na lang ito.
  return <Link to={to} className={className} {...rest}>{children}</Link>;
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
export function LoginLayout({ mode: modeProp = "login", title, subtitle, children }) {
  // Ang URL ang nagpapasya kung Login o Register (hindi na umaasa sa prop), para laging tama ang pwesto ng panels:
  //   /login    -> form sa KALIWA, larawan sa KANAN
  //   /register -> larawan sa KALIWA, form sa KANAN
  const { pathname = "" } = useLocation() || {};
  const mode = pathname.startsWith("/register") ? "register"
    : pathname.startsWith("/login") ? "login"
    : pathname.startsWith("/forgot-password") ? "forgot"
    : pathname.startsWith("/reset-password") ? "reset"
    : modeProp;
  const pair = mode === "login" || mode === "register"; // Login/Register lang ang may tabs
  const copy = COPY[mode] || COPY.login;
  const navigate = useNavigate();
  const [photoSrc, setPhotoSrc] = useState(knownPhoto || "/auth.jpg"); // auth.jpg muna, kung wala ay hero.jpg
  const busy = useRef(false);
  const rootRef = useRef(null);
  const lag = useRef(lastGo ? Math.min(400, Math.round(performance.now() - lastGoAt)) : 0);
  const arrive = useRef(lastGo); // paano dumating ang pahinang ito? ("swap" | "l" | "r" | "soft-f" | "soft-b" | null)

  // Kapag nakapasok na ang bagong pahina, saka lang itatago ang kopya (sa tamang oras), kaya laging pareho ang galaw
  // kahit gaano katagal mag-render ang pahina.
  useEffect(() => {
    const g = ghost; const kind = g?.dataset.kind;
    ghost = null; lastGo = null;
    if (!g) return;
    const wait = Math.max(0, (FADE_AT[kind] ?? 300) - (performance.now() - lastGoAt));
    setTimeout(() => g.classList.add("is-fading"), wait);
    setTimeout(() => g.remove(), wait + 500);
  }, []);

  // Tamang tab title sa bawat hakbang (Login, Register, Verify...)
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} · River of Life Calapan`;
    return () => { document.title = prev; };
  }, [title]);

  const here = PATHS[mode];

  // PAANO GUMAGANA: kinukunan ng "kopya" ang kasalukuyang pahina, inilalagay sa ibabaw, at AGAD nagna-navigate.
  // Ang kopya ang gumagalaw palabas (slide/swap) habang ang bagong pahina ay pumapasok mula sa kabila,
  // kaya sabay ang galaw, walang puwang, walang flash, at nagbabago na ang text habang gumagalaw.
  const goTo = (to) => {
    const target = MODES[to];
    if (!target || to === here || busy.current) return;
    const root = rootRef.current;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const pair = (mode === "login" || mode === "register") && (target === "login" || target === "register");
    const mobile = window.matchMedia?.("(max-width: 899px)").matches;
    const kind = pair ? (mobile ? "slide" : "swap") : (DEPTH[target] > DEPTH[mode] ? "soft-f" : "soft-b");
    const go = kind === "slide" ? COPY[mode].go : null;
    busy.current = true;
    setTimeout(() => { busy.current = false; }, 900);

    if (root && !reduce) {
      const c = root.cloneNode(true);
      c.classList.add("auth-leaving");
      c.setAttribute("aria-hidden", "true");
      c.setAttribute("inert", "");
      c.removeAttribute("data-arrive");
      c.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      c.dataset.kind = kind;
      if (go) c.dataset.go = go;
      if (window.scrollY) c.querySelector(".auth-shell").style.marginTop = `-${window.scrollY}px`;
      document.body.appendChild(c);
      void c.offsetWidth; // sisimulan ang transition mula sa kasalukuyang posisyon
      c.classList.add("is-swapping");
      ghost = c;
      setTimeout(() => { c.classList.add("is-fading"); setTimeout(() => c.remove(), 400); }, 2000); // safety lang
      lastGo = go || kind;
      lastGoAt = performance.now();
    }
    try { navigate(to); } catch { window.location.assign(to); }
  };

  // Kahit payak na <Link> ang gamit ng pahina, magsli-slide din (event delegation).
  // Capture phase: mauuna ito sa sariling click handler ng <Link>, kaya mapipigilan ang agarang navigate.
  const onLinkClick = (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a[href]");
    if (!a || a.target === "_blank") return;
    const path = a.getAttribute("href");
    if (!MODES[path]) return;
    e.preventDefault();
    goTo(path);
  };

  return (
      <div
        ref={rootRef}
        className="auth-page"
        data-side={copy.side}
        data-mode={mode}
        data-arrive={arrive.current || undefined}
        style={lag.current ? { "--lag": `-${lag.current}ms` } : undefined}
        onClickCapture={onLinkClick}
      >
        <div className="auth-shell">
          {/* ============ BRAND PANEL ============ */}
          <aside className="auth-brand">
            <div className="auth-photo" aria-hidden="true">
              {photoSrc && (
                <img
                  key={photoSrc}
                  src={photoSrc}
                  alt=""
                  decoding="sync"
                  fetchPriority="high"
                  onLoad={() => { knownPhoto = photoSrc; }}
                  onError={() => setPhotoSrc(photoSrc === "/auth.jpg" ? "/hero.jpg" : "")}
                />
              )}
            </div>

            <div className="auth-brand-in">
              <Logo />
              <div className="auth-copy">
                <h2>{copy.title}</h2>
                <p>{copy.body}</p>
                <Link to={copy.to} className="auth-ghost">
                  {!pair && <ArrowLeft size={18} aria-hidden="true" />}
                  {copy.cta}
                  {pair && <ArrowRight size={18} aria-hidden="true" />}
                </Link>
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
              {pair && (
                <nav className="auth-tabs" data-on={mode} aria-label="Login or register">
                  <Link to="/login" className={mode === "login" ? "on" : undefined} aria-current={mode === "login" ? "page" : undefined}>Login</Link>
                  <Link to="/register" className={mode === "register" ? "on" : undefined} aria-current={mode === "register" ? "page" : undefined}>Register</Link>
                  <i aria-hidden="true" />
                </nav>
              )}
              <p className="auth-kicker"><i aria-hidden="true" />{copy.kicker}</p>
              <h1>{title}</h1>
              <p className="auth-sub">{subtitle}</p>
              {children}
            </div>
          </main>
        </div>
      </div>
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
