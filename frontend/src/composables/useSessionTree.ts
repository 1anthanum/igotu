/**
 * useSessionTree — 会话成长树的数据计算 v2
 *
 * 从 sessions 列表推导每个节点的"绽放阶段"、活跃度、位置、稀有绽放，
 * 并检测里程碑（第 1/5/10/20/50 次会话）和连续签到。
 */

import { computed } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useExerciseTracker } from '@/composables/useExerciseTracker';
import { useI18n } from '@/i18n';

export type BloomStage = 'seed' | 'sprout' | 'leaf' | 'flower' | 'fruit';

export type RareBloomType = 'night_bloom' | 'early_bird' | 'deep_talk' | 'quick_checkin';

/** 节点类型：对话 or 练习 */
export type NodeType = 'chat' | 'exercise';

export interface TreeNode {
  sessionId: string;
  title: string;
  messageCount: number;
  bloomStage: BloomStage;
  /** 0-100，基于最后更新时间的新鲜度 */
  activityScore: number;
  /** 节点在树上的位置（标准化 0-1） */
  x: number;
  y: number;
  /** 在 sessions 中的索引（越小越新） */
  index: number;
  createdAt: string;
  updatedAt: string;
  /** 稀有绽放类型（可多个） */
  rareBloomTypes: RareBloomType[];
  /** 节点类型 */
  nodeType: NodeType;
  /** 练习类型（仅 exercise 节点） */
  exerciseType?: string;
}

export interface Milestone {
  count: number;
  label: string;
  emoji: string;
}

export interface StreakInfo {
  days: number;
  isActive: boolean;
}

export interface RareBloomConfig {
  type: RareBloomType;
  emoji: string;
  label: string;
  description: string;
  /** 外环光效颜色 */
  ringColor: string;
}

function getMilestones(): Milestone[] {
  const { t } = useI18n();
  return [
    { count: 1, label: t('growthTree.milestones.m1'), emoji: '🌱' },
    { count: 5, label: t('growthTree.milestones.m5'), emoji: '🌿' },
    { count: 10, label: t('growthTree.milestones.m10'), emoji: '🌸' },
    { count: 20, label: t('growthTree.milestones.m20'), emoji: '🌳' },
    { count: 50, label: t('growthTree.milestones.m50'), emoji: '✨' },
  ];
}

function getStreakMilestones(): Milestone[] {
  const { t } = useI18n();
  return [
    { count: 3, label: t('growthTree.streakDays'), emoji: '🔥' },
    { count: 7, label: t('growthTree.streakDays'), emoji: '💪' },
    { count: 14, label: t('growthTree.streakDays'), emoji: '⭐' },
    { count: 30, label: t('growthTree.streakDays'), emoji: '🏆' },
  ];
}

export function getRareBloomConfig(): Record<RareBloomType, RareBloomConfig> {
  const { t } = useI18n();
  return {
    night_bloom: {
      type: 'night_bloom',
      emoji: '🌙',
      label: t('growthTree.rareBloom.night_bloom.label'),
      description: t('growthTree.rareBloom.night_bloom.description'),
      ringColor: '#8b5cf6',
    },
    early_bird: {
      type: 'early_bird',
      emoji: '🌅',
      label: t('growthTree.rareBloom.early_bird.label'),
      description: t('growthTree.rareBloom.early_bird.description'),
      ringColor: '#f59e0b',
    },
    deep_talk: {
      type: 'deep_talk',
      emoji: '💬',
      label: t('growthTree.rareBloom.deep_talk.label'),
      description: t('growthTree.rareBloom.deep_talk.description'),
      ringColor: '#14b8a6',
    },
    quick_checkin: {
      type: 'quick_checkin',
      emoji: '⚡',
      label: t('growthTree.rareBloom.quick_checkin.label'),
      description: t('growthTree.rareBloom.quick_checkin.description'),
      ringColor: '#f97316',
    },
  };
}

/** Module-level constant for components that import it directly */
export const RARE_BLOOM_CONFIG = getRareBloomConfig();

function getBloomStage(messageCount: number): BloomStage {
  if (messageCount === 0) return 'seed';
  if (messageCount <= 3) return 'sprout';
  if (messageCount <= 10) return 'leaf';
  if (messageCount <= 30) return 'flower';
  return 'fruit';
}

function getActivityScore(updatedAt: string): number {
  const now = Date.now();
  const updated = new Date(updatedAt).getTime();
  const hoursSince = (now - updated) / (1000 * 60 * 60);
  return Math.max(0, Math.min(100, 100 - (hoursSince / 168) * 100));
}

/** 获取日期的 YYYY-MM-DD 字符串（本地时区） */
function toDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 检测稀有绽放 */
function detectRareBlooms(
  session: { created_at: string; message_count: number },
  sessionCountByDay: Record<string, number>
): RareBloomType[] {
  const types: RareBloomType[] = [];
  const hour = new Date(session.created_at).getHours();

  // Night Bloom: 23:00 ~ 00:59
  if (hour >= 23 || hour < 1) {
    types.push('night_bloom');
  }

  // Early Bird: 5:00 ~ 6:59
  if (hour >= 5 && hour < 7) {
    types.push('early_bird');
  }

  // Deep Talk: 20+ messages
  if ((session.message_count || 0) >= 20) {
    types.push('deep_talk');
  }

  // Quick Check-in: 3+ sessions same day
  const dayKey = toDateKey(session.created_at);
  if ((sessionCountByDay[dayKey] || 0) >= 3) {
    types.push('quick_checkin');
  }

  return types;
}

export const BLOOM_EMOJI: Record<BloomStage, string> = {
  seed: '🌰',
  sprout: '🌱',
  leaf: '🌿',
  flower: '🌸',
  fruit: '🌳',
};

/** 练习节点的 emoji（按累计次数） */
export const EXERCISE_EMOJI: Record<string, string> = {
  breathing: '🌬️',
  grounding: '🌍',
};

export const BLOOM_SIZE: Record<BloomStage, number> = {
  seed: 8,
  sprout: 10,
  leaf: 13,
  flower: 16,
  fruit: 20,
};

export function useSessionTree() {
  const chatStore = useChatStore();
  const exerciseTracker = useExerciseTracker();
  const { t } = useI18n();

  const MILESTONES = getMilestones();
  const STREAK_MILESTONES = getStreakMilestones();
  const RARE_BLOOM_CONFIG = getRareBloomConfig();

  /** 按天统计 session 数量 */
  const sessionCountByDay = computed(() => {
    const counts: Record<string, number> = {};
    for (const s of chatStore.sessions) {
      const key = toDateKey(s.created_at);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  });

  /**
   * 将练习记录按天聚合成"练习节点"
   * 每天的同类练习合并为一个节点，避免树上节点过多
   */
  const exerciseNodes = computed(() => {
    const byDayType: Record<string, { type: string; count: number; firstAt: string; lastAt: string }> = {};
    for (const r of exerciseTracker.records.value) {
      const day = r.completedAt.slice(0, 10);
      const key = `${day}-${r.type}`;
      if (!byDayType[key]) {
        byDayType[key] = { type: r.type, count: 0, firstAt: r.completedAt, lastAt: r.completedAt };
      }
      byDayType[key].count++;
      if (r.completedAt < byDayType[key].firstAt) byDayType[key].firstAt = r.completedAt;
      if (r.completedAt > byDayType[key].lastAt) byDayType[key].lastAt = r.completedAt;
    }
    return Object.entries(byDayType).map(([key, info]) => ({
      id: `exercise-${key}`,
      type: info.type,
      count: info.count,
      createdAt: info.firstAt,
      updatedAt: info.lastAt,
    }));
  });

  /** 所有节点（对话 + 练习，按时间从旧到新排列） */
  const nodes = computed<TreeNode[]>(() => {
    const dayCount = sessionCountByDay.value;

    // 对话节点
    const chatNodes: { time: number; node: Omit<TreeNode, 'x' | 'y' | 'index'> }[] =
      chatStore.sessions.map(session => ({
        time: new Date(session.created_at).getTime(),
        node: {
          sessionId: session.id,
          title: session.title,
          messageCount: session.message_count || 0,
          bloomStage: getBloomStage(session.message_count || 0),
          activityScore: getActivityScore(session.updated_at),
          createdAt: session.created_at,
          updatedAt: session.updated_at,
          rareBloomTypes: detectRareBlooms(session, dayCount),
          nodeType: 'chat' as NodeType,
        },
      }));

    // 练习节点
    const exNodes: { time: number; node: Omit<TreeNode, 'x' | 'y' | 'index'> }[] =
      exerciseNodes.value.map(ex => {
        const typeLabel = ex.type === 'breathing' ? t('growthTree.breathingExercise') : t('growthTree.groundingExercise');
        const countLabel = ex.count > 1 ? `×${ex.count}` : '';
        return {
          time: new Date(ex.createdAt).getTime(),
          node: {
            sessionId: ex.id,
            title: `${typeLabel}${t('growthTree.exercise')}${countLabel}`,
            messageCount: ex.count,
            bloomStage: ex.count >= 5 ? 'flower' : ex.count >= 3 ? 'leaf' : ex.count >= 2 ? 'sprout' : 'seed',
            activityScore: getActivityScore(ex.updatedAt),
            createdAt: ex.createdAt,
            updatedAt: ex.updatedAt,
            rareBloomTypes: [],
            nodeType: 'exercise' as NodeType,
            exerciseType: ex.type,
          },
        };
      });

    // 合并并按时间排序（旧 → 新）
    const all = [...chatNodes, ...exNodes].sort((a, b) => a.time - b.time);

    return all.map((item, i) => {
      const total = all.length;
      const normalizedY = total <= 1 ? 0.5 : 1 - (i / (total - 1));
      const xCenter = 0.5;
      const xSpread = 0.25 * (1 - normalizedY * 0.3);
      // 练习节点偏右侧，对话节点偏左侧，交替排列
      const side = item.node.nodeType === 'exercise'
        ? (i % 2 === 0 ? 1 : -1)
        : (i % 2 === 0 ? -1 : 1);
      const xOffset = side * xSpread;
      const jitter = ((i * 7 + 3) % 11) / 55 - 0.1;

      return {
        ...item.node,
        x: Math.max(0.1, Math.min(0.9, xCenter + xOffset + jitter)),
        y: Math.max(0.05, Math.min(0.95, normalizedY)),
        index: i,
      };
    });
  });

  /** 统计 */
  const stats = computed(() => {
    const total = chatStore.sessions.length;
    const blooming = nodes.value.filter(n => n.bloomStage === 'flower' || n.bloomStage === 'fruit').length;
    const exerciseTotal = exerciseTracker.totalCount.value;
    const breathingTotal = exerciseTracker.breathingCount.value;
    return { total, blooming, exerciseTotal, breathingTotal };
  });

  /** 稀有绽放收集统计 */
  const rareBloomCollection = computed(() => {
    const collection: Record<RareBloomType, number> = {
      night_bloom: 0,
      early_bird: 0,
      deep_talk: 0,
      quick_checkin: 0,
    };
    for (const node of nodes.value) {
      for (const type of node.rareBloomTypes) {
        collection[type]++;
      }
    }
    return collection;
  });

  /** 连续签到天数 */
  const streak = computed<StreakInfo>(() => {
    if (chatStore.sessions.length === 0) return { days: 0, isActive: false };

    // 收集所有有 session 的日期
    const dateSet = new Set<string>();
    for (const s of chatStore.sessions) {
      dateSet.add(toDateKey(s.created_at));
    }

    // 从今天开始往前数连续天数
    const today = new Date();
    const todayKey = toDateKey(today.toISOString());
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = toDateKey(yesterdayDate.toISOString());

    // 必须今天或昨天有 session 才算 active
    const isActive = dateSet.has(todayKey) || dateSet.has(yesterdayKey);
    if (!isActive) return { days: 0, isActive: false };

    // 从最近有记录的日期开始向前计数
    const startDate = dateSet.has(todayKey) ? today : yesterdayDate;
    let days = 0;
    const d = new Date(startDate);

    while (true) {
      const key = toDateKey(d.toISOString());
      if (dateSet.has(key)) {
        days++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    return { days, isActive };
  });

  /** 当前达成的最高里程碑 */
  const currentMilestone = computed<Milestone | null>(() => {
    const total = chatStore.sessions.length;
    let best: Milestone | null = null;
    for (const m of MILESTONES) {
      if (total >= m.count) best = m;
    }
    return best;
  });

  /** 下一个里程碑 */
  const nextMilestone = computed<Milestone | null>(() => {
    const total = chatStore.sessions.length;
    return MILESTONES.find(m => m.count > total) || null;
  });

  /** 检测是否刚好达成某个里程碑（供动画触发） */
  function checkMilestone(sessionCount: number): Milestone | null {
    // 检查 session 数量里程碑
    const sessionMilestone = MILESTONES.find(m => m.count === sessionCount) || null;
    if (sessionMilestone) return sessionMilestone;

    // 检查连续签到里程碑
    const streakMilestone = STREAK_MILESTONES.find(m => m.count === streak.value.days) || null;
    return streakMilestone;
  }

  return {
    nodes,
    stats,
    rareBloomCollection,
    streak,
    currentMilestone,
    nextMilestone,
    checkMilestone,
    BLOOM_EMOJI,
    BLOOM_SIZE,
    RARE_BLOOM_CONFIG,
    EXERCISE_EMOJI,
    STREAK_MILESTONES: STREAK_MILESTONES,
  };
}
