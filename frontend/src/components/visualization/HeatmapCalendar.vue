<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/i18n';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import type { CalendarDay } from '@/types/achievement';

const { t } = useI18n();

const props = defineProps<{
  data: CalendarDay[];
}>();

const moodTheme = useMoodThemeStore();

// Build a 365-day calendar grid (7 rows x ~52 cols)
const calendarGrid = computed(() => {
  const today = new Date();
  const dataMap = new Map(props.data.map(d => [d.date, d.count]));
  const days: { date: string; count: number; dayOfWeek: number }[] = [];

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      count: dataMap.get(dateStr) || 0,
      dayOfWeek: d.getDay(),
    });
  }

  return days;
});

const maxCount = computed(() => {
  return Math.max(1, ...props.data.map(d => d.count));
});

// Use mood-accent color with varying opacity for heatmap
function getColor(count: number): string {
  if (count === 0) return 'rgba(100,220,180,0.04)';
  const accent = moodTheme.palette.accent;
  const ratio = count / maxCount.value;
  // Convert hex accent to rgba with varying opacity
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  const opacity = 0.2 + ratio * 0.8;
  return `rgba(${r},${g},${b},${opacity})`;
}

// Group by weeks (columns)
const weeks = computed(() => {
  const result: typeof calendarGrid.value[] = [];
  let currentWeek: typeof calendarGrid.value = [];

  const firstDay = calendarGrid.value[0];
  if (firstDay) {
    for (let i = 0; i < firstDay.dayOfWeek; i++) {
      currentWeek.push({ date: '', count: -1, dayOfWeek: i });
    }
  }

  for (const day of calendarGrid.value) {
    if (day.dayOfWeek === 0 && currentWeek.length > 0) {
      result.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) result.push(currentWeek);

  return result;
});

function formatTooltip(day: { date: string; count: number }) {
  if (day.count < 0) return '';
  if (day.count === 0) return `${day.date}: ${t('visualization.noRecords')}`;
  return `${day.date}: ${day.count} ${t('visualization.achievements')}`;
}
</script>

<template>
  <div class="card animate-float-in" style="animation-delay: 0.2s;">
    <h3 class="text-sm font-semibold mb-4" style="color: var(--text-primary);">{{ t('visualization.achievementCalendar') }}</h3>
    <div class="overflow-x-auto">
      <div class="flex gap-[3px] min-w-max">
        <div
          v-for="(week, wi) in weeks"
          :key="wi"
          class="flex flex-col gap-[3px]"
        >
          <div
            v-for="(day, di) in week"
            :key="di"
            class="w-3 h-3 rounded-sm transition-colors"
            :style="{ backgroundColor: day.count >= 0 ? getColor(day.count) : 'transparent' }"
            :title="formatTooltip(day)"
          />
        </div>
      </div>
    </div>
    <!-- Legend -->
    <div class="flex items-center gap-1 mt-3 text-xs" style="color: var(--text-muted);">
      <span>{{ t('visualization.less') }}</span>
      <div class="w-3 h-3 rounded-sm" style="background: rgba(100,220,180,0.04);" />
      <div class="w-3 h-3 rounded-sm" :style="{ background: `color-mix(in srgb, ${moodTheme.palette.accent} 25%, transparent)` }" />
      <div class="w-3 h-3 rounded-sm" :style="{ background: `color-mix(in srgb, ${moodTheme.palette.accent} 50%, transparent)` }" />
      <div class="w-3 h-3 rounded-sm" :style="{ background: `color-mix(in srgb, ${moodTheme.palette.accent} 75%, transparent)` }" />
      <div class="w-3 h-3 rounded-sm" :style="{ background: moodTheme.palette.accent }" />
      <span>{{ t('visualization.more') }}</span>
    </div>
  </div>
</template>
