<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { logExercise } from '@/api/toolbox';

const router = useRouter();
const moodTheme = useMoodThemeStore();

const STEPS = [
  { n: 5, sense: '看到', icon: '👁️', prompt: '看看你的周围，说出5样你能看到的东西' },
  { n: 4, sense: '触到', icon: '✋', prompt: '感受一下，说出4样你能摸到的东西' },
  { n: 3, sense: '听到', icon: '👂', prompt: '安静下来，说出3种你能听到的声音' },
  { n: 2, sense: '闻到', icon: '👃', prompt: '深呼吸，说出2种你能闻到的气味' },
  { n: 1, sense: '尝到', icon: '👅', prompt: '感受一下，说出1种你能尝到的味道' },
];

const step = ref(0);
const inputs = ref<Record<number, string>>({});
const isDone = ref(false);

const currentStep = computed(() => STEPS[step.value]);
const progress = computed(() => ((step.value + 1) / 5) * 100);

function next() {
  if (step.value < 4) {
    step.value++;
  } else {
    complete();
  }
}

function prev() {
  if (step.value > 0) step.value--;
}

async function complete() {
  isDone.value = true;
  try {
    await logExercise({
      type: 'grounding',
      technique: '5-4-3-2-1',
      data: { inputs: inputs.value },
    });
  } catch { /* silent */ }
}

function restart() {
  step.value = 0;
  inputs.value = {};
  isDone.value = false;
}
</script>

<template>
  <div class="py-6 max-w-2xl mx-auto px-4">
    <button
      @click="router.push('/toolbox')"
      class="text-sm mb-4 flex items-center gap-1 transition-colors"
      style="color: var(--text-muted);"
    >
      ← 返回工具箱
    </button>

    <h1 class="text-xl font-semibold mb-1" style="color: var(--text-primary);">扎根练习 5-4-3-2-1</h1>
    <p class="text-sm mb-6" style="color: var(--text-secondary);">
      {{ moodTheme.isLowEnergy ? '不用想太多，感受就好' : '用五感把自己拉回当下' }}
    </p>

    <!-- Complete -->
    <div v-if="isDone" class="text-center py-8 space-y-4 animate-float-in">
      <div
        class="w-24 h-24 rounded-full mx-auto flex items-center justify-center"
        :style="{
          background: moodTheme.palette.accentSoft,
          boxShadow: `0 0 60px ${moodTheme.palette.glow}`,
        }"
      >
        <span class="text-4xl">🌱</span>
      </div>
      <h2 class="text-xl font-semibold" :style="{ color: moodTheme.palette.accent }">你回来了</h2>
      <p class="text-sm" style="color: var(--text-secondary);">
        你刚才用五感把自己拉回了当下。你在这里，你是安全的。
      </p>

      <!-- Summary -->
      <div class="card p-4 text-left space-y-3 mt-6">
        <div v-for="(s, i) in STEPS" :key="i" class="flex gap-3">
          <span class="text-lg flex-shrink-0">{{ s.icon }}</span>
          <div>
            <p class="text-sm font-medium" style="color: var(--text-primary);">
              {{ s.sense }}的 {{ s.n }} 样东西
            </p>
            <p class="text-sm" style="color: var(--text-muted);">{{ inputs[i] || '（未填写）' }}</p>
          </div>
        </div>
      </div>

      <div class="flex gap-3 justify-center mt-6">
        <button @click="restart" class="btn-secondary">再做一次</button>
        <button @click="router.push('/toolbox')" class="btn-ghost">返回工具箱</button>
      </div>
    </div>

    <!-- Steps -->
    <div v-else class="space-y-6">
      <!-- Progress bar -->
      <div class="h-1 rounded-full overflow-hidden" style="background: var(--border-medium);">
        <div
          class="h-full rounded-full transition-all duration-500"
          :style="{
            width: progress + '%',
            background: moodTheme.palette.accent,
            boxShadow: `0 0 10px ${moodTheme.palette.accent}`,
          }"
        />
      </div>

      <!-- Step indicator dots -->
      <div class="flex justify-center gap-2">
        <div
          v-for="i in 5"
          :key="i"
          class="w-2 h-2 rounded-full transition-all duration-300"
          :style="{
            background: i - 1 <= step ? moodTheme.palette.accent : 'var(--border-medium)',
            boxShadow: i - 1 === step ? `0 0 8px ${moodTheme.palette.accent}` : 'none',
            transform: i - 1 === step ? 'scale(1.5)' : 'scale(1)',
          }"
        />
      </div>

      <!-- Main content -->
      <div class="card-glow text-center py-8 animate-float-in" :key="step">
        <div class="text-5xl mb-3">{{ currentStep.icon }}</div>
        <div
          class="text-6xl font-bold"
          :style="{ color: moodTheme.palette.accent }"
        >
          {{ currentStep.n }}
        </div>
        <p class="text-base font-semibold mt-3" :style="{ color: moodTheme.palette.navActiveText }">
          你能{{ currentStep.sense }}的东西
        </p>
        <p class="text-sm mt-1" style="color: var(--text-secondary);">{{ currentStep.prompt }}</p>
      </div>

      <!-- Optional text input with skip option -->
      <div class="space-y-2">
        <textarea
          v-model="inputs[step]"
          :placeholder="moodTheme.isLowEnergy
            ? `想写就写，不写也可以…`
            : `写下你${currentStep.sense}的${currentStep.n}样东西...`"
          class="input-field w-full text-sm resize-none"
          :rows="moodTheme.isLowEnergy ? 2 : 4"
        />
        <p v-if="moodTheme.isLowEnergy" class="text-xs text-center" style="color: var(--text-muted);">
          不想打字？在心里默念也一样有效
        </p>
      </div>

      <div class="flex gap-3">
        <button v-if="step > 0" @click="prev" class="btn-secondary flex-1">← 上一步</button>
        <button @click="next" class="btn-primary flex-1">
          {{ step < 4
            ? (inputs[step]?.trim() ? '下一步 →' : '跳过文字，下一步 →')
            : '完成'
          }}
        </button>
      </div>

      <button
        @click="router.push('/toolbox')"
        class="safe-exit-hint"
      >
        先到这里 · 随时可以回来 →
      </button>
    </div>
  </div>
</template>
