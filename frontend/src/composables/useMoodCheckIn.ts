/**
 * IGOTU — 心情快速检测 + 色彩交互会话追踪
 *
 * 每次进入应用弹出 2 题快速检测，加权计算后驱动背景色。
 * 完成任务后 boostMood() 逐步上调色彩。
 * sessionMoodHistory 供右侧阈值面板展示。
 */
import { ref, computed, reactive } from 'vue';

// ── Types ────────────────────────────────────────────

export interface MoodSnapshot {
  score: number;
  timestamp: number;
  trigger: 'check_in' | 'boost' | 'ai_sync';
  label?: string;
}

export interface CheckInAnswers {
  mood: number;       // 1-5
  energy: number;     // 1=低 2=中 3=高
}

// ── 常量 ─────────────────────────────────────────────

const STORAGE_KEY_LAST_CHECKIN = 'igotu_last_checkin_ts';
const CHECKIN_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2小时内不重复弹出
const BOOST_AMOUNT = 0.4;

// ── Q1 — 心情 ──────────────────────────────────────

export const MOOD_QUESTIONS = {
  q1: {
    question: '此刻，你的心情如何？',
    options: [
      { score: 1, emoji: '😢', label: '很低落', hint: '深夜也有萤火虫陪你' },
      { score: 2, emoji: '😕', label: '不太好', hint: '黎明前最暗，但光会来' },
      { score: 3, emoji: '😐', label: '一般般', hint: '平静也是一种力量' },
      { score: 4, emoji: '🙂', label: '还不错', hint: '像新叶在舒展' },
      { score: 5, emoji: '😊', label: '很好', hint: '阳光穿过了树冠' },
    ],
  },
  q2: {
    question: '精力状态呢？',
    options: [
      { score: 1, emoji: '🪫', label: '没什么力气' },
      { score: 2, emoji: '⚡', label: '还行' },
      { score: 3, emoji: '🔋', label: '精力充沛' },
    ],
  },
} as const;

// ── 组合式函数 ──────────────────────────────────────

export function useMoodCheckIn() {
  // ── State ──
  const shouldShow = ref(false);
  const isCompleted = ref(false);
  const answers = reactive<Partial<CheckInAnswers>>({});
  const currentStep = ref<1 | 2>(1);

  // Session-level history — tracks all mood changes during this app open
  const sessionMoodHistory = ref<MoodSnapshot[]>([]);
  const sessionStartScore = ref<number | null>(null);

  // ── 是否应该弹出检测 ──
  function checkShouldShow(): boolean {
    const lastTs = localStorage.getItem(STORAGE_KEY_LAST_CHECKIN);
    if (lastTs) {
      const elapsed = Date.now() - Number(lastTs);
      if (elapsed < CHECKIN_COOLDOWN_MS) return false;
    }
    return true;
  }

  function initCheckIn() {
    shouldShow.value = checkShouldShow();
  }

  // ── 回答处理 ──
  function answerQ1(score: number) {
    answers.mood = score;
    currentStep.value = 2;
  }

  function answerQ2(score: number) {
    answers.energy = score;
    completeCheckIn();
  }

  function skip() {
    shouldShow.value = false;
    localStorage.setItem(STORAGE_KEY_LAST_CHECKIN, String(Date.now()));
  }

  // ── 计算最终分数 ──
  function computeScore(a: CheckInAnswers): number {
    // 精力修正：低=-0.5, 中=0, 高=+0.5
    const energyMod = (a.energy - 2) * 0.5;
    const raw = a.mood * 0.7 + (a.mood + energyMod) * 0.3;
    return Math.max(1, Math.min(5, Math.round(raw)));
  }

  function completeCheckIn() {
    if (!answers.mood || !answers.energy) return;

    const finalScore = computeScore(answers as CheckInAnswers);

    // Record starting point
    if (sessionStartScore.value === null) {
      sessionStartScore.value = finalScore;
    }

    // Push to history
    sessionMoodHistory.value.push({
      score: finalScore,
      timestamp: Date.now(),
      trigger: 'check_in',
    });

    localStorage.setItem(STORAGE_KEY_LAST_CHECKIN, String(Date.now()));
    isCompleted.value = true;
    shouldShow.value = false;

    return finalScore;
  }

  // ── 任务完成后上调色彩 ──
  function boostMood(currentScore: number, taskLabel?: string): number {
    const boosted = Math.min(5, currentScore + BOOST_AMOUNT);
    const rounded = Math.round(boosted * 10) / 10; // Keep one decimal for tracking

    sessionMoodHistory.value.push({
      score: Math.round(boosted),
      timestamp: Date.now(),
      trigger: 'boost',
      label: taskLabel,
    });

    return Math.round(boosted);
  }

  // ── AI 同步记录 ──
  function recordAiSync(score: number) {
    sessionMoodHistory.value.push({
      score,
      timestamp: Date.now(),
      trigger: 'ai_sync',
    });
  }

  // ── Computed: 阈值面板数据 ──
  const thresholdData = computed(() => {
    const history = sessionMoodHistory.value;
    if (history.length === 0) return null;

    const scores = history.map(h => h.score);
    const startScore = sessionStartScore.value ?? scores[0];
    const currentScore = scores[scores.length - 1];
    const peakScore = Math.max(...scores);
    const delta = currentScore - startScore;

    return {
      startScore,
      currentScore,
      peakScore,
      delta,
      changeCount: history.length,
      history,
    };
  });

  return {
    // State
    shouldShow,
    isCompleted,
    currentStep,
    answers,
    sessionMoodHistory,

    // Methods
    initCheckIn,
    answerQ1,
    answerQ2,
    skip,
    boostMood,
    recordAiSync,

    // Computed
    thresholdData,

    // Constants
    MOOD_QUESTIONS,
  };
}
