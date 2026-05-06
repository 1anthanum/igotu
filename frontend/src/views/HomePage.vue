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
import { useI18n } from '@/i18n';
import { useAchievementStore } from '@/stores/achievements';
import { useAnalyticsStore } from '@/stores/analytics';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useMoodCheckIn } from '@/composables/useMoodCheckIn';
import { useMoodInsights } from '@/composables/useMoodInsights';
import { useCrisisTracker } from '@/composables/useCrisisTracker';
import NextDayCheckIn from '@/components/mood/NextDayCheckIn.vue';
import EncouragementCard from '@/components/encouragement/EncouragementCard.vue';
import AchievementCard from '@/components/achievements/AchievementCard.vue';
import HeatmapCalendar from '@/components/visualization/HeatmapCalendar.vue';
import GuideTooltip from '@/components/onboarding/GuideTooltip.vue';
import QuickLogButton from '@/components/achievements/QuickLogButton.vue';
import MoodGuidance from '@/components/mood/MoodGuidance.vue';
import SanctuaryView from '@/components/sanctuary/SanctuaryView.vue';
import EmotionPulse from '@/components/mood/EmotionPulse.vue';
import InsightCards from '@/components/mood/InsightCards.vue';
import WeeklyDigest from '@/components/mood/WeeklyDigest.vue';
import DayTimeline from '@/components/visualization/DayTimeline.vue';

const router = useRouter();
const { t } = useI18n();
const achievements = useAchievementStore();
const analytics = useAnalyticsStore();
const moodTheme = useMoodThemeStore();
const moodCheckIn = useMoodCheckIn();
const moodInsights = useMoodInsights();
const crisisTracker = useCrisisTracker();

function onGuidanceTaskDone(label: string) {
  const newScore = moodCheckIn.boostMood(moodTheme.currentMood, label);
  moodTheme.setMoodSmooth(newScore);
}

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return t('home.nightGreeting');
  if (h < 12) return t('home.morningGreeting');
  if (h < 18) return t('home.afternoonGreeting');
  return t('home.eveningGreeting');
});

const mainGreeting = computed(() => {
  if (moodTheme.isLowEnergy) return t('home.mainGreetingLow');
  return t('home.mainGreetingNormal');
});

/** Normal mode: quick tools */
const quickTools = computed(() => [
  { to: '/toolbox/breathing', icon: '🍃', label: t('home.toolBreathe') },
  { to: '/chat', icon: '💭', label: t('home.toolChat') },
  { to: '/mood', icon: '🌿', label: t('home.toolMood') },
]);

const emptyHint = computed(() => {
  return t('home.emptyHint');
});

const emptySubHint = computed(() => {
  return t('home.emptySubHint');
});

onMounted(async () => {
  await Promise.all([
    achievements.loadTemplates(),
    achievements.loadToday(),
    achievements.loadCalendar(),
    analytics.loadEncouragement(),
  ]);

  // Sync mood data for insights
  moodInsights.syncToPersistent();

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
function onSanctuaryUpdateMood() {
  // Gently bump mood to 3 to exit Sanctuary → normal mode
  moodTheme.setMoodSmooth(3);
}
</script>

<template>
  <div class="pt-6">
    <!-- Layer 2: 次日关怀签到（有待跟进标记时显示） -->
    <NextDayCheckIn
      @done="(mood) => moodTheme.setMoodSmooth(mood)"
      @dismiss="() => {}"
    />

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
        @update-mood="onSanctuaryUpdateMood"
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
        <div class="mood-gradient-bg rounded-2xl px-6 py-8 animate-float-in">
          <p class="text-micro mb-2">{{ greeting }}</p>
          <h1 class="text-display" style="color: var(--text-primary);">
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
            <span class="text-2xl">{{ tool.icon }}</span>
            <span class="text-caption">{{ tool.label }}</span>
          </router-link>
        </div>

        <!-- Emotion insights -->
        <InsightCards />

        <!-- Weekly Digest (collapsible) -->
        <WeeklyDigest />

        <!-- Encouragement -->
        <EncouragementCard :messages="analytics.encouragement" />

        <!-- Today's seeds -->
        <div class="card animate-float-in" style="animation-delay: 0.15s;">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-section" style="color: var(--text-primary);">
              🌱 {{ t('home.todaySeeds') }}
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

        <!-- Day Timeline -->
        <DayTimeline />

        <!-- Heatmap -->
        <HeatmapCalendar :data="achievements.calendarData" />

        <!-- Quick log FAB -->
        <QuickLogButton />

        <!-- Emotion pulse FAB -->
        <EmotionPulse />

        <!-- Onboarding tooltip -->
        <GuideTooltip
          tip-id="home-tools"
          :title="t('home.tooltipTitle')"
          :description="t('home.tooltipDesc')"
          target-selector="#home-quick-tools"
          position="bottom"
        />
      </div>
    </template>
  </div>
</template>
