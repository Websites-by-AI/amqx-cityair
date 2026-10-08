import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGS, dirOf, strings, type Lang } from "./strings";

/**
 * Language context.
 *
 * Priority for the initial language:
 *   1. `?lang=xx` in the URL (shareable links, e.g. ?lang=ar)
 *   2. the visitor's saved choice (localStorage)
 *   3. the browser language, if we support it
 *   4. English
 *
 * The provider also sets <html lang> and <html dir>, so Persian and Arabic render
 * right-to-left everywhere (Tailwind's logical utilities follow automatically).
 */

type Ctx = {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LangContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "cityair-lang";

const supported = LANGS.map((l) => l.code);

/** Read ?lang= from both the real query string and any query that ended up inside the hash. */
function langFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const inSearch = new URLSearchParams(window.location.search).get("lang");
  if (inSearch) return inSearch;
  const hash = window.location.hash || "";
  const q = hash.indexOf("?");
  if (q !== -1) {
    const inHash = new URLSearchParams(hash.slice(q + 1)).get("lang");
    if (inHash) return inHash;
  }
  return null;
}

function detect(): Lang {
  if (typeof window === "undefined") return "en";
  const fromUrl = langFromUrl();
  if (fromUrl && supported.includes(fromUrl as Lang)) return fromUrl as Lang;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && supported.includes(saved as Lang)) return saved as Lang;
  } catch {
    /* storage can be blocked — ignore */
  }
  const nav = (window.navigator.language || "en").slice(0, 2).toLowerCase();
  if (supported.includes(nav as Lang)) return nav as Lang;
  return "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detect());
  const dir = dirOf(lang);

  // A link whose query landed inside the hash (e.g. "#/partners?lang=ar") changes the hash only —
  // no page reload — so pick the language up here as well.
  useEffect(() => {
    const onHash = () => {
      const l = langFromUrl();
      if (l && supported.includes(l as Lang)) setLangState(l as Lang);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang, dir]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    // keep the URL shareable without reloading the SPA
    try {
      const url = new URL(window.location.href);
      if (next === "en") url.searchParams.delete("lang");
      else url.searchParams.set("lang", next);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = strings[lang]?.[key] ?? strings.en[key] ?? key;
      if (!vars) return raw;
      return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), raw);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, dir, setLang, t }), [lang, dir, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useI18n must be used inside <LangProvider>");
  return ctx;
}

export { LANGS };
export type { Lang };
