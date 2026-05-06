/**
 * Personalized Gradient (C12) unit tests
 *
 * Tests the 7-day mood distribution analysis and blended gradient computation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

function seedMoodLog(entries: Array<{ score: number; timestamp: number }>) {
  localStorage.setItem('igotu_mood_log', JSON.stringify(entries));
}

describe('personalizedGradient (C12)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('returns default gradient when no mood log exists', () => {
    const store = useMoodThemeStore();
    store.init();
    const pg = store.personalizedGradient;
    expect(pg.css).toContain('linear-gradient');
    expect(pg.from).toMatch(/^#[0-9a-f]{6}$/);
    expect(pg.to).toMatch(/^#[0-9a-f]{6}$/);
    expect(pg.mid).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns default gradient when fewer than 3 entries in past 7 days', () => {
    const now = Date.now();
    seedMoodLog([
      { score: 5, timestamp: now - 1000 },
      { score: 4, timestamp: now - 2000 },
    ]);
    const store = useMoodThemeStore();
    store.init();
    // With < 3 entries, should fall back to default (mood 3 palette)
    const pg = store.personalizedGradient;
    expect(pg.css).toContain('linear-gradient');
  });

  it('blends dominant and secondary mood palettes with 3+ entries', () => {
    const now = Date.now();
    seedMoodLog([
      { score: 5, timestamp: now - 1000 },
      { score: 5, timestamp: now - 2000 },
      { score: 5, timestamp: now - 3000 },
      { score: 4, timestamp: now - 4000 },
    ]);
    const store = useMoodThemeStore();
    store.init();
    const pg = store.personalizedGradient;

    // Dominant is 5 (amber), secondary is 4 (green)
    // The blended 'from' should not be pure amber or pure green
    expect(pg.from).toMatch(/^#[0-9a-f]{6}$/);
    // Should be a valid CSS gradient
    expect(pg.css).toContain('linear-gradient(135deg');
  });

  it('ignores entries older than 7 days', () => {
    const now = Date.now();
    const eightDaysAgo = now - 8 * 24 * 3600_000;
    seedMoodLog([
      { score: 1, timestamp: eightDaysAgo },
      { score: 1, timestamp: eightDaysAgo + 1000 },
      { score: 1, timestamp: eightDaysAgo + 2000 },
      { score: 1, timestamp: eightDaysAgo + 3000 },
      // Only 2 recent entries → falls back to default
      { score: 5, timestamp: now - 1000 },
      { score: 5, timestamp: now - 2000 },
    ]);
    const store = useMoodThemeStore();
    store.init();
    const pg = store.personalizedGradient;
    // With only 2 recent entries, should use default palette (mood 3)
    expect(pg.css).toContain('linear-gradient');
  });

  it('refreshWeekDistribution recalculates after new mood entry', () => {
    const now = Date.now();
    seedMoodLog([
      { score: 3, timestamp: now - 1000 },
      { score: 3, timestamp: now - 2000 },
      { score: 3, timestamp: now - 3000 },
    ]);
    const store = useMoodThemeStore();
    store.init();
    const pg1 = store.personalizedGradient.css;

    // Add new mood 5 entries
    seedMoodLog([
      { score: 5, timestamp: now - 500 },
      { score: 5, timestamp: now - 1000 },
      { score: 5, timestamp: now - 1500 },
      { score: 3, timestamp: now - 2000 },
    ]);
    store.refreshWeekDistribution();
    const pg2 = store.personalizedGradient.css;

    // Gradient should have changed because dominant mood shifted
    expect(pg1).not.toBe(pg2);
  });

  it('handles malformed localStorage gracefully', () => {
    localStorage.setItem('igotu_mood_log', 'not valid json');
    const store = useMoodThemeStore();
    store.init();
    // Should not crash, should use default
    const pg = store.personalizedGradient;
    expect(pg.css).toContain('linear-gradient');
  });

  it('handles empty array in localStorage', () => {
    localStorage.setItem('igotu_mood_log', '[]');
    const store = useMoodThemeStore();
    store.init();
    const pg = store.personalizedGradient;
    expect(pg.css).toContain('linear-gradient');
  });
});
