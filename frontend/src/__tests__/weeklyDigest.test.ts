/**
 * WeeklyDigest component unit tests
 *
 * Tests the collapsible weekly summary card that renders
 * sparklines and stats from 7-day mood data.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import WeeklyDigest from '@/components/mood/WeeklyDigest.vue';

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'weeklyDigest.title': '这周的你',
        'weeklyDigest.records': '记录数',
        'weeklyDigest.activeDays': '活跃天',
        'weeklyDigest.avgMood': '均值',
        'weeklyDigest.quadrantCalm': '这周整体很平静，状态不错',
        'weeklyDigest.quadrantExcited': '这周你大多时候情绪偏兴奋活跃',
        'weeklyDigest.quadrantAnxious': '这周焦虑感偏多，记得深呼吸',
        'weeklyDigest.quadrantLow': '这周低能量居多，你在坚持着',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock("@/composables/useMoodCheckIn", () => ({
  emotionToColor: (e: any) => ({ h: 180, s: 50, l: 50 }),
  useMoodCheckIn: () => ({ shouldShow: { value: false }, initCheckIn: () => {} }),
}));

vi.mock('@/composables/useMoodTheme', () => ({
  useMoodThemeStore: () => ({
    palette: { accent: '#14b8a6', accentSoft: '#0a2e28' },
  }),
}));

function seedWeekMoodLog(count: number, score = 3) {
  const entries = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    entries.push({
      score,
      emotion: { valence: score >= 3 ? 0.5 : -0.3, arousal: score >= 4 ? 0.4 : -0.2 },
      need: 'relax',
      timestamp: now - i * 12 * 3600_000,
      trigger: 'test',
    });
  }
  localStorage.setItem('igotu_mood_log', JSON.stringify(entries));
}

describe('WeeklyDigest', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('renders nothing when fewer than 2 entries exist', async () => {
    seedWeekMoodLog(1);
    const wrapper = mount(WeeklyDigest);
    await flushPromises();
    expect(wrapper.text()).not.toContain('记录数');
  });

  it('renders card when >= 2 entries exist', async () => {
    seedWeekMoodLog(5);
    const wrapper = mount(WeeklyDigest);
    await flushPromises();
    expect(wrapper.text()).toContain('这周的你');
  });

  it('displays correct record count after expanding', async () => {
    seedWeekMoodLog(4);
    const wrapper = mount(WeeklyDigest);
    await flushPromises();
    // Click to expand
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('4');
    expect(wrapper.text()).toContain('记录数');
  });

  it('computes average mood correctly', async () => {
    seedWeekMoodLog(6, 4);
    const wrapper = mount(WeeklyDigest);
    await flushPromises();
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('4');
    expect(wrapper.text()).toContain('均值');
  });

  it('shows a sparkline SVG', async () => {
    seedWeekMoodLog(5);
    const wrapper = mount(WeeklyDigest);
    await flushPromises();
    const svg = wrapper.find('svg');
    expect(svg.exists()).toBe(true);
  });

  it('ignores entries older than 7 days', async () => {
    const entries = [
      { score: 5, emotion: { valence: 0.8, arousal: 0.5 }, need: 'relax', timestamp: Date.now() - 1 * 3600_000, trigger: 'test' },
      { score: 4, emotion: { valence: 0.5, arousal: 0.3 }, need: 'relax', timestamp: Date.now() - 2 * 3600_000, trigger: 'test' },
      { score: 3, emotion: { valence: 0, arousal: 0 }, need: 'relax', timestamp: Date.now() - 10 * 24 * 3600_000, trigger: 'test' },
    ];
    localStorage.setItem('igotu_mood_log', JSON.stringify(entries));
    const wrapper = mount(WeeklyDigest);
    await flushPromises();
    await wrapper.find('button').trigger('click');
    await flushPromises();
    // Should only see 2 records (the 10-day-old one filtered out)
    expect(wrapper.text()).toContain('2');
  });

  it('shows quadrant info when expanded', async () => {
    seedWeekMoodLog(5, 4); // score 4 → valence 0.5, arousal 0.4 → excited quadrant
    const wrapper = mount(WeeklyDigest);
    await flushPromises();
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('这周你大多时候情绪偏兴奋活跃');
  });

  it('collapses when clicked again', async () => {
    seedWeekMoodLog(5);
    const wrapper = mount(WeeklyDigest);
    await flushPromises();
    const btn = wrapper.find('button');
    await btn.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('记录数');
    // Click again to collapse
    await btn.trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('记录数');
  });
});
