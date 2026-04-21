import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMoodCheckIn, emotionToScore, emotionToColor } from '@/composables/useMoodCheckIn';

describe('emotionToScore', () => {
  it('maps positive valence to high score', () => {
    expect(emotionToScore({ valence: 0.8, arousal: 0 })).toBeGreaterThanOrEqual(4);
  });

  it('maps negative valence to low score', () => {
    expect(emotionToScore({ valence: -0.8, arousal: 0 })).toBeLessThanOrEqual(2);
  });

  it('maps neutral to mid score', () => {
    expect(emotionToScore({ valence: 0, arousal: 0 })).toBe(3);
  });

  it('clamps result to 1-5 range', () => {
    expect(emotionToScore({ valence: -1, arousal: 1 })).toBeGreaterThanOrEqual(1);
    expect(emotionToScore({ valence: 1, arousal: 1 })).toBeLessThanOrEqual(5);
  });

  it('high arousal + negative valence → lower score (anxiety)', () => {
    const calm = emotionToScore({ valence: -0.5, arousal: -0.5 });
    const anxious = emotionToScore({ valence: -0.5, arousal: 0.8 });
    expect(anxious).toBeLessThanOrEqual(calm);
  });

  it('high arousal + positive valence → higher score (excitement)', () => {
    const calm = emotionToScore({ valence: 0.5, arousal: -0.5 });
    const excited = emotionToScore({ valence: 0.5, arousal: 0.8 });
    expect(excited).toBeGreaterThanOrEqual(calm);
  });
});

describe('emotionToColor', () => {
  it('returns HSL object', () => {
    const color = emotionToColor({ valence: 0.5, arousal: 0.3 });
    expect(color).toHaveProperty('h');
    expect(color).toHaveProperty('s');
    expect(color).toHaveProperty('l');
  });

  it('returns valid hue (0-360)', () => {
    const angles = [
      { valence: 1, arousal: 0 },
      { valence: 0, arousal: 1 },
      { valence: -1, arousal: 0 },
      { valence: 0, arousal: -1 },
    ];
    for (const e of angles) {
      const c = emotionToColor(e);
      expect(c.h).toBeGreaterThanOrEqual(0);
      expect(c.h).toBeLessThanOrEqual(360);
    }
  });

  it('saturation increases with intensity', () => {
    const low = emotionToColor({ valence: 0.1, arousal: 0.1 });
    const high = emotionToColor({ valence: 0.9, arousal: 0.5 });
    expect(high.s).toBeGreaterThan(low.s);
  });
});

describe('useMoodCheckIn', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('initializes with shouldShow based on cooldown', () => {
    const checkIn = useMoodCheckIn();
    checkIn.initCheckIn();
    // No previous check-in → should show
    expect(checkIn.shouldShow.value).toBe(true);
  });

  it('respects cooldown period', () => {
    localStorage.setItem('igotu_last_checkin_ts', String(Date.now()));

    const checkIn = useMoodCheckIn();
    checkIn.initCheckIn();
    expect(checkIn.shouldShow.value).toBe(false);
  });

  it('allows check-in after cooldown expires', () => {
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    localStorage.setItem('igotu_last_checkin_ts', String(threeHoursAgo));

    const checkIn = useMoodCheckIn();
    checkIn.initCheckIn();
    expect(checkIn.shouldShow.value).toBe(true);
  });

  it('answerEmotion advances to step 2', () => {
    const checkIn = useMoodCheckIn();
    checkIn.answerEmotion({ valence: 0.5, arousal: 0.3 });

    expect(checkIn.currentStep.value).toBe(2);
    expect(checkIn.answers.emotion).toEqual({ valence: 0.5, arousal: 0.3 });
    expect(checkIn.previewScore.value).toBeTruthy();
  });

  it('answerNeed completes check-in', () => {
    const checkIn = useMoodCheckIn();
    checkIn.answerEmotion({ valence: 0.5, arousal: 0 });
    checkIn.answerNeed('relax');

    expect(checkIn.isCompleted.value).toBe(true);
    expect(checkIn.shouldShow.value).toBe(false);
    expect(checkIn.answers.need).toBe('relax');
  });

  it('skip closes without completing', () => {
    const checkIn = useMoodCheckIn();
    checkIn.initCheckIn();
    checkIn.skip();

    expect(checkIn.shouldShow.value).toBe(false);
    expect(checkIn.isCompleted.value).toBe(false);
  });

  it('boostMood increases score but caps at 5', () => {
    const checkIn = useMoodCheckIn();
    expect(checkIn.boostMood(4)).toBeLessThanOrEqual(5);
    // Boost of 0.4 on score 2 → 2.4 → rounds to 2
    expect(checkIn.boostMood(3)).toBeGreaterThanOrEqual(3);
  });

  it('records mood history entries', () => {
    const checkIn = useMoodCheckIn();
    checkIn.answerEmotion({ valence: 0, arousal: 0 });
    checkIn.answerNeed('nothing');
    checkIn.recordPulse({ valence: 0.3, arousal: 0.1 });

    expect(checkIn.sessionMoodHistory.value).toHaveLength(2);
  });

  it('thresholdData computes correctly', () => {
    const checkIn = useMoodCheckIn();
    checkIn.answerEmotion({ valence: -0.5, arousal: 0 });
    checkIn.answerNeed('listen');
    checkIn.recordPulse({ valence: 0.3, arousal: 0 });

    const data = checkIn.thresholdData.value;
    expect(data).not.toBeNull();
    expect(data!.changeCount).toBe(2);
    expect(data!.delta).toBeDefined();
  });
});
