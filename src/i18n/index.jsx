import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en';
import hi from './hi';
import kn from './kn';

export const LANGS = [['en', 'English'], ['hi', 'हिन्दी'], ['kn', 'ಕನ್ನಡ']];
const DICTS = { en, hi, kn };
const SHORT = { en: 'EN', hi: 'हिं', kn: 'ಕ' };
const stored = () => { try { const l = localStorage.getItem('poshak_lang'); return DICTS[l] ? l : 'en'; } catch { return 'en'; } };

let current = stored();                       // also readable outside React (see tr())
const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)) : s);
// Plain-function translate for non-component code (e.g. order status copy). Components should still call useT() so they re-render on change.
export const tr = (key, vars) => fill(DICTS[current]?.[key] ?? en[key] ?? key, vars);

const Ctx = createContext({ lang: 'en', setLang: () => {}, t: tr });
export const LangProvider = ({ children }) => {
  const [lang, setLangState] = useState(current);
  const setLang = useCallback((l) => {
    if (!DICTS[l]) return;
    current = l; setLangState(l);
    try { localStorage.setItem('poshak_lang', l); } catch { /* ignore */ }
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t: (key, vars) => fill(DICTS[lang]?.[key] ?? en[key] ?? key, vars) }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
export const useT = () => useContext(Ctx);

export const LangSwitch = ({ compact = false }) => {
  const { lang, setLang } = useT();
  return (
    <select className={`psk-lang ${compact ? 'compact' : ''}`} value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
      {LANGS.map(([k, l]) => <option key={k} value={k}>{compact ? SHORT[k] : l}</option>)}
    </select>
  );
};
