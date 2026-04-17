import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '@/api/achievements';
import type { Achievement, AchievementTemplate, CalendarDay } from '@/types/achievement';

export const useAchievementStore = defineStore('achievements', () => {
  const templates = ref<AchievementTemplate[]>([]);
  const todayAchievements = ref<Achievement[]>([]);
  const todayCount = ref(0);
  const calendarData = ref<CalendarDay[]>([]);
  const loading = ref(false);
  const justLogged = ref(false); // For success animation

  async function loadTemplates() {
    templates.value = await api.getTemplates();
  }

  async function loadToday() {
    const result = await api.getTodayAchievements();
    todayAchievements.value = result.items;
    todayCount.value = result.count;
  }

  async function loadCalendar(days = 365) {
    calendarData.value = await api.getCalendarData(days);
  }

  /**
   * Quick-log: one-tap achievement recording
   * This is the most critical UX flow — must be instant
   */
  async function quickLog(template: AchievementTemplate) {
    loading.value = true;
    try {
      const achievement = await api.logAchievement({
        templateId: template.id,
        title: template.title,
        emoji: template.emoji || undefined,
        category: template.category,
      });

      // Optimistic update
      todayAchievements.value.unshift(achievement);
      todayCount.value++;

      // Trigger success animation
      justLogged.value = true;
      setTimeout(() => { justLogged.value = false; }, 1200);

      return achievement;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Log custom achievement
   */
  async function logCustom(data: {
    title: string;
    emoji?: string;
    category?: string;
    note?: string;
  }) {
    loading.value = true;
    try {
      const achievement = await api.logAchievement(data);
      todayAchievements.value.unshift(achievement);
      todayCount.value++;
      justLogged.value = true;
      setTimeout(() => { justLogged.value = false; }, 1200);
      return achievement;
    } finally {
      loading.value = false;
    }
  }

  async function removeAchievement(id: string) {
    await api.deleteAchievement(id);
    todayAchievements.value = todayAchievements.value.filter(a => a.id !== id);
    todayCount.value = Math.max(0, todayCount.value - 1);
  }

  return {
    templates, todayAchievements, todayCount, calendarData,
    loading, justLogged,
    loadTemplates, loadToday, loadCalendar,
    quickLog, logCustom, removeAchievement,
  };
});
