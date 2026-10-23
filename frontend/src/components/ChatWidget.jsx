import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

// Local dev: iwanang walang VITE_API_URL para gumamit ng Vite proxy (/api)
// Production: i-set ang VITE_API_URL sa backend URL (walang trailing slash)
const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 60000;

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

export default function ChatWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [messages, setMessages] = useState([{ from: "bot", key: "chat.greeting" }]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { from: "user", text: q }]);
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
        body: JSON.stringify({ message: q }),
        signal: controller.signal,
      });

      const raw = await res.text();
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }
      if (!data) throw new Error("chat.invalidResponse");
      if (!res.ok || !data.success) throw new Error(data.message || "chat.connectionError");

      setMessages((m) => [...m, { from: "bot", text: data.answer }]);
    } catch (err) {
      let msg = err.message || "chat.connectionError";
      if (err.name === "AbortError") msg = "chat.timeout";
      else if (err instanceof TypeError) msg = "chat.cannotConnect";
      // kung translation key ang msg, isasalin; kung galing server, ipapakita as is
      setMessages((m) => [...m, { from: "bot", key: msg.startsWith("chat.") ? msg : undefined, text: msg }]);
    } finally {
      clearTimeout(timeout);
      clearTimeout(slowTimer);
      setLoading(false);
      setSlow(false);
    }
  };

  const disabled = loading || !input.trim();

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 50 }}>
      {open && (
        <div
          role="dialog"
          aria-label={t("chat.title")}
          style={{ width: "min(320px, calc(100vw - 40px))", height: 420, background: "#fff", border: "1px solid #ddd", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.15)", display: "flex", flexDirection: "column", marginBottom: 10, overflow: "hidden" }}
        >
          <div style={{ background: "#1e3a8a", color: "#fff", padding: "10px 14px", fontWeight: 600 }}>{t("chat.title")}</div>
          <div aria-live="polite" style={{ flex: 1, overflowY: "auto", padding: 10, background: "#f8fafc" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
                <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: 12, fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word", background: m.from === "user" ? "#1e3a8a" : "#e2e8f0", color: m.from === "user" ? "#fff" : "#0f172a" }}>
                  {linkify(m.key ? t(m.key) : m.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {slow ? t("chat.waking") : t("chat.typing")}
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div style={{ display: "flex", borderTop: "1px solid #e2e8f0" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("chat.placeholder")}
              aria-label={t("chat.placeholder")}
              maxLength={500}
              style={{ flex: 1, padding: 10, border: "none", outline: "none", fontSize: 14 }}
            />
            <button
              onClick={send}
              disabled={disabled}
              style={{ padding: "0 16px", border: "none", background: "#1e3a8a", color: "#fff", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1 }}
            >
              {t("chat.send")}
            </button>
          </div>
        </div>
      )}
      <div style={{ textAlign: "right" }}>
        <button
          onClick={() => setOpen(!open)}
          style={{ width: 56, height: 56, borderRadius: "50%", border: "none", background: "#1e3a8a", color: "#fff", fontSize: 24, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.25)" }}
          aria-label={t("chat.toggle")}
          aria-expanded={open}
        >
          {open ? "×" : "💬"}
        </button>
      </div>
    </div>
  );
}