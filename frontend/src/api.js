const BASE_URL = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEYS = ["token", "authToken", "access_token"];

function getToken() {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

function handleUnauthorized(path, hadToken) {
  // Huwag mag-redirect kung walang token (public pages, chatbot) o kung login mismo ang nag-401
  if (!hadToken || path.startsWith("/auth/login")) return;
  TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
  localStorage.removeItem("user");
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

async function request(method, path, body, config = {}) {
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
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = text; }
  const response = { data, status: res.status };

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized(path, !!token);
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