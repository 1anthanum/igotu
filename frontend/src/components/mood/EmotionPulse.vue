<script setup lang="ts">
/**
 * EmotionPulse — 快速情绪脉冲记录器
 *
 * 设计理念：
 * 一秒内完成情绪打点。不需要完整 check-in，只需在迷你圆盘上
 * 点一下、松手即记录。用于首页/任何页面的 FAB 悬浮按钮。
 *
 * 交互：
 * 1. 点击 FAB → 展开迷你环形盘（120px）
 * 2. 在盘上拖动/点击选择位置 → 松手即自动记录 pulse
 * 3. 记录后播放涟漪动画 + 短暂反馈文字 → 自动收起
 *
 * 数据：调用 useMoodCheckIn().recordPulse() 存入 sessionMoodHistory
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from '@/i18n';
import { useMoodCheckIn, emotionToColor } from '@/composables/useMoodCheckIn';
import type { EmotionPoint } from '@/composables/useMoodCheckIn';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const { t } = useI18n();
const checkIn = useMoodCheckIn();
const moodTheme = useMoodThemeStore();

// ── State ──
const isOpen = ref(false);
const discRef = ref<HTMLElement | null>(null);
const hasRecorded = ref(false);
const feedbackText = ref('');
const feedbackColor = ref('');
const rippleKey = ref(0);
const isDragging = ref(false);
const previewPoint = ref<EmotionPoint | null>(null);

// Auto-close timer
let closeTimer: ReturnType<typeof setTimeout> | null = null;

// Pulse count for badge
const pulseCount = computed(() => {
  return checkIn.sessionMoodHistory.value.filter(s => s.trigger === 'pulse').length;
});

// Preview color
const previewHSL = computed(() => {
  if (!previewPoint.value) return null;
  return emotionToColor(previewPoint.value);
});

const previewColorCSS = computed(() => {
  if (!previewHSL.value) return 'var(--mood-accent)';
  const { h, s, l } = previewHSL.value;
  return `hsl(${h},${s}%,${l}%)`;
});

// ── Toggle ──
function toggle() {
  if (isOpen.value) {
    close();
  } else {
    open();
  }
}

function open() {
  isOpen.value = true;
  hasRecorded.value = false;
  feedbackText.value = '';
  previewPoint.value = null;
}

function close() {
  isOpen.value = false;
  previewPoint.value = null;
  isDragging.value = false;
}

// ── Disc interaction ──
function getEmotionFromEvent(e: MouseEvent | Touch): EmotionPoint | null {
  if (!discRef.value) return null;
  const rect = discRef.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const radius = rect.width / 2;

  let dx = (e.clientX - cx) / radius;
  let dy = -(e.clientY - cy) / radius;

  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 1) {
    dx /= dist;
    dy /= dist;
  }

  return {
    valence: Math.round(dx * 100) / 100,
    arousal: Math.round(dy * 100) / 100,
  };
}

function onDiscPointerDown(e: MouseEvent) {
  isDragging.value = true;
  const pt = getEmotionFromEvent(e);
  if (pt) previewPoint.value = pt;
}

function onDiscPointerMove(e: MouseEvent) {
  if (!isDragging.value) return;
  const pt = getEmotionFromEvent(e);
  if (pt) previewPoint.value = pt;
}

function onDiscPointerUp() {
  if (isDragging.value && previewPoint.value) {
    recordAndClose(previewPoint.value);
  }
  isDragging.value = false;
}

function onDiscTouchStart(e: TouchEvent) {
  e.preventDefault();
  isDragging.value = true;
  const pt = getEmotionFromEvent(e.touches[0]);
  if (pt) previewPoint.value = pt;
}

function onDiscTouchMove(e: TouchEvent) {
  e.preventDefault();
  if (!isDragging.value) return;
  const pt = getEmotionFromEvent(e.touches[0]);
  if (pt) previewPoint.value = pt;
}

function onDiscTouchEnd() {
  if (isDragging.value && previewPoint.value) {
    recordAndClose(previewPoint.value);
  }
  isDragging.value = false;
}

// ── Contextual feedback logic ──
function getContextualFeedback(score: number, emotion: EmotionPoint): string {
  const history = checkIn.sessionMoodHistory.value;
  const pulses = history.filter(s => s.trigger === 'pulse');

  // Check consecutive trend (last 3 pulses)
  if (pulses.length >= 3) {
    const recent = pulses.slice(-3).map(p => p.score);
    const allRising = recent[0] < recent[1] && recent[1] < score;
    const allFalling = recent[0] > recent[1] && recent[1] > score;

    if (allRising) return t('pulse.feedbackRising');
    if (allFalling) return t('pulse.feedbackFalling');
  }

  // Check if mood improved from last pulse
  if (pulses.length >= 1) {
    const lastScore = pulses[pulses.length - 1].score;
    if (score - lastScore >= 2) return t('pulse.feedbackBigJump');
    if (lastScore - score >= 2) return t('pulse.feedbackDrop');
  }

  // High arousal + negative valence = anxiety detected
  if (emotion.arousal > 0.5 && emotion.valence < -0.3) {
    return t('pulse.feedbackAnxious');
  }

  // Very calm and positive
  if (emotion.arousal < -0.3 && emotion.valence > 0.3) {
    return t('pulse.feedbackSerene');
  }

  // Default
  return t('pulse.recorded');
}

// ── Record pulse ──
function recordAndClose(emotion: EmotionPoint) {
  const score = checkIn.recordPulse(emotion);
  moodTheme.setMoodSmooth(score);

  // Contextual feedback
  const { h, s, l } = emotionToColor(emotion);
  feedbackColor.value = `hsl(${h},${s}%,${l}%)`;
  feedbackText.value = getContextualFeedback(score, emotion);
  hasRecorded.value = true;
  rippleKey.value++;

  // Auto-close after feedback (slightly longer for contextual messages)
  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    close();
    hasRecorded.value = false;
  }, 1600);
}

// ── Dot position in disc ──
const dotLeft = computed(() => {
  if (!previewPoint.value) return '50%';
  return `${(previewPoint.value.valence + 1) / 2 * 100}%`;
});
const dotTop = computed(() => {
  if (!previewPoint.value) return '50%';
  return `${(-previewPoint.value.arousal + 1) / 2 * 100}%`;
});

// ── Global mouse listeners (only active when dragging) ──
function onGlobalMouseMove(e: MouseEvent) {
  if (!isDragging.value) return; // Critical: skip if not dragging
  onDiscPointerMove(e);
}
function onGlobalMouseUp() {
  if (!isDragging.value) return;
  onDiscPointerUp();
}

onMounted(() => {
  // Use passive listener for mousemove to avoid blocking scroll
  window.addEventListener('mousemove', onGlobalMouseMove, { passive: true });
  window.addEventListener('mouseup', onGlobalMouseUp);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onGlobalMouseMove);
  window.removeEventListener('mouseup', onGlobalMouseUp);
  if (closeTimer) clearTimeout(closeTimer);
});
</script>

<template>
  <div class="pulse-wrapper">
    <!-- Feedback ripple -->
    <transition name="ripple-burst">
      <div
        v-if="hasRecorded"
        :key="rippleKey"
        class="pulse-ripple"
        :style="{ background: feedbackColor }"
      />
    </transition>

    <!-- Mini circumplex disc -->
    <transition name="disc-pop">
      <div v-if="isOpen && !hasRecorded" class="pulse-disc-container">
        <div
          ref="discRef"
          class="pulse-disc"
          @mousedown.prevent="onDiscPointerDown"
          @touchstart="onDiscTouchStart"
          @touchmove="onDiscTouchMove"
          @touchend="onDiscTouchEnd"
        >
          <!-- Conic gradient background -->
          <div class="disc-bg" />

          <!-- Center fade -->
          <div class="disc-center-fade" />

          <!-- Crosshair -->
          <div class="mini-cross-h" />
          <div class="mini-cross-v" />

          <!-- Quadrant hints -->
          <span class="mini-q q1">✨</span>
          <span class="mini-q q2">😰</span>
          <span class="mini-q q3">😔</span>
          <span class="mini-q q4">😌</span>

          <!-- Preview dot -->
          <div
            v-if="previewPoint"
            class="mini-picker"
            :style="{
              left: dotLeft,
              top: dotTop,
              background: previewColorCSS,
              boxShadow: `0 0 12px ${previewColorCSS}`,
            }"
          />
        </div>

        <p class="disc-hint">{{ t('pulse.hint') }}</p>
      </div>
    </transition>

    <!-- Feedback text -->
    <transition name="feedback-fade">
      <div v-if="hasRecorded" class="pulse-feedback" :style="{ color: feedbackColor }">
        {{ feedbackText }}
      </div>
    </transition>

    <!-- FAB button -->
    <button
      class="pulse-fab"
      :class="{ open: isOpen }"
      :style="{ borderColor: isOpen ? previewColorCSS : 'var(--mood-accent)' }"
      @click="toggle"
      :title="t('pulse.title')"
    >
      <span class="fab-icon" :class="{ open: isOpen }">
        {{ isOpen ? '✕' : '💫' }}
      </span>
      <span
        v-if="pulseCount > 0 && !isOpen"
        class="pulse-badge"
      >
        {{ pulseCount }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.pulse-wrapper {
  position: fixed;
  right: 1rem;
  bottom: 5.5rem;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}
@media (max-width: 480px) {
  .pulse-wrapper {
    right: 0.75rem;
    bottom: 5rem;
  }
}

/* ── FAB ── */
.pulse-fab {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  backdrop-filter: blur(8px);
  position: relative;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}
.pulse-fab:hover {
  transform: scale(1.1);
}
.pulse-fab.open {
  transform: scale(0.95);
  background: rgba(255,255,255,0.05);
}

.fab-icon {
  font-size: 1.3rem;
  transition: transform 0.3s ease;
}
.fab-icon.open {
  transform: rotate(90deg);
  font-size: 0.9rem;
  color: var(--text-muted);
}

.pulse-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--mood-accent);
  color: #000;
  font-size: 0.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* ── Mini disc ── */
.pulse-disc-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
}

.pulse-disc {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  cursor: crosshair;
  touch-action: none;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}

.disc-bg {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    from 180deg at 50% 50%,
    hsla(260, 50%, 40%, 0.3),
    hsla(355, 50%, 45%, 0.3),
    hsla(20, 60%, 50%, 0.3),
    hsla(60, 50%, 50%, 0.3),
    hsla(150, 50%, 40%, 0.3),
    hsla(200, 50%, 40%, 0.3),
    hsla(260, 50%, 40%, 0.3)
  );
}

.disc-center-fade {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    rgba(10,15,20,0.85) 0%,
    rgba(10,15,20,0.3) 40%,
    transparent 70%
  );
  pointer-events: none;
}

.mini-cross-h, .mini-cross-v {
  position: absolute;
  pointer-events: none;
}
.mini-cross-h {
  left: 15%; right: 15%; top: 50%;
  height: 1px;
  background: rgba(255,255,255,0.06);
}
.mini-cross-v {
  top: 15%; bottom: 15%; left: 50%;
  width: 1px;
  background: rgba(255,255,255,0.06);
}

.mini-q {
  position: absolute;
  font-size: 0.7rem;
  pointer-events: none;
  opacity: 0.35;
}
.mini-q.q1 { top: 20%; right: 18%; }
.mini-q.q2 { top: 20%; left: 18%; }
.mini-q.q3 { bottom: 20%; left: 18%; }
.mini-q.q4 { bottom: 20%; right: 18%; }

.mini-picker {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid rgba(255,255,255,0.5);
  transition: left 0.08s ease, top 0.08s ease;
  z-index: 3;
}

.disc-hint {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-align: center;
  max-width: 130px;
}

/* ── Feedback ── */
.pulse-feedback {
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 0.25rem;
  letter-spacing: 0.03em;
}

/* ── Ripple ── */
.pulse-ripple {
  position: fixed;
  right: calc(1rem + 24px);
  bottom: calc(5.5rem + 24px);
  width: 0;
  height: 0;
  border-radius: 50%;
  opacity: 0.3;
  pointer-events: none;
  animation: pulse-ripple-expand 1s cubic-bezier(0.2, 0, 0.2, 1) forwards;
  z-index: 89;
}
@keyframes pulse-ripple-expand {
  0% { width: 0; height: 0; opacity: 0.4; }
  100% {
    width: 200px; height: 200px; opacity: 0;
    right: calc(1rem + 24px - 100px);
    bottom: calc(5.5rem + 24px - 100px);
  }
}

/* ── Transitions ── */
.disc-pop-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.disc-pop-leave-active {
  transition: all 0.2s ease;
}
.disc-pop-enter-from {
  opacity: 0; transform: scale(0.5) translateY(20px);
}
.disc-pop-leave-to {
  opacity: 0; transform: scale(0.7) translateY(10px);
}

.feedback-fade-enter-active { transition: all 0.3s ease; }
.feedback-fade-leave-active { transition: all 0.4s ease; }
.feedback-fade-enter-from { opacity: 0; transform: translateY(5px); }
.feedback-fade-leave-to { opacity: 0; }

.ripple-burst-enter-active { animation: pulse-ripple-expand 1s forwards; }
.ripple-burst-leave-active { display: none; }

@media (max-width: 480px) {
  .pulse-disc {
    width: 110px;
    height: 110px;
  }
  .disc-hint {
    max-width: 110px;
  }
  .pulse-fab {
    width: 42px;
    height: 42px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pulse-fab { transition: none !important; }
  .pulse-ripple { animation: none !important; display: none; }
  .mini-picker { transition: none !important; }
}
</style>
