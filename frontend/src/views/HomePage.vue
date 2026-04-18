<script setup lang="ts">
/**
 * HomePage v2 — 治疗间隙的每日陪伴
 *
 * 设计原则：
 * - mood ≤ 2：Sanctuary 模式（全屏树 + 被动陪伴，无任务推送）
 * - mood 3-5：正常模式（精简布局，引导卡片 + 工具 + 记录）
 *
 * "什么都不做"不是文字选项，而是视觉上的默认体验。
 */
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAchievementStore } from '@/stores/achievements';
import { useAnalyticsStore } from '@/stores/analytics';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useMoodCheckIn } from '@/composables/useMoodCheckIn';
import EncouragementCard from '@/components/encouragement/EncouragementCard.vue';
import AchievementCard from '@/components/achievements/AchievementCard.vue';
import HeatmapCalendar from '@/components/visualization/HeatmapCalendar.vue';
import GuideTooltip from '@/components/onboarding/GuideTooltip.vue';
import QuickLogButton from '@/components/achievements/QuickLogButton.vue';
import MoodGuidance from '@/components/mood/MoodGuidance.vue';
import SanctuaryView from '@/components/sanctuary/SanctuaryView.vue';

const router = useRouter();
const achievements = useAchievementStore();
const analytics = useAnalyticsStore();
const moodTheme = useMoodThemeStore();
const moodCheckIn = useMoodCheckIn();

function onGuidanceTaskDone(label: string) {
  const newScore = moodCheckIn.boostMood(moodTheme.currentMood, label);
  moodTheme.setMoodSmooth(newScore);
}

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 18) return '下午好';
  return '晚上好';
});

const mainGreeting = computed(() => {
  if (moodTheme.isLowEnergy) return '你来了就好。';
  return '你今天还好吗？';
});

/** Normal mode: quick tools */
const quickTools = computed(() => [
  { to: '/toolbox/breathing', icon: '🍃', label: '呼吸空间' },
  { to: '/chat', icon: '💭', label: '和伙伴聊聊' },
  { to: '/mood', icon: '🌿', label: '记录感受' },
]);

const emptyHint = computed(() => {
  return '点击右下角的 ✨ 种下第一颗种子';
});

const emptySubHint = computed(() => {
  return '每一个微小的行动都在让你的花园生长';
});

onMounted(async () => {
  await Promise.all([
    achievements.loadTemplates(),
    achievements.loadToday(),
    achievements.loadCalendar(),
    analytics.loadEncouragement(),
  ]);

  // Check if returning from a guided task → boost mood
  const pendingTask = sessionStorage.getItem('igotu_guidance_task');
  if (pendingTask) {
    sessionStorage.removeItem('igotu_guidance_task');
    onGuidanceTaskDone(pendingTask);
  }
});

async function handleDelete(id: string) {
  await achievements.removeAchievement(id);
  await analytics.loadEncouragement();
}

/** Sanctuary mode emits */
function onSanctuaryChat() {
  router.push('/chat');
}
function onSanctuaryBreathe() {
  router.push('/toolbox/breathing');
}
</script>

<template>
  <div class="pt-6">
    <!--
      ═══════════════════════════════════════════
      SANCTUARY MODE (mood ≤ 2)
      全屏被动陪伴，不推送任何任务
      ═══════════════════════════════════════════
    -->
    <template v-if="moodTheme.isLowEnergy">
      <SanctuaryView
        @want-chat="onSanctuaryChat"
        @want-breathe="onSanctuaryBreathe"
      />
    </template>

    <!--
      ═══════════════════════════════════════════
      NORMAL MODE (mood 3-5)
      精简布局：问候 → 引导 → 工具 → 记录
      ═══════════════════════════════════════════
    -->
    <template v-else>
      <div class="space-y-6">
        <!-- Greeting -->
        <div class="mood-gradient-bg rounded-2xl px-6 py-5 animate-float-in">
          <p class="text-xs mb-1" style="color: var(--text-muted);">{{ greeting }}</p>
          <h1 class="text-xl font-medium" style="color: var(--text-primary);">
            {{ mainGreeting }}
          </h1>
        </div>

        <!-- Mood guidance cards (only for mood 3+) -->
        <MoodGuidance @task-done="onGuidanceTaskDone" />

        <!-- Bio divider -->
        <div class="bio-divider" />

        <!-- Quick tools -->
        <div
          id="home-quick-tools"
          class="grid gap-3 grid-cols-3 animate-float-in"
          style="animation-delay: 0.1s;"
        >
          <router-link
            v-for="tool in quickTools"
            :key="tool.to"
            :to="tool.to"
            class="card flex flex-col items-center gap-2 text-center cursor-pointer py-4"
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
              {{ emptyHint }}
            </p>
            <p class="text-xs mt-1" style="color: var(--text-muted);">
              {{ emptySubHint }}
            </p>
          </div>
        </div>

        <!-- Heatmap -->
        <HeatmapCalendar :data="achievements.calendarData" />

        <!-- Quick log FAB -->
        <QuickLogButton />

        <!-- Onboarding tooltip -->
        <GuideTooltip
          tip-id="home-tools"
          title="快捷工具"
          description="这些是你最常用的工具，可以快速访问。"
          target-selector="#home-quick-tools"
          position="bottom"
        />
      </div>
    </template>
  </div>
</template>
