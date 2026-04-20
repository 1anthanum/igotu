<script setup lang="ts">
/**
 * MoodCheckIn v3 — 2D 环形情绪模型 + 需求导向
 *
 * 新流程：
 *   Step 1: EmotionCircumplex 二维拾取（效价 × 唤醒度）
 *   Step 2: "此刻你最需要什么？"（被倾听/放松/转移注意力/什么都不需要）
 *
 * 视觉：
 *   - 背景从底部中心辐射渐变，色彩由 2D 情绪坐标决定（hue=角度, saturation=强度）
 *   - 每次交互触发从底部扩散的色彩波纹
 */
import { ref, watch, computed } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useMoodCheckIn, NEED_OPTIONS, emotionToScore, emotionToColor } from '@/composables/useMoodCheckIn';
import type { EmotionPoint } from '@/composables/useMoodCheckIn';
import EmotionCircumplex from './EmotionCircumplex.vue';
import { useI18n } from '@/i18n';

const emit = defineEmits<{ done: [score: number] }>();

const { t } = useI18n();
const moodTheme = useMoodThemeStore();
const checkIn = useMoodCheckIn();

const fadeOut = ref(false);
const waveKey = ref(0);
const waveColor = ref('rgba(100,180,160,0)');

// ── 2D color system ──
const currentEmotion = ref<EmotionPoint | null>(null);

const emotionColor = computed(() => {
  if (!currentEmotion.value) return { h: 200, s: 20, l: 40 };
  return emotionToColor(currentEmotion.value);
});

const overlayGradient = computed(() => {
  if (!currentEmotion.value) {
    return 'radial-gradient(ellipse at 50% 100%, rgba(20,18,30,0.97), rgba(6,8,15,0.99))';
  }
  const { h, s, l } = emotionColor.value;
  return `radial-gradient(ellipse at 50% 100%, hsla(${h},${s}%,${l}%,0.3) 0%, hsla(${h},${s}%,${l - 10}%,0.1) 40%, rgba(6,8,15,0.97) 85%)`;
});

const bottomGlow = computed(() => {
  if (!currentEmotion.value) return 'transparent';
  const { h, s, l } = emotionColor.value;
  return `hsla(${h},${s}%,${l}%,0.2)`;
});

function triggerWave() {
  if (!currentEmotion.value) return;
  const { h, s, l } = emotionColor.value;
  waveColor.value = `hsla(${h},${s}%,${l}%,0.35)`;
  waveKey.value++;
}

// ── Step 1: Circumplex preview (live update as user drags) ──
function onEmotionPreview(emotion: EmotionPoint) {
  currentEmotion.value = emotion;
  // Live preview mood theme
  const score = emotionToScore(emotion);
  moodTheme.setMoodSmooth(score);
}

// ── Step 1: Circumplex confirm ──
function onEmotionConfirm(emotion: EmotionPoint) {
  currentEmotion.value = emotion;
  checkIn.answerEmotion(emotion);
  triggerWave();
}

// ── Step 2: Need selection ──
function pickNeed(needId: string) {
  checkIn.answerNeed(needId);
  triggerWave();
  fadeOut.value = true;
}

// When check-in completes, emit final score
watch(() => checkIn.isCompleted.value, (done) => {
  if (done && currentEmotion.value) {
    const finalScore = emotionToScore(currentEmotion.value);
    moodTheme.setMoodSmooth(finalScore);
    setTimeout(() => emit('done', finalScore), 800);
  }
});

// Step progress
const stepProgress = computed(() => checkIn.currentStep.value);
</script>

<template>
  <Teleport to="body">
    <transition name="checkin-fade">
      <div
        v-if="!checkIn.isCompleted.value"
        class="checkin-overlay"
        :class="{ 'fade-out': fadeOut }"
        :style="{ background: overlayGradient }"
      >
        <!-- Bottom glow -->
        <div
          class="bottom-glow"
          :style="{ background: `radial-gradient(ellipse at 50% 100%, ${bottomGlow}, transparent 70%)` }"
        />

        <!-- Wave pulse -->
        <transition name="wave-burst">
          <div
            v-if="waveKey > 0"
            :key="waveKey"
            class="wave-ring"
            :style="{ '--wave-color': waveColor }"
          />
        </transition>

        <!-- Step dots -->
        <div class="step-dots">
          <span
            v-for="s in 2" :key="s"
            class="step-dot"
            :class="{ active: s <= stepProgress, current: s === stepProgress }"
            :style="s <= stepProgress && currentEmotion
              ? { background: `hsl(${emotionColor.h},${emotionColor.s}%,${emotionColor.l}%)` }
              : {}"
          />
        </div>

        <div class="checkin-card animate-float-in">
          <transition name="step" mode="out-in">
            <!--
              ═══ STEP 1: Circumplex ═══
            -->
            <div v-if="checkIn.currentStep.value === 1" key="circumplex" class="step-content">
              <p class="checkin-question">{{ t('moodCheckIn.circumplexTitle') }}</p>
              <p class="checkin-subtitle">{{ t('moodCheckIn.circumplexSubtitle') }}</p>

              <EmotionCircumplex
                @update:model-value="onEmotionPreview"
                @confirm="onEmotionConfirm"
              />
            </div>

            <!--
              ═══ STEP 2: "What do you need?" ═══
            -->
            <div v-else key="needs" class="step-content">
              <p class="checkin-question">{{ t('moodCheckIn.needTitle') }}</p>
              <p class="checkin-subtitle">{{ t('moodCheckIn.needSubtitle') }}</p>

              <div class="need-grid">
                <button
                  v-for="opt in NEED_OPTIONS"
                  :key="opt.id"
                  class="need-btn"
                  @click="pickNeed(opt.id)"
                >
                  <span class="need-emoji">{{ opt.emoji }}</span>
                  <span class="need-label">{{ opt.label }}</span>
                </button>
              </div>
            </div>
          </transition>

          <!-- Skip -->
          <button class="skip-btn" @click="checkIn.skip(); emit('done', 3)">
            {{ t('common.skip') }}
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.checkin-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(20px);
  transition: background 1.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease;
  overflow: hidden;
}
.checkin-overlay.fade-out {
  opacity: 0;
  pointer-events: none;
}

/* ── Bottom glow ── */
.bottom-glow {
  position: absolute;
  bottom: -20%;
  left: -10%;
  right: -10%;
  height: 70%;
  pointer-events: none;
  transition: background 1.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Wave pulse ── */
.wave-ring {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 0;
  transform: translateX(-50%);
  border-radius: 50%;
  background: var(--wave-color, rgba(100,180,160,0.3));
  pointer-events: none;
  animation: wave-expand 1.4s cubic-bezier(0.2, 0, 0.2, 1) forwards;
}
@keyframes wave-expand {
  0% { width: 0; height: 0; opacity: 0.6; bottom: -5%; }
  50% { opacity: 0.35; }
  100% { width: 250vmax; height: 250vmax; opacity: 0; bottom: -125vmax; left: calc(50% - 125vmax); transform: none; }
}
.wave-burst-enter-active { animation: wave-expand 1.4s cubic-bezier(0.2, 0, 0.2, 1) forwards; }
.wave-burst-leave-active { display: none; }

/* ── Step dots ── */
.step-dots {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  z-index: 2;
}
.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  transition: all 0.5s ease;
}
.step-dot.current {
  transform: scale(1.3);
  box-shadow: 0 0 8px currentColor;
}

.checkin-card {
  max-width: 420px;
  width: 90vw;
  padding: 1.5rem 1rem;
  text-align: center;
  position: relative;
  z-index: 2;
}

.step-content {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.checkin-question {
  font-size: 1.15rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  letter-spacing: 0.02em;
}

.checkin-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
}

/* ── Need buttons (Step 2) ── */
.need-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: 100%;
  max-width: 320px;
}
.need-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.2rem 1rem;
  border-radius: 1.2rem;
  border: 1px solid var(--border-subtle);
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.3s ease;
}
.need-btn:hover {
  border-color: var(--mood-accent);
  background: var(--mood-hover-bg);
  transform: translateY(-3px);
  box-shadow: 0 6px 24px var(--mood-glow);
}
.need-btn:active {
  transform: translateY(0);
}
.need-emoji { font-size: 1.6rem; }
.need-label { font-size: 0.8rem; color: var(--text-secondary); }

/* ── Skip ── */
.skip-btn {
  margin-top: 1.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: color 0.2s;
}
.skip-btn:hover { color: var(--text-secondary); }

/* ── Transitions ── */
.checkin-fade-enter-active { transition: opacity 0.5s ease; }
.checkin-fade-leave-active { transition: opacity 0.6s ease; }
.checkin-fade-enter-from,
.checkin-fade-leave-to { opacity: 0; }

.step-enter-active,
.step-leave-active { transition: all 0.35s ease; }
.step-enter-from { opacity: 0; transform: translateX(24px); }
.step-leave-to { opacity: 0; transform: translateX(-24px); }

@media (prefers-reduced-motion: reduce) {
  .checkin-overlay { transition: opacity 0.3s !important; }
  .need-btn { transition: none !important; }
  .bottom-glow { transition: none !important; }
  .step-dot { transition: none !important; }
  .wave-ring { animation: none !important; display: none; }
}
</style>
