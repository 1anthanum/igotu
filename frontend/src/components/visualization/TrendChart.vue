<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Chart, registerables } from 'chart.js';
import { useI18n } from '@/i18n';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

Chart.register(...registerables);

const { t } = useI18n();

const props = defineProps<{
  dailyCounts: { date: string; count: number }[];
  title?: string;
}>();

const moodTheme = useMoodThemeStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

function renderChart() {
  if (!canvasRef.value || props.dailyCounts.length === 0) return;

  if (chartInstance) chartInstance.destroy();

  const accent = moodTheme.palette.accent;

  const labels = props.dailyCounts.map(d => {
    const date = new Date(d.date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  chartInstance = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: t('visualization.dailyAchievements'),
        data: props.dailyCounts.map(d => d.count),
        borderColor: accent,
        backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: accent,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10,25,20,0.95)',
          titleColor: '#d0e8dc',
          bodyColor: '#6aa88e',
          borderColor: 'rgba(100,220,180,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#3a7a64', font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(100,220,180,0.04)' },
          ticks: {
            color: '#3a7a64',
            font: { size: 11 },
            stepSize: 1,
          },
        },
      },
    },
  });
}

onMounted(renderChart);
watch(() => props.dailyCounts, renderChart);
watch(() => moodTheme.palette.accent, renderChart);
</script>

<template>
  <div class="card">
    <h3 class="text-sm font-semibold mb-4" style="color: var(--text-primary);">{{ title || t('visualization.trend') }}</h3>
    <div class="h-48">
      <canvas ref="canvasRef" />
    </div>
  </div>
</template>
