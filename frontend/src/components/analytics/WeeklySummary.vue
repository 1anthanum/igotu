<script setup lang="ts">
import { useI18n } from '@/i18n';
import type { WeeklySummary } from '@/types/api';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const { t } = useI18n();

defineProps<{
  summary: WeeklySummary | null;
}>();

const moodTheme = useMoodThemeStore();
</script>

<template>
  <div v-if="summary" class="card animate-float-in">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-semibold" style="color: var(--text-primary);">{{ t('analyticsSections.weeklySummary') }}</h3>
      <span class="text-2xl">
        {{ summary.totalAchievements > 10 ? '🌟' : summary.totalAchievements > 0 ? '💚' : '💙' }}
      </span>
    </div>

    <div class="text-center py-4">
      <div class="text-4xl font-bold" :style="{ color: moodTheme.palette.accent }">
        {{ summary.totalAchievements }}
      </div>
      <div class="text-sm mt-1" style="color: var(--text-muted);">{{ t('analyticsSections.achievements') }}</div>
    </div>

    <p
      class="text-sm text-center rounded-xl py-3 px-4"
      :style="{
        background: `linear-gradient(135deg, ${moodTheme.palette.gradientFrom}, ${moodTheme.palette.gradientTo})`,
        color: moodTheme.palette.navActiveText,
      }"
    >
      {{ summary.message }}
    </p>
  </div>
</template>
