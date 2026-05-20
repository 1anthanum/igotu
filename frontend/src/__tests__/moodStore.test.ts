/**
 * Mood Pinia store unit tests
 *
 * Tests log(), fetchToday(), fetchTrend() actions,
 * initial state, loading flags, and justLogged behavior.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMoodStore } from '@/stores/mood';
import type { MoodEntry } from '@/api/mood';

// ── Mocks ────────────────────────────────────────────────

const mockSetMood = vi.fn();

vi.mock('@/api/mood', () => ({
  logMood: vi.fn(),
  getTodayMoods: vi.fn(),
  getMoodTrend: vi.fn(),
}));

vi.mock('@/composables/useMoodTheme', () => ({
  useMoodThemeStore: () => ({
    setMood: mockSetMood,
    init: vi.fn(),
  }),
}));

// Import mocked functions so we can control their return values per test
import { logMood, getTodayMoods, getMoodTrend } from '@/api/mood';

const mockedLogMood = vi.mocked(logMood);
const mockedGetTodayMoods = vi.mocked(getTodayMoods);
const mockedGetMoodTrend = vi.mocked(getMoodTrend);

// ── Helpers ──────────────────────────────────────────────

function makeMoodEntry(overrides: Partial<MoodEntry> = {}): MoodEntry {
  return {
    id: 'entry-1',
    mood_score: 4,
    mood_emoji: '🙂',
    mood_label: '还不错',
    note: '',
    recorded_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────

describe('useMoodStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Initial state
  it('has correct initial state', () => {
    const store = useMoodStore();
    expect(store.todayEntries).toEqual([]);
    expect(store.trendData).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.justLogged).toBe(false);
  });

  // 2. log: adds entry to todayEntries via unshift
  it('log() prepends the new entry to todayEntries', async () => {
    const existing = makeMoodEntry({ id: 'old', mood_score: 3 });
    const created = makeMoodEntry({ id: 'new', mood_score: 4 });
    mockedLogMood.mockResolvedValue(created);

    const store = useMoodStore();
    store.todayEntries.push(existing);

    await store.log({ mood_score: 4, mood_emoji: '🙂', mood_label: '还不错' });

    expect(store.todayEntries).toHaveLength(2);
    expect(store.todayEntries[0]).toEqual(created);
    expect(store.todayEntries[1]).toEqual(existing);
  });

  // 3. log: calls moodTheme.setMood with the mood_score
  it('log() calls moodTheme.setMood with the provided mood_score', async () => {
    mockedLogMood.mockResolvedValue(makeMoodEntry({ mood_score: 2 }));

    const store = useMoodStore();
    await store.log({ mood_score: 2, mood_emoji: '😕', mood_label: '不太好' });

    expect(mockSetMood).toHaveBeenCalledWith(2);
  });

  // 4. log: sets justLogged to true
  it('log() sets justLogged to true and resets after 2000ms', async () => {
    mockedLogMood.mockResolvedValue(makeMoodEntry());

    const store = useMoodStore();
    expect(store.justLogged).toBe(false);

    await store.log({ mood_score: 4, mood_emoji: '🙂', mood_label: '还不错' });
    expect(store.justLogged).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(store.justLogged).toBe(false);
  });

  // 5. fetchToday: populates todayEntries from API
  it('fetchToday() populates todayEntries from the API', async () => {
    const entries = [
      makeMoodEntry({ id: 'a' }),
      makeMoodEntry({ id: 'b' }),
    ];
    mockedGetTodayMoods.mockResolvedValue(entries);

    const store = useMoodStore();
    await store.fetchToday();

    expect(mockedGetTodayMoods).toHaveBeenCalledOnce();
    expect(store.todayEntries).toEqual(entries);
  });

  // 6. fetchTrend: populates trendData from API
  it('fetchTrend() populates trendData from the API', async () => {
    const trend = [
      makeMoodEntry({ id: 't1' }),
      makeMoodEntry({ id: 't2' }),
      makeMoodEntry({ id: 't3' }),
    ];
    mockedGetMoodTrend.mockResolvedValue(trend);

    const store = useMoodStore();
    await store.fetchTrend(7);

    expect(mockedGetMoodTrend).toHaveBeenCalledWith(7);
    expect(store.trendData).toEqual(trend);
  });

  // 7. fetchTrend: sets loading true during fetch, false after
  it('fetchTrend() manages loading flag around the async call', async () => {
    let resolvePromise!: (value: MoodEntry[]) => void;
    mockedGetMoodTrend.mockImplementation(
      () => new Promise((resolve) => { resolvePromise = resolve; }),
    );

    const store = useMoodStore();
    expect(store.loading).toBe(false);

    const promise = store.fetchTrend();
    // loading should be true while awaiting
    expect(store.loading).toBe(true);

    resolvePromise([makeMoodEntry()]);
    await promise;

    expect(store.loading).toBe(false);
  });

  // 8. fetchTrend: sets loading false and falls back on error
  it('fetchTrend() sets loading to false and clears data when the API throws', async () => {
    mockedGetMoodTrend.mockRejectedValue(new Error('network error'));

    const store = useMoodStore();
    await store.fetchTrend();

    expect(store.loading).toBe(false);
    expect(store.trendData).toEqual([]);
  });

  // 9. log: returns the created entry
  it('log() returns the entry created by the API', async () => {
    const created = makeMoodEntry({ id: 'returned-entry', mood_score: 5 });
    mockedLogMood.mockResolvedValue(created);

    const store = useMoodStore();
    const result = await store.log({ mood_score: 5, mood_emoji: '😊', mood_label: '很好' });

    expect(result).toEqual(created);
  });
});
