/**
 * DayTimeline component unit tests
 *
 * Tests the daily timeline that visualizes today's mood entries
 * and achievements on a horizontal time axis.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import DayTimeline from '@/components/visualization/DayTimeline.vue';

// Mock i18n
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'dayTimeline.title': '今日轨迹',
        'dayTimeline.events': '个事件',
      };
      return map[key] ?? key;
    },
  }),
}));

// Mock achievement store
vi.mock('@/stores/achievements', () => ({
  useAchievementStore: () => ({
    todayAchievements: [],
  }),
}));

// Mock mood theme store
vi.mock('@/composables/useMoodTheme', () => ({
  useMoodThemeStore: () => ({
    palette: { accent: '#14b8a6' },
  }),
  MOOD_CONFIG: [
    { score: 1, emoji: '😢', color: '#8b5cf6' },
    { score: 2, emoji: '😕', color: '#6366f1' },
    { score: 3, emoji: '😐', color: '#14b8a6' },
    { score: 4, emoji: '🙂', color: '#10b981' },
    { score: 5, emoji: '😊', color: '#f59e0b' },
  ],
}));

function seedMoodLog(entries: Array<{ score: number; timestamp: number }>) {
  localStorage.setItem('igotu_mood_log', JSON.stringify(entries));
}

describe('DayTimeline', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('renders without crashing when no data exists', () => {
    const wrapper = mount(DayTimeline);
    expect(wrapper.exists()).toBe(true);
  });

  it('shows title text when events exist', () => {
    seedMoodLog([{ score: 3, timestamp: Date.now() - 3600_000 }]);
    const wrapper = mount(DayTimeline);
    expect(wrapper.text()).toContain('今日轨迹');
  });

  it('shows event dots when mood entries exist for today', () => {
    const now = Date.now();
    seedMoodLog([
      { score: 3, timestamp: now - 3600_000 },
      { score: 4, timestamp: now - 1800_000 },
    ]);

    const wrapper = mount(DayTimeline);
    const dots = wrapper.findAll('.timeline-dot');
    expect(dots.length).toBeGreaterThanOrEqual(2);
  });

  it('ignores mood entries from yesterday', () => {
    const yesterday = Date.now() - 25 * 3600_000;
    seedMoodLog([
      { score: 3, timestamp: yesterday },
    ]);

    const wrapper = mount(DayTimeline);
    const dots = wrapper.findAll('.timeline-dot');
    expect(dots.length).toBe(0);
  });

  it('renders hour markers when events exist', () => {
    seedMoodLog([{ score: 4, timestamp: Date.now() - 1800_000 }]);
    const wrapper = mount(DayTimeline);
    const text = wrapper.text();
    expect(text).toContain('12');
  });

  it('contains a "now" indicator when events exist', () => {
    seedMoodLog([{ score: 3, timestamp: Date.now() - 600_000 }]);
    const wrapper = mount(DayTimeline);
    const nowIndicator = wrapper.find('.timeline-now');
    expect(nowIndicator.exists()).toBe(true);
  });
});
