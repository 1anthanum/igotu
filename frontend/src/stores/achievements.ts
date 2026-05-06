import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '@/api/achievements';
import type { Achievement, AchievementTemplate, CalendarDay } from '@/types/achievement';

/** Preset templates — used in demo mode or when API fails */
const FALLBACK_TEMPLATES: AchievementTemplate[] = [
  { id: 'tpl-breathe', title: '深呼吸', emoji: '🍃', category: 'selfcare', sort_order: 0, is_active: true },
  { id: 'tpl-walk', title: '散步', emoji: '🚶', category: 'movement', sort_order: 1, is_active: true },
  { id: 'tpl-journal', title: '写日记', emoji: '📝', category: 'reflection', sort_order: 2, is_active: true },
  { id: 'tpl-water', title: '喝水', emoji: '💧', category: 'selfcare', sort_order: 3, is_active: true },
  { id: 'tpl-sleep', title: '早睡', emoji: '🌙', category: 'selfcare', sort_order: 4, is_active: true },
  { id: 'tpl-talk', title: '和人聊天', emoji: '💬', category: 'social', sort_order: 5, is_active: true },
  { id: 'tpl-cook', title: '做饭', emoji: '🍳', category: 'selfcare', sort_order: 6, is_active: true },
  { id: 'tpl-music', title: '听音乐', emoji: '🎵', category: 'comfort', sort_order: 7, is_active: true },
  { id: 'tpl-stretch', title: '拉伸', emoji: '🧘', category: 'movement', sort_order: 8, is_active: true },
];

export const useAchievementStore = defineStore('achievements', () => {
  const templates = ref<AchievementTemplate[]>([]);
  const todayAchievements = ref<Achievement[]>([]);
  const todayCount = ref(0);
  const calendarData = ref<CalendarDay[]>([]);
  const loading = ref(false);
  const justLogged = ref(false); // For success animation

  async function loadTemplates() {
    try {
      const result = await api.getTemplates();
      templates.value = result && result.length > 0 ? result : FALLBACK_TEMPLATES;
    } catch {
      templates.value = FALLBACK_TEMPLATES;
    }
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
      let achievement: Achievement;
      try {
        achievement = await api.logAchievement({
          templateId: template.id,
          title: template.title,
          emoji: template.emoji || undefined,
          category: template.category,
        });
      } catch {
        // Demo/offline mode: create local-only achievement
        achievement = {
          id: `local-${Date.now()}`,
          title: template.title,
          emoji: template.emoji || '✨',
          category: template.category || 'custom',
          note: null,
          recorded_date: new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
        };
      }

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
      let achievement: Achievement;
      try {
        achievement = await api.logAchievement(data);
      } catch {
        // Demo/offline mode: create local-only achievement
        achievement = {
          id: `local-${Date.now()}`,
          title: data.title,
          emoji: data.emoji || '✨',
          category: data.category || 'custom',
          note: data.note || null,
          recorded_date: new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
        };
      }
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
