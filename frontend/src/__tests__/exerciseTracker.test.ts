import { describe, it, expect, beforeEach } from 'vitest';
import { useExerciseTracker } from '@/composables/useExerciseTracker';

describe('useExerciseTracker', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset the module-level shared records ref
    const tracker = useExerciseTracker();
    tracker.records.value = [];
  });

  it('starts with empty records', () => {
    const tracker = useExerciseTracker();
    expect(tracker.records.value).toEqual([]);
    expect(tracker.totalCount.value).toBe(0);
  });

  it('logs a breathing exercise', () => {
    const tracker = useExerciseTracker();
    const record = tracker.logCompletion('breathing', 'box');

    expect(record.type).toBe('breathing');
    expect(record.technique).toBe('box');
    expect(record.id).toMatch(/^ex-/);
    expect(tracker.breathingCount.value).toBe(1);
    expect(tracker.totalCount.value).toBe(1);
  });

  it('logs a grounding exercise', () => {
    const tracker = useExerciseTracker();
    tracker.logCompletion('grounding', '5-4-3-2-1');

    expect(tracker.groundingCount.value).toBe(1);
    expect(tracker.breathingCount.value).toBe(0);
  });

  it('counts today exercises', () => {
    const tracker = useExerciseTracker();
    tracker.logCompletion('breathing', 'box');
    tracker.logCompletion('breathing', '4-7-8');

    expect(tracker.todayCount.value).toBe(2);
  });

  it('persists records to localStorage', () => {
    const tracker1 = useExerciseTracker();
    tracker1.logCompletion('breathing', 'box');

    const raw = localStorage.getItem('igotu_exercise_records');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
  });

  it('limits records to 200', () => {
    const tracker = useExerciseTracker();
    for (let i = 0; i < 210; i++) {
      tracker.logCompletion('breathing', 'box');
    }
    expect(tracker.records.value.length).toBeLessThanOrEqual(200);
  });

  it('returns recent records', () => {
    const tracker = useExerciseTracker();
    for (let i = 0; i < 15; i++) {
      tracker.logCompletion('breathing', `tech-${i}`);
    }

    const recent = tracker.recentRecords(5);
    expect(recent).toHaveLength(5);
  });

  it('groups records by date', () => {
    const tracker = useExerciseTracker();
    tracker.logCompletion('breathing', 'box');
    tracker.logCompletion('grounding', '5-4-3-2-1');

    const byDate = tracker.recordsByDate.value;
    const today = new Date().toISOString().slice(0, 10);
    expect(byDate[today]).toHaveLength(2);
  });

  it('stores additional data with record', () => {
    const tracker = useExerciseTracker();
    const record = tracker.logCompletion('breathing', 'box', { cycles: 4, feeling: 'calm' });

    expect(record.data).toEqual({ cycles: 4, feeling: 'calm' });
  });
});
