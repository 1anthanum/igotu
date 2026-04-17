import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '@/api/analytics';
import type { WeeklySummary, MonthlySummary, PatternInsight, EncouragementMessage } from '@/types/api';

export const useAnalyticsStore = defineStore('analytics', () => {
  const weeklySummary = ref<WeeklySummary | null>(null);
  const monthlySummary = ref<MonthlySummary | null>(null);
  const patterns = ref<PatternInsight[]>([]);
  const encouragement = ref<EncouragementMessage[]>([]);
  const loading = ref(false);

  async function loadWeekly() {
    weeklySummary.value = await api.getWeeklySummary();
  }

  async function loadMonthly() {
    monthlySummary.value = await api.getMonthlySummary();
  }

  async function loadPatterns() {
    patterns.value = await api.getPatterns();
  }

  async function loadEncouragement() {
    encouragement.value = await api.getEncouragement();
  }

  async function loadAll() {
    loading.value = true;
    try {
      await Promise.all([
        loadWeekly(),
        loadEncouragement(),
        loadPatterns(),
      ]);
    } finally {
      loading.value = false;
    }
  }

  return {
    weeklySummary, monthlySummary, patterns, encouragement, loading,
    loadWeekly, loadMonthly, loadPatterns, loadEncouragement, loadAll,
  };
});
