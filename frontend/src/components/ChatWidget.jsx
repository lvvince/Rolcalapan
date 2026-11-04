import { useState, useRef, useEffect } from "react";
// Local dev: iwanang walang VITE_API_URL para gumamit ng Vite proxy (/api)
const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 60000;
const HISTORY_LIMIT = 6;

// Phones (portrait at landscape). Kapareho ng mobile media query sa CSS sa ibaba.
const MOBILE_Q = "(max-width: 480px), (max-height: 520px)";

// Profile picture ng assistant (frontend/public/rolav.png)
const ASSISTANT_PIC = "/rolav.png";

// label = lumalabas sa button at sa chat; query = ang totoong tanong na ipinapadala sa bot
// (kapareho ng mga tanong sa dataset para mataas ang confidence)
const QUICK_REPLIES = [
  { label: "Service times", query: "What time is the Sunday service?" },
  { label: "Ministries", query: "What ministries do you have?" },
  { label: "Saan ang location?", query: "Saan po ang simbahan ninyo?" },
  { label: "Paano sumali?", query: "Paano po sumali sa ministry?" },
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
.rol-root {
  position: fixed; z-index: 50; font-family: inherit;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  right: calc(20px + env(safe-area-inset-right, 0px));
}
/* Desktop: transparent wrapper lang; nagiging backdrop sa phones */
.rol-overlay { display: contents; }
.rol-window {
  width: min(380px, calc(100vw - 40px));
  height: min(560px, calc(100vh - 120px));
  height: min(560px, calc(100dvh - 120px));
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(8, 47, 73, .25), 0 2px 8px rgba(8, 47, 73, .1);
  display: flex; flex-direction: column; overflow: hidden;
  margin-bottom: 12px;
  transform-origin: bottom right;
  animation: rol-open .22s cubic-bezier(.2,.8,.2,1);
}
@keyframes rol-open { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: none; } }

.rol-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; color: #fff;
  background: linear-gradient(135deg, #0b6e8a 0%, #0891b2 60%, #12b5d6 100%);
}
.rol-avatar {
  width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  background: rgba(255,255,255,.2); border: 1.5px solid rgba(255,255,255,.5);
  display: grid; place-items: center; position: relative;
}
.rol-avatar img { width: 28px; height: 28px; object-fit: contain; }
.rol-avatar::after {
  content: ""; position: absolute; right: -1px; bottom: -1px;
  width: 11px; height: 11px; border-radius: 50%;
  background: #4ade80; border: 2px solid #0b6e8a;
}
.rol-title { font-weight: 700; font-size: 15px; line-height: 1.2; }
.rol-sub { font-size: 12px; opacity: .85; margin-top: 2px; }
.rol-close {
  margin-left: auto; width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  border: none; background: rgba(255,255,255,.15); color: #fff; cursor: pointer;
  display: grid; place-items: center; transition: background .15s;
}
.rol-close:hover { background: rgba(255,255,255,.3); }

.rol-body {
  flex: 1; min-height: 0; overflow-y: auto; padding: 16px 14px 8px;
  background: #f1f7fa; scroll-behavior: smooth;
  overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
}
.rol-row { display: flex; flex-direction: column; margin-bottom: 12px; animation: rol-in .2s ease-out; }
.rol-row.user { align-items: flex-end; }
.rol-row.bot { align-items: flex-start; }
@keyframes rol-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* Isang linya: avatar + bubble */
.rol-line { display: flex; align-items: flex-end; gap: 8px; width: 100%; }
.rol-row.user .rol-line { justify-content: flex-end; }
.rol-pic {
  width: 34px; height: 34px; flex-shrink: 0;
  object-fit: contain; background: transparent;
}

.rol-bubble {
  max-width: 82%; padding: 10px 14px; font-size: 14px; line-height: 1.45;
  white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;
}
.rol-row.bot .rol-bubble { max-width: calc(82% - 38px); }
.rol-bubble.bot { background: #fff; color: #0f172a; border-radius: 18px 18px 18px 4px; box-shadow: 0 1px 2px rgba(15,23,42,.08); }
.rol-bubble.user { background: linear-gradient(135deg, #0891b2, #0e7490); color: #fff; border-radius: 18px 18px 4px 18px; }
.rol-bubble.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.rol-time { font-size: 11px; color: #94a3b8; margin: 4px 6px 0; }
.rol-row.bot .rol-time { margin-left: 44px; }

.rol-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 2px 0 12px; animation: rol-in .3s ease-out; }
.rol-chip {
  padding: 8px 14px; border-radius: 999px; font-size: 13px; font-weight: 500;
  background: #fff; color: #0e7490; border: 1.5px solid #a5e3f0; cursor: pointer;
  transition: all .15s;
}
.rol-chip:hover { background: #0891b2; color: #fff; border-color: #0891b2; transform: translateY(-1px); }

.rol-typing { display: inline-flex; gap: 4px; padding: 12px 14px; background: #fff; border-radius: 18px 18px 18px 4px; box-shadow: 0 1px 2px rgba(15,23,42,.08); }
.rol-typing span { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; animation: rol-bounce 1.2s infinite ease-in-out; }
.rol-typing span:nth-child(2) { animation-delay: .15s; }
.rol-typing span:nth-child(3) { animation-delay: .3s; }
@keyframes rol-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .5; } 30% { transform: translateY(-5px); opacity: 1; } }
.rol-slow { font-size: 12px; color: #64748b; margin: 6px 4px 0 44px; }

.rol-footer { padding: 10px 12px 12px; background: #fff; border-top: 1px solid #e2e8f0; }
.rol-inputwrap {
  display: flex; align-items: center; gap: 6px;
  background: #f1f5f9; border: 1.5px solid transparent; border-radius: 999px;
  padding: 4px 4px 4px 16px; transition: all .15s;
}
.rol-inputwrap:focus-within { background: #fff; border-color: #0891b2; box-shadow: 0 0 0 3px rgba(8,145,178,.15); }
.rol-input { flex: 1; border: none; outline: none; background: transparent; font-size: 14px; padding: 8px 0; color: #0f172a; min-width: 0; }
.rol-input::placeholder { color: #64748b; }
.rol-send {
  width: 38px; height: 38px; border-radius: 50%; border: none; flex-shrink: 0;
  background: linear-gradient(135deg, #0891b2, #0e7490); color: #fff; cursor: pointer;
  display: grid; place-items: center; transition: transform .15s, opacity .15s;
}
.rol-send:hover:not(:disabled) { transform: scale(1.08); }
.rol-send:disabled { opacity: .4; cursor: default; }
.rol-count { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 8px; }

.rol-toggle {
  width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer;
  background: linear-gradient(135deg, #0891b2, #0e7490); color: #fff;
  display: grid; place-items: center; position: relative;
  box-shadow: 0 8px 20px rgba(8,145,178,.45); transition: transform .2s;
}
.rol-toggle:hover { transform: scale(1.07); }
.rol-toggle.pulse::before {
  content: ""; position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid #0891b2; animation: rol-pulse 2s infinite;
}
@keyframes rol-pulse { from { transform: scale(1); opacity: .8; } to { transform: scale(1.6); opacity: 0; } }

.rol-chip, .rol-send, .rol-close, .rol-toggle {
  touch-action: manipulation; -webkit-tap-highlight-color: transparent;
}

.rol-body::-webkit-scrollbar { width: 6px; }
.rol-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

/* ---------- DARK MODE ---------- */
html[data-theme="dark"] .rol-window { background: #111c2e; box-shadow: 0 20px 50px rgba(0,0,0,.6), 0 2px 8px rgba(0,0,0,.4); border: 1px solid #1e293b; }
html[data-theme="dark"] .rol-header { background: linear-gradient(135deg, #07303d 0%, #0b5d75 60%, #0e7490 100%); }
html[data-theme="dark"] .rol-avatar::after { border-color: #07303d; }
html[data-theme="dark"] .rol-body { background: #0b1220; }
html[data-theme="dark"] .rol-body::-webkit-scrollbar-thumb { background: #334155; }
html[data-theme="dark"] .rol-bubble.bot,
html[data-theme="dark"] .rol-typing { background: #1e293b; color: #e2e8f0; box-shadow: none; }
html[data-theme="dark"] .rol-bubble.user { background: linear-gradient(135deg, #0e7490, #0b5d75); }
html[data-theme="dark"] .rol-bubble.error { background: #2a1215; color: #fca5a5; border-color: #7f1d1d; }
html[data-theme="dark"] .rol-time,
html[data-theme="dark"] .rol-count { color: #64748b; }
html[data-theme="dark"] .rol-slow { color: #94a3b8; }
html[data-theme="dark"] .rol-chip { background: #1e293b; color: #67e8f9; border-color: #134e5e; }
html[data-theme="dark"] .rol-chip:hover { background: #0891b2; color: #fff; border-color: #0891b2; }
html[data-theme="dark"] .rol-footer { background: #111c2e; border-top-color: #1e293b; }
html[data-theme="dark"] .rol-inputwrap { background: #0b1220; }
html[data-theme="dark"] .rol-inputwrap:focus-within { background: #0f1b2a; border-color: #22d3ee; box-shadow: 0 0 0 3px rgba(34,211,238,.18); }
html[data-theme="dark"] .rol-input { color: #f1f5f9; }
html[data-theme="dark"] .rol-input::placeholder { color: #94a3b8; }
html[data-theme="dark"] .rol-send,
html[data-theme="dark"] .rol-toggle { background: linear-gradient(135deg, #0e7490, #0b5d75); }
html[data-theme="dark"] .rol-toggle { box-shadow: 0 8px 20px rgba(0,0,0,.5); }
html[data-theme="dark"] .rol-toggle.pulse::before { border-color: #22d3ee; }

/* ---------- RESPONSIVE ---------- */

/* Tablet / maliit na laptop */
@media (min-width: 481px) and (max-width: 820px) {
  .rol-window { width: 400px; }
}

/* Phones (portrait at landscape): modal na may backdrop */
@media (max-width: 480px), (max-height: 520px) {
  .rol-root {
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    right: calc(16px + env(safe-area-inset-right, 0px));
  }
  .rol-root.open .rol-toggle { display: none; } /* may close button na sa header */
  .rol-toggle { width: 56px; height: 56px; }

  /* Backdrop: sumusunod sa visible area (keyboard-aware) */
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

  /* Ang modal mismo: puno ang taas ng visible area pero may max */
  .rol-window {
    width: 100%; max-width: 440px;
    height: 100%; max-height: 640px;
    margin: 0; border-radius: 20px;
    animation: rol-open .22s cubic-bezier(.2,.8,.2,1);
  }

  .rol-close { width: 44px; height: 44px; }
  .rol-bubble { max-width: 88%; font-size: 15px; }
  .rol-row.bot .rol-bubble { max-width: calc(88% - 38px); }
  .rol-chip { padding: 10px 16px; font-size: 14px; min-height: 40px; }
  .rol-footer { padding: 10px 12px 12px; }
  .rol-input { font-size: 16px; } /* iwas auto-zoom sa iOS */
  .rol-send { width: 44px; height: 44px; }
}

/* Landscape phones: mas maliit na padding */
@media (max-height: 520px) {
  .rol-overlay { padding: 8px calc(12px + env(safe-area-inset-right, 0px)) 8px calc(12px + env(safe-area-inset-left, 0px)); }
  .rol-window { max-width: 520px; border-radius: 16px; }
  .rol-header { padding: 8px 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .rol-window, .rol-overlay, .rol-row, .rol-chips, .rol-toggle.pulse::before, .rol-typing span { animation: none; }
}
`;

const ChatIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.6-.8L3 21l1.9-5.4A8.4 8.4 0 1 1 21 11.5z" />
  </svg>
);
const CloseIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", welcome: true, time: Date.now(), text: "Hi! Kumusta! I'm the River of Life assistant. Ask me in English or Tagalog about schedules, ministries, and FAQs." },
  ]);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Mobile: i-lock ang scroll ng page at sundan ang totoong visible area (keyboard-aware)
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

  const send = async (override) => {
    const chip = override && typeof override === "object" && override.query ? override : null;
    const q = (chip ? chip.query : typeof override === "string" ? override : input).trim();
    const shown = chip ? chip.label : q;
    if (!q || loading) return;

    // Huling mga messages (walang welcome at walang error) para may memory ang chatbot
    const history = messages
      .filter((m) => !m.welcome && !m.error)
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));

    setMessages((m) => [...m, { from: "user", text: shown, time: Date.now() }]);
    setInput("");
    setLoading(true);
    setSlow(false);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const slowTimer = setTimeout(() => setSlow(true), 8000);

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
      setMessages((m) => [...m, { from: "bot", error: true, text: msg, time: Date.now() }]);
    } finally {
      clearTimeout(timeout);
      clearTimeout(slowTimer);
      setLoading(false);
      setSlow(false);
    }
  };

  const disabled = loading || !input.trim();
  const showChips = messages.length === 1; // welcome message pa lang

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
              <div className="rol-sub">Online • Sumasagot sa English at Tagalog</div>
            </div>
            <button className="rol-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <CloseIcon size={18} />
            </button>
          </div>

          <div className="rol-body" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`rol-row ${m.from}`}>
                <div className="rol-line">
                  {m.from === "bot" && <img className="rol-pic" src={ASSISTANT_PIC} alt="" />}
                  <div className={`rol-bubble ${m.from}${m.error ? " error" : ""}`}>{linkify(m.text)}</div>
                </div>
                {m.time && <div className="rol-time">{formatTime(m.time)}</div>}
              </div>
            ))}

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
                {slow && <div className="rol-slow">Ginigising pa ang server, sandali lang po...</div>}
              </div>
            )}
            <div ref={endRef} />
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
          className={`rol-toggle${open ? "" : " pulse"}`}
          onClick={() => setOpen(!open)}
          aria-label="Toggle chatbot"
          aria-expanded={open}
        >
          {open ? <CloseIcon /> : <ChatIcon />}
        </button>
      </div>
    </div>
  );
}