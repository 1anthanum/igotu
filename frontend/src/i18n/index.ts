/**
 * Lightweight i18n system for IGOTU
 *
 * Usage:
 *   import { useI18n } from '@/i18n';
 *   const { t, locale } = useI18n();
 *   t('breathing.title')  // returns translated string
 *   locale.value = 'en';  // switch language
 */

import { ref, computed } from 'vue';
import { zh } from './zh';
import { en } from './en';

export type Locale = 'zh' | 'en';

const STORAGE_KEY = 'igotu_locale';

function loadLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {}
  return 'zh';
}

/** Global reactive locale — shared across all components */
export const currentLocale = ref<Locale>(loadLocale());

const messages: Record<Locale, Record<string, any>> = { zh, en };

/** Resolve a dot-path key from a nested object */
function resolve(obj: any, path: string): any {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return path;
    cur = cur[p];
  }
  return cur ?? path;
}

export function setLocale(loc: Locale) {
  currentLocale.value = loc;
  try { localStorage.setItem(STORAGE_KEY, loc); } catch {}
  // Update html lang attribute for accessibility
  try { document.documentElement.lang = loc; } catch {}
}

export function useI18n() {
  /** Translate a key, with optional interpolation: t('key', { n: 3 }) */
  function t(key: string, params?: Record<string, string | number>): any {
    let result = resolve(messages[currentLocale.value], key);
    if (result === key) {
      // Fallback to zh if en key is missing
      result = resolve(messages.zh, key);
    }
    if (typeof result === 'string' && params) {
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return result;
  }

  const locale = computed({
    get: () => currentLocale.value,
    set: (v: Locale) => setLocale(v),
  });

  const isEn = computed(() => currentLocale.value === 'en');
  const isZh = computed(() => currentLocale.value === 'zh');

  return { t, locale, isEn, isZh, setLocale };
}
