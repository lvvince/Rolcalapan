// Save as: frontend/src/components/DailyVerse.jsx
// Self-contained: walang hiwalay na CSS file na kailangan.
import { useEffect, useState } from "react";
import { BookOpen, Copy, Check } from "lucide-react";
import api from "../api";

const CSS = `
.dv-card{
  position:relative;
  display:flex;
  align-items:flex-start;
  gap:16px;
  margin:18px 0;
  padding:20px 24px;
  border-radius:16px;
  border:1px solid rgba(14,116,144,.22);
  border-left:5px solid #0e7490;
  background:linear-gradient(135deg,rgba(14,116,144,.10),rgba(34,211,238,.05));
  color:inherit;
  overflow:hidden;
  animation:dv-fade .4s ease both;
}
.dv-card::after{
  content:"\\201D";
  position:absolute;
  right:18px;
  top:-18px;
  font-family:Georgia,serif;
  font-size:130px;
  line-height:1;
  color:rgba(14,116,144,.10);
  pointer-events:none;
}
.dv-icon{
  flex:0 0 46px;
  width:46px;
  height:46px;
  display:grid;
  place-items:center;
  border-radius:12px;
  background:rgba(14,116,144,.15);
  color:#14a3b8;
}
.dv-body{min-width:0;flex:1;position:relative;z-index:1}
.dv-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom:8px;
}
.dv-label{
  font-size:11.5px;
  font-weight:700;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:#14a3b8;
}
.dv-date{
  font-size:12px;
  opacity:.65;
  margin-left:8px;
  font-weight:500;
  letter-spacing:0;
  text-transform:none;
}
.dv-copy{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:5px 10px;
  border-radius:8px;
  border:1px solid rgba(14,116,144,.3);
  background:transparent;
  color:#14a3b8;
  font-size:12px;
  font-weight:600;
  cursor:pointer;
}
.dv-copy:hover{background:rgba(14,116,144,.12)}
.dv-text{
  margin:0;
  font-family:Georgia,"Times New Roman",serif;
  font-size:1.12rem;
  font-style:italic;
  line-height:1.75;
  color:inherit;
}
.dv-ref{
  display:inline-block;
  margin-top:12px;
  padding:4px 12px;
  border-radius:999px;
  background:rgba(14,116,144,.14);
  color:#14a3b8;
  font-size:.85rem;
  font-weight:700;
}
@keyframes dv-fade{
  from{opacity:0;transform:translateY(6px)}
  to{opacity:1;transform:none}
}
@media (max-width:600px){
  .dv-card{padding:14px 16px;gap:12px}
  .dv-icon{flex-basis:38px;width:38px;height:38px}
  .dv-text{font-size:1rem}
  .dv-date{display:none}
}
`;

export default function DailyVerse({ portal = "home" }) {
  const [verse, setVerse] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/verse/daily", { params: { portal } })
      .then((r) => {
        if (!cancelled && r.data?.success) setVerse(r.data.data);
      })
      .catch((e) => console.error("VERSE failed:", e.response?.status, e.message));
    return () => {
      cancelled = true;
    };
  }, [portal]);

  if (!verse) return null;

  const text = verse.text_tl || verse.text_en;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`"${text}" — ${verse.reference}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="dv-card" aria-label="Daily Bible Verse">
      <style>{CSS}</style>
      <span className="dv-icon" aria-hidden="true">
        <BookOpen size={22} />
      </span>
      <div className="dv-body">
        <div className="dv-top">
          <div className="dv-label">
            Daily Bible Verse <span className="dv-date">· {today}</span>
          </div>
          <button type="button" className="dv-copy" onClick={copy} aria-label="Copy verse">
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="dv-text">“{text}”</p>
        <span className="dv-ref">{verse.reference}</span>
      </div>
    </section>
  );
}