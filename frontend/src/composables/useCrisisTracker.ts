/**
 * useCrisisTracker — Layer 2 危机时刻记忆系统
 *
 * 当用户在 Layer 1 或低情绪状态下使用了产品（Sanctuary、声景、简化呼吸等），
 * 系统记录一个"危机时刻标记"（CrisisMarker）。
 *
 * 次日打开 App 时，系统检查是否有未跟进的标记，
 * 并触发温和的次日签到流程。
 *
 * 设计原则：
 * - 不存储对话内容，只存储元数据标记
 * - 不做临床诊断，只做关怀性跟进
 * - 宁可漏报，不可误报
 */

import { ref, computed } from 'vue';

// ── 数据模型 ──

export interface CrisisMarker {
  id: string;
  timestamp: number;
  /** 触发时的情绪分数 */
  moodScore: number;
  /** 使用了哪些工具 */
  toolsUsed: CrisisTool[];
  /** 持续时长（秒）— 用户在 Layer 1 停留了多久 */
  duration: number;
  /** 是否包含敏感表达（由后端 sensitivity_flag 标记） */
  hasSensitiveExpression: boolean;
  /** 次日是否已跟进 */
  followedUp: boolean;
  /** 跟进时的情绪分数 */
  followUpMood?: number;
  /** 跟进时间 */
  followUpTimestamp?: number;
}

export type CrisisTool = 'sanctuary' | 'soundscape' | 'breathing-minimal' | 'breathing' | 'grounding';

const STORAGE_KEY = 'igotu_crisis_markers';
const MAX_RETENTION_DAYS = 90;
/** 危机标记创建后至少经过这么久才显示次日签到（避免凌晨2点弹出"昨天很难"） */
const MIN_FOLLOWUP_COOLDOWN_MS = 8 * 60 * 60 * 1000; // 8 小时

// ── 全局状态 ──

const markers = ref<CrisisMarker[]>(loadMarkers());

function loadMarkers(): CrisisMarker[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CrisisMarker[];
    // 清理超过 90 天的旧数据
    const cutoff = Date.now() - MAX_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return parsed.filter(m => m.timestamp >= cutoff);
  } catch {
    return [];
  }
}

function saveMarkers() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(markers.value));
  } catch { /* storage full — silent */ }
}

// ── Session tracking — 记录当前 Layer 1 停留 ──

let sessionStartTime: number | null = null;
let sessionTools: Set<CrisisTool> = new Set();
let sessionMood: number = 3;

export function useCrisisTracker() {
  // ── 创建标记 ──

  /**
   * 开始一个 Layer 1 session。
   * 在进入 Sanctuary / 使用 crisis 工具时调用。
   */
  function startCrisisSession(moodScore: number) {
    if (sessionStartTime !== null) return; // 已在 session 中
    sessionStartTime = Date.now();
    sessionMood = moodScore;
    sessionTools = new Set();
  }

  /**
   * 记录在当前 session 中使用的工具。
   */
  function recordToolUse(tool: CrisisTool) {
    sessionTools.add(tool);
  }

  /**
   * 结束当前 Layer 1 session 并创建 CrisisMarker。
   * 在离开 Sanctuary / crisis 工具页面时调用。
   * 只有 session 持续 > 30 秒才会创建标记（避免意外触碰产生噪声）。
   */
  function endCrisisSession(): CrisisMarker | null {
    if (sessionStartTime === null) return null;

    const duration = Math.round((Date.now() - sessionStartTime) / 1000);
    sessionStartTime = null;

    // 过短的 session 不记录（< 30s 可能是误触）
    if (duration < 30) return null;

    const marker: CrisisMarker = {
      id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      moodScore: sessionMood,
      toolsUsed: Array.from(sessionTools),
      duration,
      hasSensitiveExpression: false,
      followedUp: false,
    };

    markers.value.unshift(marker);

    // 保留最多 200 条
    if (markers.value.length > 200) {
      markers.value = markers.value.slice(0, 200);
    }

    saveMarkers();
    return marker;
  }

  /**
   * 标记最近的 marker 包含敏感表达。
   * 由前端在收到后端 sensitivity_flag 时调用。
   */
  function markSensitive() {
    const recent = markers.value[0];
    if (recent && Date.now() - recent.timestamp < 24 * 60 * 60 * 1000) {
      recent.hasSensitiveExpression = true;
      saveMarkers();
    }
  }

  // ── 次日检测 ──

  /**
   * 检查是否有需要次日跟进的标记。
   * 逻辑：过去 48h 内是否有 followedUp === false 的标记？
   * 额外约束：标记创建后至少 8 小时才触发（避免凌晨 2 点刚离开 Sanctuary
   *           就弹出"昨天有些不容易"——那其实是 1 小时前的事）。
   */
  const pendingFollowUp = computed(() => {
    const now = Date.now();
    const twoDaysAgo = now - 48 * 60 * 60 * 1000;
    return markers.value.find(m =>
      !m.followedUp &&
      m.timestamp >= twoDaysAgo &&
      m.timestamp < now &&
      (now - m.timestamp) >= MIN_FOLLOWUP_COOLDOWN_MS // 至少间隔 8 小时
    ) ?? null;
  });

  /**
   * 是否有包含敏感表达的待跟进标记。
   */
  const hasSensitivePending = computed(() => {
    return pendingFollowUp.value?.hasSensitiveExpression === true;
  });

  /**
   * 完成跟进。
   * 在次日签到时调用，传入用户选择的当前情绪。
   */
  function completeFollowUp(currentMood: number) {
    const pending = pendingFollowUp.value;
    if (!pending) return;

    pending.followedUp = true;
    pending.followUpMood = currentMood;
    pending.followUpTimestamp = Date.now();
    saveMarkers();
  }

  // ── 连续低情绪检测 ──

  /**
   * 检查过去 N 天是否连续 mood ≤ 2。
   * 用于 Layer 3 报告中标注"建议尽快与治疗师沟通"。
   */
  function consecutiveLowDays(days: number = 3): boolean {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let d = 0; d < days; d++) {
      const dayStart = now - (d + 1) * dayMs;
      const dayEnd = now - d * dayMs;
      const dayMarkers = markers.value.filter(m =>
        m.timestamp >= dayStart && m.timestamp < dayEnd
      );
      // 如果某天没有标记，不算"连续低"
      if (dayMarkers.length === 0) return false;
      // 如果某天有标记但平均 mood > 2，不算"连续低"
      const avgMood = dayMarkers.reduce((s, m) => s + m.moodScore, 0) / dayMarkers.length;
      if (avgMood > 2) return false;
    }
    return true;
  }

  // ── 统计 ──

  /** 过去 N 天的标记列表 */
  function recentMarkers(days: number = 7): CrisisMarker[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return markers.value.filter(m => m.timestamp >= cutoff);
  }

  /** 过去 N 天的工具使用统计 */
  function toolUsageStats(days: number = 7): Record<CrisisTool, number> {
    const recent = recentMarkers(days);
    const stats: Record<string, number> = {};
    for (const m of recent) {
      for (const tool of m.toolsUsed) {
        stats[tool] = (stats[tool] || 0) + 1;
      }
    }
    return stats as Record<CrisisTool, number>;
  }

  /** 过去 N 天中有危机标记的天数 */
  function crisisDayCount(days: number = 7): number {
    const recent = recentMarkers(days);
    const uniqueDays = new Set(
      recent.map(m => new Date(m.timestamp).toISOString().slice(0, 10))
    );
    return uniqueDays.size;
  }

  /** 跟进后情绪回升的平均值 */
  const avgMoodRecovery = computed(() => {
    const withFollowUp = markers.value.filter(m => m.followedUp && m.followUpMood != null);
    if (withFollowUp.length === 0) return null;
    const totalRecovery = withFollowUp.reduce((s, m) => s + ((m.followUpMood ?? m.moodScore) - m.moodScore), 0);
    return totalRecovery / withFollowUp.length;
  });

  return {
    markers,
    // Session management
    startCrisisSession,
    recordToolUse,
    endCrisisSession,
    markSensitive,
    // Follow-up
    pendingFollowUp,
    hasSensitivePending,
    completeFollowUp,
    // Analysis
    consecutiveLowDays,
    recentMarkers,
    toolUsageStats,
    crisisDayCount,
    avgMoodRecovery,
  };
}
