const BASE_URL = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEYS = ["token", "authToken", "access_token"];

function getToken() {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

function clearSession() {
  TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
  localStorage.removeItem("user");
}

function handleUnauthorized() {
  clearSession();
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

// Isang refresh request lang sa isang pagkakataon.
// Ginagamit ang remember-me cookie para makakuha ng bagong JWT.
let refreshing = null;
export function refreshSession() {
  if (!refreshing) {
    refreshing = (async () => {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* ignore */ }
      if (!res.ok || !data.token) {
        throw new Error(data.error || "Not remembered");
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      return data;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function request(method, path, body, config = {}, retried = false) {
  const token = getToken();
  const isForm = body instanceof FormData;
  let url = `${BASE_URL}${path}`;
  if (config.params) {
    const qs = new URLSearchParams(config.params).toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  const headers = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(config.headers || {}),
  };
  // Para sa FormData, ang browser dapat ang magtakda ng Content-Type (may boundary)
  if (isForm) {
    Object.keys(headers).forEach((k) => {
      if (k.toLowerCase() === "content-type") delete headers[k];
    });
  }

  const res = await fetch(url, {
    method,
    headers,
    // Kailangan ng cookie sa login / refresh / logout (remember-me)
    credentials: path.startsWith("/auth/") ? "include" : "same-origin",
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = text; }
  const response = { data, status: res.status };

  if (!res.ok) {
    // Expired ang JWT: subukang i-refresh gamit ang remember-me cookie, tapos ulitin ang request
    if (res.status === 401 && token && !retried && !path.startsWith("/auth/")) {
      try {
        await refreshSession();
        return request(method, path, body, config, true);
      } catch {
        handleUnauthorized();
      }
    } else if (res.status === 401 && token && !path.startsWith("/auth/")) {
      handleUnauthorized();
    }

    const msg =
      (data && typeof data === "object" && (data.error || data.message)) ||
      `Request failed: ${res.status}`;
    const err = new Error(msg);
    err.response = response;
    throw err;
  }
  return response;
}

const api = {
  get: (path, config) => request("GET", path, undefined, config),
  delete: (path, config) => request("DELETE", path, undefined, config),
  post: (path, body, config) => request("POST", path, body, config),
  put: (path, body, config) => request("PUT", path, body, config),
  patch: (path, body, config) => request("PATCH", path, body, config),
};

export { api };
export default api;