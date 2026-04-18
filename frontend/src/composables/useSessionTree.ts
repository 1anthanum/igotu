/**
 * useSessionTree — 会话成长树的数据计算 v2
 *
 * 从 sessions 列表推导每个节点的"绽放阶段"、活跃度、位置、稀有绽放，
 * 并检测里程碑（第 1/5/10/20/50 次会话）和连续签到。
 */

import { computed } from 'vue';
import { useChatStore } from '@/stores/chat';

export type BloomStage = 'seed' | 'sprout' | 'leaf' | 'flower' | 'fruit';

export type RareBloomType = 'night_bloom' | 'early_bird' | 'deep_talk' | 'quick_checkin';

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

const MILESTONES: Milestone[] = [
  { count: 1, label: '第一次对话', emoji: '🌱' },
  { count: 5, label: '五次交流', emoji: '🌿' },
  { count: 10, label: '十次陪伴', emoji: '🌸' },
  { count: 20, label: '二十次成长', emoji: '🌳' },
  { count: 50, label: '五十次绽放', emoji: '✨' },
];

const STREAK_MILESTONES: Milestone[] = [
  { count: 3, label: '连续三天', emoji: '🔥' },
  { count: 7, label: '坚持一周', emoji: '💪' },
  { count: 14, label: '两周不间断', emoji: '⭐' },
  { count: 30, label: '月度坚持', emoji: '🏆' },
];

export const RARE_BLOOM_CONFIG: Record<RareBloomType, RareBloomConfig> = {
  night_bloom: {
    type: 'night_bloom',
    emoji: '🌙',
    label: '夜之花',
    description: '深夜 23:00 后开启的对话',
    ringColor: '#8b5cf6',
  },
  early_bird: {
    type: 'early_bird',
    emoji: '🌅',
    label: '晨光',
    description: '清晨 5:00-7:00 开启的对话',
    ringColor: '#f59e0b',
  },
  deep_talk: {
    type: 'deep_talk',
    emoji: '💬',
    label: '深度对话',
    description: '消息数达到 20 条以上',
    ringColor: '#14b8a6',
  },
  quick_checkin: {
    type: 'quick_checkin',
    emoji: '⚡',
    label: '活跃日',
    description: '一天内开启 3 次以上对话',
    ringColor: '#f97316',
  },
};

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

export const BLOOM_SIZE: Record<BloomStage, number> = {
  seed: 8,
  sprout: 10,
  leaf: 13,
  flower: 16,
  fruit: 20,
};

export function useSessionTree() {
  const chatStore = useChatStore();

  /** 按天统计 session 数量 */
  const sessionCountByDay = computed(() => {
    const counts: Record<string, number> = {};
    for (const s of chatStore.sessions) {
      const key = toDateKey(s.created_at);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  });

  /** 所有节点（按创建时间从旧到新排列，旧的在树底部） */
  const nodes = computed<TreeNode[]>(() => {
    const reversed = [...chatStore.sessions].reverse();
    const dayCount = sessionCountByDay.value;

    return reversed.map((session, i) => {
      const total = reversed.length;
      const normalizedY = total <= 1 ? 0.5 : 1 - (i / (total - 1));
      const xCenter = 0.5;
      const xSpread = 0.25 * (1 - normalizedY * 0.3);
      const xOffset = i % 2 === 0 ? -xSpread : xSpread;
      const jitter = ((i * 7 + 3) % 11) / 55 - 0.1;

      return {
        sessionId: session.id,
        title: session.title,
        messageCount: session.message_count || 0,
        bloomStage: getBloomStage(session.message_count || 0),
        activityScore: getActivityScore(session.updated_at),
        x: Math.max(0.1, Math.min(0.9, xCenter + xOffset + jitter)),
        y: Math.max(0.05, Math.min(0.95, normalizedY)),
        index: i,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        rareBloomTypes: detectRareBlooms(session, dayCount),
      };
    });
  });

  /** 统计 */
  const stats = computed(() => {
    const total = chatStore.sessions.length;
    const blooming = nodes.value.filter(n => n.bloomStage === 'flower' || n.bloomStage === 'fruit').length;
    return { total, blooming };
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
    STREAK_MILESTONES,
  };
}
