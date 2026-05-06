<script setup lang="ts">
/**
 * NextDayCheckIn — Layer 2 次日关怀签到
 *
 * 当昨天有未跟进的 CrisisMarker 时，显示温和的签到界面。
 * 与正常的 MoodCheckIn 弹窗不同：
 * - 措辞更温和
 * - 不提及具体内容
 * - 简化为 3 级情绪选择（而非 5 级）
 * - 如果 mood ≤ 2，不追问，只显示"我在这里"
 *
 * 设计原则：
 * - 不重复潜在的创伤性内容
 * - 不打断，不侵入
 * - 温和 → 确认 → 消失
 */
import { ref, computed, onMounted } from 'vue';
import { useCrisisTracker } from '@/composables/useCrisisTracker';
import { useMoodThemeStore, MOOD_CONFIG } from '@/composables/useMoodTheme';
import { useI18n } from '@/i18n';

const emit = defineEmits<{
  'done': [mood: number];
  'dismiss': [];
}>();

const { t } = useI18n();
const crisisTracker = useCrisisTracker();
const moodTheme = useMoodThemeStore();

const isVisible = ref(false);
const selectedMood = ref<number | null>(null);
const showResponse = ref(false);
const isDismissing = ref(false);

/** 3 级简化情绪选项 */
const moodOptions = computed(() => [
  { score: 1, emoji: '😢', label: t('nextDayCheckIn.stillHard') },
  { score: 3, emoji: '🙂', label: t('nextDayCheckIn.betterNow') },
  { score: 5, emoji: '😊', label: t('nextDayCheckIn.imOkay') },
]);

/** 根据选择显示的回应 */
const responseMessage = computed(() => {
  if (selectedMood.value === null) return '';
  if (selectedMood.value <= 2) return t('nextDayCheckIn.responselow');
  return t('nextDayCheckIn.responseGood');
});

/** 是否有敏感标记（影响措辞细微变化） */
const isSensitive = computed(() => crisisTracker.hasSensitivePending.value);

/** 签到主提示语 */
const promptMessage = computed(() => {
  if (isSensitive.value) {
    return t('nextDayCheckIn.promptSensitive');
  }
  return t('nextDayCheckIn.promptNormal');
});

function selectMood(score: number) {
  selectedMood.value = score;
  showResponse.value = true;

  // 映射 3 级 → 5 级情绪分数
  const mappedScore = score <= 1 ? 2 : score >= 5 ? 4 : 3;
  crisisTracker.completeFollowUp(mappedScore);

  // 2 秒后自动消失
  setTimeout(() => {
    dismiss(mappedScore);
  }, 2500);
}

function dismiss(mood?: number) {
  isDismissing.value = true;
  setTimeout(() => {
    isVisible.value = false;
    if (mood != null) {
      emit('done', mood);
    } else {
      emit('dismiss');
    }
  }, 400);
}

onMounted(() => {
  // 只在有待跟进的标记时显示
  if (crisisTracker.pendingFollowUp.value) {
    // 延迟 1 秒后出现，让页面先加载
    setTimeout(() => {
      isVisible.value = true;
    }, 1000);
  }
});
</script>

<template>
  <transition name="checkin-overlay">
    <div
      v-if="isVisible"
      class="checkin-overlay"
      :class="{ dismissing: isDismissing }"
    >
      <div class="checkin-card" :class="{ dismissing: isDismissing }">
        <!-- 提示语 -->
        <p class="checkin-prompt">{{ promptMessage }}</p>

        <!-- 情绪选择（不可见时隐藏） -->
        <div v-if="!showResponse" class="checkin-options">
          <button
            v-for="opt in moodOptions"
            :key="opt.score"
            class="checkin-option"
            @click="selectMood(opt.score)"
          >
            <span class="opt-emoji">{{ opt.emoji }}</span>
            <span class="opt-label">{{ opt.label }}</span>
          </button>
        </div>

        <!-- 回应 -->
        <transition name="response-fade">
          <div v-if="showResponse" class="checkin-response">
            <p class="response-text" :style="{ color: moodTheme.palette.accent }">
              {{ responseMessage }}
            </p>
          </div>
        </transition>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.checkin-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 1.5rem;
  transition: opacity 0.4s ease;
}
.checkin-overlay.dismissing {
  opacity: 0;
}

.checkin-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 1.5rem;
  padding: 2rem 1.5rem;
  max-width: 360px;
  width: 100%;
  text-align: center;
  transition: transform 0.4s ease, opacity 0.4s ease;
  animation: card-enter 0.5s ease;
}
.checkin-card.dismissing {
  transform: translateY(10px) scale(0.96);
  opacity: 0;
}

@keyframes card-enter {
  0% { opacity: 0; transform: translateY(20px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.checkin-prompt {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  font-weight: 300;
  letter-spacing: 0.01em;
}

/* ── Mood options ── */
.checkin-options {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.checkin-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}
.checkin-option:hover {
  border-color: var(--mood-accent);
  background: var(--mood-hover-bg);
}
.checkin-option:active {
  transform: scale(0.95);
}

.opt-emoji {
  font-size: 1.5rem;
}
.opt-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* ── Response ── */
.checkin-response {
  padding: 1rem 0 0.5rem;
}
.response-text {
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.02em;
  line-height: 1.6;
}

.response-fade-enter-active {
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.response-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

/* ── Overlay transition ── */
.checkin-overlay-enter-active {
  transition: opacity 0.4s ease;
}
.checkin-overlay-enter-from {
  opacity: 0;
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .checkin-card {
    animation: none;
  }
  .checkin-overlay, .checkin-card, .response-fade-enter-active {
    transition: none !important;
  }
}
</style>
