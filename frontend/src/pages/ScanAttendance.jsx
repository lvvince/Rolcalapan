import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../api";
import "../components/portal.css";

export default function ScanAttendance() {
  const busy = useRef(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let scanner;
    let startPromise;

    async function onScan(text) {
      if (busy.current) return;
      busy.current = true;

      try {
        const res = await api.post("/attendance/scan", {
          member_code: text.trim(),
        });
        setResult({ ok: true, msg: res.data.message });
      } catch (err) {
        setResult({
          ok: false,
          msg:
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Scan failed.",
        });
      }

      setTimeout(() => {
        busy.current = false;
      }, 2500);
    }

    const timer = setTimeout(() => {
      scanner = new Html5Qrcode("qr-reader");
      startPromise = scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScan,
          () => {}
        )
        .catch(() =>
          setResult({ ok: false, msg: "Cannot open camera. Allow camera access." })
        );
    }, 200);

    return () => {
      clearTimeout(timer);
      if (startPromise) {
        startPromise
          .then(() => scanner.stop())
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
  }, []);

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Scan Attendance</h1>
        <p className="muted">Ipakita ang QR code ng member sa camera.</p>

        <div id="qr-reader" style={{ width: "100%" }} />

        {result && (
          <div
            className={result.ok ? "msg ok" : "alert"}
            role="status"
            style={{ marginTop: 12 }}
          >
            {result.msg}
          </div>
        )}
      </div>
    </div>
  );
}