import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QrCameraScanner({ onScan }) {
  const busy = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let scanner;
    let startPromise;

    const timer = setTimeout(() => {
      scanner = new Html5Qrcode("qr-camera-reader");
      startPromise = scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (text) => {
            if (busy.current) return;
            busy.current = true;
            onScanRef.current(text.trim());
            setTimeout(() => {
              busy.current = false;
            }, 2500);
          },
          () => {}
        )
        .catch(() => alert("Cannot open camera. Allow camera access."));
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
    <div style={{ maxWidth: 360, marginTop: 12 }}>
      <div id="qr-camera-reader" style={{ width: "100%" }} />
    </div>
  );
}