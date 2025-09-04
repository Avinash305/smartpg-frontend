import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import kn from './kn';
import hi from './hi';
import mr from './mr';
import ta from './ta';
import te from './te';

// Supported language codes in resources below
const SUPPORTED_LANGS = ['en', 'kn', 'hi', 'mr', 'ta', 'te'];

// Helper: normalize incoming language codes (map 'ka' -> 'kn')
const normalizeLang = (code) => {
  const c = String(code || 'en').toLowerCase();
  const mapped = c === 'ka' ? 'kn' : c;
  return SUPPORTED_LANGS.includes(mapped) ? mapped : 'en';
};

// Resolve initial language
let storedLang = 'en';
try {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('app_language') : null;
  if (saved) {
    storedLang = normalizeLang(saved);
    // Persist normalized value if it changed
    if (saved !== storedLang) {
      try { if (typeof window !== 'undefined') localStorage.setItem('app_language', storedLang); } catch {}
    }
  } else {
    // First visit: try browser language (e.g., en-US -> en)
    const navLang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.split('-')[0] : 'en';
    storedLang = normalizeLang(navLang);
    // Persist for subsequent visits
    try { if (typeof window !== 'undefined') localStorage.setItem('app_language', storedLang); } catch {}
  }
} catch {}

try { if (typeof document !== 'undefined') document.documentElement.lang = storedLang; } catch {}

if (!i18next.isInitialized) {
  i18next
    .use(initReactI18next)
    .init({
      resources: { en, kn, hi, mr, ta, te },
      lng: normalizeLang(storedLang) || 'en',
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });

  // Keep <html lang> synced with i18n at runtime
  try {
    i18next.on('languageChanged', (lng) => {
      try { if (typeof document !== 'undefined') document.documentElement.lang = normalizeLang(lng); } catch {}
    });
  } catch {}
}

export default i18next;
