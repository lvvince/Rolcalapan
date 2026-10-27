import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api";

export default function useNotifCount(userId, interval = 15000) {
  const key = `notif_seen_${userId ?? "anon"}`;
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(null);
  const maxIdRef = useRef(0);
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/portal/notifications");
      const rows = Array.isArray(data) ? data : [];
      const maxId = rows.reduce((m, n) => Math.max(m, Number(n.id) || 0), 0);

      // Unang beses ever: ituring na nakita na ang lahat ng luma
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, String(maxId));
      }
      const seen = Number(localStorage.getItem(key)) || 0;

      // Pop-up kapag may dumating na bago pagkatapos ng unang load
      if (!firstLoad.current && maxId > maxIdRef.current) {
        const newest = rows
          .filter((n) => Number(n.id) > maxIdRef.current)
          .sort((a, b) => Number(b.id) - Number(a.id))[0];
        if (newest) setToast(newest);
      }

      maxIdRef.current = maxId;
      firstLoad.current = false;
      setUnread(rows.filter((n) => Number(n.id) > seen).length);
    } catch {
      /* huwag mag-crash kapag nag-fail ang request */
    }
  }, [key]);

  const markSeen = useCallback(() => {
    localStorage.setItem(key, String(maxIdRef.current));
    setUnread(0);
  }, [key]);

  useEffect(() => {
    firstLoad.current = true;
    load();
    const id = setInterval(load, interval);
    return () => clearInterval(id);
  }, [load, interval]);

  // Auto-hide ng pop-up pagkalipas ng 5 segundo
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  return { unread, toast, dismiss: () => setToast(null), markSeen };
}