import { defineStore } from 'pinia';
import { ref } from 'vue';
import { logMood, getTodayMoods, getMoodTrend, type MoodEntry } from '@/api/mood';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

export const useMoodStore = defineStore('mood', () => {
  const todayEntries = ref<MoodEntry[]>([]);
  const trendData = ref<MoodEntry[]>([]);
  const loading = ref(false);
  const justLogged = ref(false);

  async function log(data: { mood_score: number; mood_emoji: string; mood_label: string; note?: string }) {
    const entry = await logMood(data);
    todayEntries.value.unshift(entry);

    // Update the global mood theme to reflect new mood
    const moodTheme = useMoodThemeStore();
    moodTheme.setMood(data.mood_score);

    justLogged.value = true;
    setTimeout(() => { justLogged.value = false; }, 2000);
    return entry;
  }

  async function fetchToday() {
    todayEntries.value = await getTodayMoods();
  }

  async function fetchTrend(days = 30) {
    loading.value = true;
    try {
      trendData.value = await getMoodTrend(days);
    } finally {
      loading.value = false;
    }
  }

  return { todayEntries, trendData, loading, justLogged, log, fetchToday, fetchTrend };
});
