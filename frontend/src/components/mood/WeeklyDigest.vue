<script setup lang="ts">
/**
 * WeeklyDigest — 情绪周报卡
 *
 * 折叠式卡片，显示过去 7 天的情绪概览：
 * - 迷你 sparkline（效价趋势线）
 * - 最常出现的情绪象限
 * - 连续记录天数
 * - 记录总数
 *
 * 数据来源：localStorage 'igotu_mood_log'
 */
import { ref, computed, onMounted } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useI18n } from '@/i18n';
import { emotionToColor } from '@/composables/useMoodCheckIn';

const moodTheme = useMoodThemeStore();
const { t } = useI18n();
const expanded = ref(false);

interface PersistedEntry {
  score: number;
  emotion?: { valence: number; arousal: number };
  need?: string;
  timestamp: number;
  trigger: string;
}

function loadWeekEntries(): PersistedEntry[] {
  try {
    const raw = localStorage.getItem('igotu_mood_log');
    if (!raw) return [];
    const all: PersistedEntry[] = JSON.parse(raw);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return all.filter(e => e.timestamp >= weekAgo);
  } catch { return []; }
}

const entries = ref<PersistedEntry[]>([]);

onMounted(() => {
  entries.value = loadWeekEntries();
});

const hasData = computed(() => entries.value.length >= 2);

// Sparkline points: normalize valence to 0-1 range, map to SVG path
const sparklinePath = computed(() => {
  const withEmotion = entries.value.filter(e => e.emotion);
  if (withEmotion.length < 2) return '';

  const w = 120;
  const h = 32;
  const padding = 2;

  const points = withEmotion.map((e, i) => {
    const x = padding + (i / (withEmotion.length - 1)) * (w - padding * 2);
    // valence: -1 → top, +1 → bottom (inverted for SVG)
    const y = padding + ((1 - (e.emotion!.valence + 1) / 2)) * (h - padding * 2);
    return { x, y };
  });

  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
});

// Average mood score
const avgScore = computed(() => {
  if (entries.value.length === 0) return 0;
  const sum = entries.value.reduce((acc, e) => acc + e.score, 0);
  return Math.round(sum / entries.value.length * 10) / 10;
});

// Dominant quadrant
const dominantQuadrant = computed(() => {
  const withEmotion = entries.value.filter(e => e.emotion);
  if (withEmotion.length === 0) return null;

  const counts = { excited: 0, anxious: 0, low: 0, calm: 0 };

  for (const e of withEmotion) {
    const { valence, arousal } = e.emotion!;
    if (valence >= 0 && arousal >= 0) counts.excited++;
    else if (valence < 0 && arousal >= 0) counts.anxious++;
    else if (valence < 0 && arousal < 0) counts.low++;
    else counts.calm++;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
});

const quadrantInfo = computed(() => {
  const map: Record<string, { emoji: string; key: string }> = {
    excited: { emoji: '⚡', key: 'weeklyDigest.quadrantExcited' },
    anxious: { emoji: '🌀', key: 'weeklyDigest.quadrantAnxious' },
    low: { emoji: '🌧️', key: 'weeklyDigest.quadrantLow' },
    calm: { emoji: '🍃', key: 'weeklyDigest.quadrantCalm' },
  };
  return dominantQuadrant.value ? map[dominantQuadrant.value] : null;
});

// Unique days with records
const uniqueDays = computed(() => {
  const days = new Set(entries.value.map(e => new Date(e.timestamp).toDateString()));
  return days.size;
});

// Sparkline gradient color
const sparkColor = computed(() => {
  if (avgScore.value >= 4) return '#10b981';
  if (avgScore.value >= 3) return '#14b8a6';
  return '#6366f1';
});
</script>

<template>
  <div v-if="hasData" class="card animate-float-in" style="animation-delay: 0.12s;">
    <!-- Collapsed header: always visible -->
    <button
      @click="expanded = !expanded"
      class="w-full flex items-center justify-between gap-3"
    >
      <div class="flex items-center gap-2.5">
        <span class="text-lg">📊</span>
        <span class="text-section" style="color: var(--text-primary);">
          {{ t('weeklyDigest.title') }}
        </span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Mini sparkline (always visible) -->
        <svg v-if="sparklinePath" width="120" height="32" class="sparkline-mini">
          <path
            :d="sparklinePath"
            fill="none"
            :stroke="sparkColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.7"
          />
        </svg>

        <span
          class="text-xs transition-transform duration-300"
          :style="{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }"
        >▾</span>
      </div>
    </button>

    <!-- Expanded content -->
    <transition name="digest-expand">
      <div v-if="expanded" class="digest-body mt-4 pt-3" style="border-top: 1px solid var(--border-subtle);">
        <div class="grid grid-cols-3 gap-3 text-center">
          <!-- Stat: records count -->
          <div class="digest-stat">
            <span class="digest-stat-value" :style="{ color: moodTheme.palette.accent }">
              {{ entries.length }}
            </span>
            <span class="text-micro">{{ t('weeklyDigest.records') }}</span>
          </div>

          <!-- Stat: active days -->
          <div class="digest-stat">
            <span class="digest-stat-value" :style="{ color: moodTheme.palette.accent }">
              {{ uniqueDays }}<span class="text-micro" style="color: var(--text-muted);">/7</span>
            </span>
            <span class="text-micro">{{ t('weeklyDigest.activeDays') }}</span>
          </div>

          <!-- Stat: avg mood -->
          <div class="digest-stat">
            <span class="digest-stat-value" :style="{ color: moodTheme.palette.accent }">
              {{ avgScore }}
            </span>
            <span class="text-micro">{{ t('weeklyDigest.avgMood') }}</span>
          </div>
        </div>

        <!-- Dominant emotion zone -->
        <div
          v-if="quadrantInfo"
          class="mt-3 flex items-center justify-center gap-2 py-2 rounded-xl"
          style="background: var(--mood-hover-bg);"
        >
          <span>{{ quadrantInfo.emoji }}</span>
          <span class="text-caption">{{ t(quadrantInfo.key) }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.sparkline-mini {
  flex-shrink: 0;
}

.digest-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.digest-stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.2;
}

.digest-expand-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.digest-expand-leave-active {
  transition: all 0.25s ease;
}
.digest-expand-enter-from,
.digest-expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-8px);
}
.digest-expand-enter-to,
.digest-expand-leave-from {
  opacity: 1;
  max-height: 200px;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .digest-expand-enter-active,
  .digest-expand-leave-active { transition: none; }
}
</style>
