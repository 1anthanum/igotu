import { ref, computed } from 'vue';

export interface OpeningPreference {
  mode: 'freetext' | 'choice';
  lastChoice?: string;
  updatedAt: number;
}

const STORAGE_KEY = 'igotu_opening_preference';

function loadPreference(): OpeningPreference | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePreference(pref: OpeningPreference) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
  } catch { /* silent */ }
}

const preference = ref<OpeningPreference | null>(loadPreference());

export function useOpeningPreference() {
  const hasPreference = computed(() => preference.value !== null);

  const preferredMode = computed(() => preference.value?.mode ?? 'freetext');

  const lastChoice = computed(() => preference.value?.lastChoice);

  function setFreetext() {
    preference.value = { mode: 'freetext', updatedAt: Date.now() };
    savePreference(preference.value);
  }

  function setChoice(choiceKey: string) {
    preference.value = { mode: 'choice', lastChoice: choiceKey, updatedAt: Date.now() };
    savePreference(preference.value);
  }

  function clear() {
    preference.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    preference,
    hasPreference,
    preferredMode,
    lastChoice,
    setFreetext,
    setChoice,
    clear,
  };
}
