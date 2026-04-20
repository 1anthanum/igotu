<script setup lang="ts">
/**
 * EmotionCircumplex — Russell 环形情绪模型 2D 拾取器
 *
 * X 轴：效价 Valence（不愉快 ←→ 愉快）  范围 [-1, 1]
 * Y 轴：唤醒度 Arousal（平静 ←→ 激动）  范围 [-1, 1]
 *
 * 四象限：
 *   Q1 (右上): 高唤醒 + 正效价 → 兴奋/热情/警觉     色相 ~40°  (橙金)
 *   Q2 (左上): 高唤醒 + 负效价 → 焦虑/愤怒/紧张     色相 ~0°   (红橘)
 *   Q3 (左下): 低唤醒 + 负效价 → 悲伤/疲惫/空虚     色相 ~270° (靛紫)
 *   Q4 (右下): 低唤醒 + 正效价 → 平静/放松/满足     色相 ~150° (翠绿)
 *
 * 交互：用户在圆盘上点击/触摸一个位置，一次操作同时采集两个维度。
 * 圆盘中心 = 中性情绪，越靠边缘 = 情绪越强烈。
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from '@/i18n';

const props = defineProps<{
  modelValue?: { valence: number; arousal: number } | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: { valence: number; arousal: number }];
  confirm: [value: { valence: number; arousal: number }];
}>();

const { t } = useI18n();

// ── State ──
const circleRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const valence = ref(props.modelValue?.valence ?? 0);
const arousal = ref(props.modelValue?.arousal ?? 0);
const hasSelected = ref(!!props.modelValue);

// Pulse animation on selection
const pulseKey = ref(0);

// ── Computed ──
const angle = computed(() => Math.atan2(-arousal.value, valence.value)); // -arousal because screen Y is inverted
const intensity = computed(() => Math.sqrt(valence.value ** 2 + arousal.value ** 2));

// Color from position: hue mapped to circumplex angle, saturation from intensity
const currentHue = computed(() => {
  // Map angle to hue:
  // Right(+V,0A)=60(warm yellow), Top-right(+V,+A)=40(orange-gold),
  // Top(-V,+A)=0/360(red), Top-left(-V,+A)=340(rose-red),
  // Left(-V,0A)=280(purple), Bottom-left(-V,-A)=260(indigo),
  // Bottom(0,-A)=220(blue), Bottom-right(+V,-A)=150(teal-green)

  const a = Math.atan2(arousal.value, valence.value); // standard math angle
  // Custom hue mapping (not linear, tuned for emotional color semantics)
  const deg = ((a * 180) / Math.PI + 360) % 360;

  // Map 360° angle to emotionally meaningful hues:
  // 0° (right, +V) → hue 60 (warm yellow/calm positive)
  // 90° (up, +A) → hue 20 (orange excitement)
  // 135° (upper-left, -V+A) → hue 0 (red anxiety)
  // 180° (left, -V) → hue 300 (purple sadness)
  // 225° (lower-left, -V-A) → hue 260 (deep indigo exhaustion)
  // 270° (down, -A) → hue 200 (calm blue)
  // 315° (lower-right, +V-A) → hue 150 (teal serenity)

  const hueMap: [number, number][] = [
    [0, 60],      // right: warm yellow
    [45, 35],     // upper-right: golden
    [90, 15],     // top: energetic orange
    [135, 355],   // upper-left: anxious red
    [180, 300],   // left: sad purple
    [225, 260],   // lower-left: exhausted indigo
    [270, 200],   // bottom: calm blue
    [315, 150],   // lower-right: serene teal
    [360, 60],    // wrap back to right
  ];

  // Interpolate between hue control points
  for (let i = 0; i < hueMap.length - 1; i++) {
    const [d0, h0] = hueMap[i];
    const [d1, h1] = hueMap[i + 1];
    if (deg >= d0 && deg <= d1) {
      const t = (deg - d0) / (d1 - d0);
      // Handle hue wrapping (e.g., 355 → 300)
      let diff = h1 - h0;
      if (Math.abs(diff) > 180) {
        if (diff > 0) diff -= 360;
        else diff += 360;
      }
      return ((h0 + diff * t) + 360) % 360;
    }
  }
  return 60;
});

const currentSaturation = computed(() => {
  const i = Math.min(intensity.value, 1);
  return 30 + i * 60; // 30% at center → 90% at edge
});

const currentLightness = computed(() => {
  return 50 + (1 - Math.min(intensity.value, 1)) * 15; // 50-65%
});

const pickerColor = computed(() =>
  `hsl(${currentHue.value}, ${currentSaturation.value}%, ${currentLightness.value}%)`
);

const pickerGlow = computed(() =>
  `hsla(${currentHue.value}, ${currentSaturation.value}%, ${currentLightness.value}%, 0.4)`
);

// Gradient for the circumplex background
const bgGradient = computed(() => {
  // 4-stop conic gradient matching the emotional color wheel
  return `conic-gradient(
    from 180deg at 50% 50%,
    hsla(260, 50%, 40%, 0.25),
    hsla(355, 50%, 45%, 0.25),
    hsla(20, 60%, 50%, 0.25),
    hsla(60, 50%, 50%, 0.25),
    hsla(150, 50%, 40%, 0.25),
    hsla(200, 50%, 40%, 0.25),
    hsla(260, 50%, 40%, 0.25)
  )`;
});

// Quadrant label based on position
const emotionLabel = computed(() => {
  if (!hasSelected.value) return '';
  const v = valence.value;
  const a = arousal.value;
  const i = intensity.value;

  if (i < 0.15) return t('circumplex.neutral');

  if (v >= 0 && a >= 0) {
    // Q1: high arousal + positive
    if (i > 0.6) return t('circumplex.excited');
    return t('circumplex.enthusiastic');
  }
  if (v < 0 && a >= 0) {
    // Q2: high arousal + negative
    if (i > 0.6) return t('circumplex.anxious');
    return t('circumplex.tense');
  }
  if (v < 0 && a < 0) {
    // Q3: low arousal + negative
    if (i > 0.6) return t('circumplex.depressed');
    return t('circumplex.fatigued');
  }
  // Q4: low arousal + positive
  if (i > 0.6) return t('circumplex.serene');
  return t('circumplex.calm');
});

// Quadrant hint
const emotionHint = computed(() => {
  if (!hasSelected.value) return t('circumplex.hint');
  const v = valence.value;
  const a = arousal.value;

  if (v >= 0 && a >= 0) return t('circumplex.hintQ1');
  if (v < 0 && a >= 0) return t('circumplex.hintQ2');
  if (v < 0 && a < 0) return t('circumplex.hintQ3');
  return t('circumplex.hintQ4');
});

// ── Interaction ──
function getPositionFromEvent(e: MouseEvent | Touch) {
  if (!circleRef.value) return;
  const rect = circleRef.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const radius = rect.width / 2;

  let dx = (e.clientX - cx) / radius;
  let dy = -(e.clientY - cy) / radius; // invert Y (up = positive arousal)

  // Clamp to circle
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 1) {
    dx /= dist;
    dy /= dist;
  }

  valence.value = Math.round(dx * 100) / 100;
  arousal.value = Math.round(dy * 100) / 100;
  hasSelected.value = true;
  pulseKey.value++;

  emit('update:modelValue', { valence: valence.value, arousal: arousal.value });
}

function onPointerDown(e: MouseEvent) {
  isDragging.value = true;
  getPositionFromEvent(e);
}

function onPointerMove(e: MouseEvent) {
  if (!isDragging.value) return;
  getPositionFromEvent(e);
}

function onPointerUp() {
  if (isDragging.value && hasSelected.value) {
    isDragging.value = false;
  }
}

function onTouchStart(e: TouchEvent) {
  e.preventDefault();
  isDragging.value = true;
  getPositionFromEvent(e.touches[0]);
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault();
  if (!isDragging.value) return;
  getPositionFromEvent(e.touches[0]);
}

function onTouchEnd() {
  isDragging.value = false;
}

function confirmSelection() {
  if (hasSelected.value) {
    emit('confirm', { valence: valence.value, arousal: arousal.value });
  }
}

onMounted(() => {
  window.addEventListener('mouseup', onPointerUp);
  window.addEventListener('mousemove', onPointerMove);
});

onUnmounted(() => {
  window.removeEventListener('mouseup', onPointerUp);
  window.removeEventListener('mousemove', onPointerMove);
});

// Picker dot position (CSS percentage)
const dotLeft = computed(() => `${(valence.value + 1) / 2 * 100}%`);
const dotTop = computed(() => `${(-arousal.value + 1) / 2 * 100}%`);
</script>

<template>
  <div class="circumplex-container">
    <!-- The circle -->
    <div
      ref="circleRef"
      class="circumplex-disc"
      :style="{ background: bgGradient }"
      @mousedown.prevent="onPointerDown"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- Radial fade from center (neutral zone) -->
      <div class="disc-overlay" />

      <!-- Axis labels -->
      <span class="axis-label axis-top">{{ t('circumplex.axisArousalHigh') }}</span>
      <span class="axis-label axis-bottom">{{ t('circumplex.axisArousalLow') }}</span>
      <span class="axis-label axis-left">{{ t('circumplex.axisValenceNeg') }}</span>
      <span class="axis-label axis-right">{{ t('circumplex.axisValencePos') }}</span>

      <!-- Quadrant emoji hints -->
      <span class="quadrant-emoji q1-emoji">✨</span>
      <span class="quadrant-emoji q2-emoji">😰</span>
      <span class="quadrant-emoji q3-emoji">😔</span>
      <span class="quadrant-emoji q4-emoji">😌</span>

      <!-- Cross-hair lines (subtle) -->
      <div class="crosshair-h" />
      <div class="crosshair-v" />

      <!-- Selection pulse -->
      <div
        v-if="hasSelected"
        :key="pulseKey"
        class="selection-pulse"
        :style="{
          left: dotLeft,
          top: dotTop,
          background: pickerGlow,
        }"
      />

      <!-- Picker dot -->
      <div
        v-if="hasSelected"
        class="picker-dot"
        :style="{
          left: dotLeft,
          top: dotTop,
          background: pickerColor,
          boxShadow: `0 0 20px ${pickerGlow}, 0 0 40px ${pickerGlow}`,
        }"
      />
    </div>

    <!-- Emotion label -->
    <div class="emotion-readout" :style="{ color: hasSelected ? pickerColor : 'var(--text-muted)' }">
      <span class="emotion-label">{{ emotionLabel || t('circumplex.tapPrompt') }}</span>
    </div>
    <p class="emotion-hint">{{ emotionHint }}</p>

    <!-- Confirm button -->
    <button
      v-if="hasSelected"
      class="confirm-btn"
      :style="{
        background: pickerColor,
        boxShadow: `0 0 24px ${pickerGlow}`,
      }"
      @click="confirmSelection"
    >
      {{ t('circumplex.confirmBtn') }}
    </button>
  </div>
</template>

<style scoped>
.circumplex-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  user-select: none;
  -webkit-user-select: none;
}

.circumplex-disc {
  position: relative;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  cursor: crosshair;
  touch-action: none;
  border: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
}

/* Center-to-edge fade overlay */
.disc-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    rgba(10,15,20,0.8) 0%,
    rgba(10,15,20,0.3) 40%,
    transparent 70%
  );
  pointer-events: none;
}

/* Axis labels */
.axis-label {
  position: absolute;
  font-size: 0.6rem;
  color: rgba(255,255,255,0.3);
  pointer-events: none;
  letter-spacing: 0.05em;
}
.axis-top { top: 8px; left: 50%; transform: translateX(-50%); }
.axis-bottom { bottom: 8px; left: 50%; transform: translateX(-50%); }
.axis-left { left: 8px; top: 50%; transform: translateY(-50%); }
.axis-right { right: 8px; top: 50%; transform: translateY(-50%); }

/* Quadrant emoji markers */
.quadrant-emoji {
  position: absolute;
  font-size: 1.2rem;
  pointer-events: none;
  opacity: 0.4;
}
.q1-emoji { top: 22%; right: 22%; }
.q2-emoji { top: 22%; left: 22%; }
.q3-emoji { bottom: 22%; left: 22%; }
.q4-emoji { bottom: 22%; right: 22%; }

/* Crosshair */
.crosshair-h, .crosshair-v {
  position: absolute;
  pointer-events: none;
}
.crosshair-h {
  left: 10%; right: 10%; top: 50%;
  height: 1px;
  background: rgba(255,255,255,0.06);
}
.crosshair-v {
  top: 10%; bottom: 10%; left: 50%;
  width: 1px;
  background: rgba(255,255,255,0.06);
}

/* Picker dot */
.picker-dot {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: left 0.1s ease, top 0.1s ease;
  z-index: 3;
  border: 2px solid rgba(255,255,255,0.5);
}

/* Selection pulse animation */
.selection-pulse {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: pulse-out 0.8s ease-out forwards;
  pointer-events: none;
  z-index: 2;
}
@keyframes pulse-out {
  0% { width: 20px; height: 20px; opacity: 0.5; }
  100% { width: 80px; height: 80px; opacity: 0; margin-left: -30px; margin-top: -30px; }
}

/* Readout */
.emotion-readout {
  text-align: center;
  min-height: 1.5em;
}
.emotion-label {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}
.emotion-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
  max-width: 260px;
}

/* Confirm button */
.confirm-btn {
  padding: 0.6rem 2rem;
  border-radius: 1.5rem;
  border: none;
  color: rgba(0,0,0,0.85);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
}
.confirm-btn:hover {
  transform: scale(1.05);
  filter: brightness(1.1);
}
.confirm-btn:active {
  transform: scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .picker-dot { transition: none !important; }
  .selection-pulse { animation: none !important; display: none; }
}

@media (max-width: 360px) {
  .circumplex-disc { width: 220px; height: 220px; }
}
</style>
