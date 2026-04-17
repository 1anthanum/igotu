<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useAchievementStore } from '@/stores/achievements';
import { useAnalyticsStore } from '@/stores/analytics';
import EncouragementCard from '@/components/encouragement/EncouragementCard.vue';
import AchievementCard from '@/components/achievements/AchievementCard.vue';
import HeatmapCalendar from '@/components/visualization/HeatmapCalendar.vue';
import QuickLogButton from '@/components/achievements/QuickLogButton.vue';

const achievements = useAchievementStore();
const analytics = useAnalyticsStore();

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 18) return '下午好';
  return '晚上好';
});

onMounted(async () => {
  await Promise.all([
    achievements.loadTemplates(),
    achievements.loadToday(),
    achievements.loadCalendar(),
    analytics.loadEncouragement(),
  ]);
});

async function handleDelete(id: string) {
  await achievements.removeAchievement(id);
  await analytics.loadEncouragement();
}
</script>

<template>
  <div class="pt-6 space-y-6">
    <!-- Greeting -->
    <div class="mood-gradient-bg rounded-2xl px-6 py-5 animate-float-in">
      <p class="text-xs mb-1" style="color: var(--text-muted);">{{ greeting }}</p>
      <h1 class="text-xl font-medium" style="color: var(--text-primary);">
        你今天还好吗？
      </h1>
    </div>

    <!-- Bio divider -->
    <div class="bio-divider" />

    <!-- Quick tools -->
    <div class="grid grid-cols-3 gap-3 animate-float-in" style="animation-delay: 0.1s;">
      <router-link
        v-for="tool in [
          { to: '/toolbox/breathing', icon: '🍃', label: '呼吸空间' },
          { to: '/chat', icon: '💭', label: '和伙伴聊聊' },
          { to: '/mood', icon: '🌿', label: '记录感受' },
        ]"
        :key="tool.to"
        :to="tool.to"
        class="card flex flex-col items-center gap-2 py-4 text-center cursor-pointer"
      >
        <span class="text-xl">{{ tool.icon }}</span>
        <span class="text-xs" style="color: var(--text-secondary);">{{ tool.label }}</span>
      </router-link>
    </div>

    <!-- Encouragement -->
    <EncouragementCard :messages="analytics.encouragement" />

    <!-- Today's seeds -->
    <div class="card animate-float-in" style="animation-delay: 0.15s;">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-medium" style="color: var(--text-primary);">
          🌱 今日种下的种子
          <span v-if="achievements.todayCount > 0" class="ml-1" style="color: var(--mood-accent);">
            {{ achievements.todayCount }}
          </span>
        </h2>
      </div>

      <div v-if="achievements.todayAchievements.length > 0" class="space-y-2">
        <AchievementCard
          v-for="item in achievements.todayAchievements"
          :key="item.id"
          :achievement="item"
          @delete="handleDelete"
        />
      </div>

      <div v-else class="text-center py-8">
        <div class="text-3xl mb-2">🌱</div>
        <p class="text-sm" style="color: var(--text-secondary);">
          点击右下角的 ✨ 种下第一颗种子
        </p>
        <p class="text-xs mt-1" style="color: var(--text-muted);">
          每一个微小的行动都在让你的花园生长
        </p>
      </div>
    </div>

    <!-- Heatmap -->
    <HeatmapCalendar :data="achievements.calendarData" />

    <!-- Quick log FAB -->
    <QuickLogButton />
  </div>
</template>
