const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export function apiUrl(path) {
  return `${API_URL}${path}`;
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token"); // palitan kung iba ang key mo
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* walang JSON body */
  }

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
  }
  return data;
}

const cache = new Map();

export async function translateText(text, target = "tl") {
  if (!text || target === "en") return text;
  const key = `${target}:${text}`;
  if (cache.has(key)) return cache.get(key);
  const data = await apiFetch("/api/translate", {
    method: "POST",
    body: JSON.stringify({ text, target }),
  });
  const out = data?.translation || text;
  cache.set(key, out);
  return out;
}