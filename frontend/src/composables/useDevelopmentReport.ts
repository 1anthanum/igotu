/**
 * useDevelopmentReport — Layer 3 发展摘要生成器
 *
 * 聚合过去 N 天的情绪数据、工具使用记录、危机标记，
 * 生成结构化的发展摘要。
 *
 * 数据来源（全部前端本地）：
 * - igotu_mood_log → 情绪趋势、平均分、波动性
 * - igotu_exercise_records → 工具使用次数和类型
 * - igotu_crisis_markers → 危机时刻、跟进结果
 *
 * 后端对话主题摘要（未来扩展）：暂用占位结构。
 */

import { computed, ref } from 'vue';
import { useExerciseTracker, type ExerciseRecord } from '@/composables/useExerciseTracker';
import { useCrisisTracker, type CrisisMarker } from '@/composables/useCrisisTracker';

// ── 报告数据结构 ──

export interface MoodTrendPoint {
  date: string; // YYYY-MM-DD
  score: number;
  timestamp: number;
}

export interface ToolUsageSummary {
  name: string;
  count: number;
  icon: string;
}

export interface CrisisMomentSummary {
  date: string;
  durationMinutes: number;
  toolsUsed: string[];
  followedUp: boolean;
  recoveryDelta: number | null; // followUpMood - moodScore
}

export interface DevelopmentReport {
  /** 报告覆盖的时间范围 */
  periodDays: number;
  periodStart: string;
  periodEnd: string;

  /** 情绪趋势 */
  moodTrend: MoodTrendPoint[];
  moodAverage: number;
  moodDelta: number; // 前半段 vs 后半段平均值差
  moodVolatility: 'low' | 'medium' | 'high';

  /** 工具使用 */
  toolUsage: ToolUsageSummary[];
  totalToolSessions: number;

  /** 危机时刻 */
  crisisMoments: CrisisMomentSummary[];
  crisisDayCount: number;

  /** 值得关注的信号 */
  alerts: ReportAlert[];

  /** 后端对话主题（未来扩展） */
  conversationTopics: string[];
}

export interface ReportAlert {
  type: 'consecutive-low' | 'improvement' | 'frequent-crisis' | 'stable';
  message: string;
  severity: 'info' | 'attention' | 'positive';
}

// ── 工具名称/icon 映射 ──

const TOOL_META: Record<string, { name: string; icon: string }> = {
  breathing: { name: '呼吸练习', icon: '🍃' },
  grounding: { name: '接地练习', icon: '🌍' },
  soundscape: { name: '声景', icon: '🎵' },
  'breathing-minimal': { name: '简化呼吸', icon: '💫' },
  sanctuary: { name: 'Sanctuary', icon: '🌳' },
};

// ── Composable ──

export function useDevelopmentReport() {
  const exerciseTracker = useExerciseTracker();
  const crisisTracker = useCrisisTracker();

  const reportDays = ref(7);

  /** 生成指定天数的发展报告 */
  function generateReport(days: number = reportDays.value): DevelopmentReport {
    const now = Date.now();
    const periodStart = now - days * 24 * 60 * 60 * 1000;
    const startDate = new Date(periodStart).toISOString().slice(0, 10);
    const endDate = new Date(now).toISOString().slice(0, 10);

    // ── 情绪趋势 ──
    const moodTrend = loadMoodTrend(periodStart, now);
    const moodAverage = moodTrend.length > 0
      ? moodTrend.reduce((s, p) => s + p.score, 0) / moodTrend.length
      : 3;

    // 前半段 vs 后半段的变化
    const halfIdx = Math.floor(moodTrend.length / 2);
    let moodDelta = 0;
    if (moodTrend.length >= 4) {
      const firstHalf = moodTrend.slice(0, halfIdx);
      const secondHalf = moodTrend.slice(halfIdx);
      const avg1 = firstHalf.reduce((s, p) => s + p.score, 0) / firstHalf.length;
      const avg2 = secondHalf.reduce((s, p) => s + p.score, 0) / secondHalf.length;
      moodDelta = Math.round((avg2 - avg1) * 10) / 10;
    }

    // 波动性：标准差
    const moodStdDev = computeStdDev(moodTrend.map(p => p.score));
    const moodVolatility: DevelopmentReport['moodVolatility'] =
      moodStdDev < 0.7 ? 'low' : moodStdDev < 1.2 ? 'medium' : 'high';

    // ── 工具使用 ──
    const toolUsage = computeToolUsage(periodStart, now);
    const totalToolSessions = toolUsage.reduce((s, t) => s + t.count, 0);

    // ── 危机时刻 ──
    const recentCrisis = crisisTracker.recentMarkers(days);
    const crisisMoments = recentCrisis.map(m => ({
      date: new Date(m.timestamp).toISOString().slice(0, 10),
      durationMinutes: Math.round(m.duration / 60),
      toolsUsed: m.toolsUsed,
      followedUp: m.followedUp,
      recoveryDelta: m.followUpMood != null ? m.followUpMood - m.moodScore : null,
    }));
    const crisisDayCount = crisisTracker.crisisDayCount(days);

    // ── 警报/信号 ──
    const alerts = computeAlerts(moodTrend, moodDelta, crisisDayCount, days);

    return {
      periodDays: days,
      periodStart: startDate,
      periodEnd: endDate,
      moodTrend,
      moodAverage: Math.round(moodAverage * 10) / 10,
      moodDelta,
      moodVolatility,
      toolUsage,
      totalToolSessions,
      crisisMoments,
      crisisDayCount,
      alerts,
      conversationTopics: [], // 后端扩展占位
    };
  }

  // ── 内部工具函数 ──

  function loadMoodTrend(from: number, to: number): MoodTrendPoint[] {
    try {
      const raw = localStorage.getItem('igotu_mood_log');
      if (!raw) return [];
      const all = JSON.parse(raw) as Array<{ score: number; timestamp: number }>;
      return all
        .filter(e => e.timestamp >= from && e.timestamp <= to)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(e => ({
          date: new Date(e.timestamp).toISOString().slice(0, 10),
          score: Math.max(1, Math.min(5, Math.round(e.score))),
          timestamp: e.timestamp,
        }));
    } catch {
      return [];
    }
  }

  function computeToolUsage(from: number, to: number): ToolUsageSummary[] {
    const startDate = new Date(from).toISOString().slice(0, 10);
    const counts: Record<string, number> = {};

    for (const record of exerciseTracker.records.value) {
      if (record.completedAt.slice(0, 10) >= startDate) {
        counts[record.type] = (counts[record.type] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([type, count]) => ({
        name: TOOL_META[type]?.name ?? type,
        count,
        icon: TOOL_META[type]?.icon ?? '🔧',
      }))
      .sort((a, b) => b.count - a.count);
  }

  function computeStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  function computeAlerts(
    trend: MoodTrendPoint[],
    delta: number,
    crisisDays: number,
    periodDays: number
  ): ReportAlert[] {
    const alerts: ReportAlert[] = [];

    // 连续低情绪
    if (crisisTracker.consecutiveLowDays(3)) {
      alerts.push({
        type: 'consecutive-low',
        message: '过去 3 天情绪持续偏低，建议与治疗师沟通',
        severity: 'attention',
      });
    }

    // 明显好转
    if (delta >= 0.8) {
      alerts.push({
        type: 'improvement',
        message: `情绪趋势向好（+${delta}）`,
        severity: 'positive',
      });
    }

    // 频繁危机
    if (crisisDays >= Math.ceil(periodDays * 0.5)) {
      alerts.push({
        type: 'frequent-crisis',
        message: `过去 ${periodDays} 天中有 ${crisisDays} 天出现困难时刻`,
        severity: 'attention',
      });
    }

    // 稳定
    if (trend.length >= 5 && delta >= -0.3 && delta <= 0.3 && crisisDays <= 1) {
      alerts.push({
        type: 'stable',
        message: '情绪整体稳定',
        severity: 'info',
      });
    }

    return alerts;
  }

  /** 当前报告（响应式） */
  const currentReport = computed(() => generateReport(reportDays.value));

  /** 设置报告天数 */
  function setReportDays(days: number) {
    reportDays.value = Math.max(1, Math.min(90, days));
  }

  // ── 图表用原始数据 ──

  /** 原始情绪数据点（含时间戳，用于精细曲线绘制） */
  const rawMoodData = computed(() => {
    const now = Date.now();
    const from = now - reportDays.value * 24 * 60 * 60 * 1000;
    return loadMoodTrend(from, now);
  });

  /** 原始危机标记（含时间戳/时长/分数，用于曲线上叠加标记） */
  const rawCrisisData = computed(() => {
    return crisisTracker.recentMarkers(reportDays.value);
  });

  return {
    reportDays,
    currentReport,
    generateReport,
    setReportDays,
    rawMoodData,
    rawCrisisData,
  };
}
