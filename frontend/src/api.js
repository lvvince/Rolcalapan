const BASE_URL = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("access_token")
  );
}

async function request(method, path, body, config = {}) {
  const token = getToken();
  const isForm = body instanceof FormData;
  let url = `${BASE_URL}${path}`;
  if (config.params) {
    const qs = new URLSearchParams(config.params).toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }
  const res = await fetch(url, {
    method,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config.headers || {}),
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = text; }
  const response = { data, status: res.status };
  if (!res.ok) {
    const err = new Error((data && data.message) || `Request failed: ${res.status}`);
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
