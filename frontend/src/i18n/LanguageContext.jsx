import { createContext, useCallback, useContext, useRef, useState } from 'react';
import en from './en.json';

export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'ceb', label: 'Cebuano' },
  { code: 'ilo', label: 'Ilocano' },
];

const API = import.meta.env.VITE_API_URL || '';
const BATCH = 24;      // ilang text kada request
const MAX_TRIES = 4;   // ilang beses ulit-ulitin ang hindi pa naisasalin
const Ctx = createContext(null);

// I-flatten ang en.json para gumana ang t('common.save')
const flatten = (obj, prefix = '', out = {}) => {
  Object.keys(obj || {}).forEach((k) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (obj[k] && typeof obj[k] === 'object') flatten(obj[k], key, out);
    else out[key] = String(obj[k]);
  });
  return out;
};
const EN = flatten(en);

// Fallback: kapag wala sa en.json at walang default, gawing readable English
const KEY_LIKE = /^[a-z][A-Za-z0-9_-]*(\.[A-Za-z0-9_-]+)+$/;
const humanize = (key) =>
  key
    .split('.')
    .pop()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

const loadCache = (l) => {
  try { return JSON.parse(localStorage.getItem('tr_' + l)) || {}; } catch { return {}; }
};
const saveCache = (l, c) => {
  try { localStorage.setItem('tr_' + l, JSON.stringify(c)); } catch { /* ignore */ }
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en');
  const [cache, setCache] = useState(() => loadCache(localStorage.getItem('lang') || 'en'));

  const langRef = useRef(lang);
  const requested = useRef(new Set());
  const attempts = useRef({});
  const queue = useRef([]);
  const timer = useRef(null);
  const busy = useRef(false);

  const setLang = (l) => {
    localStorage.setItem('lang', l);
    document.documentElement.lang = l;
    langRef.current = l;
    requested.current = new Set();
    attempts.current = {};
    queue.current = [];
    setLangState(l);
    setCache(loadCache(l));
  };

  const schedule = (ms) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), ms);
  };
  const flushRef = useRef(() => {});

  const flush = useCallback(async () => {
    if (busy.current) return; // isang request lang sa isang pagkakataon
    const l = langRef.current;
    if (l === 'en') { queue.current = []; return; }
    const texts = queue.current.splice(0, BATCH);
    if (!texts.length) return;

    busy.current = true;
    let translations = {};
    try {
      const res = await fetch(`${API}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: l, texts }),
      });
      const raw = await res.text();
      if (!res.ok) {
        console.error('[translate] error', res.status, raw.slice(0, 500));
      } else {
        try {
          translations = JSON.parse(raw).translations || {};
console.info('[translate] ok', l, Object.keys(translations).length, 'of', texts.length);
        } catch {
          const msg = raw
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .slice(0, 500);
          console.error('[translate] backend error:', res.status, msg);
        }
      }
    } catch (e) {
      console.error('[translate] failed', e);
    }
    busy.current = false;

    // i-save ang may pagbabago lang (hindi ang kapareho ng English)
    const clean = {};
    Object.entries(translations).forEach(([k, v]) => {
      if (typeof v === 'string' && v && v !== k) clean[k] = v;
    });
    if (Object.keys(clean).length) {
      const merged = { ...loadCache(l), ...clean };
      saveCache(l, merged);
      if (langRef.current === l) setCache(merged);
    }

    // ulitin ang mga hindi nasagot
    let retried = 0;
    if (langRef.current === l) {
      texts.forEach((tx) => {
        if (tx in translations) return;
        attempts.current[tx] = (attempts.current[tx] || 0) + 1;
        if (attempts.current[tx] <= MAX_TRIES) {
          queue.current.push(tx);
          retried += 1;
        }
      });
    }

    if (queue.current.length) schedule(retried ? 2000 : 150);
  }, []);
  flushRef.current = flush;

  // t('common.save')
  // t('menu.profile', 'My Profile')              <- default text
  // t('menu.profile', { defaultValue: 'My Profile' })
  // t('Hello {name}', { name })
  const t = useCallback(
    (key, vars) => {
      if (typeof key !== 'string' || !key.trim()) return key;

      const def = typeof vars === 'string' ? vars : vars && vars.defaultValue;
      const params = vars && typeof vars === 'object' ? vars : null;

      const source =
        EN[key] ?? def ?? (KEY_LIKE.test(key) ? humanize(key) : key); // English text
      let out = source;

      if (lang !== 'en') {
        if (cache[source]) {
          out = cache[source];
        } else if (!requested.current.has(source)) {
          requested.current.add(source);
          queue.current.push(source);
          schedule(150);
        }
      }

      if (params) {
        Object.keys(params).forEach((k) => {
          if (k === 'defaultValue') return;
          out = out.split(`{{${k}}}`).join(params[k]).split(`{${k}}`).join(params[k]);
        });
      }
      return out;
    },
    [lang, cache]
  );

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useLang = () =>
  useContext(Ctx) || { lang: 'en', setLang: () => {}, t: (s) => s };