// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import api, { refreshSession } from "../api";

const AuthContext = createContext(null);

export const homeForRole = (role) =>
  ({ admin: "/admin", staff: "/staff", ministry_leader: "/ministry", member: "/portal" }[role] || "/login");

function saveSession(data) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// True kung expired na (o malapit nang mag-expire) ang JWT
function tokenExpired(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(part));
    return payload.exp ? payload.exp * 1000 < Date.now() + 30000 : false;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [ready, setReady] = useState(false);

  // Pag-load ng app: kung walang valid na token, i-restore gamit ang remember-me cookie
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !tokenExpired(token)) {
      setReady(true);
      return;
    }
    refreshSession()
      .then((data) => setUser(data.user))
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password, remember = false) => {
    const { data } = await api.post("/auth/login", { email, password, remember });
    saveSession(data);
    setUser(data.user);
    return data.user;
  };

  // Mabilis na logout: i-clear agad ang session, tapos ang server call ay sa background
  // (hindi hinihintay). Kailangan pa rin ito para ma-clear ng server ang remember-me cookie.
  const logout = () => {
    const token = localStorage.getItem("token");
    clearSession();
    setUser(null);
    api
      .post("/auth/logout", null, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .catch(() => {});
  };

  // Huwag munang i-render ang app habang chine-check ang remember-me cookie
  if (!ready) return null;

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);