<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { logExercise } from '@/api/toolbox';

const router = useRouter();
const moodTheme = useMoodThemeStore();

const TECHNIQUES = [
  {
    name: '方块呼吸 4-4-4-4',
    desc: '平衡型，适合焦虑时使用',
    icon: '◻️',
    phases: [
      { label: '吸气', duration: 4, instruction: '用鼻子慢慢吸气' },
      { label: '屏住', duration: 4, instruction: '轻轻屏住呼吸' },
      { label: '呼气', duration: 4, instruction: '用嘴慢慢呼气' },
      { label: '屏住', duration: 4, instruction: '自然停顿' },
    ],
  },
  {
    name: '放松呼吸 4-7-8',
    desc: '副交感神经激活，适合睡前',
    icon: '🌙',
    phases: [
      { label: '吸气', duration: 4, instruction: '用鼻子吸气4秒' },
      { label: '屏住', duration: 7, instruction: '屏住呼吸7秒' },
      { label: '呼气', duration: 8, instruction: '用嘴缓缓呼气8秒' },
    ],
  },
  {
    name: '简单深呼吸 4-6',
    desc: '最简单，低能量时使用',
    icon: '🍃',
    phases: [
      { label: '吸气', duration: 4, instruction: '慢慢吸气' },
      { label: '呼气', duration: 6, instruction: '慢慢呼气' },
    ],
  },
];

const selectedTech = ref(0);
const targetCycles = ref(3);
const isActive = ref(false);
const isDone = ref(false);
const currentCycle = ref(0);
const currentPhaseIndex = ref(0);
const countdown = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const technique = computed(() => TECHNIQUES[selectedTech.value]);
const currentPhase = computed(() => technique.value.phases[currentPhaseIndex.value]);

const circleScale = computed(() => {
  if (!isActive.value || !currentPhase.value) return 0.6;
  const phase = currentPhase.value;
  const total = phase.duration;
  const elapsed = total - countdown.value;
  const progress = elapsed / total;

  if (phase.label === '吸气') return 0.6 + 0.4 * progress;
  if (phase.label === '呼气') return 1.0 - 0.4 * progress;
  return 1.0;
});

const totalPhaseTime = computed(() => {
  if (!currentPhase.value) return 1;
  return currentPhase.value.duration;
});

const phaseProgress = computed(() => {
  return 1 - (countdown.value / totalPhaseTime.value);
});

function start() {
  isActive.value = true;
  isDone.value = false;
  currentCycle.value = 0;
  currentPhaseIndex.value = 0;
  countdown.value = technique.value.phases[0].duration;
  runTimer();
}

function stop() {
  isActive.value = false;
  if (timer) { clearInterval(timer); timer = null; }
}

function runTimer() {
  timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      currentPhaseIndex.value++;
      if (currentPhaseIndex.value >= technique.value.phases.length) {
        currentPhaseIndex.value = 0;
        currentCycle.value++;
        if (currentCycle.value >= targetCycles.value) {
          complete();
          return;
        }
      }
      countdown.value = technique.value.phases[currentPhaseIndex.value].duration;
    }
  }, 1000);
}

async function complete() {
  isActive.value = false;
  isDone.value = true;
  if (timer) { clearInterval(timer); timer = null; }
  try {
    await logExercise({
      type: 'breathing',
      technique: technique.value.name,
      data: { cycles: targetCycles.value },
    });
  } catch { /* silent */ }
}

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <!-- Fullscreen immersive mode when active -->
  <div
    v-if="isActive"
    class="fixed inset-0 z-50 flex flex-col items-center justify-center"
    style="background: var(--bg-primary);"
  >
    <!-- Ambient glow rings -->
    <div class="breath-ambient">
      <div
        class="ambient-ring ambient-ring-1"
        :style="{
          transform: `scale(${circleScale * 1.8})`,
          background: `radial-gradient(circle, ${moodTheme.palette.glow}, transparent 70%)`,
        }"
      />
      <div
        class="ambient-ring ambient-ring-2"
        :style="{
          transform: `scale(${circleScale * 2.4})`,
          background: `radial-gradient(circle, ${moodTheme.palette.glow}, transparent 70%)`,
        }"
      />
    </div>

    <!-- Info bar top -->
    <div class="absolute top-8 left-0 right-0 text-center">
      <p class="text-sm" style="color: var(--text-muted);">
        {{ technique.name }} — 循环 {{ currentCycle + 1 }} / {{ targetCycles }}
      </p>
    </div>

    <!-- Main breathing circle -->
    <div class="breath-container">
      <div
        class="breath-circle"
        :style="{
          transform: `scale(${circleScale})`,
          borderColor: moodTheme.palette.accent,
          boxShadow: `0 0 80px ${moodTheme.palette.glow}, 0 0 160px ${moodTheme.palette.glow}, inset 0 0 60px ${moodTheme.palette.glow}`,
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

    <!-- Instruction -->
    <p class="mt-8 text-sm" style="color: var(--text-secondary);">
      {{ currentPhase.instruction }}
    </p>

    <!-- Phase dots -->
    <div class="flex gap-3 mt-6">
      <div
        v-for="(phase, i) in technique.phases"
        :key="i"
        class="flex items-center gap-1.5"
      >
        <div
          class="w-2 h-2 rounded-full transition-all duration-500"
          :style="{
            background: i === currentPhaseIndex ? moodTheme.palette.accent : 'var(--border-medium)',
            boxShadow: i === currentPhaseIndex ? `0 0 8px ${moodTheme.palette.accent}` : 'none',
            transform: i === currentPhaseIndex ? 'scale(1.3)' : 'scale(1)',
          }"
        />
        <span
          class="text-xs transition-all duration-300"
          :style="{
            color: i === currentPhaseIndex ? moodTheme.palette.accent : 'var(--text-muted)',
            fontWeight: i === currentPhaseIndex ? '600' : '400',
          }"
        >
          {{ phase.label }}
        </span>
      </div>
    </div>

    <!-- Stop button -->
    <button
      @click="stop"
      class="mt-10 px-6 py-2 rounded-xl text-sm transition-all"
      style="background: rgba(100,220,180,0.05); color: var(--text-muted); border: 1px solid var(--border-subtle);"
    >
      停止
    </button>
  </div>

  <!-- Done state -->
  <div v-else-if="isDone" class="py-6 max-w-2xl mx-auto px-4">
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
      <div class="text-xl font-semibold" :style="{ color: moodTheme.palette.accent }">做得好</div>
      <p class="text-sm" style="color: var(--text-secondary);">
        你刚刚完成了 {{ targetCycles }} 个循环的呼吸练习。<br/>
        感受一下此刻的身体。
      </p>
      <div class="flex gap-3 justify-center mt-6">
        <button @click="isDone = false" class="btn-secondary">再来一次</button>
        <button @click="router.push('/toolbox')" class="btn-ghost">返回工具箱</button>
      </div>
    </div>
  </div>

  <!-- Selection page -->
  <div v-else class="py-6 max-w-2xl mx-auto px-4">
    <button
      @click="router.push('/toolbox')"
      class="text-sm mb-4 flex items-center gap-1 transition-colors"
      style="color: var(--text-muted);"
    >
      ← 返回工具箱
    </button>

    <h1 class="text-xl font-semibold mb-1" style="color: var(--text-primary);">呼吸引导</h1>
    <p class="text-sm mb-6" style="color: var(--text-secondary);">选择一个呼吸技巧，跟着节奏来。</p>

    <div class="space-y-3">
      <div
        v-for="(tech, i) in TECHNIQUES"
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

    <!-- Cycle selector -->
    <div class="card p-4 mt-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm" style="color: var(--text-secondary);">循环次数</span>
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
        节奏: {{ technique.phases.map(p => `${p.label} ${p.duration}s`).join(' → ') }}
      </p>
    </div>

    <button @click="start" class="btn-primary w-full mt-6">开始呼吸</button>
  </div>
</template>

<style scoped>
/* ── Immersive breathing ── */
.breath-ambient {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.ambient-ring {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  transition: transform 1.5s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.5;
}
.ambient-ring-2 {
  opacity: 0.25;
}

.breath-container {
  position: relative;
  width: 240px;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.breath-circle {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: 3px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 1.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 1.2s ease;
  background: rgba(100,220,180,0.02);
}

.breath-label {
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: 0.1em;
}

.breath-countdown {
  font-size: 3.5rem;
  font-weight: 200;
  line-height: 1;
  margin-top: 0.25rem;
}

/* ── Range slider ── */
.range-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: var(--border-medium);
  outline: none;
}
.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--mood-accent);
  cursor: pointer;
  box-shadow: 0 0 10px var(--mood-glow);
}
.range-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--mood-accent);
  cursor: pointer;
  border: none;
  box-shadow: 0 0 10px var(--mood-glow);
}
</style>
