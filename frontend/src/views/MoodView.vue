<script setup lang="ts">
import { onMounted } from 'vue';
import { useMoodStore } from '@/stores/mood';
import MoodPicker from '@/components/mood/MoodPicker.vue';
import MoodHistory from '@/components/mood/MoodHistory.vue';

const moodStore = useMoodStore();

onMounted(async () => {
  await Promise.all([
    moodStore.fetchToday(),
    moodStore.fetchTrend(30),
  ]);
});
</script>

<template>
  <div class="py-6 space-y-6">
    <div class="animate-float-in">
      <h1 class="text-xl font-semibold" style="color: var(--text-primary);">🌿 情绪花园</h1>
      <p class="text-sm mt-1" style="color: var(--text-secondary);">每一次记录，都是在花园里种下一颗种子</p>
    </div>

    <MoodPicker />

    <MoodHistory
      :entries="moodStore.trendData"
      :today-entries="moodStore.todayEntries"
    />
  </div>
</template>
