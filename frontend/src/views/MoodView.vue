<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useMoodStore } from '@/stores/mood';
import { useMoodInsights } from '@/composables/useMoodInsights';
import MoodPicker from '@/components/mood/MoodPicker.vue';
import MoodHistory from '@/components/mood/MoodHistory.vue';
import EmotionScatter from '@/components/visualization/EmotionScatter.vue';

const moodStore = useMoodStore();
const moodInsights = useMoodInsights();

onMounted(async () => {
  await Promise.all([
    moodStore.fetchToday(),
    moodStore.fetchTrend(30),
  ]);
  moodInsights.syncToPersistent();
});

/** Extract scatter data from persisted log */
const scatterData = computed(() => {
  try {
    const raw = localStorage.getItem('igotu_mood_log');
    if (!raw) return [];
    const entries = JSON.parse(raw) as Array<{ emotion?: { valence: number; arousal: number }; timestamp: number }>;
    return entries
      .filter(e => e.emotion)
      .map(e => ({
        valence: e.emotion!.valence,
        arousal: e.emotion!.arousal,
        timestamp: e.timestamp,
      }));
  } catch { return []; }
});
</script>

<template>
  <div class="py-6 space-y-6">
    <div class="animate-float-in">
      <h1 class="text-heading" style="color: var(--text-primary);">🌿 情绪花园</h1>
      <p class="text-caption mt-1">每一次记录，都是在花园里种下一颗种子</p>
    </div>

    <MoodPicker />

    <!-- 2D Emotion Scatter Plot -->
    <EmotionScatter :data="scatterData" />

    <MoodHistory
      :entries="moodStore.trendData"
      :today-entries="moodStore.todayEntries"
    />
  </div>
</template>
