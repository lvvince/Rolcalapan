// frontend/src/components/QrView.jsx
import { useRef, useState } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import "./portal.css";

const LOGO_DARK = "/logo-dark.png";
const LOGO_WHITE = "/logo-white.png";

const loadImg = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = src;
  });

const rrect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
};

// props:
//   code, name   - required (same as before)
//   photo        - optional profile picture (data URL / url)
//   guide        - optional: show the "How to check in" panel beside the card
export default function QrView({ code, name, photo, guide = false }) {
  const canvasRef = useRef(null);
  const [busy, setBusy] = useState(false);
  if (!code) return null;

  const download = async () => {
    const qrCanvas = canvasRef.current;
    if (!qrCanvas) return;
    setBusy(true);
    try {
      const [logoW, pic] = await Promise.all([loadImg(LOGO_WHITE), loadImg(photo)]);
      const W = 720;
      const QR = 480;
      const headerH = 130;
      const qrTop = pic ? 226 : 176;
      const nameY = qrTop + QR + 70;
      const pillY = nameY + 24;
      const H = pillY + 56 + 56;

      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d");

      // card
      rrect(ctx, 0, 0, W, H, 36);
      ctx.save();
      ctx.clip();
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W, H);

      // header
      const g = ctx.createLinearGradient(0, 0, W, headerH);
      g.addColorStop(0, "#0b4f63");
      g.addColorStop(0.7, "#0891b2");
      g.addColorStop(1, "#22d3ee");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, headerH);
      if (logoW) ctx.drawImage(logoW, 36, 22, 86, 86);
      ctx.fillStyle = "#fff";
      ctx.font = "700 30px 'Segoe UI', system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText("RIVER OF LIFE CALAPAN", 140, headerH / 2);
      ctx.restore();

      // photo
      if (pic) {
        const cx = W / 2;
        const cy = headerH + 20;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 52, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(pic, cx - 52, cy - 52, 104, 104);
        ctx.restore();
      }

      // qr
      ctx.drawImage(qrCanvas, (W - QR) / 2, qrTop, QR, QR);

      // name + code
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = "700 42px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(name || "", W / 2, nameY);

      ctx.font = "700 28px 'Segoe UI', system-ui, sans-serif";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
      const tw = ctx.measureText(code).width + 56;
      ctx.fillStyle = "#ecfeff";
      rrect(ctx, (W - tw) / 2, pillY, tw, 56, 28);
      ctx.fill();
      ctx.fillStyle = "#0c6078";
      ctx.textBaseline = "middle";
      ctx.fillText(code, W / 2, pillY + 29);

      const a = document.createElement("a");
      a.download = `${code}-qr.png`;
      a.href = c.toDataURL("image/png");
      a.click();
    } finally {
      setBusy(false);
    }
  };

  const qrProps = {
    value: code,
    level: "H", // high error correction so the logo in the middle is safe
    imageSettings: { src: LOGO_DARK, width: 54, height: 54, excavate: true },
  };

  const card = (
    <div className="qr-box">
      {photo && <img className="qr-photo" src={photo} alt="" />}
      <QRCodeSVG {...qrProps} size={220} />
      <h3 className="qr-name">{name}</h3>
      <span className="qr-code">{code}</span>
    </div>
  );

  const actions = (
    <div className="qr-actions no-print">
      <button className="btn" onClick={() => window.print()}>Print</button>
      <button className="btn secondary" onClick={download} disabled={busy}>
        {busy ? "Preparing..." : "Download PNG"}
      </button>
    </div>
  );

  // hidden high-resolution canvas used only for "Download PNG"
  const hidden = (
    <div style={{ position: "absolute", left: -9999, top: 0 }} aria-hidden="true">
      <QRCodeCanvas ref={canvasRef} {...qrProps} size={600} imageSettings={{ ...qrProps.imageSettings, width: 150, height: 150 }} />
    </div>
  );

  if (!guide) {
    return (
      <div>
        {card}
        <div style={{ marginTop: 12 }}>{actions}</div>
        {hidden}
      </div>
    );
  }

  return (
    <div className="qr-layout">
      {card}
      <div className="panel qr-guide no-print">
        <h4>How to check in</h4>
        <ol className="qr-steps">
          <li><span>1</span><div><strong>Open this page or show your printed QR</strong><p>Use your phone with the screen brightness up, or bring your printed copy.</p></div></li>
          <li><span>2</span><div><strong>Show your QR code</strong><p>Let the staff at the entrance scan it from your phone or printout.</p></div></li>
          <li><span>3</span><div><strong>Wait for confirmation</strong><p>Your attendance is recorded once it is scanned.</p></div></li>
        </ol>
        {actions}
        <div className="qr-tip">💡 Do not share your QR code with other people. It is your personal attendance pass.</div>
      </div>
      {hidden}
    </div>
  );
}