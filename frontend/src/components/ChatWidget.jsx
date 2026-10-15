// frontend/src/components/ChatWidget.jsx
import { useState, useRef, useEffect } from "react";
import api from "../api";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I'm the River of Life assistant. Ask me about schedules, ministries, and FAQs." },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { from: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const { data } = await api.post("/chatbot/ask", { question: q });
      setMessages((m) => [...m, { from: "bot", text: data.answer }]);
    } catch (err) {
      setMessages((m) => [...m, { from: "bot", text: err.response?.data?.error || "Connection error. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 50 }}>
      {open && (
        <div style={{ width: 320, height: 420, background: "#fff", border: "1px solid #ddd", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.15)", display: "flex", flexDirection: "column", marginBottom: 10, overflow: "hidden" }}>
          <div style={{ background: "#1e3a8a", color: "#fff", padding: "10px 14px", fontWeight: 600 }}>Church Assistant</div>
          <div style={{ flex: 1, overflowY: "auto", padding: 10, background: "#f8fafc" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
                <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: 12, fontSize: 14, background: m.from === "user" ? "#1e3a8a" : "#e2e8f0", color: m.from === "user" ? "#fff" : "#0f172a" }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div style={{ fontSize: 12, color: "#64748b" }}>Typing...</div>}
            <div ref={endRef} />
          </div>
          <div style={{ display: "flex", borderTop: "1px solid #e2e8f0" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type your question..."
              style={{ flex: 1, padding: 10, border: "none", outline: "none", fontSize: 14 }}
            />
            <button onClick={send} style={{ padding: "0 16px", border: "none", background: "#1e3a8a", color: "#fff", cursor: "pointer" }}>Send</button>
          </div>
        </div>
      )}
      <div style={{ textAlign: "right" }}>
        <button
          onClick={() => setOpen(!open)}
          style={{ width: 56, height: 56, borderRadius: "50%", border: "none", background: "#1e3a8a", color: "#fff", fontSize: 24, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.25)" }}
          aria-label="Toggle chatbot"
        >
          {open ? "×" : "💬"}
        </button>
      </div>
    </div>
  );
}