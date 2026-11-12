// frontend/src/pages/Home.jsx
// Public home page ng River of Life Calapan.
// Black & white theme · mixed sharp/soft edges · editorial type · mobile-first.
//
// MGA LARAWAN (ilagay sa frontend/public/). Kapag wala pa, may maayos na placeholder at hindi masisira ang layout:
//   hero.jpg        - malapad na photo sa likod ng hero (landscape, mas maganda kung 1920x1080 pataas)
//   about.jpg       - About section (portrait / 4:5)
//   pastor.jpg      - maliit na larawan ng pastor (square)
//   sunday.jpg      - Sunday Service card (landscape)
//   fire.jpg        - Fire on the Altar card (landscape)
//   ministries.jpg  - Ministries section (portrait / 4:5)
//   community.jpg   - Community section (square)
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Menu, X, ArrowRight, ArrowUpRight, MapPin, Clock, Phone, Mail,
  Heart, CalendarDays, Users, MessageCircle, BookOpen,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import api from "../api";
import "./home.css";

/* ====================================================================
   NILALAMAN (dito mo palitan ang mga teksto, oras, at link)
==================================================================== */
const FACEBOOK_URL = "https://www.facebook.com/riveroflifeintcalapan";
const INSTAGRAM_URL = "https://www.instagram.com/riveroflifecalapan";

// TODO: palitan ng totoong detalye ng simbahan
const CONTACT = {
  address: "Lalud Highway, Calapan City, 5200 Oriental Mindoro",
  phone: "0963 590 3836",
  email: "riveroflifecalapan.ph@gmail.com",
  mapQuery: "Janssen Rabulan, Lalud Highway, Calapan City, 5200 Oriental Mindoro",
  // MAS TUMPAK: Google Maps > Share > "Embed a map" > kopyahin ang src="..." (URL lang) dito
  mapEmbedUrl: "",
  // Google Maps > Share > "Send a link" > Copy link
  mapLinkUrl: "",
};

// TODO: palitan ng totoong araw at oras
const services = [
  { id: "sunday", title: "Sunday Service", day: "Sunday", time: "9:00 AM – 11:00 AM", desc: "Worship, the Word, and fellowship. Come as you are and stay for coffee and conversation.", img: "/sunday.jpg" },
  { id: "fire", title: "Fire on the Altar", day: "Friday", time: "6:00 PM – 8:00 PM", desc: "A night of prayer and worship as we seek God together and lift one another up.", img: "/fire.jpg" },
];

const PASTOR = { name: "Pastor Alvin Jester Culla", role: "Lead Pastor", photo: "/pastor.jpg" };

// TODO: palitan ng aktwal na ministries ng simbahan
const ministries = [
  { title: "Worship", desc: "Lead the church in song through vocals, instruments, and the praise team." },
  { title: "Youth", desc: "A space for young people to grow in faith, friendship, and purpose." },
  { title: "Kids", desc: "Fun, safe, and Bible-based lessons for our youngest members." },
  { title: "Media", desc: "Sound, lights, livestream, and graphics that help the church connect." },
  { title: "Prayer", desc: "Stand in the gap and pray for the needs of our church and city." },
  { title: "Outreach", desc: "Serve the community of Calapan through feeding programs and visits." },
];

// to: route · href: anchor · action: "chat" (bubuksan ang chatbot)
const features = [
  { icon: Users, title: "Ministries", desc: "Find a ministry where you can serve, belong, and grow alongside others.", cta: "Explore ministries", href: "#ministries" },
  { icon: CalendarDays, title: "Events", desc: "Stay updated with church activities and announcements, and RSVP in a tap.", cta: "Create an account", to: "/register" },
  { icon: Heart, title: "Prayer requests", desc: "Share your prayer needs with your church family and pray for one another.", cta: "Share a prayer", to: "/register" },
  { icon: MessageCircle, title: "AI assistant", desc: "Questions about service times, ministries, or visiting? Ask anytime.", cta: "Ask now", action: "chat" },
];

// Mga talata mula sa Biblia (KJV, public domain)
const verses = [
  { tone: "dark", label: "Share your prayers", text: "Bear ye one another's burdens, and so fulfil the law of Christ.", ref: "Galatians 6:2" },
  { tone: "light", label: "Celebrate His goodness", text: "O magnify the LORD with me, and let us exalt his name together.", ref: "Psalm 34:3" },
];
const FALLBACK_VERSE = { reference: "Ecclesiastes 3:11", text_en: "He hath made every thing beautiful in his time." };

const faqs = [
  { q: "What should I wear?", a: "Come as you are. Most people wear casual or smart-casual clothes." },
  { q: "How long is the Sunday service?", a: "About 1.5 to 2 hours, including worship, the message, and fellowship." },
  { q: "Is there something for my kids?", a: "Yes. Our Kids ministry has Bible-based activities during the Sunday service." },
  { q: "Do I need to register to attend?", a: "Visitors are welcome to just come. To have your attendance recorded, please register. You will get a personal QR code to show at the entrance, plus access to events, prayer requests, and more." },
  { q: "I have other questions.", a: null }, // may link sa chatbot
];

// TODO: ilagay ang totoong detalye. Kapag walang laman, hindi lalabas ang Give section.
const GIVE = { gcashName: "", gcashNumber: "", qrImage: "/gcash-qr.png" };

const NAV = [
  ["about", "About"],
  ["gatherings", "Gatherings"],
  ["ministries", "Ministries"],
  ["faq", "FAQ"],
  ["visit", "Visit"],
];
const SPY_IDS = NAV.map(([id]) => id);
const TICKER = ["Worship", "Prayer", "Community", "The Word", "Service", "Growth", "Fellowship"];
const HERO_WORDS = ["Let", "your", "life", "flow", "with", "God's", "love."];

const openChatbot = () => window.dispatchEvent(new CustomEvent("open-chatbot"));
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ====================================================================
   Maliliit na piyesa
==================================================================== */
// Opisyal na hitsura at kulay ng Facebook at Instagram
function FacebookIcon({ size = 36 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path fill="#fff" d="M16.671 15.469 17.203 12h-3.328V9.75c0-.949.465-1.875 1.956-1.875h1.513V4.922s-1.373-.234-2.686-.234c-2.741 0-4.533 1.662-4.533 4.669V12H7.078v3.469h3.047V24h3.75v-8.531h2.796Z" />
    </svg>
  );
}
function InstagramIcon({ size = 36 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FEDA77" />
          <stop offset=".3" stopColor="#F58529" />
          <stop offset=".55" stopColor="#DD2A7B" />
          <stop offset=".8" stopColor="#8134AF" />
          <stop offset="1" stopColor="#515BD4" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="4" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="16.1" cy="7.9" r="1" fill="#fff" />
    </svg>
  );
}

// Payak na alon (sine) na paulit-ulit; 1200 ang lapad, 600 ang period kaya seamless ang loop.
const wavePath = (base, amp, phase) => {
  let d = "";
  for (let x = 0; x <= 1200; x += 20) {
    const y = base + amp * Math.sin((x / 600) * Math.PI * 2 + phase);
    d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)} `;
  }
  return d;
};
const WAVES = [wavePath(40, 14, 0), wavePath(70, 12, 1.4), wavePath(100, 10, 2.8)];

function River({ className = "" }) {
  return (
    <div className={`river ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1200 140" preserveAspectRatio="none">
        {WAVES.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    </div>
  );
}

// Larawan na may matalas na frame. Kapag wala pa ang file, logo placeholder ang lalabas.
function Photo({ src, alt, ratio = "4 / 5", className = "", tilt = false, chip, children }) {
  const [ok, setOk] = useState(true);
  return (
    <figure className={`photo ${className}`} style={{ "--ratio": ratio }} data-tilt={tilt ? "" : undefined}>
      <div className="photo-in">
        <span className="photo-fallback" aria-hidden="true"><img src="/logo.png" alt="" /></span>
        {ok && (
          <img src={src} alt={alt} loading="lazy" decoding="async" data-parallax="0.07" onError={() => setOk(false)} />
        )}
      </div>
      {chip}
      {children}
    </figure>
  );
}

function Eyebrow({ children }) {
  return <p className="eyebrow"><i aria-hidden="true" />{children}</p>;
}

// Hinahati ang heading sa mga salita para sa stagger reveal
function Words({ text }) {
  return text.split(" ").map((w, i, a) => (
    <Fragment key={i}>
      <span className="wd"><span style={{ "--i": i }}>{w}</span></span>
      {i < a.length - 1 ? " " : null}
    </Fragment>
  ));
}

// Numero na umaakyat kapag nakita sa screen. Totoong bilang mula sa data, hindi gawa-gawa.
function Stat({ to, label }) {
  const ref = useRef(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) { setV(to); return; }
    let raf;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / 1400);
        setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <div className="stat" ref={ref}><b>{v}</b><span>{label}</span></div>;
}

// Gumagana ang mga CTA: router link / anchor / chatbot
function CtaLink({ item, className, children }) {
  const inner = children ?? <>{item.cta}<ArrowUpRight size={18} aria-hidden="true" /></>;
  if (item.action === "chat") return <button type="button" className={className} onClick={openChatbot}>{inner}</button>;
  if (item.to) return <Link to={item.to} className={className}>{inner}</Link>;
  return <a href={item.href} className={className}>{inner}</a>;
}

/* ====================================================================
   Hooks
==================================================================== */
// Fade-in kapag lumabas sa screen ang element na may class na "reveal"
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".home .reveal:not(.in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ISANG scroll listener (rAF-throttled) para sa: nav line, scrollspy, at parallax
// ng mga elementong nakikita lang sa screen. Transform lang ang ginagalaw (mura sa GPU).
function useScrollEffects(ids, setActive, setScrolled) {
  useEffect(() => {
    const parallaxOn = !prefersReducedMotion() && !navigator.connection?.saveData;
    const visible = new Set();
    const root = document.querySelector(".home");
    let io;
    if (parallaxOn && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))),
        { rootMargin: "120px 0px" }
      );
      document.querySelectorAll(".home [data-parallax]").forEach((el) => io.observe(el));
    }

    let ticking = false;
    let lastActive = "";
    let lastScrolled = false;

    const run = () => {
      ticking = false;
      const vh = window.innerHeight;

      const max = document.documentElement.scrollHeight - vh;
      root?.style.setProperty("--sp", max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : "0");

      const sc = window.scrollY > 8;
      if (sc !== lastScrolled) { lastScrolled = sc; setScrolled(sc); }

      const atBottom = vh + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current = "";
      if (atBottom) current = ids[ids.length - 1];
      else {
        const line = vh * 0.35;
        ids.forEach((id) => {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= line) current = id;
        });
      }
      if (current !== lastActive) { lastActive = current; setActive(current); }

      if (visible.size) {
        const factor = window.innerWidth < 720 ? 0.6 : 1;
        visible.forEach((el) => {
          const box = el.parentElement.getBoundingClientRect();
          const speed = parseFloat(el.dataset.parallax) * factor;
          const range = el.dataset.range ? parseFloat(el.dataset.range) : box.height * 0.07;
          const raw = (box.top + box.height / 2 - vh / 2) * -speed;
          const y = Math.max(-range, Math.min(range, raw));
          el.style.setProperty("--py", `${y.toFixed(1)}px`);
        });
      }
    };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(run); }
    };
    run();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      io?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ====================================================================
   Mga section
==================================================================== */
// Accordion na gamit ng Ministries at FAQ (isa lang ang bukas, may smooth na height animation)
function Accordion({ items, idPrefix, className = "", firstOpen = true, renderBody, renderLead }) {
  const [open, setOpen] = useState(firstOpen ? 0 : -1);
  return (
    <ul className={`acc ${className}`}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <li key={it.q || it.title} className={`acc-item ${isOpen ? "is-open" : ""}`} style={{ "--k": i }}>
            <h3>
              <button type="button" className="acc-q" aria-expanded={isOpen} aria-controls={`${idPrefix}-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                {renderLead && <span className="acc-no" aria-hidden="true">{renderLead(i)}</span>}
                <span className="acc-t">{it.q || it.title}</span>
              </button>
            </h3>
            <div className="acc-panel" id={`${idPrefix}-${i}`} role="region" aria-label={it.q || it.title}>
              <div>{renderBody(it, i)}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function GiveSection() {
  const [copied, setCopied] = useState(false);
  const [qrBroken, setQrBroken] = useState(false);
  if (!GIVE.gcashNumber && !GIVE.gcashName) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(GIVE.gcashNumber.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  return (
    <section id="give" className="sec">
      <div className="wrap">
        <div className="give reveal">
          {!qrBroken && <img className="give-qr" src={GIVE.qrImage} alt="GCash QR code" onError={() => setQrBroken(true)} />}
          <div>
            <Eyebrow>Give</Eyebrow>
            <h2 className="h2"><Words text="Your offering helps us serve." /></h2>
            {GIVE.gcashName && <p>Account name: <strong>{GIVE.gcashName}</strong></p>}
            {GIVE.gcashNumber && (
              <div className="give-number">
                {GIVE.gcashNumber}
                <button type="button" className="rl-btn rl-btn-ghost" onClick={copy}>{copied ? "Copied" : "Copy number"}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====================================================================
   Page
==================================================================== */
export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [daily, setDaily] = useState(null);
  const [heroBroken, setHeroBroken] = useState(false);
  const [pastorBroken, setPastorBroken] = useState(false);

  const burgerRef = useRef(null);
  const closeRef = useRef(null);
  const drawerRef = useRef(null);

  useReveal();
  useScrollEffects(SPY_IDS, setActive, setScrolled);

  // Verse of the day (public endpoint). Kapag offline/walang data, may fallback.
  useEffect(() => {
    let cancelled = false;
    api.get("/verse/daily", { params: { portal: "home" } })
      .then((r) => { if (!cancelled) setDaily(r.data?.success ? r.data.data : FALLBACK_VERSE); })
      .catch(() => { if (!cancelled) setDaily(FALLBACK_VERSE); });
    return () => { cancelled = true; };
  }, []);

  // Side drawer: Esc para magsara, focus trap, lock ang scroll ng page
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { closeMenu(); burgerRef.current?.focus(); return; }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const f = drawerRef.current.querySelectorAll("a[href], button:not([disabled])");
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const onResize = () => { if (window.innerWidth >= 960) closeMenu(); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen, closeMenu]);

  const mapQuery = encodeURIComponent(CONTACT.mapQuery || CONTACT.address);
  const mapSrc = CONTACT.mapEmbedUrl || `https://www.google.com/maps?q=${mapQuery}&output=embed`;
  const mapLink = CONTACT.mapLinkUrl || `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  const tel = `tel:${CONTACT.phone.replace(/\s/g, "")}`;
  const pastorInitials = PASTOR.name.split(" ").filter((w) => !/^pastor$/i.test(w)).map((w) => w[0]).slice(0, 2).join("");
  const dailyText = daily?.text_en;

  // Spotlight na sumusunod sa cursor (mouse/pen lang, hindi sa touch)
  const spot = (e) => {
    if (e.pointerType === "touch") return;
    const t = e.target.closest?.("[data-tilt]");
    if (t) {
      const b = t.getBoundingClientRect();
      t.style.setProperty("--ry", `${(((e.clientX - b.left) / b.width) - 0.5) * 7}deg`);
      t.style.setProperty("--rx", `${(0.5 - ((e.clientY - b.top) / b.height)) * 7}deg`);
    }
    const el = e.target.closest?.("[data-spot]");
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const untilt = (e) => {
    const t = e.target.closest?.("[data-tilt]");
    if (t && !t.contains(e.relatedTarget)) { t.style.setProperty("--rx", "0deg"); t.style.setProperty("--ry", "0deg"); }
  };

  return (
    <div className="home" id="top" onPointerMove={spot} onPointerOut={untilt}>
      {/* ================= NAVBAR ================= */}
      <header className={`nav ${scrolled ? "is-scrolled" : ""}`}>
        <div className="wrap nav-in">
          <a href="#top" className="rl-brand" aria-label="River of Life Calapan, back to top">
            <img src="/logo.png" alt="" />
            <span>River of Life <em>Calapan</em></span>
          </a>

          <nav className="nav-links" aria-label="Main">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className={active === id ? "is-active" : undefined} aria-current={active === id ? "true" : undefined}>{label}</a>
            ))}
          </nav>

          <div className="nav-actions">
            <ThemeToggle />
            <Link to="/login" className="rl-btn rl-btn-ghost nav-login">Login</Link>
            <Link to="/register" className="rl-btn rl-btn-primary nav-register">Register</Link>
            <button
              ref={burgerRef}
              type="button"
              className="burger"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="drawer"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile side drawer */}
      <div className={`scrim ${menuOpen ? "is-open" : ""}`} onClick={closeMenu} aria-hidden="true" />
      <aside id="drawer" ref={drawerRef} className={`drawer ${menuOpen ? "is-open" : ""}`} aria-label="Menu" aria-hidden={!menuOpen} inert={!menuOpen}>
        <div className="drawer-top">
          <span className="rl-brand">
            <img src="/logo.png" alt="" />
            <span>River of Life <em>Calapan</em></span>
          </span>
          <button ref={closeRef} type="button" className="burger" aria-label="Close menu" onClick={() => { closeMenu(); burgerRef.current?.focus(); }}>
            <X size={22} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <nav className="drawer-links" aria-label="Mobile">
          {NAV.map(([id, label], i) => (
            <a key={id} href={`#${id}`} onClick={closeMenu} style={{ "--i": i }} className={active === id ? "is-active" : undefined}>
              <span>{label}</span><ArrowRight size={20} aria-hidden="true" />
            </a>
          ))}
        </nav>
        <div className="drawer-cta">
          <Link to="/register" className="rl-btn rl-btn-primary rl-btn-block" onClick={closeMenu}>Register</Link>
          <Link to="/login" className="rl-btn rl-btn-ghost rl-btn-block" onClick={closeMenu}>Login</Link>
          <p>{CONTACT.address}</p>
        </div>
      </aside>

      <main>
        {/* ================= HERO ================= */}
        <section className="hero" data-spot>
          <div className="hero-bg" aria-hidden="true">
            {!heroBroken && (
              <img src="/hero.jpg" alt="" fetchPriority="high" decoding="async" data-parallax="0.14" data-range="80" onError={() => setHeroBroken(true)} />
            )}
          </div>
          <div className="hero-glow" aria-hidden="true" />
          <div className="wrap hero-main">
            <p className="hero-meta">
              <span><Clock size={16} aria-hidden="true" />{services[0].day} · {services[0].time}</span>
              <span><MapPin size={16} aria-hidden="true" />Calapan City, Oriental Mindoro</span>
            </p>
            <h1 aria-label="Let your life flow with God's love.">
              {HERO_WORDS.map((w, i) => (
                <Fragment key={w}>
                  <span className="w" aria-hidden="true">
                    <span className={w === "flow" ? "outline" : undefined} style={{ "--i": i }}>{w}</span>
                  </span>{" "}
                </Fragment>
              ))}
            </h1>
            <p className="lead">
              A church family where everyone is welcome. A space to share prayers,
              encourage one another, and celebrate God's goodness together.
            </p>
            <div className="hero-btns">
              <Link to="/register" className="rl-btn rl-btn-light rl-btn-lg">Join the community<ArrowRight size={18} aria-hidden="true" /></Link>
              <a href="#gatherings" className="rl-btn rl-btn-outline-light rl-btn-lg">See gathering times</a>
            </div>
          </div>
          <div className="wrap hero-foot">
            {dailyText && (
              <p className="hero-verse">
                <span>“{dailyText}”</span>
                <b>{daily.reference}</b>
              </p>
            )}
          </div>
        </section>

        {/* ================= TICKER ================= */}
        <div className="ticker" aria-hidden="true">
          <ul>
            {TICKER.map((t) => (<li key={t}><i />{t}</li>))}
          </ul>
        </div>

        {/* ================= ABOUT ================= */}
        <section id="about" className="sec">
          <div className="wrap split">
            <div className="reveal">
              <Photo src="/about.jpg" alt="River of Life Calapan worshipping together" ratio="4 / 5" className="photo-tall" tilt>
                <figcaption className="pastor">
                  <span className="pastor-av">
                    <span aria-hidden="true">{pastorInitials}</span>
                    {!pastorBroken && <img src={PASTOR.photo} alt="" loading="lazy" onError={() => setPastorBroken(true)} />}
                  </span>
                  <span><strong>{PASTOR.name}</strong><small>{PASTOR.role}</small></span>
                </figcaption>
              </Photo>
            </div>
            <div className="copy reveal">
              <Eyebrow>About us</Eyebrow>
              <h2 className="h2"><Words text="A home for everyone looking for one." /></h2>
              <p>
                River of Life Calapan is a community of believers committed to worshipping God,
                growing in His Word, and serving one another. Whether you are new to faith or
                have walked with Christ for years, you have a place here.
              </p>
              <p>We believe faith is lived best together, in prayer, in encouragement, and in celebrating what God has done.</p>
              <div className="stats">
                <Stat to={services.length} label="Weekly gatherings" />
                <Stat to={ministries.length} label="Ministries to join" />
                <Stat to={features.length} label="Ways to stay connected" />
              </div>
              <a href="#visit" className="rl-btn rl-btn-primary">Find us<ArrowRight size={18} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        {/* ================= GATHERINGS ================= */}
        <section id="gatherings" className="sec sec-alt">
          <div className="wrap">
            <div className="sec-head reveal">
              <div>
                <Eyebrow>Gatherings</Eyebrow>
                <h2 className="h2"><Words text="Join us this week" /></h2>
              </div>
              <p>Two times to meet with God and with each other. Come as you are.</p>
            </div>
            <div className="gather">
              {services.map((s, i) => (
                <article className="g-card reveal" data-spot key={s.id} style={{ "--d": `${i * 100}ms` }}>
                  <Photo
                    src={s.img}
                    alt={`${s.title} at River of Life Calapan`}
                    ratio="16 / 10"
                    className="photo-card"
                    chip={<span className="chip"><Clock size={14} aria-hidden="true" />{s.day} · {s.time}</span>}
                  />
                  <div className="g-body">
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                    <a href="#visit" className="text-cta">Where to find us<ArrowRight size={16} aria-hidden="true" /></a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ================= MINISTRIES ================= */}
        <section id="ministries" className="sec">
          <div className="wrap split">
            <div className="reveal">
              <Photo src="/ministries.jpg" alt="Members serving together in ministry" ratio="4 / 5" className="photo-tall photo-stick" tilt chip={<span className="chip"><Users size={14} aria-hidden="true" />{ministries.length} ministries</span>} />
            </div>
            <div className="reveal">
              <Eyebrow>Ministries</Eyebrow>
              <h2 className="h2"><Words text="Find a place to serve and grow" /></h2>
              <p className="sub">Every gift matters here. Pick a ministry to learn more, then join through your account.</p>
              <Accordion
                items={ministries}
                idPrefix="min"
                className="acc-min"
                renderBody={(m) => (
                  <>
                    <p>{m.desc}</p>
                    <Link to="/register" className="text-cta">Join {m.title}<ArrowRight size={16} aria-hidden="true" /></Link>
                  </>
                )}
              />
            </div>
          </div>
        </section>

        {/* ================= COMMUNITY ================= */}
        <section id="community" className="sec sec-alt">
          <div className="wrap split split-rev">
            <div className="copy reveal">
              <Eyebrow>Community</Eyebrow>
              <h2 className="h2"><Words text="Carry each other's prayers. Celebrate every answer." /></h2>
              <p>
                Your account is your door into our digital community space: submit a prayer request,
                stand with others in theirs, and share the good things God is doing in your life.
              </p>
              <ul className="points">
                <li><Heart size={20} aria-hidden="true" />Share prayer needs with your church family</li>
                <li><Users size={20} aria-hidden="true" />Encourage one another through ministries and groups</li>
                <li><CalendarDays size={20} aria-hidden="true" />Never miss an event, announcement, or sermon</li>
              </ul>
              <Link to="/register" className="rl-btn rl-btn-primary">Create your account<ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
            <div className="reveal">
              <Photo src="/community.jpg" alt="Church family sharing a moment of fellowship" ratio="1 / 1" className="photo-sq" tilt chip={<span className="chip"><Heart size={14} aria-hidden="true" />Pray together</span>} />
            </div>
          </div>
        </section>

        {/* ================= WHAT YOU CAN DO ================= */}
        <section id="features" className="sec">
          <div className="wrap">
            <div className="sec-head reveal">
              <div>
                <Eyebrow>What you can do</Eyebrow>
                <h2 className="h2"><Words text="Everything you need to stay connected" /></h2>
              </div>
              <p>One account opens your church family's space, on any device.</p>
            </div>
            <div className="cells">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <article className="cell reveal" key={f.title} style={{ "--d": `${i * 80}ms` }}>
                    <span className="cell-icon"><Icon size={24} strokeWidth={1.6} aria-hidden="true" /></span>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                    <CtaLink item={f} className="cell-link" />
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= VERSES ================= */}
        <section id="verses" className="sec sec-alt">
          <div className="wrap">
            <div className="sec-head reveal">
              <div>
                <Eyebrow>Words we gather around</Eyebrow>
                <h2 className="h2"><Words text="What we hold on to, together" /></h2>
              </div>
            </div>
            <div className="quotes">
              <aside className="today reveal" aria-live="polite">
                {dailyText && (
                  <>
                    <p className="today-label"><BookOpen size={15} aria-hidden="true" />Verse of the day</p>
                    <p className="today-text">“{dailyText}”</p>
                    <p className="today-ref">{daily.reference}</p>
                  </>
                )}
              </aside>
              {verses.map((v, i) => (
                <figure key={v.ref} data-spot className={`quote quote-${v.tone} reveal`} style={{ "--d": `${i * 100}ms` }}>
                  <span className="quote-mark" aria-hidden="true">“</span>
                  <blockquote>{v.text}</blockquote>
                  <figcaption><b>{v.label}</b><span>{v.ref}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ================= FAQ (minimal) ================= */}
        <section id="faq" className="sec">
          <div className="wrap faq">
            <h2 className="faq-title reveal"><Words text="Frequently Asked Questions" /></h2>
            <div className="reveal">
              <Accordion
                items={faqs}
                idPrefix="faq"
                className="acc-faq"
                firstOpen={false}
                renderBody={(f) => (
                  <p>
                    {f.a ?? (
                      <>
                        Ask our <button type="button" className="text-link" onClick={openChatbot}>AI assistant</button> anytime, or message us on{" "}
                        <a href={FACEBOOK_URL} target="_blank" rel="noreferrer">Facebook</a>.
                      </>
                    )}
                  </p>
                )}
              />
            </div>
          </div>
        </section>

        {/* ================= VISIT ================= */}
        <section id="visit" className="sec sec-alt">
          <div className="wrap">
            <div className="sec-head reveal">
              <div>
                <Eyebrow>Visit us</Eyebrow>
                <h2 className="h2"><Words text="First time? You're welcome here" /></h2>
              </div>
            </div>
            <div className="visit">
              <div className="visit-info reveal">
                <ul className="visit-list">
                  <li><span><MapPin size={20} aria-hidden="true" /></span><div><small>Address</small>{CONTACT.address}</div></li>
                  {services.map((s) => (
                    <li key={s.id}><span><Clock size={20} aria-hidden="true" /></span><div><small>{s.title}</small>{s.day}, {s.time}</div></li>
                  ))}
                  <li><span><Phone size={20} aria-hidden="true" /></span><div><small>Call</small><a href={tel}>{CONTACT.phone}</a></div></li>
                  <li><span><Mail size={20} aria-hidden="true" /></span><div><small>Email</small><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></div></li>
                </ul>
                <div className="btn-row">
                  <a className="rl-btn rl-btn-primary" href={mapLink} target="_blank" rel="noreferrer">Get directions<ArrowUpRight size={18} aria-hidden="true" /></a>
                  <a className="rl-btn rl-btn-ghost" href={FACEBOOK_URL} target="_blank" rel="noreferrer">Message us</a>
                </div>
              </div>
              <div className="visit-map reveal">
                <iframe title="River of Life Calapan location" src={mapSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            </div>
          </div>
        </section>

        <GiveSection />

        {/* ================= CTA (full-bleed) ================= */}
        <section className="cta">
          <River className="river-cta" />
          <div className="wrap cta-in reveal">
            <h2><Words text="Be part of our church family" /></h2>
            <p>Create an account to share prayers, join ministries, and stay close to what God is doing among us.</p>
            <div className="btn-row">
              <Link to="/register" className="rl-btn rl-btn-light rl-btn-lg">Register now<ArrowRight size={18} aria-hidden="true" /></Link>
              <button type="button" className="rl-btn rl-btn-outline-light rl-btn-lg" onClick={openChatbot}>Ask the assistant</button>
            </div>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer id="contact" className="foot">
        <div className="wrap foot-grid">
          <div className="foot-brand">
            <span className="rl-brand">
              <img src="/logo.png" alt="" />
              <span>River of Life <em>Calapan</em></span>
            </span>
            <p>{CONTACT.address}</p>
            <div className="social">
              <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" aria-label="River of Life Calapan on Facebook"><FacebookIcon /></a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label="River of Life Calapan on Instagram"><InstagramIcon /></a>
            </div>
          </div>

          <nav aria-label="Footer">
            <h4>Explore</h4>
            <ul>
              <li><a href="#about">About</a></li>
              <li><a href="#gatherings">Gatherings</a></li>
              <li><a href="#ministries">Ministries</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#visit">Visit us</a></li>
            </ul>
          </nav>

          <div>
            <h4>Gatherings</h4>
            <ul className="foot-times">
              {services.map((s) => (
                <li key={s.id}><span>{s.title}</span><b>{s.day}, {s.time}</b></li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href={tel}>{CONTACT.phone}</a></li>
              <li><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
              <li><a href={mapLink} target="_blank" rel="noreferrer">Get directions</a></li>
            </ul>
          </div>

          <div>
            <h4>Your account</h4>
            <ul>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
              <li><button type="button" onClick={openChatbot}>Ask the assistant</button></li>
            </ul>
          </div>
        </div>
        <div className="wrap">
          <p className="copy-line">© {new Date().getFullYear()} River of Life Calapan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
