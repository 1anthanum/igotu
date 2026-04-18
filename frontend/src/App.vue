<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useMoodCheckIn } from '@/composables/useMoodCheckIn';
import AppHeader from '@/components/layout/AppHeader.vue';
import AmbientParticles from '@/components/effects/AmbientParticles.vue';
import GradientMesh from '@/components/effects/GradientMesh.vue';
import WelcomeModal from '@/components/onboarding/WelcomeModal.vue';
import MoodCheckIn from '@/components/mood/MoodCheckIn.vue';
import MoodThresholdPanel from '@/components/mood/MoodThresholdPanel.vue';
import DemoBanner from '@/components/demo/DemoBanner.vue';

const auth = useAuthStore();
const moodTheme = useMoodThemeStore();
const checkIn = useMoodCheckIn();
const showCheckIn = ref(false);

onMounted(() => {
  moodTheme.init();
  if (auth.isAuthenticated || auth.isDemo) {
    checkIn.initCheckIn();
    showCheckIn.value = checkIn.shouldShow.value;
  }
});

function onCheckInDone(score: number) {
  moodTheme.setMoodSmooth(score);
  showCheckIn.value = false;
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--bg-primary); color: var(--text-primary);">
    <!-- 背景视觉层 -->
    <AmbientParticles />
    <GradientMesh />

    <AppHeader v-if="auth.isAuthenticated" />
    <main class="max-w-2xl mx-auto px-4 pb-24 relative" style="z-index: 1;">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Onboarding -->
    <WelcomeModal v-if="auth.isAuthenticated" />

    <!-- Mood check-in overlay -->
    <MoodCheckIn v-if="showCheckIn" @done="onCheckInDone" />

    <!-- Threshold panel (right side) -->
    <MoodThresholdPanel v-if="(auth.isAuthenticated || auth.isDemo) && !showCheckIn" />

    <!-- Demo banner -->
    <DemoBanner v-if="auth.isDemo" />
  </div>
</template>
