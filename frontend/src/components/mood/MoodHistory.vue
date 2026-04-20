<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
} from 'chart.js';
import { useI18n } from '@/i18n';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import type { MoodEntry } from '@/api/mood';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

const { t } = useI18n();

const props = defineProps<{
  entries: MoodEntry[];
  todayEntries: MoodEntry[];
}>();

const moodTheme = useMoodThemeStore();

const chartData = computed(() => {
  const data = [...props.entries].slice(-30);
  const accent = moodTheme.palette.accent;
  return {
    labels: data.map(e => {
      const d = new Date(e.recorded_at);
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    }),
    datasets: [
      {
        label: t('nav.mood'),
        data: data.map(e => e.mood_score),
        borderColor: accent,
        backgroundColor: `${accent}15`,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: accent,
        pointBorderColor: accent,
        borderWidth: 2,
      },
    ],
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      min: 0.5,
      max: 5.5,
      ticks: {
        stepSize: 1,
        color: '#3a7a64',
        callback: (value: number) => {
          const labels: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' };
          return labels[value] || '';
        },
      },
      grid: { color: 'rgba(100,220,180,0.04)' },
      border: { display: false },
    },
    x: {
      ticks: { maxTicksLimit: 8, font: { size: 10 }, color: '#3a7a64' },
      grid: { display: false },
      border: { display: false },
    },
  },
  plugins: {
    tooltip: {
      backgroundColor: 'rgba(10,25,20,0.95)',
      borderColor: 'rgba(100,220,180,0.1)',
      borderWidth: 1,
      titleColor: '#d0e8dc',
      bodyColor: '#6aa88e',
      callbacks: {
        label: (ctx: any) => {
          const emojis: Record<number, string> = {
            1: '😢 很低落', 2: '😕 不太好', 3: '😐 一般', 4: '🙂 还不错', 5: '😊 很好',
          };
          return emojis[ctx.raw] || ctx.raw;
        },
      },
    },
  },
}));

function formatTime(ts: string) {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
</script>

<template>
  <div>
    <!-- Today's entries -->
    <div v-if="todayEntries.length > 0" class="card p-4 mb-4 animate-float-in" style="animation-delay: 0.2s;">
      <h3 class="text-sm font-medium mb-3" style="color: var(--text-secondary);">{{ t('moodHistory.todayRecords') }}</h3>
      <div class="space-y-2">
        <div
          v-for="entry in todayEntries"
          :key="entry.id"
          class="flex items-center gap-3 text-sm py-1.5 px-3 rounded-lg"
          style="background: var(--mood-hover-bg);"
        >
          <span class="text-xl">{{ entry.mood_emoji }}</span>
          <span style="color: var(--text-primary);">{{ entry.mood_label }}</span>
          <span v-if="entry.note" class="text-xs truncate flex-1" style="color: var(--text-muted);">
            {{ entry.note }}
          </span>
          <span class="text-xs ml-auto flex-shrink-0" style="color: var(--text-muted);">
            {{ formatTime(entry.recorded_at) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Trend chart -->
    <div v-if="entries.length >= 3" class="card p-4 animate-float-in" style="animation-delay: 0.3s;">
      <h3 class="text-sm font-medium mb-3" style="color: var(--text-secondary);">{{ t('moodHistory.recentTrend') }}</h3>
      <div class="h-48">
        <Line :data="chartData" :options="chartOptions as any" />
      </div>
    </div>
    <div v-else class="card p-6 text-center text-sm" style="color: var(--text-muted);">
      记录更多情绪后，这里会显示趋势图
    </div>
  </div>
</template>
