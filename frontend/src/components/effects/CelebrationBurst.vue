<script setup lang="ts">
/**
 * CelebrationBurst — 成就庆祝微动效
 *
 * 用法：
 *   <CelebrationBurst ref="celebRef" />
 *   celebRef.value?.fire()          // 默认 emoji 爆发
 *   celebRef.value?.fire('🌿')     // 指定 emoji
 *
 * 在完成呼吸练习、PHQ9、认知重构等任务时触发。
 * 低能量模式下 → 只显示柔和的单次脉冲光晕（无粒子）。
 * prefers-reduced-motion → 完全静默。
 */
import { ref } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const moodTheme = useMoodThemeStore();
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Spark {
  id: number;
  emoji: string;
  x: number;
  y: number;
  angle: number;
  distance: number;
  delay: number;
}

const sparks = ref<Spark[]>([]);
const showGlow = ref(false);
let sparkId = 0;

function fire(emoji = '✨') {
  if (prefersReducedMotion) return;

  // Low-energy: soft center glow only
  if (moodTheme.isLowEnergy) {
    showGlow.value = true;
    setTimeout(() => { showGlow.value = false; }, 1500);
    return;
  }

  showGlow.value = true;
  const count = 8;
  const newSparks: Spark[] = [];

  for (let i = 0; i < count; i++) {
    newSparks.push({
      id: ++sparkId,
      emoji,
      x: 50,
      y: 50,
      angle: (360 / count) * i + (Math.random() - 0.5) * 30,
      distance: 60 + Math.random() * 40,
      delay: Math.random() * 150,
    });
  }

  sparks.value = newSparks;
  setTimeout(() => { sparks.value = []; showGlow.value = false; }, 1200);
}

defineExpose({ fire });
</script>

<template>
  <div class="celebration-container" aria-hidden="true">
    <!-- Center glow pulse -->
    <div
      v-if="showGlow"
      class="center-glow"
      :style="{ background: `radial-gradient(circle, ${moodTheme.palette.accent}20, transparent 70%)` }"
    />

    <!-- Emoji sparks -->
    <span
      v-for="s in sparks"
      :key="s.id"
      class="spark"
      :style="{
        '--angle': s.angle + 'deg',
        '--distance': s.distance + 'px',
        animationDelay: s.delay + 'ms',
      }"
    >{{ s.emoji }}</span>
  </div>
</template>

<style scoped>
.celebration-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 200;
  width: 0;
  height: 0;
}

.center-glow {
  position: absolute;
  width: 300px;
  height: 300px;
  top: -150px;
  left: -150px;
  border-radius: 50%;
  animation: glow-pulse 1.2s ease-out forwards;
}

@keyframes glow-pulse {
  0%   { opacity: 0; transform: scale(0.5); }
  30%  { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.3); }
}

.spark {
  position: absolute;
  font-size: 1.25rem;
  animation: spark-fly 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}

@keyframes spark-fly {
  0%   { transform: translate(0, 0) scale(0); opacity: 1; }
  60%  { opacity: 1; }
  100% {
    transform:
      translate(
        calc(cos(var(--angle)) * var(--distance)),
        calc(sin(var(--angle)) * var(--distance))
      )
      scale(1);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .center-glow, .spark { animation: none !important; display: none; }
}
</style>
