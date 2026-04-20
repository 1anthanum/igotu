<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useExerciseTracker } from '@/composables/useExerciseTracker';
import { useI18n } from '@/i18n';
import CelebrationBurst from '@/components/effects/CelebrationBurst.vue';

const router = useRouter();
const moodTheme = useMoodThemeStore();
const exerciseTracker = useExerciseTracker();
const { t } = useI18n();

const celebRef = ref<InstanceType<typeof CelebrationBurst> | null>(null);

const techniques = computed(() => [
  {
    name: t('breathing.techniques.box.name'),
    desc: t('breathing.techniques.box.desc'),
    icon: '◻️',
    phases: [
      { label: t('breathing.phases.inhale'), duration: 4, instruction: t('breathing.instructions.inhaleNose'), type: 'inhale' as const },
      { label: t('breathing.phases.hold'), duration: 4, instruction: t('breathing.instructions.holdGently'), type: 'hold' as const },
      { label: t('breathing.phases.exhale'), duration: 4, instruction: t('breathing.instructions.exhaleMouth'), type: 'exhale' as const },
      { label: t('breathing.phases.hold'), duration: 4, instruction: t('breathing.instructions.holdNatural'), type: 'hold' as const },
    ],
  },
  {
    name: t('breathing.techniques.relaxing.name'),
    desc: t('breathing.techniques.relaxing.desc'),
    icon: '🌙',
    phases: [
      { label: t('breathing.phases.inhale'), duration: 4, instruction: t('breathing.instructions.inhale4'), type: 'inhale' as const },
      { label: t('breathing.phases.hold'), duration: 7, instruction: t('breathing.instructions.hold7'), type: 'hold' as const },
      { label: t('breathing.phases.exhale'), duration: 8, instruction: t('breathing.instructions.exhale8'), type: 'exhale' as const },
    ],
  },
  {
    name: t('breathing.techniques.simple.name'),
    desc: t('breathing.techniques.simple.desc'),
    icon: '🍃',
    phases: [
      { label: t('breathing.phases.inhale'), duration: 4, instruction: t('breathing.instructions.inhaleSlowly'), type: 'inhale' as const },
      { label: t('breathing.phases.exhale'), duration: 6, instruction: t('breathing.instructions.exhaleSlowly'), type: 'exhale' as const },
    ],
  },
]);

const selectedTech = ref(0);
const targetCycles = ref(3);
const isActive = ref(false);
const isDone = ref(false);
const showFullConfig = ref(false);
const currentCycle = ref(0);
const currentPhaseIndex = ref(0);
const countdown = ref(0);

// ── Smooth animation state (rAF-driven) ──
const smoothProgress = ref(0);       // 0→1 within current phase
const rippleActive = ref(false);     // ripple on phase transition
const rippleKey = ref(0);            // force re-render ripple
let rafId: number | null = null;
let phaseStartTime = 0;
let phaseDuration = 0;               // in ms

const technique = computed(() => techniques.value[selectedTech.value]);
const currentPhase = computed(() => technique.value.phases[currentPhaseIndex.value]);

// Easing: sinusoidal ease-in-out for organic feel
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// Smooth circle scale driven by rAF progress
const circleScale = computed(() => {
  if (!isActive.value || !currentPhase.value) return 0.6;
  const phase = currentPhase.value;
  const p = easeInOutSine(smoothProgress.value);

  if (phase.type === 'inhale') return 0.6 + 0.4 * p;
  if (phase.type === 'exhale') return 1.0 - 0.4 * p;
  // hold: subtle micro-pulse (±2%) to feel alive
  return 0.98 + 0.02 * Math.sin(smoothProgress.value * Math.PI * 2);
});

// Glow intensity pulsates with breathing
const glowIntensity = computed(() => {
  if (!isActive.value) return 0.3;
  return 0.3 + 0.7 * ((circleScale.value - 0.6) / 0.4);
});

// Background gradient shift
const bgHue = computed(() => {
  if (!isActive.value) return 0;
  const phase = currentPhase.value;
  if (phase.type === 'inhale') return smoothProgress.value * 15;
  if (phase.type === 'exhale') return 15 - smoothProgress.value * 15;
  return 8;
});

// Particle ring: 12 orbs that orbit and pulse
const PARTICLE_COUNT = 12;
const animTime = ref(0); // updated by rAF loop
const particlePositions = computed(() => {
  const scale = circleScale.value;
  const radius = 130 * scale;
  const time = animTime.value;
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + time;
    const wobble = Math.sin(time * 2 + i) * 6;
    return {
      x: Math.cos(angle) * (radius + wobble),
      y: Math.sin(angle) * (radius + wobble),
      opacity: 0.3 + 0.5 * ((Math.sin(time * 3 + i * 0.8) + 1) / 2),
      size: 3 + 2 * Math.sin(time * 2.5 + i),
    };
  });
});

/** Quick start: simplest technique (4-6), 3 cycles */
function quickStart() {
  selectedTech.value = 2;
  targetCycles.value = 3;
  start();
}

function start() {
  isActive.value = true;
  isDone.value = false;
  currentCycle.value = 0;
  currentPhaseIndex.value = 0;
  countdown.value = technique.value.phases[0].duration;
  smoothProgress.value = 0;
  phaseDuration = technique.value.phases[0].duration * 1000;
  phaseStartTime = performance.now();
  runAnimationLoop();
}

function stop() {
  isActive.value = false;
  cancelAnimation();
}

function cancelAnimation() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function runAnimationLoop() {
  cancelAnimation();

  function tick(now: number) {
    if (!isActive.value) return;

    const elapsed = now - phaseStartTime;
    const rawProgress = Math.min(elapsed / phaseDuration, 1);
    smoothProgress.value = rawProgress;
    animTime.value = now / 3000; // drive particle orbit

    // Update integer countdown for display
    const remaining = Math.ceil((phaseDuration - elapsed) / 1000);
    countdown.value = Math.max(remaining, 0);

    if (rawProgress >= 1) {
      // Phase complete — advance
      advancePhase();
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
}

function advancePhase() {
  // Trigger ripple effect
  rippleActive.value = true;
  rippleKey.value++;
  setTimeout(() => { rippleActive.value = false; }, 600);

  currentPhaseIndex.value++;
  if (currentPhaseIndex.value >= technique.value.phases.length) {
    currentPhaseIndex.value = 0;
    currentCycle.value++;
    if (currentCycle.value >= targetCycles.value) {
      complete();
      return;
    }
  }

  // Start next phase
  smoothProgress.value = 0;
  phaseDuration = technique.value.phases[currentPhaseIndex.value].duration * 1000;
  phaseStartTime = performance.now();
  countdown.value = technique.value.phases[currentPhaseIndex.value].duration;
  runAnimationLoop();
}

function complete() {
  isActive.value = false;
  isDone.value = true;
  cancelAnimation();

  // Fire celebration
  nextTick(() => celebRef.value?.fire('🌿'));

  exerciseTracker.logCompletion('breathing', technique.value.name, {
    cycles: targetCycles.value,
  });

  try {
    import('@/api/toolbox').then(({ logExercise }) => {
      logExercise({
        type: 'breathing',
        technique: technique.value.name,
        data: { cycles: targetCycles.value },
      }).catch(() => {});
    }).catch(() => {});
  } catch { /* silent */ }
}

onUnmounted(() => {
  cancelAnimation();
});
</script>

<template>
  <div>
  <!-- Page background gradient (selection & done screens) -->
  <div v-if="!isActive" class="tool-bg breathing-bg" />

  <!-- Fullscreen immersive mode when active -->
  <div
    v-if="isActive"
    class="fixed inset-0 z-50 flex flex-col items-center justify-center breathing-immersive"
    :style="{
      background: `radial-gradient(ellipse at center, hsl(${160 + bgHue}, 30%, 8%) 0%, hsl(${160 + bgHue}, 20%, 4%) 100%)`,
    }"
  >
    <!-- Ambient glow rings -->
    <div class="breath-ambient">
      <div
        class="ambient-ring ambient-ring-1"
        :style="{
          transform: `scale(${circleScale * 1.8})`,
          background: `radial-gradient(circle, ${moodTheme.palette.glow}, transparent 70%)`,
          opacity: glowIntensity * 0.5,
        }"
      />
      <div
        class="ambient-ring ambient-ring-2"
        :style="{
          transform: `scale(${circleScale * 2.4})`,
          background: `radial-gradient(circle, ${moodTheme.palette.glow}, transparent 70%)`,
          opacity: glowIntensity * 0.25,
        }"
      />
      <div
        class="ambient-ring ambient-ring-3"
        :style="{
          transform: `scale(${circleScale * 3.2})`,
          background: `radial-gradient(circle, ${moodTheme.palette.glow}, transparent 80%)`,
          opacity: glowIntensity * 0.1,
        }"
      />
    </div>

    <!-- Particle ring -->
    <div class="particle-ring">
      <div
        v-for="(p, i) in particlePositions"
        :key="i"
        class="particle-orb"
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

    <!-- Phase transition ripple -->
    <transition name="ripple-fade">
      <div
        v-if="rippleActive"
        :key="rippleKey"
        class="ripple-ring"
        :style="{ borderColor: moodTheme.palette.accent }"
      />
    </transition>

    <!-- Top info -->
    <div class="absolute top-8 left-0 right-0 text-center">
      <p class="text-sm" style="color: var(--text-muted);">
        {{ technique.name }} — {{ t('breathing.cycleProgress', { current: currentCycle + 1, total: targetCycles }) }}
      </p>
    </div>

    <!-- Main breathing circle -->
    <div class="breath-container">
      <div
        class="breath-circle"
        :style="{
          transform: `scale(${circleScale})`,
          borderColor: moodTheme.palette.accent,
          boxShadow: `0 0 ${60 + glowIntensity * 60}px ${moodTheme.palette.glow}, 0 0 ${120 + glowIntensity * 80}px ${moodTheme.palette.glow}, inset 0 0 ${40 + glowIntensity * 40}px ${moodTheme.palette.glow}`,
        }"
      >
        <span class="breath-label" :style="{ color: moodTheme.palette.accent }">
          {{ currentPhase.label }}
        </span>
        <span class="breath-countdown" style="color: var(--text-primary);">
          {{ countdown }}
        </span>
      </div>
    </div>

    <p class="mt-8 text-sm instruction-text" style="color: var(--text-secondary);">
      {{ currentPhase.instruction }}
    </p>

    <!-- Phase indicator dots -->
    <div class="flex gap-3 mt-6">
      <div
        v-for="(phase, i) in technique.phases"
        :key="i"
        class="flex items-center gap-1.5"
      >
        <div
          class="phase-dot"
          :style="{
            background: i === currentPhaseIndex ? moodTheme.palette.accent : 'var(--border-medium)',
            boxShadow: i === currentPhaseIndex ? `0 0 8px ${moodTheme.palette.accent}` : 'none',
            transform: i === currentPhaseIndex ? 'scale(1.3)' : 'scale(1)',
          }"
        />
        <span
          class="text-xs phase-label-text"
          :style="{
            color: i === currentPhaseIndex ? moodTheme.palette.accent : 'var(--text-muted)',
            fontWeight: i === currentPhaseIndex ? '600' : '400',
          }"
        >
          {{ phase.label }}
        </span>
      </div>
    </div>

    <button
      @click="stop"
      class="mt-10 px-6 py-2 rounded-xl text-sm stop-btn"
    >
      {{ t('breathing.stopEarly') }}
    </button>
  </div>

  <!-- Done state -->
  <div v-else-if="isDone" class="py-6 max-w-2xl mx-auto px-4 relative z-1">
    <div class="text-center py-16 space-y-4 animate-float-in">
      <div
        class="w-24 h-24 rounded-full mx-auto flex items-center justify-center"
        :style="{
          background: moodTheme.palette.accentSoft,
          boxShadow: `0 0 60px ${moodTheme.palette.glow}`,
        }"
      >
        <span class="text-4xl">🌿</span>
      </div>
      <div class="text-xl font-semibold" :style="{ color: moodTheme.palette.accent }">{{ t('breathing.doneTitle') }}</div>
      <p class="text-sm" style="color: var(--text-secondary);">
        {{ t('breathing.doneMsg', { cycles: targetCycles }) }}<br/>
        {{ t('breathing.doneFeel') }}
      </p>
      <p class="text-xs" style="color: var(--text-muted);">
        {{ t('breathing.totalCount', { count: exerciseTracker.breathingCount.value }) }}
      </p>
      <div class="flex gap-3 justify-center mt-6">
        <button @click="isDone = false; showFullConfig = false" class="btn-secondary">{{ t('common.restart') }}</button>
        <button @click="router.push('/toolbox')" class="btn-ghost">{{ t('common.backToToolbox') }}</button>
      </div>
    </div>
  </div>

  <!-- Selection page -->
  <div v-else class="py-6 max-w-2xl mx-auto px-4 relative z-1">
    <button
      @click="router.push('/toolbox')"
      class="text-sm mb-4 flex items-center gap-1 transition-colors"
      style="color: var(--text-muted);"
    >
      {{ t('common.backToToolbox') }}
    </button>

    <!-- Quick start mode (default) -->
    <div v-if="!showFullConfig" class="text-center animate-float-in">
      <h1 class="text-xl font-semibold mb-1" style="color: var(--text-primary);">{{ t('breathing.title') }}</h1>
      <p class="text-sm mb-8" style="color: var(--text-secondary);">{{ t('breathing.subtitle') }}</p>

      <div
        class="quick-start-circle mx-auto cursor-pointer"
        :style="{
          borderColor: moodTheme.palette.accent,
          boxShadow: `0 0 40px ${moodTheme.palette.glow}, inset 0 0 30px ${moodTheme.palette.glow}`,
        }"
        @click="quickStart"
      >
        <span class="text-sm font-medium" :style="{ color: moodTheme.palette.accent }">{{ t('breathing.clickToStart') }}</span>
        <span class="text-xs mt-1" style="color: var(--text-muted);">{{ t('breathing.quickStartLabel') }}</span>
      </div>

      <p class="text-xs mt-6" style="color: var(--text-muted);">
        {{ t('breathing.quickStartInfo') }}
      </p>

      <button
        @click="showFullConfig = true"
        class="mt-6 text-xs transition-colors"
        style="color: var(--text-muted);"
      >
        {{ t('breathing.switchTechnique') }}
      </button>
    </div>

    <!-- Full config mode -->
    <div v-else class="animate-float-in">
      <h1 class="text-xl font-semibold mb-1" style="color: var(--text-primary);">{{ t('breathing.title') }}</h1>
      <p class="text-sm mb-6" style="color: var(--text-secondary);">{{ t('breathing.selectSubtitle') }}</p>

      <div class="space-y-3">
        <div
          v-for="(tech, i) in techniques"
          :key="i"
          class="card p-4 flex items-center justify-between cursor-pointer transition-all"
          :style="{
            borderColor: selectedTech === i ? moodTheme.palette.accent : undefined,
            boxShadow: selectedTech === i ? `0 0 20px ${moodTheme.palette.glow}` : undefined,
          }"
          @click="selectedTech = i"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ tech.icon }}</span>
            <div>
              <p class="font-medium text-sm" style="color: var(--text-primary);">{{ tech.name }}</p>
              <p class="text-xs" style="color: var(--text-muted);">{{ tech.desc }}</p>
            </div>
          </div>
          <div
            class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
            :style="{
              borderColor: selectedTech === i ? moodTheme.palette.accent : 'var(--border-medium)',
              background: selectedTech === i ? moodTheme.palette.accent : 'transparent',
            }"
          >
            <div v-if="selectedTech === i" class="w-2 h-2 rounded-full" style="background: var(--text-inverse);" />
          </div>
        </div>
      </div>

      <div class="card p-4 mt-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm" style="color: var(--text-secondary);">{{ t('breathing.cycleLabel') }}</span>
          <span class="text-sm font-semibold" :style="{ color: moodTheme.palette.accent }">{{ targetCycles }}</span>
        </div>
        <input
          type="range"
          v-model.number="targetCycles"
          min="1"
          max="10"
          class="range-slider w-full"
        />
        <p class="text-xs mt-1" style="color: var(--text-muted);">
          {{ t('breathing.rhythm') }}: {{ technique.phases.map(p => `${p.label} ${p.duration}s`).join(' → ') }}
        </p>
      </div>

      <button @click="start" class="btn-primary w-full mt-6">{{ t('breathing.startBreathing') }}</button>

      <button @click="showFullConfig = false" class="safe-exit-hint mt-2">
        {{ t('breathing.backToQuickStart') }}
      </button>
    </div>
  </div>
  <CelebrationBurst ref="celebRef" />
  </div>
</template>

<style scoped>
/* ── Quick start circle ── */
.quick-start-circle {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 3px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(100,220,180,0.02);
  transition: all 0.3s;
  animation: gentle-breathe 4s ease-in-out infinite;
}
.quick-start-circle:hover { filter: brightness(1.1); }
.quick-start-circle:active { transform: scale(0.95) !important; }

@keyframes gentle-breathe {
  0%, 100% { transform: scale(0.92); opacity: 0.8; }
  50% { transform: scale(1.02); opacity: 1; }
}

/* ── Immersive breathing screen ── */
.breathing-immersive {
  transition: background 2s ease;
}

/* ── Ambient glow rings ── */
.breath-ambient {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.ambient-ring {
  position: absolute; width: 300px; height: 300px;
  border-radius: 50%;
  will-change: transform, opacity;
}
.ambient-ring-1 { transition: none; }
.ambient-ring-2 { transition: none; }
.ambient-ring-3 { transition: none; }

/* ── Main breathing circle ── */
.breath-container {
  position: relative; width: 240px; height: 240px;
  display: flex; align-items: center; justify-content: center;
}
.breath-circle {
  width: 220px; height: 220px; border-radius: 50%;
  border: 3px solid;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  will-change: transform, box-shadow;
  background: rgba(100,220,180,0.02);
}
.breath-label {
  font-size: 1.125rem; font-weight: 600; letter-spacing: 0.1em;
  transition: opacity 0.3s ease;
}
.breath-countdown {
  font-size: 3.5rem; font-weight: 200; line-height: 1; margin-top: 0.25rem;
  transition: opacity 0.3s ease;
}

/* ── Particle ring ── */
.particle-ring {
  position: absolute;
  width: 0; height: 0;
  pointer-events: none;
  z-index: 2;
}
.particle-orb {
  position: absolute;
  border-radius: 50%;
  will-change: transform, opacity;
  transform-origin: center;
}

/* ── Phase transition ripple ── */
.ripple-ring {
  position: absolute;
  width: 220px; height: 220px;
  border-radius: 50%;
  border: 2px solid;
  opacity: 0;
  pointer-events: none;
  animation: ripple-expand 0.6s ease-out forwards;
}
@keyframes ripple-expand {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
}

.ripple-fade-enter-active { animation: ripple-expand 0.6s ease-out; }
.ripple-fade-leave-active { display: none; }

/* ── Instruction text ── */
.instruction-text {
  transition: opacity 0.4s ease;
  animation: text-breathe 4s ease-in-out infinite;
}
@keyframes text-breathe {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* ── Phase indicator dots ── */
.phase-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  transition: all 0.5s ease;
}
.phase-label-text {
  transition: all 0.3s ease;
}

/* ── Stop button ── */
.stop-btn {
  background: rgba(100,220,180,0.05);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
  transition: all 0.3s;
}
.stop-btn:hover {
  background: rgba(100,220,180,0.1);
  border-color: var(--border-medium);
}

/* ── Range slider ── */
.range-slider {
  -webkit-appearance: none; appearance: none;
  height: 4px; border-radius: 2px; background: var(--border-medium); outline: none;
}
.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
  background: var(--mood-accent); cursor: pointer; box-shadow: 0 0 10px var(--mood-glow);
}
.range-slider::-moz-range-thumb {
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--mood-accent); cursor: pointer; border: none; box-shadow: 0 0 10px var(--mood-glow);
}

/* ── Page background ── */
.tool-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.8s ease;
}
.breathing-bg {
  background: radial-gradient(
    ellipse at 50% 100%,
    rgba(13, 148, 136, 0.12) 0%,
    rgba(13, 148, 136, 0.04) 35%,
    transparent 70%
  );
}

/* ── Reduced motion preference ── */
@media (prefers-reduced-motion: reduce) {
  .ambient-ring, .breath-circle, .particle-orb, .ripple-ring {
    transition: none !important;
    animation: none !important;
  }
  .instruction-text { animation: none; opacity: 1; }
  .quick-start-circle { animation: none; }
}
</style>
