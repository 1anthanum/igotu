<script setup lang="ts">
import { onMounted } from 'vue';
import { useAnalyticsStore } from '@/stores/analytics';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useI18n } from '@/i18n';
import WeeklySummaryCard from '@/components/analytics/WeeklySummary.vue';
import PatternInsightCard from '@/components/analytics/PatternInsight.vue';
import TrendChart from '@/components/visualization/TrendChart.vue';
import CategoryBreakdown from '@/components/visualization/CategoryBreakdown.vue';

const analytics = useAnalyticsStore();
const moodTheme = useMoodThemeStore();
const { t } = useI18n();

onMounted(async () => {
  await Promise.all([
    analytics.loadWeekly(),
    analytics.loadMonthly(),
    analytics.loadPatterns(),
  ]);
});
</script>

<template>
  <div class="pt-6 space-y-6">
    <h1 class="text-xl font-semibold animate-float-in" style="color: var(--text-primary);">🌱 {{ t('analytics.title') }}</h1>

    <WeeklySummaryCard :summary="analytics.weeklySummary" />

    <TrendChart
      v-if="analytics.weeklySummary?.dailyCounts.length"
      :daily-counts="analytics.weeklySummary!.dailyCounts"
      :title="t('analytics.weeklyTrend')"
    />

    <CategoryBreakdown
      v-if="analytics.weeklySummary?.categoryCounts"
      :category-counts="analytics.weeklySummary!.categoryCounts"
    />

    <PatternInsightCard :insights="analytics.patterns" />

    <!-- Monthly overview -->
    <div v-if="analytics.monthlySummary" class="card animate-float-in" style="animation-delay: 0.3s;">
      <h3 class="text-sm font-semibold mb-3" style="color: var(--text-primary);">{{ t('analytics.monthlyOverview') }}</h3>
      <div class="grid grid-cols-2 gap-4">
        <div
          class="text-center rounded-xl py-4"
          :style="{ background: moodTheme.palette.navActive }"
        >
          <div class="text-2xl font-bold" :style="{ color: moodTheme.palette.accent }">
            {{ analytics.monthlySummary.totalAchievements }}
          </div>
          <div class="text-xs mt-1" style="color: var(--text-muted);">{{ t('analytics.totalAchievements') }}</div>
        </div>
        <div
          class="text-center rounded-xl py-4"
          style="background: var(--bg-card);"
        >
          <div class="text-2xl font-bold" style="color: var(--text-primary);">
            {{ analytics.monthlySummary.avgPerDay }}
          </div>
          <div class="text-xs mt-1" style="color: var(--text-muted);">{{ t('analytics.avgPerDay') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
