import { useState, useRef, useEffect } from "react";
// Local dev: iwanang walang VITE_API_URL para gumamit ng Vite proxy (/api)
const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 60000;
const HISTORY_LIMIT = 6;

const QUICK_REPLIES = [
  "Service times",
  "Ministries",
  "Saan ang location?",
  "Paano sumali?",
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
.rol-root { position: fixed; bottom: 20px; right: 20px; z-index: 50; font-family: inherit; }
.rol-window {
  width: min(380px, calc(100vw - 40px));
  height: min(560px, calc(100vh - 120px));
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
  margin-left: auto; width: 32px; height: 32px; border-radius: 50%;
  border: none; background: rgba(255,255,255,.15); color: #fff; cursor: pointer;
  display: grid; place-items: center; transition: background .15s;
}
.rol-close:hover { background: rgba(255,255,255,.3); }

.rol-body {
  flex: 1; overflow-y: auto; padding: 16px 14px 8px;
  background: #f1f7fa; scroll-behavior: smooth;
}
.rol-row { display: flex; flex-direction: column; margin-bottom: 12px; animation: rol-in .2s ease-out; }
.rol-row.user { align-items: flex-end; }
.rol-row.bot { align-items: flex-start; }
@keyframes rol-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.rol-bubble {
  max-width: 82%; padding: 10px 14px; font-size: 14px; line-height: 1.45;
  white-space: pre-wrap; word-break: break-word;
}
.rol-bubble.bot { background: #fff; color: #0f172a; border-radius: 18px 18px 18px 4px; box-shadow: 0 1px 2px rgba(15,23,42,.08); }
.rol-bubble.user { background: linear-gradient(135deg, #0891b2, #0e7490); color: #fff; border-radius: 18px 18px 4px 18px; }
.rol-bubble.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.rol-time { font-size: 11px; color: #94a3b8; margin: 4px 6px 0; }

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
.rol-slow { font-size: 12px; color: #64748b; margin: 6px 4px 0; }

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

.rol-body::-webkit-scrollbar { width: 6px; }
.rol-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

@media (max-width: 480px) {
  .rol-root { bottom: 12px; right: 12px; }
  .rol-window { position: fixed; inset: 0; width: 100%; height: 100%; max-height: none; border-radius: 0; margin: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .rol-window, .rol-row, .rol-chips, .rol-toggle.pulse::before, .rol-typing span { animation: none; }
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (override) => {
    const q = (typeof override === "string" ? override : input).trim();
    if (!q || loading) return;

    // Huling mga messages (walang welcome at walang error) para may memory ang chatbot
    const history = messages
      .filter((m) => !m.welcome && !m.error)
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));

    setMessages((m) => [...m, { from: "user", text: q, time: Date.now() }]);
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
    <div className="rol-root" onKeyDown={(e) => e.key === "Escape" && open && setOpen(false)}>
      <style>{STYLES}</style>

      {open && (
        <div role="dialog" aria-label="Church Assistant" className="rol-window">
          <div className="rol-header">
            <div className="rol-avatar">
              <img src="/logo.png" alt="River of Life Calapan logo" />
            </div>
            <div>
              <div className="rol-title">River of Life Assistant</div>
              <div className="rol-sub">Online </div>
            </div>
            <button className="rol-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <CloseIcon size={18} />
            </button>
          </div>

          <div className="rol-body" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`rol-row ${m.from}`}>
                <div className={`rol-bubble ${m.from}${m.error ? " error" : ""}`}>{linkify(m.text)}</div>
                {m.time && <div className="rol-time">{formatTime(m.time)}</div>}
              </div>
            ))}

            {showChips && (
              <div className="rol-chips">
                {QUICK_REPLIES.map((q) => (
                  <button key={q} className="rol-chip" onClick={() => send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="rol-row bot">
                <div className="rol-typing" aria-label="Typing">
                  <span /><span /><span />
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