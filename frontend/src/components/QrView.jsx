// frontend/src/components/QrView.jsx
import { QRCodeSVG } from "qrcode.react";
import "./portal.css";

export default function QrView({ code, name }) {
  if (!code) return null;
  return (
    <div>
      <div className="qr-box">
        <QRCodeSVG value={code} size={220} />
        <h3 style={{ margin: "12px 0 0" }}>{name}</h3>
        <div className="muted" style={{ fontSize: 18, letterSpacing: 2 }}>{code}</div>
      </div>
      <div className="no-print" style={{ marginTop: 12 }}>
        <button className="btn" onClick={() => window.print()}>Print</button>
      </div>
    </div>
  );
}