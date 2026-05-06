<script setup lang="ts">
/**
 * BreathingMinimal — Layer 1 感官通道：简化呼吸引导
 *
 * 从 BreathingExercise 中抽取核心动画逻辑，去掉：
 * - 文字计时器
 * - 技巧选择 UI
 * - 循环计数
 * - 完成页面 / 庆祝效果
 *
 * 只保留：
 * - 一个呼吸圆（膨胀 = 吸气，收缩 = 呼气）
 * - 柔和 glow + 粒子
 * - 可选震动节律
 * - 自动无限循环（用户点击或离开时停止）
 *
 * 使用最简单的 4-6 节律（吸 4s, 呼 6s）
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const moodTheme = useMoodThemeStore();

// ── 呼吸参数 ──
const INHALE_DURATION = 4000; // ms
const EXHALE_DURATION = 6000; // ms
const CYCLE_DURATION = INHALE_DURATION + EXHALE_DURATION;

// ── 状态 ──
const isActive = ref(false);
const smoothProgress = ref(0); // 0-1 within current phase
const phase = ref<'inhale' | 'exhale'>('inhale');

let rafId: number | null = null;
let cycleStartTime = 0;

// ── 震动支持检测 ──
const hasVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator;
let lastVibratePhase: string | null = null;

// ── 计算视觉状态 ──
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

const circleScale = computed(() => {
  if (!isActive.value) return 0.65;
  const p = easeInOutSine(smoothProgress.value);
  if (phase.value === 'inhale') return 0.6 + 0.4 * p;
  return 1.0 - 0.4 * p;
});

const glowIntensity = computed(() => {
  if (!isActive.value) return 0.2;
  return 0.2 + 0.6 * ((circleScale.value - 0.6) / 0.4);
});

// ── 粒子 ──
const PARTICLE_COUNT = 8;
const animTime = ref(0);
const particles = computed(() => {
  const scale = circleScale.value;
  const radius = 100 * scale;
  const time = animTime.value;
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + time * 0.5;
    const wobble = Math.sin(time * 1.5 + i) * 4;
    return {
      x: Math.cos(angle) * (radius + wobble),
      y: Math.sin(angle) * (radius + wobble),
      opacity: 0.2 + 0.4 * ((Math.sin(time * 2 + i * 0.9) + 1) / 2),
      size: 2 + 1.5 * Math.sin(time * 2 + i),
    };
  });
});

// ── 动画循环 ──
function tick(now: number) {
  if (!isActive.value) return;

  const elapsed = (now - cycleStartTime) % CYCLE_DURATION;
  animTime.value = now / 3000;

  if (elapsed < INHALE_DURATION) {
    phase.value = 'inhale';
    smoothProgress.value = elapsed / INHALE_DURATION;
  } else {
    phase.value = 'exhale';
    smoothProgress.value = (elapsed - INHALE_DURATION) / EXHALE_DURATION;
  }

  // 震动：呼气时短脉冲，每个呼气阶段只触发一次
  if (hasVibration && phase.value === 'exhale' && lastVibratePhase !== 'exhale') {
    try {
      navigator.vibrate([50, 100, 50, 100, 50]); // 3 短脉冲
    } catch { /* silent */ }
  }
  lastVibratePhase = phase.value;

  rafId = requestAnimationFrame(tick);
}

function start() {
  isActive.value = true;
  cycleStartTime = performance.now();
  phase.value = 'inhale';
  smoothProgress.value = 0;
  lastVibratePhase = null;
  rafId = requestAnimationFrame(tick);
}

function stop() {
  isActive.value = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (hasVibration) {
    try { navigator.vibrate(0); } catch { /* silent */ }
  }
}

function toggle() {
  if (isActive.value) {
    stop();
  } else {
    start();
  }
}

// ── 自动启动（Layer 1 不需要点击"开始"按钮） ──
onMounted(() => {
  // 延迟 800ms 后自动启动，给 DOM 一个入场时间
  setTimeout(() => {
    if (!isActive.value) start();
  }, 800);
});

onUnmounted(() => {
  stop();
});
</script>

<template>
  <div class="breathing-minimal" @click="toggle">
    <!-- Ambient glow -->
    <div
      class="bm-glow"
      :style="{
        transform: `scale(${circleScale * 2})`,
        opacity: glowIntensity * 0.3,
        background: `radial-gradient(circle, ${moodTheme.palette.glow}, transparent 70%)`,
      }"
    />

    <!-- Particle ring -->
    <div class="bm-particles">
      <div
        v-for="(p, i) in particles"
        :key="i"
        class="bm-particle"
        :style="{
          transform: `translate(${p.x}px, ${p.y}px)`,
          opacity: p.opacity,
          width: `${p.size}px`,
          height: `${p.size}px`,
          background: moodTheme.palette.accent,
          boxShadow: `0 0 ${p.size * 3}px ${moodTheme.palette.glow}`,
        }"
      />
    </div>

    <!-- 主呼吸圆 — 无文字，纯视觉 -->
    <div
      class="bm-circle"
      :style="{
        transform: `scale(${circleScale})`,
        borderColor: moodTheme.palette.accent,
        boxShadow: `
          0 0 ${30 + glowIntensity * 40}px ${moodTheme.palette.glow},
          0 0 ${60 + glowIntensity * 60}px ${moodTheme.palette.glow},
          inset 0 0 ${20 + glowIntensity * 30}px ${moodTheme.palette.glow}
        `,
      }"
    />
  </div>
</template>

<style scoped>
.breathing-minimal {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

/* ── Glow ── */
.bm-glow {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  pointer-events: none;
  will-change: transform, opacity;
}

/* ── Main circle ── */
.bm-circle {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 2px solid;
  background: rgba(100, 220, 180, 0.02);
  will-change: transform, box-shadow;
}

/* ── Particles ── */
.bm-particles {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
}
.bm-particle {
  position: absolute;
  border-radius: 50%;
  will-change: transform, opacity;
}

/* ── Low energy ── */
:global(body.low-energy) .bm-particle {
  display: none;
}
:global(body.low-energy) .bm-glow {
  display: none;
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .bm-circle,
  .bm-glow,
  .bm-particle {
    transition: none !important;
    animation: none !important;
  }
}
</style>
