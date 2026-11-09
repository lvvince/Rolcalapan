import { useState, useRef, useEffect } from "react";
// Local dev: iwanang walang VITE_API_URL para gumamit ng Vite proxy (/api)
const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 60000;
const SLOW_AFTER_MS = 5000;
const HISTORY_LIMIT = 6;

const MOBILE_Q = "(max-width: 480px), (max-height: 520px)";
const ASSISTANT_PIC = "/rolav.png";

const WELCOME = {
  from: "bot",
  welcome: true,
  time: Date.now(),
  text: "Hi! Kumusta! I'm the River of Life assistant. Ask me about schedules, ministries, and FAQs.",
};

const QUICK_REPLIES = [
  { label: "Service times", query: "What time is the Sunday service?" },
  { label: "Ministries", query: "What ministries do you have?" },
  { label: "Church location", query: "Saan po ang simbahan ninyo?" },
  { label: "How to register?", query: "How to register?" },
];

function linkify(text) {
  return text.split(/(https?:\/\/[^\s]*[^\s.,;)])/g).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
        {part}
      </a>
    ) : (
      part
    )
  );
}

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&display=swap");

/* ---------- TOKENS ---------- */
.rol-root {
  --rol-navy: #0b6e8a;
  --rol-water: #0891b2;
  --rol-water-soft: #e0f4f9;
  --rol-ember: #0891b2;
  --rol-ember-hover: #0e7490;
  --rol-bg: #f1f7fa;
  --rol-surface: #ffffff;
  --rol-ink: #14212b;
  --rol-muted: #566673;
  --rol-line: #d6e5ea;
  --rol-user-bg: linear-gradient(135deg, #0891b2, #0e7490);
  --rol-user-ink: #ffffff;
  --rol-link: #0e7490;
  --rol-shadow: 0 20px 50px rgba(8, 47, 73, .25), 0 2px 8px rgba(8, 47, 73, .1);
  --rol-head: linear-gradient(135deg, #0b6e8a 0%, #0891b2 60%, #12b5d6 100%);
  --rol-main: linear-gradient(135deg, #0891b2, #0e7490);
  --rol-online: #4ade80;
}
html[data-theme="dark"] .rol-root {
  --rol-navy: #07303d;
  --rol-water: #67e8f9;
  --rol-water-soft: #134e5e;
  --rol-ember: #0e7490;
  --rol-ember-hover: #0891b2;
  --rol-bg: #0b1220;
  --rol-surface: #1e293b;
  --rol-ink: #e6eef2;
  --rol-muted: #9db0bd;
  --rol-line: #26384d;
  --rol-user-bg: linear-gradient(135deg, #0e7490, #0b5d75);
  --rol-user-ink: #ffffff;
  --rol-link: #67e8f9;
  --rol-shadow: 0 20px 50px rgba(0, 0, 0, .6), 0 2px 8px rgba(0, 0, 0, .4);
  --rol-head: linear-gradient(135deg, #07303d 0%, #0b5d75 60%, #0e7490 100%);
  --rol-main: linear-gradient(135deg, #0e7490, #0b5d75);
  --rol-online: #4ade80;
}

.rol-root {
  position: fixed; z-index: 50; font-family: inherit;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  right: calc(20px + env(safe-area-inset-right, 0px));
}
.rol-overlay { display: contents; }

/* ---------- WINDOW ---------- */
.rol-window {
  width: min(384px, calc(100vw - 40px));
  height: min(580px, calc(100vh - 120px));
  height: min(580px, calc(100dvh - 120px));
  background: var(--rol-bg);
  border-radius: 24px;
  box-shadow: var(--rol-shadow);
  display: flex; flex-direction: column; overflow: hidden;
  margin-bottom: 14px;
  transform-origin: bottom right;
  animation: rol-open .24s cubic-bezier(.2,.8,.2,1);
}
html[data-theme="dark"] .rol-window { border: 1px solid var(--rol-line); }
@keyframes rol-open { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }

/* ---------- HEADER (may alon sa ilalim) ---------- */
.rol-header {
  position: relative; display: flex; align-items: center; gap: 12px;
  padding: 16px 14px 26px 16px; color: #fff; background: var(--rol-head);
}
.rol-wave { position: absolute; left: 0; bottom: -1px; width: 100%; height: 16px; display: block; fill: var(--rol-bg); }
.rol-avatar {
  position: relative; width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
  background: rgba(255,255,255,.2); border: 1.5px solid rgba(255,255,255,.5);
  display: grid; place-items: center;
}
.rol-avatar img { width: 28px; height: 28px; object-fit: contain; }
.rol-avatar::after {
  content: ""; position: absolute; right: -2px; bottom: -2px;
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--rol-online); border: 2px solid var(--rol-navy);
}
.rol-title { font-family: "Bricolage Grotesque", system-ui, sans-serif; font-weight: 700; font-size: 16px; line-height: 1.2; letter-spacing: .01em; }
.rol-actions { margin-left: auto; display: flex; gap: 6px; }
.rol-iconbtn {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  border: none; background: rgba(255,255,255,.12); color: #fff; cursor: pointer;
  display: grid; place-items: center; transition: background .15s, transform .15s;
}
.rol-iconbtn:hover { background: rgba(255,255,255,.24); }
.rol-iconbtn:active { transform: scale(.92); }

/* ---------- BODY ---------- */
.rol-body {
  flex: 1; min-height: 0; overflow-y: auto; padding: 8px 14px 8px;
  background: var(--rol-bg); scroll-behavior: smooth;
  overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
}
.rol-row { display: flex; flex-direction: column; margin-bottom: 4px; animation: rol-in .2s ease-out; }
.rol-row.end-group { margin-bottom: 14px; }
.rol-row.user { align-items: flex-end; }
.rol-row.bot { align-items: flex-start; }
@keyframes rol-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.rol-line { display: flex; align-items: flex-end; gap: 8px; width: 100%; }
.rol-row.user .rol-line { justify-content: flex-end; }
.rol-pic { width: 34px; height: 34px; flex-shrink: 0; object-fit: contain; }
.rol-pic-gap { width: 34px; flex-shrink: 0; }

.rol-bubble {
  max-width: 82%; padding: 10px 14px; font-size: 14px; line-height: 1.5;
  white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;
}
.rol-row.bot .rol-bubble { max-width: calc(82% - 38px); }
.rol-bubble.bot {
  background: var(--rol-surface); color: var(--rol-ink);
  border: 1px solid var(--rol-line); border-radius: 16px 16px 16px 4px;
}
.rol-bubble.user { background: var(--rol-user-bg); color: var(--rol-user-ink); border-radius: 16px 16px 4px 16px; }
.rol-bubble.error { background: #fdf0ee; color: #9a2f1f; border: 1px solid #f3c7bf; }
html[data-theme="dark"] .rol-bubble.error { background: #301816; color: #ffb4a6; border-color: #6b2c22; }
.rol-time { font-size: 11px; color: var(--rol-muted); margin: 4px 6px 0; }
.rol-row.bot .rol-time { margin-left: 44px; }

.rol-retry {
  margin: 6px 0 0 44px; padding: 7px 14px; font-size: 13px; font-weight: 600;
  color: var(--rol-ink); background: var(--rol-surface); border: 1.5px solid var(--rol-line);
  border-radius: 10px; cursor: pointer; transition: border-color .15s, background .15s;
}
.rol-retry:hover { border-color: var(--rol-water); background: var(--rol-water-soft); }

/* Quick replies: 2x2 na cards */
.rol-chips { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0 14px 42px; animation: rol-in .3s ease-out; }
.rol-chip {
  text-align: left; padding: 11px 12px; border-radius: 12px; font-size: 13px; font-weight: 600; line-height: 1.25;
  background: var(--rol-surface); color: var(--rol-ink); border: 1.5px solid var(--rol-line); cursor: pointer;
  transition: border-color .15s, background .15s, transform .15s;
}
.rol-chip:hover { border-color: var(--rol-water); background: var(--rol-water-soft); transform: translateY(-1px); }

.rol-typing {
  display: inline-flex; gap: 4px; padding: 13px 14px; background: var(--rol-surface);
  border: 1px solid var(--rol-line); border-radius: 16px 16px 16px 4px;
}
.rol-typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--rol-water); animation: rol-bounce 1.2s infinite ease-in-out; }
.rol-typing span:nth-child(2) { animation-delay: .15s; }
.rol-typing span:nth-child(3) { animation-delay: .3s; }
@keyframes rol-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .5; } 30% { transform: translateY(-5px); opacity: 1; } }
.rol-slow { font-size: 12px; color: var(--rol-muted); margin: 6px 4px 0 44px; }

/* ---------- FOOTER ---------- */
.rol-footer { padding: 10px 12px 12px; background: var(--rol-surface); border-top: 1px solid var(--rol-line); }
.rol-inputwrap {
  display: flex; align-items: center; gap: 8px;
  background: var(--rol-bg); border: 1.5px solid var(--rol-line); border-radius: 14px;
  padding: 4px 4px 4px 14px; transition: border-color .15s, box-shadow .15s;
}
.rol-inputwrap:focus-within { border-color: var(--rol-water); box-shadow: 0 0 0 3px color-mix(in srgb, var(--rol-water) 25%, transparent); }
.rol-input { flex: 1; border: none; outline: none; background: transparent; font-size: 14px; padding: 8px 0; color: var(--rol-ink); min-width: 0; font-family: inherit; }
.rol-input::placeholder { color: var(--rol-muted); }
.rol-send {
  width: 38px; height: 38px; border-radius: 10px; border: none; flex-shrink: 0;
  background: var(--rol-main); color: #fff; cursor: pointer;
  display: grid; place-items: center; transition: transform .15s, opacity .15s, background .15s;
}
.rol-send:hover:not(:disabled) { transform: scale(1.08); }
.rol-send:active:not(:disabled) { transform: scale(.94); }
.rol-send:disabled { opacity: .35; cursor: default; }
.rol-count { text-align: center; font-size: 11px; color: var(--rol-muted); margin-top: 8px; }

/* ---------- FLOATING BUTTON (pill) ---------- */
.rol-toggle {
  display: inline-flex; align-items: center; gap: 10px;
  height: 56px; padding: 0 22px 0 16px; border: none; border-radius: 999px; cursor: pointer;
  background: var(--rol-main); color: #fff; font: 600 15px/1 inherit; font-family: inherit;
  box-shadow: 0 8px 20px rgba(8,145,178,.45), 0 0 0 1px rgba(255,255,255,.12) inset;
  transition: transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s;
}
.rol-toggle:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(8,145,178,.55), 0 0 0 1px rgba(255,255,255,.18) inset; }
.rol-toggle:active { transform: scale(.96); }
html[data-theme="dark"] .rol-toggle { box-shadow: 0 8px 20px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.12) inset; }

.rol-icobox { position: relative; width: 26px; height: 26px; display: grid; place-items: center; flex-shrink: 0; }
.rol-ico { position: absolute; display: grid; place-items: center; transition: transform .28s cubic-bezier(.2,.8,.2,1), opacity .2s; }
.rol-ico-close { opacity: 0; transform: rotate(-90deg) scale(.5); }
.rol-root.open .rol-ico-chat { opacity: 0; transform: rotate(90deg) scale(.5); }
.rol-root.open .rol-ico-close { opacity: 1; transform: none; }

/* Ember na "online" dot, 3 beses lang mag-pulse */
.rol-dot { position: absolute; top: -3px; right: -4px; width: 10px; height: 10px; border-radius: 50%; background: var(--rol-online); border: 2px solid #0e7490; }
.rol-dot::before { content: ""; position: absolute; inset: -2px; border-radius: 50%; border: 2px solid var(--rol-online); animation: rol-pulse 1.8s ease-out 3; }
.rol-root.open .rol-dot { display: none; }
@keyframes rol-pulse { from { transform: scale(1); opacity: .9; } to { transform: scale(2.6); opacity: 0; } }

.rol-chip, .rol-send, .rol-iconbtn, .rol-toggle, .rol-retry {
  touch-action: manipulation; -webkit-tap-highlight-color: transparent;
}
.rol-toggle:focus-visible, .rol-chip:focus-visible, .rol-send:focus-visible,
.rol-iconbtn:focus-visible, .rol-retry:focus-visible {
  outline: 3px solid #22d3ee; outline-offset: 2px;
}

.rol-body::-webkit-scrollbar { width: 6px; }
.rol-body::-webkit-scrollbar-thumb { background: var(--rol-line); border-radius: 3px; }

/* ---------- RESPONSIVE ---------- */
@media (min-width: 481px) and (max-width: 820px) {
  .rol-window { width: 400px; }
}

@media (max-width: 480px), (max-height: 520px) {
  .rol-root {
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    right: calc(16px + env(safe-area-inset-right, 0px));
  }
  .rol-root.open .rol-toggle { display: none; }
  /* Sa phone: bilog na icon lang ang button */
  .rol-toggle { width: 56px; padding: 0; justify-content: center; }
  .rol-toggle-label { display: none; }

  .rol-overlay {
    display: flex; align-items: center; justify-content: center;
    position: fixed; left: 0; right: 0;
    top: var(--rol-top, 0px);
    height: 100vh;
    height: var(--rol-h, 100dvh);
    padding: calc(12px + env(safe-area-inset-top, 0px)) calc(12px + env(safe-area-inset-right, 0px))
             calc(12px + env(safe-area-inset-bottom, 0px)) calc(12px + env(safe-area-inset-left, 0px));
    background: rgba(8, 47, 73, .5);
    animation: rol-fade .18s ease-out;
  }
  @keyframes rol-fade { from { opacity: 0; } to { opacity: 1; } }

  .rol-window {
    width: 100%; max-width: 440px;
    height: 100%; max-height: 660px;
    margin: 0; border-radius: 22px;
  }

  .rol-iconbtn { width: 44px; height: 44px; }
  .rol-bubble { max-width: 88%; font-size: 15px; }
  .rol-row.bot .rol-bubble { max-width: calc(88% - 38px); }
  .rol-chip { padding: 12px; font-size: 14px; min-height: 44px; }
  .rol-input { font-size: 16px; }
  .rol-send { width: 44px; height: 44px; }
}

@media (max-width: 360px) {
  .rol-chips { grid-template-columns: 1fr; }
}

@media (max-height: 520px) {
  .rol-overlay { padding: 8px calc(12px + env(safe-area-inset-right, 0px)) 8px calc(12px + env(safe-area-inset-left, 0px)); }
  .rol-window { max-width: 520px; border-radius: 16px; }
  .rol-header { padding: 8px 14px 20px; }
}

@media (prefers-reduced-motion: reduce) {
  .rol-window, .rol-overlay, .rol-row, .rol-chips, .rol-dot::before, .rol-typing span { animation: none; }
  .rol-ico, .rol-toggle { transition: none; }
}
`;

const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.6-.8L3 21l1.9-5.4A8.4 8.4 0 1 1 21 11.5z" />
  </svg>
);
const CloseIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5" />
  </svg>
);
const Wave = () => (
  <svg className="rol-wave" viewBox="0 0 400 16" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 8 C 50 0, 100 16, 150 8 S 250 0, 300 8 S 370 14, 400 6 V16 H0 Z" />
  </svg>
);

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading, slow]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Mobile: i-lock ang scroll ng page at sundan ang visible area (keyboard-aware)
  useEffect(() => {
    if (!open || !window.matchMedia(MOBILE_Q).matches) return;
    const vv = window.visualViewport;
    const root = rootRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const update = () => {
      if (!vv || !root) return;
      root.style.setProperty("--rol-h", `${vv.height}px`);
      root.style.setProperty("--rol-top", `${vv.offsetTop}px`);
    };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);

    return () => {
      document.body.style.overflow = prevOverflow;
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      root?.style.removeProperty("--rol-h");
      root?.style.removeProperty("--rol-top");
    };
  }, [open]);

  const resetChat = () => {
    if (loading) return;
    setMessages([{ ...WELCOME, time: Date.now() }]);
    setInput("");
    inputRef.current?.focus();
  };

  const send = async (override, { retry = false } = {}) => {
    const chip = override && typeof override === "object" && override.query ? override : null;
    const q = (chip ? chip.query : typeof override === "string" ? override : input).trim();
    const shown = chip ? chip.label : q;
    if (!q || loading) return;

    let history = messages
      .filter((m) => !m.welcome && !m.error)
      .map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
    if (retry) history = history.slice(0, -1);
    history = history.slice(-HISTORY_LIMIT);

    setMessages((m) =>
      retry
        ? m.filter((x) => !x.error)
        : [...m, { from: "user", text: shown, query: q, time: Date.now() }]
    );
    setInput("");
    setLoading(true);
    setSlow(false);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history }),
        signal: controller.signal,
      });

      const raw = await res.text();
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }
      if (!data) throw new Error("Hindi valid ang sagot ng server. Subukan ulit.");
      if (!res.ok || !data.success) throw new Error(data.message || "Connection error. Try again.");

      setMessages((m) => [...m, { from: "bot", text: data.answer, time: Date.now() }]);
    } catch (err) {
      let msg = err.message || "Connection error. Try again.";
      if (err.name === "AbortError") msg = "Natagalan ang server. Subukan ulit.";
      else if (err instanceof TypeError) msg = "Hindi makakonekta sa server. Subukan ulit.";
      setMessages((m) => [...m, { from: "bot", error: true, retryQuery: q, text: msg, time: Date.now() }]);
    } finally {
      clearTimeout(timeout);
      clearTimeout(slowTimer);
      setLoading(false);
      setSlow(false);
    }
  };

  const disabled = loading || !input.trim();
  const showChips = messages.length === 1;

  return (
    <div
      ref={rootRef}
      className={`rol-root${open ? " open" : ""}`}
      onKeyDown={(e) => e.key === "Escape" && open && setOpen(false)}
    >
      <style>{STYLES}</style>

      {open && (
        <div className="rol-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Church Assistant" className="rol-window">
            <div className="rol-header">
              <div className="rol-avatar">
                <img src="/logo.png" alt="River of Life Calapan logo" />
              </div>
              <div>
                <div className="rol-title">River of Life Assistant</div>
              </div>
              <div className="rol-actions">
                <button className="rol-iconbtn" onClick={resetChat} aria-label="Start new chat" title="New chat">
                  <RefreshIcon />
                </button>
                <button className="rol-iconbtn" onClick={() => setOpen(false)} aria-label="Close chat">
                  <CloseIcon size={18} />
                </button>
              </div>
              <Wave />
            </div>

            <div className="rol-body" ref={bodyRef} aria-live="polite">
              {messages.map((m, i) => {
                const next = messages[i + 1];
                const endOfGroup = !next || next.from !== m.from;
                return (
                  <div key={i} className={`rol-row ${m.from}${endOfGroup ? " end-group" : ""}`}>
                    <div className="rol-line">
                      {m.from === "bot" &&
                        (endOfGroup ? (
                          <img className="rol-pic" src={ASSISTANT_PIC} alt="" />
                        ) : (
                          <span className="rol-pic-gap" />
                        ))}
                      <div className={`rol-bubble ${m.from}${m.error ? " error" : ""}`}>{linkify(m.text)}</div>
                    </div>
                    {m.error && m.retryQuery && !loading && i === messages.length - 1 && (
                      <button className="rol-retry" onClick={() => send(m.retryQuery, { retry: true })}>
                        Subukan ulit
                      </button>
                    )}
                    {m.time && endOfGroup && <div className="rol-time">{formatTime(m.time)}</div>}
                  </div>
                );
              })}

              {showChips && (
                <div className="rol-chips">
                  {QUICK_REPLIES.map((c) => (
                    <button key={c.label} className="rol-chip" onClick={() => send(c)}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="rol-row bot">
                  <div className="rol-line">
                    <img className="rol-pic" src={ASSISTANT_PIC} alt="" />
                    <div className="rol-typing" aria-label="Typing">
                      <span /><span /><span />
                    </div>
                  </div>
                  {slow && (
                    <div className="rol-slow">
                      Gumigising ang assistant, maghintay po ng ilang segundo...
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rol-footer">
              <div className="rol-inputwrap">
                <input
                  ref={inputRef}
                  className="rol-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()}
                  placeholder="Type your question..."
                  aria-label="Your question"
                  maxLength={500}
                />
                <button className="rol-send" onClick={() => send()} disabled={disabled} aria-label="Send message">
                  <SendIcon />
                </button>
              </div>
              {input.length > 400 && <div className="rol-count">{input.length}/500</div>}
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: "right" }}>
        <button
          className="rol-toggle"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close chat assistant" : "Open chat assistant"}
          aria-expanded={open}
        >
          <span className="rol-icobox">
            <span className="rol-ico rol-ico-chat"><ChatIcon /></span>
            <span className="rol-ico rol-ico-close"><CloseIcon /></span>
            <span className="rol-dot" />
          </span>
          <span className="rol-toggle-label">Chat with us</span>
        </button>
      </div>
    </div>
  );
}