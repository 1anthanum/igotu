/**
 * IGOTU — 心情检测 v3：Russell 环形模型 + 需求导向
 *
 * v3 变更：
 * - Step 1: 二维情绪拾取（效价 × 唤醒度）via EmotionCircumplex
 * - Step 2: "此刻你最需要什么？"（被倾听/放松/转移注意力/什么都不需要）
 * - 移除"进步感知"步骤（避免触发反刍思维）
 * - 2D 数据模型：{ valence, arousal } 替代 1D score
 * - 向后兼容：computeScore() 将 2D 映射为 1-5 分供旧模块使用
 */
import { ref, computed, reactive } from 'vue';
import { useI18n } from '@/i18n';

// ── Types ────────────────────────────────────────────

export interface EmotionPoint {
  valence: number;   // -1 (不愉快) → +1 (愉快)
  arousal: number;   // -1 (平静)   → +1 (激动)
}

export interface MoodSnapshot {
  score: number;           // 1-5 兼容旧系统
  emotion?: EmotionPoint;  // v3: 2D 坐标
  need?: string;           // v3: 用户此刻的需求
  timestamp: number;
  trigger: 'check_in' | 'boost' | 'ai_sync' | 'pulse';
  label?: string;
}

export interface CheckInAnswers {
  emotion: EmotionPoint | null;
  need: string | null;       // 'listen' | 'relax' | 'distract' | 'nothing'
  context: string | null;    // 'work' | 'social' | 'alone' | 'rest' (optional)
}

// ── Need options ─────────────────────────────────────

function getNeedOptions() {
  const { t } = useI18n();
  return [
    { id: 'listen',   emoji: '👂', label: t('moodCheckIn.needListen') },
    { id: 'relax',    emoji: '🍃', label: t('moodCheckIn.needRelax') },
    { id: 'distract', emoji: '🎯', label: t('moodCheckIn.needDistract') },
    { id: 'nothing',  emoji: '☁️',  label: t('moodCheckIn.needNothing') },
  ];
}

// ── Context tags (optional micro-tag) ────────────────

function getContextOptions() {
  const { t } = useI18n();
  return [
    { id: 'work',   emoji: '💼', label: t('moodCheckIn.ctxWork') },
    { id: 'social', emoji: '👥', label: t('moodCheckIn.ctxSocial') },
    { id: 'alone',  emoji: '🧘', label: t('moodCheckIn.ctxAlone') },
    { id: 'rest',   emoji: '🛋️',  label: t('moodCheckIn.ctxRest') },
  ];
}

// ── Backward compat: get old MOOD_QUESTIONS ──────────

function getMoodQuestions() {
  const { t } = useI18n();
  return {
    q1: {
      question: t('moodCheckIn.q1Question'),
      options: [
        { score: 1, emoji: '😢', label: t('moodCheckIn.q1Option1Label'), hint: t('moodCheckIn.q1Option1Hint') },
        { score: 2, emoji: '😕', label: t('moodCheckIn.q1Option2Label'), hint: t('moodCheckIn.q1Option2Hint') },
        { score: 3, emoji: '😐', label: t('moodCheckIn.q1Option3Label'), hint: t('moodCheckIn.q1Option3Hint') },
        { score: 4, emoji: '🙂', label: t('moodCheckIn.q1Option4Label'), hint: t('moodCheckIn.q1Option4Hint') },
        { score: 5, emoji: '😊', label: t('moodCheckIn.q1Option5Label'), hint: t('moodCheckIn.q1Option5Hint') },
      ],
    },
    q3: {
      question: t('moodCheckIn.q3Question'),
      options: [
        { score: 1, emoji: '🪫', label: t('moodCheckIn.q3Option1') },
        { score: 2, emoji: '⚡', label: t('moodCheckIn.q3Option2') },
        { score: 3, emoji: '🔋', label: t('moodCheckIn.q3Option3') },
      ],
    },
    // v3: q2_pool removed — "进步感知" replaced by "needs"
    q2_pool: [],
  };
}

export const MOOD_QUESTIONS = getMoodQuestions();
export const NEED_OPTIONS = getNeedOptions();
export const CONTEXT_OPTIONS = getContextOptions();

// ── Constants ────────────────────────────────────────

const STORAGE_KEY_LAST_CHECKIN = 'igotu_last_checkin_ts';
const STORAGE_KEY_YESTERDAY_MOOD = 'igotu_yesterday_mood';
const CHECKIN_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const BOOST_AMOUNT = 0.4;

// ── 2D → 1D score mapping ───────────────────────────

/**
 * Convert 2D emotion to 1-5 score for backward compatibility.
 * Uses valence as primary axis with arousal as modifier.
 *
 * valence [-1,1] → base [1,5]
 * arousal modifies: high arousal on negative side = worse (anxiety),
 *                   high arousal on positive side = slightly better (excitement)
 */
export function emotionToScore(e: EmotionPoint): number {
  // Base: linear map valence to 1-5
  const base = (e.valence + 1) / 2 * 4 + 1; // [-1,1] → [1,5]

  // Arousal modifier: amplifies the valence direction
  const arousalMod = e.arousal * 0.3 * (e.valence >= 0 ? 1 : -1);
  // If negative valence + high arousal → push lower (anxiety)
  // If positive valence + high arousal → push slightly higher (excitement)

  return Math.max(1, Math.min(5, Math.round(base + arousalMod)));
}

/**
 * Convert 2D emotion to HSL color.
 * Hue: angle on circumplex, Saturation: intensity, Lightness: fixed.
 */
export function emotionToColor(e: EmotionPoint): { h: number; s: number; l: number } {
  const angle = ((Math.atan2(e.arousal, e.valence) * 180) / Math.PI + 360) % 360;
  const intensity = Math.sqrt(e.valence ** 2 + e.arousal ** 2);

  // Hue mapping (same as EmotionCircumplex component)
  const hueMap: [number, number][] = [
    [0, 60], [45, 35], [90, 15], [135, 355],
    [180, 300], [225, 260], [270, 200], [315, 150], [360, 60],
  ];

  let hue = 60;
  for (let i = 0; i < hueMap.length - 1; i++) {
    const [d0, h0] = hueMap[i];
    const [d1, h1] = hueMap[i + 1];
    if (angle >= d0 && angle <= d1) {
      const t = (angle - d0) / (d1 - d0);
      let diff = h1 - h0;
      if (Math.abs(diff) > 180) {
        if (diff > 0) diff -= 360;
        else diff += 360;
      }
      hue = ((h0 + diff * t) + 360) % 360;
      break;
    }
  }

  const s = 30 + Math.min(intensity, 1) * 60;
  const l = 50 + (1 - Math.min(intensity, 1)) * 15;

  return { h: hue, s, l };
}

// ── Composable ───────────────────────────────────────

export function useMoodCheckIn() {
  // ── State ──
  const shouldShow = ref(false);
  const isCompleted = ref(false);
  const currentStep = ref<1 | 2 | 3>(1); // 1=circumplex, 2=needs, 3=context(optional,auto-skip)
  const answers = reactive<CheckInAnswers>({
    emotion: null,
    need: null,
    context: null,
  });

  // Session-level history
  const sessionMoodHistory = ref<MoodSnapshot[]>([]);
  const sessionStartScore = ref<number | null>(null);

  // Live color preview
  const previewEmotion = ref<EmotionPoint | null>(null);
  const previewScore = ref<number | null>(null);

  // Yesterday data
  const yesterdayMood = ref<number | null>(null);

  // Legacy compat
  const progressQuestion = ref({ question: '', options: [] as any[] });

  function loadYesterdayMood() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_YESTERDAY_MOOD);
      if (raw) {
        const data = JSON.parse(raw);
        if (Date.now() - data.ts < 48 * 60 * 60 * 1000) {
          yesterdayMood.value = data.score;
        }
      }
    } catch { /* ignore */ }
  }

  function saveAsTodayMood(score: number, emotion?: EmotionPoint) {
    try {
      localStorage.setItem(STORAGE_KEY_YESTERDAY_MOOD, JSON.stringify({
        score,
        emotion,
        ts: Date.now(),
      }));
    } catch { /* ignore */ }
  }

  function checkShouldShow(): boolean {
    const lastTs = localStorage.getItem(STORAGE_KEY_LAST_CHECKIN);
    if (lastTs) {
      const elapsed = Date.now() - Number(lastTs);
      if (elapsed < CHECKIN_COOLDOWN_MS) return false;
    }
    return true;
  }

  function initCheckIn() {
    loadYesterdayMood();
    shouldShow.value = checkShouldShow();
  }

  // ── Step 1: Circumplex emotion pick ──
  function answerEmotion(emotion: EmotionPoint) {
    answers.emotion = emotion;
    previewEmotion.value = emotion;
    previewScore.value = emotionToScore(emotion);
    currentStep.value = 2;
  }

  // ── Step 2: "What do you need right now?" ──
  function answerNeed(needId: string) {
    answers.need = needId;
    completeCheckIn();
  }

  // ── Legacy adapters (keep old interface working) ──
  function answerQ1(score: number) {
    // Map 1-5 to approximate valence,arousal
    const valenceMap: Record<number, number> = { 1: -0.8, 2: -0.4, 3: 0, 4: 0.4, 5: 0.8 };
    answerEmotion({ valence: valenceMap[score] ?? 0, arousal: 0 });
  }

  function answerQ2(score: number) {
    // Legacy: progress → just map to need
    if (score <= 1) answerNeed('listen');
    else if (score >= 3) answerNeed('nothing');
    else answerNeed('relax');
  }

  function answerQ3(score: number) {
    // Legacy: energy → ignored in v3, just complete
    if (!isCompleted.value) completeCheckIn();
  }

  function skip() {
    shouldShow.value = false;
    previewEmotion.value = null;
    previewScore.value = null;
    localStorage.setItem(STORAGE_KEY_LAST_CHECKIN, String(Date.now()));
  }

  function completeCheckIn() {
    if (!answers.emotion) return;

    const finalScore = emotionToScore(answers.emotion);

    if (sessionStartScore.value === null) {
      sessionStartScore.value = finalScore;
    }

    sessionMoodHistory.value.push({
      score: finalScore,
      emotion: answers.emotion,
      need: answers.need ?? undefined,
      timestamp: Date.now(),
      trigger: 'check_in',
    });

    saveAsTodayMood(finalScore, answers.emotion);
    localStorage.setItem(STORAGE_KEY_LAST_CHECKIN, String(Date.now()));
    isCompleted.value = true;
    shouldShow.value = false;

    return finalScore;
  }

  // ── Mood pulse (micro-moment) ──
  function recordPulse(emotion: EmotionPoint) {
    const score = emotionToScore(emotion);
    sessionMoodHistory.value.push({
      score,
      emotion,
      timestamp: Date.now(),
      trigger: 'pulse',
    });
    return score;
  }

  // ── Boost ──
  function boostMood(currentScore: number, taskLabel?: string): number {
    const boosted = Math.min(5, currentScore + BOOST_AMOUNT);
    sessionMoodHistory.value.push({
      score: Math.round(boosted),
      timestamp: Date.now(),
      trigger: 'boost',
      label: taskLabel,
    });
    return Math.round(boosted);
  }

  // ── AI sync ──
  function recordAiSync(score: number) {
    sessionMoodHistory.value.push({
      score,
      timestamp: Date.now(),
      trigger: 'ai_sync',
    });
  }

  // ── Computed ──
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
    previewEmotion,
    previewScore,
    yesterdayMood,
    progressQuestion, // legacy

    // Methods
    initCheckIn,
    answerEmotion,
    answerNeed,
    answerQ1,     // legacy adapter
    answerQ2,     // legacy adapter
    answerQ3,     // legacy adapter
    skip,
    recordPulse,
    boostMood,
    recordAiSync,

    // Computed
    thresholdData,

    // Constants
    MOOD_QUESTIONS,
  };
}
