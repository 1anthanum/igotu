<script setup lang="ts">
/**
 * DevelopmentReportView — Layer 3 发展摘要页面
 *
 * 自动聚合近期数据，生成结构化的发展报告。
 * 面向两个受众：用户自己（自省）和治疗师（临床参考）。
 *
 * 功能：
 * - 切换 7 / 14 / 30 天范围
 * - 双轨情绪曲线（MoodCurveChart，可导出 PNG）
 * - 工具使用统计
 * - 危机时刻概要
 * - 警报/信号卡片
 * - PNG 导出（通过 MoodCurveChart 组件）
 */
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@/i18n';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useDevelopmentReport, type ReportAlert } from '@/composables/useDevelopmentReport';
import MoodCurveChart from '@/components/report/MoodCurveChart.vue';

const router = useRouter();
const { t } = useI18n();
const moodTheme = useMoodThemeStore();
const { currentReport, setReportDays, reportDays, rawMoodData, rawCrisisData } = useDevelopmentReport();

const curveChartRef = ref<InstanceType<typeof MoodCurveChart> | null>(null);

const periodOptions = [7, 14, 30];

function selectPeriod(days: number) {
  setReportDays(days);
}

/** 趋势方向 icon */
const trendIcon = computed(() => {
  const d = currentReport.value.moodDelta;
  if (d >= 0.5) return '↑';
  if (d <= -0.5) return '↓';
  return '→';
});

const trendColor = computed(() => {
  const d = currentReport.value.moodDelta;
  if (d >= 0.5) return '#10b981';
  if (d <= -0.5) return '#f59e0b';
  return 'var(--text-muted)';
});

/** 波动性标签 */
const volatilityLabel = computed(() => {
  const v = currentReport.value.moodVolatility;
  return t(`report.volatility.${v}`);
});

/** 警报严重性 → 样式 */
function alertStyle(alert: ReportAlert) {
  switch (alert.severity) {
    case 'attention': return { border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)' };
    case 'positive': return { border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' };
    default: return { border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' };
  }
}

function alertIcon(alert: ReportAlert) {
  switch (alert.type) {
    case 'consecutive-low': return '⚠️';
    case 'improvement': return '📈';
    case 'frequent-crisis': return '💛';
    case 'stable': return '🌿';
    default: return 'ℹ️';
  }
}

function goBack() {
  router.push('/');
}
</script>

<template>
  <div class="report-page">
    <!-- Header -->
    <div class="report-header">
      <button @click="goBack" class="back-btn">← {{ t('common.backToHome') }}</button>
      <h1 class="report-title">📊 {{ t('report.title') }}</h1>
      <p class="report-subtitle">{{ t('report.subtitle') }}</p>
    </div>

    <!-- Period selector -->
    <div class="period-selector">
      <button
        v-for="days in periodOptions"
        :key="days"
        class="period-btn"
        :class="{ active: reportDays === days }"
        @click="selectPeriod(days)"
      >
        {{ days }} {{ t('report.days') }}
      </button>
    </div>

    <!-- Mood trend card -->
    <div class="card report-card animate-float-in">
      <h2 class="card-title">{{ t('report.moodTrend') }}</h2>
      <div class="trend-row">
        <div class="trend-stat">
          <span class="stat-value" :style="{ color: moodTheme.palette.accent }">
            {{ currentReport.moodAverage }}
          </span>
          <span class="stat-label">{{ t('report.average') }}</span>
        </div>
        <div class="trend-stat">
          <span class="stat-value" :style="{ color: trendColor }">
            {{ trendIcon }} {{ Math.abs(currentReport.moodDelta) }}
          </span>
          <span class="stat-label">{{ t('report.change') }}</span>
        </div>
        <div class="trend-stat">
          <span class="stat-value">{{ volatilityLabel }}</span>
          <span class="stat-label">{{ t('report.volatilityLabel') }}</span>
        </div>
      </div>

      <!-- 双轨情绪曲线 -->
      <MoodCurveChart
        ref="curveChartRef"
        :mood-data="rawMoodData"
        :crisis-data="rawCrisisData"
        :period-days="currentReport.periodDays"
        :period-start="currentReport.periodStart"
        :period-end="currentReport.periodEnd"
        :accent-color="moodTheme.palette.accent"
      />
    </div>

    <!-- Tool usage card -->
    <div class="card report-card animate-float-in" style="animation-delay: 0.05s;">
      <h2 class="card-title">🔧 {{ t('report.toolUsage') }}</h2>
      <div v-if="currentReport.toolUsage.length > 0" class="tool-list">
        <div v-for="tool in currentReport.toolUsage" :key="tool.name" class="tool-row">
          <span class="tool-icon">{{ tool.icon }}</span>
          <span class="tool-name">{{ tool.name }}</span>
          <span class="tool-count" :style="{ color: moodTheme.palette.accent }">
            ×{{ tool.count }}
          </span>
        </div>
      </div>
      <p v-else class="no-data">{{ t('report.noToolData') }}</p>
    </div>

    <!-- Crisis moments card -->
    <div
      v-if="currentReport.crisisMoments.length > 0"
      class="card report-card animate-float-in"
      style="animation-delay: 0.1s;"
    >
      <h2 class="card-title">⚡ {{ t('report.crisisMoments') }}</h2>
      <div class="crisis-list">
        <div v-for="(moment, i) in currentReport.crisisMoments" :key="i" class="crisis-row">
          <span class="crisis-date">{{ moment.date }}</span>
          <span class="crisis-detail">
            {{ moment.durationMinutes }} {{ t('report.minutes') }}
            <span v-if="moment.recoveryDelta !== null && moment.recoveryDelta > 0" class="recovery-badge">
              +{{ moment.recoveryDelta }}
            </span>
          </span>
        </div>
      </div>
      <p class="crisis-summary">
        {{ t('report.crisisSummary', { count: currentReport.crisisDayCount, days: currentReport.periodDays }) }}
      </p>
    </div>

    <!-- Alerts -->
    <div
      v-for="(alert, i) in currentReport.alerts"
      :key="i"
      class="alert-card animate-float-in"
      :style="{ ...alertStyle(alert), animationDelay: `${0.15 + i * 0.05}s` }"
    >
      <span class="alert-icon">{{ alertIcon(alert) }}</span>
      <span class="alert-message">{{ alert.message }}</span>
    </div>

    <!-- Footer actions -->
    <div class="report-footer">
      <p class="footer-note">{{ t('report.footerNote') }}</p>
    </div>
  </div>
</template>

<style scoped>
.report-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

/* ── Header ── */
.report-header {
  margin-bottom: 1.5rem;
}
.back-btn {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: color 0.2s;
}
.back-btn:hover { color: var(--text-secondary); }
.report-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}
.report-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* ── Period selector ── */
.period-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}
.period-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.2s;
}
.period-btn.active {
  color: var(--mood-nav-active-text);
  border-color: var(--mood-accent);
  background: var(--mood-hover-bg);
}

/* ── Cards ── */
.report-card {
  margin-bottom: 1rem;
}
.card-title {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

/* ── Mood trend ── */
.trend-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.75rem;
}
.trend-stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}
.stat-label {
  font-size: 0.65rem;
  color: var(--text-muted);
}

/* ── Tool usage ── */
.tool-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.tool-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.tool-icon { font-size: 1rem; }
.tool-name {
  flex: 1;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.tool-count {
  font-size: 0.85rem;
  font-weight: 600;
}

/* ── Crisis moments ── */
.crisis-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}
.crisis-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}
.crisis-date {
  color: var(--text-muted);
  font-family: monospace;
}
.crisis-detail {
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.recovery-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  font-weight: 600;
}
.crisis-summary {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-style: italic;
}

/* ── Alerts ── */
.alert-card {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  margin-bottom: 0.75rem;
}
.alert-icon {
  font-size: 1rem;
  flex-shrink: 0;
}
.alert-message {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* ── Footer ── */
.report-footer {
  margin-top: 1.5rem;
  text-align: center;
}
.footer-note {
  font-size: 0.65rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.no-data {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
  padding: 1rem 0;
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .animate-float-in { animation: none !important; }
}
</style>
