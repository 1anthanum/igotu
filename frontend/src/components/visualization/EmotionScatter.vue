<script setup lang="ts">
/**
 * EmotionScatter — 2D 情绪散点图
 *
 * 在 Russell 环形模型的 valence × arousal 平面上，
 * 绘制用户历史情绪点。点的颜色与情绪色彩系统一致，
 * 越近期的点越大越亮，形成时间衰减的视觉轨迹。
 */
import { computed } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useI18n } from '@/i18n';
import { emotionToColor } from '@/composables/useMoodCheckIn';

const moodTheme = useMoodThemeStore();
const { t } = useI18n();

interface DataPoint {
  valence: number;   // -1 → +1
  arousal: number;   // -1 → +1
  timestamp: number;
}

const props = defineProps<{
  data: DataPoint[];
}>();

const AXIS_LABELS = computed(() => ({
  top: t('emotion.arousalHigh'),     // 激动
  bottom: t('emotion.arousalLow'),   // 平静
  left: t('emotion.valenceNeg'),     // 不愉快
  right: t('emotion.valencePos'),    // 愉快
}));

// Quadrant labels
const QUADRANTS = computed(() => [
  { x: 75, y: 25, label: t('emotion.quadrant.ha') },  // high arousal + positive → 兴奋/快乐
  { x: 25, y: 25, label: t('emotion.quadrant.hn') },  // high arousal + negative → 焦虑/愤怒
  { x: 25, y: 75, label: t('emotion.quadrant.ln') },  // low arousal + negative → 悲伤/疲惫
  { x: 75, y: 75, label: t('emotion.quadrant.lp') },  // low arousal + positive → 平静/满足
]);

// Transform data to SVG coordinates (200x200 viewBox, with 20px padding)
const points = computed(() => {
  if (!props.data.length) return [];

  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

  return props.data
    .filter(d => d.valence != null && d.arousal != null)
    .map(d => {
      const age = now - d.timestamp;
      const recency = Math.max(0, 1 - age / maxAge); // 1 = now, 0 = 7d ago
      const { h, s, l } = emotionToColor({ valence: d.valence, arousal: d.arousal });

      return {
        // Map -1..+1 to 20..180 (padding 20px each side in 200x200 viewBox)
        cx: 20 + (d.valence + 1) * 80,  // -1→20, 0→100, +1→180
        cy: 20 + (1 - d.arousal) * 80,  // +1→20, 0→100, -1→180 (inverted Y)
        r: 3 + recency * 4,             // 3px (old) → 7px (new)
        opacity: 0.3 + recency * 0.6,   // 0.3 (old) → 0.9 (new)
        color: `hsl(${h},${s}%,${l}%)`,
        timestamp: d.timestamp,
      };
    })
    .sort((a, b) => a.opacity - b.opacity); // draw newer on top
});

// Centroid (average position)
const centroid = computed(() => {
  if (points.value.length < 3) return null;
  const recent = points.value.slice(-10); // last 10 points
  const cx = recent.reduce((sum, p) => sum + p.cx, 0) / recent.length;
  const cy = recent.reduce((sum, p) => sum + p.cy, 0) / recent.length;
  return { cx, cy };
});
</script>

<template>
  <div class="card animate-float-in" style="animation-delay: 0.2s;">
    <h2 class="text-section mb-3" style="color: var(--text-primary);">
      🎯 {{ t('emotion.scatterTitle') }}
    </h2>

    <div class="scatter-container">
      <svg viewBox="0 0 200 200" class="scatter-svg">
        <!-- Background grid -->
        <line x1="100" y1="20" x2="100" y2="180" stroke="var(--border-subtle)" stroke-width="0.5" />
        <line x1="20" y1="100" x2="180" y2="100" stroke="var(--border-subtle)" stroke-width="0.5" />

        <!-- Quadrant background fills -->
        <rect x="100" y="20" width="80" height="80" fill="var(--mood-glow)" opacity="0.3" rx="4" />
        <rect x="20" y="20" width="80" height="80" fill="rgba(239,68,68,0.03)" rx="4" />
        <rect x="20" y="100" width="80" height="80" fill="rgba(107,114,128,0.03)" rx="4" />
        <rect x="100" y="100" width="80" height="80" fill="rgba(59,130,246,0.03)" rx="4" />

        <!-- Quadrant labels -->
        <text
          v-for="q in QUADRANTS"
          :key="q.label"
          :x="q.x * 1.6 + 20"
          :y="q.y * 1.6 + 20"
          class="quadrant-label"
          text-anchor="middle"
        >{{ q.label }}</text>

        <!-- Centroid glow -->
        <circle
          v-if="centroid"
          :cx="centroid.cx"
          :cy="centroid.cy"
          :r="14"
          :fill="moodTheme.palette.accent"
          opacity="0.08"
        />
        <circle
          v-if="centroid"
          :cx="centroid.cx"
          :cy="centroid.cy"
          :r="3"
          :fill="moodTheme.palette.accent"
          opacity="0.6"
          stroke="white"
          stroke-width="0.5"
        />

        <!-- Data points -->
        <circle
          v-for="(p, i) in points"
          :key="i"
          :cx="p.cx"
          :cy="p.cy"
          :r="p.r"
          :fill="p.color"
          :opacity="p.opacity"
          class="scatter-dot"
        />

        <!-- Axis labels -->
        <text x="100" y="14" class="axis-label" text-anchor="middle">{{ AXIS_LABELS.top }}</text>
        <text x="100" y="196" class="axis-label" text-anchor="middle">{{ AXIS_LABELS.bottom }}</text>
        <text x="10" y="102" class="axis-label" text-anchor="middle" transform="rotate(-90,10,102)">{{ AXIS_LABELS.left }}</text>
        <text x="190" y="102" class="axis-label" text-anchor="middle" transform="rotate(90,190,102)">{{ AXIS_LABELS.right }}</text>
      </svg>

      <!-- Empty state -->
      <div v-if="points.length === 0" class="scatter-empty">
        <p class="text-caption">{{ t('emotion.scatterEmpty') }}</p>
      </div>
    </div>

    <p v-if="points.length > 0" class="text-micro mt-3 text-center">
      {{ t('emotion.scatterHint', { count: points.length }) }}
    </p>
  </div>
</template>

<style scoped>
.scatter-container {
  position: relative;
  aspect-ratio: 1;
  max-width: 320px;
  margin: 0 auto;
}

.scatter-svg {
  width: 100%;
  height: 100%;
}

.scatter-dot {
  transition: r 0.3s ease, opacity 0.3s ease;
}

.axis-label {
  font-size: 6px;
  fill: var(--text-muted);
  font-weight: 500;
}

.quadrant-label {
  font-size: 5.5px;
  fill: var(--text-muted);
  opacity: 0.6;
  font-weight: 400;
}

.scatter-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (prefers-reduced-motion: reduce) {
  .scatter-dot { transition: none; }
}
</style>
