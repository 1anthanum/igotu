/**
 * useExerciseTracker — 练习完成本地追踪
 *
 * 记录呼吸练习、扎根练习等工具的完成次数和历史，
 * 数据存储在 localStorage 中（不依赖后端），
 * 供成长树和统计页面使用。
 */

import { ref, computed } from 'vue';

export interface ExerciseRecord {
  id: string;
  type: 'breathing' | 'grounding';
  technique: string;
  /** 完成时间 ISO string */
  completedAt: string;
  /** 额外数据（循环数、感受等） */
  data?: Record<string, any>;
}

const STORAGE_KEY = 'igotu_exercise_records';

/** 全局响应式记录列表 */
const records = ref<ExerciseRecord[]>(loadRecords());

function loadRecords(): ExerciseRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value));
  } catch { /* storage full — silent */ }
}

export function useExerciseTracker() {
  /** 记录一次练习完成 */
  function logCompletion(type: ExerciseRecord['type'], technique: string, data?: Record<string, any>) {
    const record: ExerciseRecord = {
      id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      technique,
      completedAt: new Date().toISOString(),
      data,
    };
    records.value.unshift(record);
    // 最多保留 200 条
    if (records.value.length > 200) {
      records.value = records.value.slice(0, 200);
    }
    saveRecords();
    return record;
  }

  /** 呼吸练习完成次数 */
  const breathingCount = computed(() =>
    records.value.filter(r => r.type === 'breathing').length
  );

  /** 扎根练习完成次数 */
  const groundingCount = computed(() =>
    records.value.filter(r => r.type === 'grounding').length
  );

  /** 总练习次数 */
  const totalCount = computed(() => records.value.length);

  /** 今天的练习次数 */
  const todayCount = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return records.value.filter(r => r.completedAt.slice(0, 10) === today).length;
  });

  /** 按日期分组的练习记录（供成长树使用） */
  const recordsByDate = computed(() => {
    const map: Record<string, ExerciseRecord[]> = {};
    for (const r of records.value) {
      const day = r.completedAt.slice(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(r);
    }
    return map;
  });

  /** 最近 N 条记录 */
  function recentRecords(limit = 10): ExerciseRecord[] {
    return records.value.slice(0, limit);
  }

  return {
    records,
    logCompletion,
    breathingCount,
    groundingCount,
    totalCount,
    todayCount,
    recordsByDate,
    recentRecords,
  };
}
