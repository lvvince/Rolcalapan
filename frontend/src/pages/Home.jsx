import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import "./home.css";

const FACEBOOK_URL = "https://www.facebook.com/riveroflifeintcalapan";
const INSTAGRAM_URL = "https://www.instagram.com/riveroflifecalapan";

// TODO: palitan ng totoong detalye ng simbahan
const CONTACT = {
  address: "Lalud Highway, Calapan City, 5200 Oriental Mindoro",
  phone: "0963 590 3836",
  email: "riveroflifecalapan.ph@gmail.com",
  // Ito ang hinahanap sa Google Maps (pangalan ng listing + address) para lumabas ang eksaktong pin.
  mapQuery: "Janssen Rabulan, Lalud Highway, Calapan City, 5200 Oriental Mindoro",
  // MAS TUMPAK: Google Maps > ilagay ang listing > Share > "Embed a map" > kopyahin ang src="..." (URL lang) dito
  mapEmbedUrl: "",
  // Google Maps > Share > "Send a link" > Copy link, at ilagay dito
  mapLinkUrl: "",
};

// TODO: palitan ng totoong araw at oras
const services = [
  { title: "Sunday Service", day: "Sunday", time: "9:00 AM – 11:00 AM", desc: "Join us in worship, the Word, and fellowship." },
  { title: "Fire on the Altar", day: "Friday", time: "6:00 PM – 8:00 PM", desc: "A night of prayer and worship as we seek God together." },
];

// TODO: ilagay ang litrato sa /public/pastor.jpg
const PASTOR = { name: "Pastor Alvin Jester Culla", role: "Lead Pastor", photo: "/pastor.jpg" };

// TODO: palitan ng aktwal na ministries ng simbahan
const ministries = [
  { icon: <MusicIcon />, title: "Worship", desc: "Lead the church in song through vocals, instruments, and the praise team." },
  { icon: <UsersIcon />, title: "Youth", desc: "A space for young people to grow in faith, friendship, and purpose." },
  { icon: <SmileIcon />, title: "Kids", desc: "Fun, safe, and Bible-based lessons for our youngest members." },
  { icon: <VideoIcon />, title: "Media", desc: "Sound, lights, livestream, and graphics that help the church connect." },
  { icon: <HeartIcon />, title: "Prayer", desc: "Stand in the gap and pray for the needs of our church and city." },
  { icon: <GlobeIcon />, title: "Outreach", desc: "Serve the community of Calapan through feeding programs and visits." },
];

// action: "chat" (bubuksan ang chatbot) | to: route (react-router) | href: section/anchor
// TODO: palitan ang "/register" ng actual route (e.g. "/events") kapag meron na
const features = [
  { icon: <BookIcon />, title: "Ministries", desc: "Find a ministry where you can serve and grow.", href: "#ministries" },
  { icon: <CalendarIcon />, title: "Events", desc: "Stay updated with church activities and announcements.", to: "/register" },
  { icon: <HeartIcon />, title: "Prayer Requests", desc: "Share your prayer needs with our church family.", to: "/register" },
  { icon: <ChatIcon />, title: "AI Assistant", desc: "Ask questions about the church anytime.", action: "chat" },
];

// TODO: ilagay ang mga litrato sa /public/gallery/ (1.jpg, 2.jpg, ...). Ang hindi makita ay awtomatikong nakatago.
const GALLERY = Array.from({ length: 8 }, (_, i) => ({
  src: `/gallery/${i + 1}.jpg`,
  alt: `River of Life Calapan photo ${i + 1}`,
}));
const GALLERY_COMING_SOON = true; // gawing false kapag may litrato na

// TODO: ilagay ang totoong detalye. Kapag walang laman, hindi lalabas ang Give section.
const GIVE = {
  gcashName: "",
  gcashNumber: "",
  qrImage: "/gcash-qr.png",
};

// TODO: PLACEHOLDER lang ito. Palitan ng totoong testimonies (with permission) bago i-deploy.
const testimonies = [
  { quote: "I came in not knowing anyone, and now this church feels like family.", name: "Church member" },
  { quote: "Serving in ministry helped me grow in faith and in confidence.", name: "Ministry volunteer" },
  { quote: "Our whole family looks forward to Sunday worship every week.", name: "Church family" },
];

const faqs = [
  { q: "What should I wear?", a: "Come as you are. Most people wear casual or smart-casual clothes." },
  { q: "How long is the Sunday service?", a: "About 1.5 to 2 hours, including worship, the message, and fellowship." },
  { q: "Is there something for my kids?", a: "Yes. Our Kids ministry has Bible-based activities during the Sunday service." },
  { q: "Do I need to register to attend?", a: "Visitors are welcome to just come. To have your attendance recorded, please register. You will get a personal QR code to show at the entrance, plus access to events, prayer requests, and more." },
  { q: "I have other questions.", a: null }, // may link sa chatbot
];

/* ---------- Icons (inline SVG, sumusunod sa kulay ng text via currentColor) ---------- */
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function Svg({ children, size = 24 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}
function BookIcon() { return <Svg><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></Svg>; }
function HeartIcon() { return <Svg><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></Svg>; }
function ChatIcon() { return <Svg><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Svg>; }
function CalendarIcon() { return <Svg><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Svg>; }
function PinIcon({ size = 18 }) { return <Svg size={size}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Svg>; }
function ClockIcon({ size = 18 }) { return <Svg size={size}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Svg>; }
function PhoneIcon() { return <Svg size={18}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></Svg>; }
function MailIcon() { return <Svg size={18}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22 6 12 13 2 6" /></Svg>; }
function MusicIcon() { return <Svg><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></Svg>; }
function UsersIcon() { return <Svg><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>; }
function SmileIcon() { return <Svg><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></Svg>; }
function VideoIcon() { return <Svg><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></Svg>; }
function GlobeIcon() { return <Svg><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></Svg>; }
function ChevronDown() { return <Svg size={20}><polyline points="6 9 12 15 18 9" /></Svg>; }
function ChevronLeft() { return <Svg size={22}><polyline points="15 18 9 12 15 6" /></Svg>; }
function ChevronRight() { return <Svg size={22}><polyline points="9 18 15 12 9 6" /></Svg>; }
function CloseIcon() { return <Svg size={22}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>; }

/* ---------- Hooks ---------- */
// Fade-in kapag lumabas sa screen ang element na may class na "reveal"
function useReveal(deps = []) {
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
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Scrollspy: alin ang section na nasa screen para ma-highlight sa navbar.
// Kapag nasa pinakababa na ng page, ang huling id (contact) ang active.
function useActiveSection(ids) {
  const [active, setActive] = useState("");
  useEffect(() => {
    const onScroll = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setActive(ids[ids.length - 1]);
        return;
      }
      const line = window.innerHeight * 0.35;
      let current = "";
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      });
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return active;
}

const openChatbot = () => window.dispatchEvent(new CustomEvent("open-chatbot"));

/* ---------- Mga section ---------- */
function GallerySection() {
  const [broken, setBroken] = useState({});
  const [open, setOpen] = useState(-1);
  const visible = GALLERY.map((g, i) => ({ ...g, i })).filter((g) => !broken[g.i]);
  const pos = visible.findIndex((g) => g.i === open);

  const close = useCallback(() => setOpen(-1), []);
  const step = useCallback(
    (dir) => {
      if (visible.length === 0) return;
      const next = (pos + dir + visible.length) % visible.length;
      setOpen(visible[next].i);
    },
    [pos, visible]
  );

  useEffect(() => {
    if (open < 0) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, step]);

  if (GALLERY_COMING_SOON) {
    return (
      <section id="gallery" className="home-section">
        <div className="home-container">
          <h2 className="center">Gallery</h2>
          <p className="section-lead">Moments from our worship, events, and fellowship.</p>
          <p className="section-note">Coming soon.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="gallery" className="home-section">
      <div className="home-container">
        <h2 className="center">Gallery</h2>
        <p className="section-lead">Moments from our worship, events, and fellowship.</p>
        <div className="gallery-grid">
          {GALLERY.map((g, i) =>
            broken[i] ? null : (
              <button type="button" className="gallery-tile reveal" key={g.src} onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1}`}>
                <img src={g.src} alt={g.alt} loading="lazy" onError={() => setBroken((b) => ({ ...b, [i]: true }))} />
              </button>
            )
          )}
        </div>
        {visible.length === 0 && <p className="section-note">Add photos to <code>public/gallery/1.jpg</code>, <code>2.jpg</code>, and so on.</p>}
      </div>

      {open >= 0 && visible[pos] && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={close}>
          <img src={visible[pos].src} alt={visible[pos].alt} onClick={(e) => e.stopPropagation()} />
          <button type="button" className="lightbox-btn lightbox-close" onClick={close} aria-label="Close"><CloseIcon /></button>
          {visible.length > 1 && (
            <>
              <button type="button" className="lightbox-btn lightbox-prev" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous photo"><ChevronLeft /></button>
              <button type="button" className="lightbox-btn lightbox-next" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next photo"><ChevronRight /></button>
            </>
          )}
        </div>
      )}
    </section>
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
    <section id="give" className="home-section">
      <div className="home-container">
        <h2 className="center">Give</h2>
        <p className="section-lead">Your offering helps us serve our church and community.</p>
        <div className="give-card reveal">
          {!qrBroken && <img className="give-qr" src={GIVE.qrImage} alt="GCash QR code" onError={() => setQrBroken(true)} />}
          <div className="give-details" style={qrBroken ? { gridColumn: "1 / -1" } : undefined}>
            <h3>Give through GCash</h3>
            {GIVE.gcashName && <p>Account name: <strong>{GIVE.gcashName}</strong></p>}
            {GIVE.gcashNumber && (
              <div className="give-number">
                {GIVE.gcashNumber}
                <button type="button" className="btn btn-outline" onClick={copy}>{copied ? "Copied" : "Copy number"}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Page ---------- */
export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroBroken, setHeroBroken] = useState(false);
  const [pastorBroken, setPastorBroken] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  useReveal();
  const active = useActiveSection(["about", "services", "ministries", "visit", "contact"]);

  const mapQuery = encodeURIComponent(CONTACT.mapQuery || CONTACT.address);
  // Kapag may inilagay na exact embed/link, iyon ang gagamitin; kung wala, ang pangalan + address ng listing ang gamit
  const mapSrc = CONTACT.mapEmbedUrl || `https://www.google.com/maps?q=${mapQuery}&output=embed`;
  const mapLink = CONTACT.mapLinkUrl || `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const navLink = (id, label) => (
    <a href={`#${id}`} onClick={closeMenu} className={active === id ? "active" : undefined} aria-current={active === id ? "true" : undefined}>
      {label}
    </a>
  );

  return (
    <div className="home">
      {/* NAVBAR */}
      <header className="home-nav">
        <div className="home-container home-nav-inner">
          <a href="#top" className="home-logo" onClick={closeMenu}>
            <img src="/logo.png" alt="River of Life Calapan logo" />
            <span className="home-logo-text">
              River of Life <span>Calapan</span>
            </span>
          </a>

          <nav id="home-menu" className={`home-links ${menuOpen ? "open" : ""}`} aria-label="Main">
            {navLink("about", "About")}
            {navLink("services", "Services")}
            {navLink("ministries", "Ministries")}
            {navLink("visit", "Visit")}
            {navLink("contact", "Contact")}
            {/* Lalabas lang sa mobile menu */}
            <Link to="/login" className="home-links-login" onClick={closeMenu}>Login</Link>
          </nav>

          <div className="home-actions">
            <ThemeToggle />
            <Link to="/login" className="btn btn-outline home-login-btn">Login</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
            <button
              type="button"
              className="home-burger"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="home-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* HERO (optional photo: /public/hero.jpg) */}
      <section id="top" className="home-hero">
        {!heroBroken && (
          <div className="home-hero-bg" aria-hidden="true">
            <img src="/hero.jpg" alt="" onError={() => setHeroBroken(true)} />
          </div>
        )}
        <div className="home-container">
          <img src="/logo.png" alt="" className="home-hero-logo" />
          <p className="home-eyebrow">Welcome to</p>
          <h1>River of Life Calapan</h1>
          <p className="home-sub">A church family where everyone is welcome. Let your life flow with God's love.</p>
          <div className="home-hero-btns">
            <Link to="/register" className="btn btn-primary btn-lg">Join Us</Link>
            <a href="#services" className="btn btn-light btn-lg">Service Times</a>
          </div>
        </div>
      </section>

      {/* VERSE */}
      <section className="home-verse">
        <div className="home-container">
          <figure className="verse-card">
            <blockquote className="verse-text">
              "He has made everything beautiful in its time.
              He has also set eternity in the human heart;
              yet no one can fathom what God has done from beginning to end." (NIV)
            </blockquote>
            <figcaption className="verse-ref">Ecclesiastes 3:11</figcaption>
          </figure>
        </div>
      </section>

      {/* ABOUT + PASTOR */}
      <section id="about" className="home-section">
        <div className="home-container about-grid reveal">
          <div className="about-photo">
            <div className="about-photo-fallback" aria-hidden="true">{PASTOR.name.split(" ").filter((w) => !/^pastor$/i.test(w)).map((w) => w[0]).slice(0, 2).join("")}</div>
            {!pastorBroken && <img src={PASTOR.photo} alt={PASTOR.name} onError={() => setPastorBroken(true)} />}
          </div>
          <div className="about-text">
            <h2>About Us</h2>
            <p>
              River of Life Calapan is a community of believers committed to worshipping God,
              growing in His Word, and serving one another. Whether you are new to faith or have
              walked with Christ for years, you have a home here.
            </p>
            <p className="about-name">{PASTOR.name}</p>
            <p className="about-role">{PASTOR.role}</p>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="home-section home-alt">
        <div className="home-container">
          <h2 className="center">Join Our Gatherings</h2>
          <div className="home-grid home-grid-3">
            {services.map((s) => (
              <div className="home-card reveal" key={s.title}>
                <h3>{s.title}</h3>
                <span className="home-tag">{s.day} · {s.time}</span>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MINISTRIES */}
      <section id="ministries" className="home-section">
        <div className="home-container">
          <h2 className="center">Ministries</h2>
          <p className="section-lead">Find a place to serve and grow with others.</p>
          <div className="home-grid home-grid-3">
            {ministries.map((m) => (
              <Link to="/register" className="home-card home-card-link reveal" key={m.title}>
                <div className="home-icon">{m.icon}</div>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
                <span className="home-card-more">Join this ministry</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="home-section home-alt">
        <div className="home-container">
          <h2 className="center">What You Can Do</h2>
          <div className="home-grid home-grid-4">
            {features.map((f) => {
              const inner = (
                <>
                  <div className="home-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </>
              );
              return f.action === "chat" ? (
                <button type="button" className="home-card home-card-link reveal" key={f.title} onClick={openChatbot}>{inner}</button>
              ) : f.to ? (
                <Link to={f.to} className="home-card home-card-link reveal" key={f.title}>{inner}</Link>
              ) : (
                <a href={f.href} className="home-card home-card-link reveal" key={f.title}>{inner}</a>
              );
            })}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <GallerySection />

      {/* GIVE (lalabas lang kapag may laman ang GIVE) */}
      <GiveSection />

      {/* TESTIMONIES */}
      <section id="testimonies" className="home-section home-alt">
        <div className="home-container">
          <h2 className="center">Stories from Our Church Family</h2>
          <div className="home-grid home-grid-3">
            {testimonies.map((t, i) => (
              <figure className="home-card quote-card reveal" key={i}>
                <blockquote>"{t.quote}"</blockquote>
                <figcaption>{t.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="home-section">
        <div className="home-container">
          <h2 className="center">What to Expect</h2>
          <div className="faq-list">
            {faqs.map((f) => (
              <details className="faq-item" key={f.q}>
                <summary>{f.q}<ChevronDown /></summary>
                <div className="faq-body">
                  <p>
                    {f.a ?? (
                      <>
                        Ask our <button type="button" className="faq-link" onClick={openChatbot}>AI Assistant</button> anytime, or message us on{" "}
                        <a href={FACEBOOK_URL} target="_blank" rel="noreferrer">Facebook</a>.
                      </>
                    )}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* VISIT US */}
      <section id="visit" className="home-section home-alt">
        <div className="home-container">
          <h2 className="center">Visit Us</h2>
          <div className="visit-grid">
            <div className="visit-info reveal">
              <h3>First time? You're welcome here.</h3>
              <ul className="visit-list">
                <li><span aria-hidden="true"><PinIcon /></span>{CONTACT.address}</li>
                <li><span aria-hidden="true"><ClockIcon /></span>{services[0].title} · {services[0].day}, {services[0].time}</li>
                <li><span aria-hidden="true"><PhoneIcon /></span><a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>{CONTACT.phone}</a></li>
                <li><span aria-hidden="true"><MailIcon /></span><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
              </ul>
              <div className="visit-btns">
                <a className="btn btn-primary" href={mapLink} target="_blank" rel="noreferrer">Get Directions</a>
                <a className="btn btn-outline" href={FACEBOOK_URL} target="_blank" rel="noreferrer">Message Us</a>
              </div>
            </div>
            <div className="visit-map reveal">
              <iframe
                title="River of Life Calapan location"
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="home-cta">
        <div className="home-container">
          <h2>Be part of our church family</h2>
          <p>Create an account to access church information, events, and more.</p>
          <Link to="/register" className="btn btn-light btn-lg">Register Now</Link>
        </div>
      </section>

            {/* CONTACT / FOOTER */}
      <footer id="contact" className="home-footer">
        <div className="home-container home-footer-inner">
          {/* Brand + socials */}
          <div>
            <div className="home-footer-brand">
              <img src="/logo.png" alt="River of Life Calapan logo" />
              <div>
                <strong>River of Life Calapan</strong>
                <p>{CONTACT.address}</p>
              </div>
            </div>
            <div className="home-social-row">
              <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" className="home-social" aria-label="River of Life Calapan on Facebook">
                <FacebookIcon />
                <span>Facebook</span>
              </a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="home-social" aria-label="River of Life Calapan on Instagram">
                <InstagramIcon />
                <span>Instagram</span>
              </a>
            </div>
          </div>

          {/* Quick links */}
          <nav aria-label="Footer">
            <h4>Quick Links</h4>
            <ul className="footer-list">
              <li><a href="#about">About</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#ministries">Ministries</a></li>
              <li><a href="#faq">What to Expect</a></li>
              <li><a href="#visit">Visit Us</a></li>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </ul>
          </nav>

          {/* Service times + contact */}
          <div>
            <h4>Service Times</h4>
            <ul className="footer-list footer-services">
              {services.map((s) => (
                <li key={s.title}>
                  <span>{s.title}</span>
                  <b>{s.day}, {s.time}</b>
                </li>
              ))}
            </ul>

            <h4 className="footer-h-gap">Contact</h4>
            <ul className="footer-list">
              <li><a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>{CONTACT.phone}</a></li>
              <li><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
              <li><a href={mapLink} target="_blank" rel="noreferrer">Get directions →</a></li>
            </ul>
          </div>
        </div>

        <div className="home-container">
          <p className="home-copy">© {new Date().getFullYear()} River of Life Calapan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}