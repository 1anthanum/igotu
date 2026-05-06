/**
 * IGOTU — 情绪模式洞察引擎
 *
 * 从 sessionMoodHistory + localStorage 持久化数据中，
 * 自动发现情绪规律并生成可读洞察卡片。
 *
 * 洞察类型：
 *   1. 时间模式    — "你在早晨通常感觉更好"
 *   2. 象限迁移    — "你今天从焦虑区移向了平静区"
 *   3. 唤醒度趋势  — "你的情绪强度在下降（趋于平静）"
 *   4. 效价走势    — "整体心情在好转"
 *   5. 连续性      — "这是你连续第 N 天记录情绪"
 *   6. 需求偏好    — "你最常选择'放松一下'"
 *
 * 数据来源：
 *   - useMoodCheckIn().sessionMoodHistory（当前会话，内存）
 *   - localStorage 'igotu_mood_log'（跨天持久化）
 */
import { computed } from 'vue';
import { useMoodCheckIn, emotionToColor } from './useMoodCheckIn';
import type { EmotionPoint, MoodSnapshot } from './useMoodCheckIn';

// ── Types ────────────────────────────────────────────

export interface Insight {
  id: string;
  type: 'time_pattern' | 'quadrant_shift' | 'arousal_trend' | 'valence_trend' | 'streak' | 'need_preference';
  icon: string;
  titleKey: string;     // i18n key
  descKey: string;      // i18n key
  params: Record<string, string | number>;  // interpolation params
  color: { h: number; s: number; l: number };
  priority: number;     // higher = show first
}

// ── Persistent storage ──────────────────────────────

const STORAGE_KEY = 'igotu_mood_log';
const STREAK_KEY = 'igotu_mood_streak';

interface PersistedEntry {
  score: number;
  emotion?: EmotionPoint;
  need?: string;
  timestamp: number;
  trigger: string;
}

function loadPersistedLog(): PersistedEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function appendToPersistedLog(snapshots: MoodSnapshot[]) {
  const existing = loadPersistedLog();
  const existingTs = new Set(existing.map(e => e.timestamp));

  const newEntries = snapshots
    .filter(s => !existingTs.has(s.timestamp))
    .map(s => ({
      score: s.score,
      emotion: s.emotion,
      need: s.need,
      timestamp: s.timestamp,
      trigger: s.trigger,
    }));

  if (newEntries.length === 0) return;

  const merged = [...existing, ...newEntries]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-200); // keep last 200 entries

  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

function getStreak(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    const today = new Date().toDateString();
    const lastDate = new Date(data.lastDate).toDateString();

    if (lastDate === today) return data.count;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastDate === yesterday.toDateString()) return data.count; // will be updated when user records

    return 0; // streak broken
  } catch { return 0; }
}

function updateStreak(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    const today = new Date().toDateString();

    if (!raw) {
      const data = { count: 1, lastDate: today };
      localStorage.setItem(STREAK_KEY, JSON.stringify(data));
      return 1;
    }

    const data = JSON.parse(raw);
    const lastDate = new Date(data.lastDate).toDateString();

    if (lastDate === today) return data.count; // already counted today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastDate === yesterday.toDateString()) {
      data.count += 1;
    } else {
      data.count = 1; // streak broken
    }
    data.lastDate = today;
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
    return data.count;
  } catch { return 1; }
}

// ── Quadrant helper ─────────────────────────────────

type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'center';

function getQuadrant(e: EmotionPoint): Quadrant {
  const intensity = Math.sqrt(e.valence ** 2 + e.arousal ** 2);
  if (intensity < 0.15) return 'center';
  if (e.valence >= 0 && e.arousal >= 0) return 'Q1';
  if (e.valence < 0 && e.arousal >= 0) return 'Q2';
  if (e.valence < 0 && e.arousal < 0) return 'Q3';
  return 'Q4';
}

const QUADRANT_NAMES: Record<Quadrant, string> = {
  Q1: 'insights.quadrantQ1', // excited/positive
  Q2: 'insights.quadrantQ2', // anxious/negative
  Q3: 'insights.quadrantQ3', // depressed/negative
  Q4: 'insights.quadrantQ4', // calm/positive
  center: 'insights.quadrantCenter',
};

// ── Insight generators ──────────────────────────────

function analyzeTimePattern(entries: PersistedEntry[]): Insight | null {
  const withEmotion = entries.filter(e => e.emotion);
  if (withEmotion.length < 3) return null;

  // Group by time-of-day bucket
  const buckets: Record<string, { valenceSum: number; count: number }> = {
    morning: { valenceSum: 0, count: 0 },
    afternoon: { valenceSum: 0, count: 0 },
    evening: { valenceSum: 0, count: 0 },
    night: { valenceSum: 0, count: 0 },
  };

  for (const e of withEmotion) {
    const h = new Date(e.timestamp).getHours();
    let bucket: string;
    if (h >= 6 && h < 12) bucket = 'morning';
    else if (h >= 12 && h < 18) bucket = 'afternoon';
    else if (h >= 18 && h < 23) bucket = 'evening';
    else bucket = 'night';

    buckets[bucket].valenceSum += e.emotion!.valence;
    buckets[bucket].count++;
  }

  // Find best time-of-day
  let bestBucket = '';
  let bestAvg = -Infinity;
  for (const [name, data] of Object.entries(buckets)) {
    if (data.count >= 2) {
      const avg = data.valenceSum / data.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestBucket = name;
      }
    }
  }

  if (!bestBucket || bestAvg < 0.1) return null;

  return {
    id: 'time_pattern',
    type: 'time_pattern',
    icon: bestBucket === 'morning' ? '🌅' : bestBucket === 'afternoon' ? '☀️' : bestBucket === 'evening' ? '🌆' : '🌙',
    titleKey: 'insights.timePatternTitle',
    descKey: `insights.timeBucket_${bestBucket}`,
    params: { bucket: bestBucket },
    color: { h: 45, s: 80, l: 55 },
    priority: 3,
  };
}

function analyzeQuadrantShift(sessionHistory: MoodSnapshot[]): Insight | null {
  const withEmotion = sessionHistory.filter(s => s.emotion);
  if (withEmotion.length < 2) return null;

  const first = withEmotion[0];
  const last = withEmotion[withEmotion.length - 1];
  const fromQ = getQuadrant(first.emotion!);
  const toQ = getQuadrant(last.emotion!);

  if (fromQ === toQ) return null;

  // Determine if this is a positive shift
  const isPositive =
    (fromQ === 'Q2' && (toQ === 'Q1' || toQ === 'Q4')) ||
    (fromQ === 'Q3' && (toQ === 'Q4' || toQ === 'Q1' || toQ === 'center')) ||
    (fromQ === 'center' && (toQ === 'Q1' || toQ === 'Q4'));

  const lastColor = emotionToColor(last.emotion!);

  return {
    id: 'quadrant_shift',
    type: 'quadrant_shift',
    icon: isPositive ? '🌊' : '🔄',
    titleKey: isPositive ? 'insights.quadrantShiftPositive' : 'insights.quadrantShiftNeutral',
    descKey: 'insights.quadrantShiftDesc',
    params: { from: QUADRANT_NAMES[fromQ], to: QUADRANT_NAMES[toQ] },
    color: lastColor,
    priority: isPositive ? 5 : 2,
  };
}

function analyzeArousalTrend(sessionHistory: MoodSnapshot[]): Insight | null {
  const withEmotion = sessionHistory.filter(s => s.emotion);
  if (withEmotion.length < 3) return null;

  const arousalValues = withEmotion.map(s => s.emotion!.arousal);
  const firstHalf = arousalValues.slice(0, Math.ceil(arousalValues.length / 2));
  const secondHalf = arousalValues.slice(Math.ceil(arousalValues.length / 2));

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const diff = avgSecond - avgFirst;

  if (Math.abs(diff) < 0.2) return null;

  const calming = diff < 0;

  return {
    id: 'arousal_trend',
    type: 'arousal_trend',
    icon: calming ? '🍃' : '⚡',
    titleKey: calming ? 'insights.arousalDecreasing' : 'insights.arousalIncreasing',
    descKey: calming ? 'insights.arousalDecreasingDesc' : 'insights.arousalIncreasingDesc',
    params: { delta: Math.abs(Math.round(diff * 100)) },
    color: calming ? { h: 180, s: 50, l: 50 } : { h: 30, s: 70, l: 55 },
    priority: 4,
  };
}

function analyzeValenceTrend(sessionHistory: MoodSnapshot[]): Insight | null {
  const withEmotion = sessionHistory.filter(s => s.emotion);
  if (withEmotion.length < 3) return null;

  const valenceValues = withEmotion.map(s => s.emotion!.valence);
  const firstHalf = valenceValues.slice(0, Math.ceil(valenceValues.length / 2));
  const secondHalf = valenceValues.slice(Math.ceil(valenceValues.length / 2));

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const diff = avgSecond - avgFirst;

  if (Math.abs(diff) < 0.2) return null;

  const improving = diff > 0;

  return {
    id: 'valence_trend',
    type: 'valence_trend',
    icon: improving ? '🌱' : '🌧️',
    titleKey: improving ? 'insights.valenceImproving' : 'insights.valenceDecreasing',
    descKey: improving ? 'insights.valenceImprovingDesc' : 'insights.valenceDecreasingDesc',
    params: { delta: Math.abs(Math.round(diff * 100)) },
    color: improving ? { h: 140, s: 60, l: 50 } : { h: 260, s: 50, l: 50 },
    priority: improving ? 5 : 3,
  };
}

function analyzeStreak(): Insight | null {
  const streak = getStreak();
  if (streak < 2) return null;

  return {
    id: 'streak',
    type: 'streak',
    icon: streak >= 7 ? '🔥' : '✨',
    titleKey: 'insights.streakTitle',
    descKey: streak >= 7 ? 'insights.streakLong' : 'insights.streakShort',
    params: { days: streak },
    color: { h: 35, s: 90, l: 55 },
    priority: streak >= 7 ? 4 : 1,
  };
}

function analyzeNeedPreference(entries: PersistedEntry[]): Insight | null {
  const withNeed = entries.filter(e => e.need);
  if (withNeed.length < 3) return null;

  const counts: Record<string, number> = {};
  for (const e of withNeed) {
    counts[e.need!] = (counts[e.need!] || 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;

  const [topNeed, topCount] = sorted[0];
  const ratio = topCount / withNeed.length;
  if (ratio < 0.4) return null; // No clear preference

  const needEmoji: Record<string, string> = {
    listen: '👂',
    relax: '🍃',
    distract: '🎯',
    nothing: '☁️',
  };

  return {
    id: 'need_preference',
    type: 'need_preference',
    icon: needEmoji[topNeed] || '💡',
    titleKey: 'insights.needPreferenceTitle',
    descKey: 'insights.needPreferenceDesc',
    params: { need: `moodCheckIn.need${topNeed.charAt(0).toUpperCase() + topNeed.slice(1)}`, ratio: Math.round(ratio * 100) },
    color: { h: 200, s: 50, l: 50 },
    priority: 2,
  };
}

// ── Composable ──────────────────────────────────────

export function useMoodInsights() {
  const checkIn = useMoodCheckIn();

  // Cache persisted log to avoid repeated JSON.parse in computed
  let _persistedLogCache: PersistedEntry[] | null = null;
  let _persistedLogVersion = 0;

  function getCachedPersistedLog(): PersistedEntry[] {
    if (_persistedLogCache === null) {
      _persistedLogCache = loadPersistedLog();
    }
    return _persistedLogCache;
  }

  function invalidatePersistedCache() {
    _persistedLogCache = null;
    _persistedLogVersion++;
  }

  // Sync session data to persistent storage
  function syncToPersistent() {
    const history = checkIn.sessionMoodHistory.value;
    if (history.length > 0) {
      appendToPersistedLog(history);
      updateStreak();
      invalidatePersistedCache(); // Invalidate after writing
    }
  }

  // Generate insights
  const insights = computed<Insight[]>(() => {
    const sessionHistory = checkIn.sessionMoodHistory.value;
    const persistedLog = getCachedPersistedLog();

    // Combine session + persisted (deduplicated)
    const sessionTs = new Set(sessionHistory.map(s => s.timestamp));
    const allEntries: PersistedEntry[] = [
      ...persistedLog.filter(p => !sessionTs.has(p.timestamp)),
      ...sessionHistory.map(s => ({
        score: s.score,
        emotion: s.emotion,
        need: s.need,
        timestamp: s.timestamp,
        trigger: s.trigger,
      })),
    ].sort((a, b) => a.timestamp - b.timestamp);

    const results: Insight[] = [];

    // Run analyzers
    const timePattern = analyzeTimePattern(allEntries);
    if (timePattern) results.push(timePattern);

    const quadrantShift = analyzeQuadrantShift(sessionHistory);
    if (quadrantShift) results.push(quadrantShift);

    const arousalTrend = analyzeArousalTrend(sessionHistory);
    if (arousalTrend) results.push(arousalTrend);

    const valenceTrend = analyzeValenceTrend(sessionHistory);
    if (valenceTrend) results.push(valenceTrend);

    const streak = analyzeStreak();
    if (streak) results.push(streak);

    const needPref = analyzeNeedPreference(allEntries);
    if (needPref) results.push(needPref);

    // Sort by priority descending
    results.sort((a, b) => b.priority - a.priority);

    return results;
  });

  // Top insight for compact display
  const topInsight = computed(() => insights.value[0] ?? null);

  // Has any meaningful data
  const hasData = computed(() => {
    return checkIn.sessionMoodHistory.value.length > 0 || loadPersistedLog().length > 0;
  });

  const streak = computed(() => getStreak());

  return {
    insights,
    topInsight,
    hasData,
    streak,
    syncToPersistent,
  };
}
