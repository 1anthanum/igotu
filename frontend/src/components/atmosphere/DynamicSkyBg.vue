<script setup lang="ts">
/**
 * DynamicSkyBg — 动态天空背景层
 *
 * 作为全局背景层使用，放在 App.vue 最底层。
 * 融合 时间（日夜循环） + 情绪（天气粒子） 创造活的背景。
 *
 * 视觉元素：
 * - 基底渐变：时间段 + 情绪色温调整
 * - 氛围粒子：星星（夜间）、云雾（低情绪）、光斑（高情绪）
 * - 天际线微光：模拟自然光线的渐变条
 */
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useDynamicSky } from '@/composables/useDynamicSky';

const moodTheme = useMoodThemeStore();
const { skyState } = useDynamicSky(() => moodTheme.currentMood);

// ── Stars (static, generated once at module level) ──
const STARS = Array.from({ length: 25 }, (_, i) => ({
  id: `star-${i}`,
  x: (i * 37 + 13) % 100,
  y: (i * 23 + 7) % 60,
  size: 1 + (i % 3) * 0.5,
  delay: (i * 0.4) % 5,
}));

const showStars = computed(() => {
  const phase = skyState.value.phase;
  return phase === 'deepNight' || phase === 'night' || phase === 'evening';
});

const showClouds = computed(() => {
  const w = skyState.value.weather;
  return w === 'storm' || w === 'fog' || w === 'overcast';
});

const showSunGlow = computed(() => {
  const w = skyState.value.weather;
  const phase = skyState.value.phase;
  return (w === 'sunny' || w === 'clear') && (phase === 'morning' || phase === 'day' || phase === 'dusk');
});

const cloudCount = computed(() => {
  if (skyState.value.weather === 'storm') return 5;
  if (skyState.value.weather === 'fog') return 4;
  return 3;
});

// Stars are static — no onMounted needed for generation
</script>

<template>
  <div class="dynamic-sky" :style="{ background: skyState.gradient }">
    <!-- Stars layer (night) -->
    <div v-if="showStars" class="sky-stars">
      <span
        v-for="star in STARS"
        :key="star.id"
        class="star"
        :style="{
          left: star.x + '%',
          top: star.y + '%',
          width: star.size + 'px',
          height: star.size + 'px',
          animationDelay: star.delay + 's',
        }"
      />
    </div>

    <!-- Cloud/fog layer (low mood) -->
    <div v-if="showClouds" class="sky-clouds">
      <div
        v-for="i in cloudCount"
        :key="'cloud-' + i"
        class="cloud"
        :style="{
          top: (10 + i * 15) + '%',
          left: ((i * 30 + 10) % 80) + '%',
          opacity: skyState.particleOpacity,
          animationDelay: (i * 2.5) + 's',
          width: (80 + i * 25) + 'px',
          height: (20 + i * 8) + 'px',
        }"
      />
    </div>

    <!-- Sun glow (high mood, daytime) -->
    <div v-if="showSunGlow" class="sky-sun-glow" :style="{
      background: `radial-gradient(ellipse at 70% 10%, ${skyState.ambientColor} 0%, transparent 60%)`,
      opacity: skyState.ambientIntensity * 0.4,
    }" />

    <!-- Horizon ambient light -->
    <div
      class="sky-horizon"
      :style="{
        background: `linear-gradient(0deg, ${skyState.ambientColor} 0%, transparent 100%)`,
        opacity: skyState.ambientIntensity * 0.12,
      }"
    />
  </div>
</template>

<style scoped>
.dynamic-sky {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  transition: background 3s ease;
  overflow: hidden;
}

/* ── Stars ── */
.sky-stars {
  position: absolute;
  inset: 0;
  animation: stars-fade-in 2s ease forwards;
}
.star {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  animation: star-twinkle 4s ease-in-out infinite alternate;
}
@keyframes star-twinkle {
  0% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 0.9; transform: scale(1.2); }
  100% { opacity: 0.4; transform: scale(0.9); }
}
@keyframes stars-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ── Clouds ── */
.sky-clouds {
  position: absolute;
  inset: 0;
}
.cloud {
  position: absolute;
  border-radius: 50%;
  background: rgba(180, 190, 210, 0.15);
  filter: blur(20px);
  animation: cloud-drift 25s ease-in-out infinite alternate;
}
@keyframes cloud-drift {
  0% { transform: translateX(0) translateY(0); }
  50% { transform: translateX(30px) translateY(-5px); }
  100% { transform: translateX(-20px) translateY(3px); }
}

/* ── Sun glow ── */
.sky-sun-glow {
  position: absolute;
  inset: 0;
  transition: opacity 3s ease;
}

/* ── Horizon ── */
.sky-horizon {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30%;
  transition: opacity 3s ease, background 3s ease;
}

@media (prefers-reduced-motion: reduce) {
  .star { animation: none !important; opacity: 0.5; }
  .cloud { animation: none !important; }
  .dynamic-sky { transition: none !important; }
}
</style>
