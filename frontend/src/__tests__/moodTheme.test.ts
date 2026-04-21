import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMoodThemeStore, MOOD_CONFIG } from '@/composables/useMoodTheme';

describe('useMoodThemeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('defaults to mood 3', () => {
    const store = useMoodThemeStore();
    expect(store.currentMood).toBe(3);
  });

  it('provides palette for default mood', () => {
    const store = useMoodThemeStore();
    expect(store.palette.accent).toBe('#14b8a6');
  });

  it('setMood changes palette', () => {
    const store = useMoodThemeStore();
    store.setMood(1);
    expect(store.currentMood).toBe(1);
    expect(store.palette.accent).toBe('#8b5cf6');
  });

  it('clamps mood to 1-5 range', () => {
    const store = useMoodThemeStore();
    store.setMood(0);
    expect(store.currentMood).toBe(1);
    store.setMood(10);
    expect(store.currentMood).toBe(5);
  });

  it('rounds fractional mood scores', () => {
    const store = useMoodThemeStore();
    store.setMood(3.7);
    expect(store.currentMood).toBe(4);
  });

  it('activates low energy mode for mood <= 2', () => {
    const store = useMoodThemeStore();
    store.setMood(2);
    expect(store.isLowEnergy).toBe(true);
    store.setMood(3);
    expect(store.isLowEnergy).toBe(false);
  });

  it('adjusts animation speed for low moods', () => {
    const store = useMoodThemeStore();
    store.setMood(1);
    expect(store.animationSpeed).toBe(0.5);
    store.setMood(2);
    expect(store.animationSpeed).toBe(0.7);
    store.setMood(3);
    expect(store.animationSpeed).toBe(1);
  });

  it('persists mood to localStorage', () => {
    const store = useMoodThemeStore();
    store.setMood(4);
    expect(localStorage.getItem('igotu_last_mood')).toBe('4');
  });

  it('loads saved mood on init', () => {
    localStorage.setItem('igotu_last_mood', '5');
    const store = useMoodThemeStore();
    store.init();
    expect(store.currentMood).toBe(5);
  });

  it('all 5 palettes have required properties', () => {
    const store = useMoodThemeStore();
    for (let mood = 1; mood <= 5; mood++) {
      store.setMood(mood);
      const p = store.palette;
      expect(p.accent).toBeTruthy();
      expect(p.accentSoft).toBeTruthy();
      expect(p.glow).toBeTruthy();
      expect(p.gradientFrom).toBeTruthy();
      expect(p.gradientTo).toBeTruthy();
      expect(p.chart).toBeTruthy();
      expect(p.navActive).toBeTruthy();
      expect(p.navActiveText).toBeTruthy();
      expect(typeof p.glowIntensity).toBe('number');
      expect(typeof p.fontWeight).toBe('number');
    }
  });

  it('personalizedGradient returns valid CSS', () => {
    const store = useMoodThemeStore();
    store.init();
    const pg = store.personalizedGradient;
    expect(pg.css).toContain('linear-gradient');
    expect(pg.from).toMatch(/^#[0-9a-f]{6}$/);
    expect(pg.to).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('MOOD_CONFIG', () => {
  it('has 5 mood levels', () => {
    expect(MOOD_CONFIG).toHaveLength(5);
  });

  it('each config has score, emoji, label, color, metaphor', () => {
    for (const config of MOOD_CONFIG) {
      expect(config.score).toBeGreaterThanOrEqual(1);
      expect(config.score).toBeLessThanOrEqual(5);
      expect(config.emoji).toBeTruthy();
      expect(config.label).toBeTruthy();
      expect(config.color).toMatch(/^#/);
      expect(config.metaphor).toBeTruthy();
    }
  });
});
