import { describe, it, expect, beforeEach } from 'vitest';
import { useOpeningPreference } from '@/composables/useOpeningPreference';

describe('useOpeningPreference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no preference', () => {
    const pref = useOpeningPreference();
    expect(pref.hasPreference.value).toBe(false);
    expect(pref.lastChoice.value).toBeUndefined();
  });

  it('setChoice stores the choice', () => {
    const pref = useOpeningPreference();
    pref.setChoice('A');
    expect(pref.preferredMode.value).toBe('choice');
    expect(pref.lastChoice.value).toBe('A');
    expect(pref.hasPreference.value).toBe(true);
  });

  it('setFreetext stores freetext mode', () => {
    const pref = useOpeningPreference();
    pref.setFreetext();
    expect(pref.preferredMode.value).toBe('freetext');
    expect(pref.hasPreference.value).toBe(true);
  });

  it('persists to localStorage', () => {
    const pref = useOpeningPreference();
    pref.setChoice('B');
    const stored = localStorage.getItem('igotu_opening_preference');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.mode).toBe('choice');
    expect(parsed.lastChoice).toBe('B');
  });

  it('clear removes preference', () => {
    const pref = useOpeningPreference();
    pref.setChoice('A');
    pref.clear();
    expect(pref.hasPreference.value).toBe(false);
    expect(localStorage.getItem('igotu_opening_preference')).toBeNull();
  });
});
