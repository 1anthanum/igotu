<script setup lang="ts">
import { computed } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const moodTheme = useMoodThemeStore();

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const orbStyle1 = computed(() => ({
  background: `radial-gradient(circle, ${moodTheme.palette.accent}08, transparent 70%)`,
  animationDuration: prefersReducedMotion || moodTheme.isLowEnergy ? '0s' : '25s',
}));

const orbStyle2 = computed(() => ({
  background: `radial-gradient(circle, ${moodTheme.palette.accent}05, transparent 70%)`,
  animationDuration: prefersReducedMotion || moodTheme.isLowEnergy ? '0s' : '30s',
}));

const orbStyle3 = computed(() => ({
  background: `radial-gradient(circle, ${moodTheme.palette.accent}04, transparent 70%)`,
  animationDuration: prefersReducedMotion || moodTheme.isLowEnergy ? '0s' : '20s',
}));
</script>

<template>
  <div class="fixed inset-0 pointer-events-none overflow-hidden" style="z-index: 0;">
    <!-- Orb 1: top-left, large -->
    <div
      class="gradient-orb orb-1"
      :style="orbStyle1"
    />
    <!-- Orb 2: bottom-right, medium -->
    <div
      class="gradient-orb orb-2"
      :style="orbStyle2"
    />
    <!-- Orb 3: center, small -->
    <div
      class="gradient-orb orb-3"
      :style="orbStyle3"
    />
  </div>
</template>

<style scoped>
.gradient-orb {
  position: absolute;
  border-radius: 50%;
  transition: background 2.5s ease;
}

.orb-1 {
  width: 600px;
  height: 600px;
  top: -200px;
  left: -150px;
  animation: drift-1 25s ease-in-out infinite alternate;
}

.orb-2 {
  width: 500px;
  height: 500px;
  bottom: -150px;
  right: -100px;
  animation: drift-2 30s ease-in-out infinite alternate;
}

.orb-3 {
  width: 400px;
  height: 400px;
  top: 40%;
  left: 30%;
  animation: drift-3 20s ease-in-out infinite alternate;
}

@keyframes drift-1 {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(60px, 40px) scale(1.05); }
  100% { transform: translate(-30px, 80px) scale(0.95); }
}

@keyframes drift-2 {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-50px, -30px) scale(1.08); }
  100% { transform: translate(40px, -60px) scale(0.97); }
}

@keyframes drift-3 {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -50px) scale(1.1); }
  100% { transform: translate(-40px, 30px) scale(0.93); }
}

@media (prefers-reduced-motion: reduce) {
  .gradient-orb { animation: none !important; }
}
</style>
