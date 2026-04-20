<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@/i18n';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useExerciseTracker } from '@/composables/useExerciseTracker';
import CelebrationBurst from '@/components/effects/CelebrationBurst.vue';

const router = useRouter();
const moodTheme = useMoodThemeStore();
const exerciseTracker = useExerciseTracker();
const { t } = useI18n();

const celebRef = ref<InstanceType<typeof CelebrationBurst> | null>(null);

const STEPS = computed(() => [
  { n: 5, sense: t('grounding.senses.see'), icon: '👁️', prompt: t('grounding.prompts.see') },
  { n: 4, sense: t('grounding.senses.touch'), icon: '✋', prompt: t('grounding.prompts.touch') },
  { n: 3, sense: t('grounding.senses.hear'), icon: '👂', prompt: t('grounding.prompts.hear') },
  { n: 2, sense: t('grounding.senses.smell'), icon: '👃', prompt: t('grounding.prompts.smell') },
  { n: 1, sense: t('grounding.senses.taste'), icon: '👅', prompt: t('grounding.prompts.taste') },
]);

const step = ref(0);
const inputs = ref<Record<number, string>>({});
const isDone = ref(false);

const currentStep = computed(() => STEPS.value[step.value]);
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

function complete() {
  isDone.value = true;

  // Fire celebration
  nextTick(() => celebRef.value?.fire('🌍'));

  // Local tracking
  exerciseTracker.logCompletion('grounding', '5-4-3-2-1', { inputs: inputs.value });

  // Backend sync (fire-and-forget)
  try {
    import('@/api/toolbox').then(({ logExercise }) => {
      logExercise({
        type: 'grounding',
        technique: '5-4-3-2-1',
        data: { inputs: inputs.value },
      }).catch(() => {});
    }).catch(() => {});
  } catch { /* silent */ }
}

function restart() {
  step.value = 0;
  inputs.value = {};
  isDone.value = false;
}
</script>

<template>
  <div class="tool-page">
    <!-- Page background gradient -->
    <div class="tool-bg grounding-bg" />

    <div class="py-6 max-w-2xl mx-auto px-4 relative z-10">
    <button
      @click="router.push('/toolbox')"
      class="text-sm mb-4 flex items-center gap-1 transition-colors"
      style="color: var(--text-muted);"
    >
      ← {{ t('common.backToToolbox') }}
    </button>

    <h1 class="text-xl font-semibold mb-1" style="color: var(--text-primary);">{{ t('grounding.title') }}</h1>
    <p class="text-sm mb-6" style="color: var(--text-secondary);">
      {{ moodTheme.isLowEnergy ? t('grounding.subtitleLow') : t('grounding.subtitleNormal') }}
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
      <h2 class="text-xl font-semibold" :style="{ color: moodTheme.palette.accent }">{{ t('grounding.doneTitle') }}</h2>
      <p class="text-sm" style="color: var(--text-secondary);">
        {{ t('grounding.doneMsg') }}
      </p>

      <!-- Summary -->
      <div class="card p-4 text-left space-y-3 mt-6">
        <div v-for="(s, i) in STEPS" :key="i" class="flex gap-3">
          <span class="text-lg flex-shrink-0">{{ s.icon }}</span>
          <div>
            <p class="text-sm font-medium" style="color: var(--text-primary);">
              {{ t('grounding.summaryItem', { sense: s.sense, n: s.n }) }}
            </p>
            <p class="text-sm" style="color: var(--text-muted);">{{ inputs[i] || t('grounding.notFilled') }}</p>
          </div>
        </div>
      </div>

      <div class="flex gap-3 justify-center mt-6">
        <button @click="restart" class="btn-secondary">{{ t('common.restart') }}</button>
        <button @click="router.push('/toolbox')" class="btn-ghost">{{ t('common.backToToolbox') }}</button>
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
          {{ t('grounding.stepDisplay', { sense: currentStep.sense }) }}
        </p>
        <p class="text-sm mt-1" style="color: var(--text-secondary);">{{ currentStep.prompt }}</p>
      </div>

      <!-- Optional text input with skip option -->
      <div class="space-y-2">
        <textarea
          v-model="inputs[step]"
          :placeholder="moodTheme.isLowEnergy
            ? t('grounding.inputPlaceholderLow')
            : t('grounding.inputPlaceholder', { sense: currentStep.sense, n: currentStep.n })"
          class="input-field w-full text-sm resize-none"
          :rows="moodTheme.isLowEnergy ? 2 : 4"
        />
        <p v-if="moodTheme.isLowEnergy" class="text-xs text-center" style="color: var(--text-muted);">
          {{ t('grounding.noTextHint') }}
        </p>
      </div>

      <div class="flex gap-3">
        <button v-if="step > 0" @click="prev" class="btn-secondary flex-1">← {{ t('common.previous') }}</button>
        <button @click="next" class="btn-primary flex-1">
          {{ step < 4
            ? (inputs[step]?.trim() ? t('grounding.nextStep') : t('grounding.skipText'))
            : t('common.done')
          }}
        </button>
      </div>

      <button
        @click="router.push('/toolbox')"
        class="safe-exit-hint"
      >
        {{ t('common.safeExit') }} →
      </button>
    </div>
    </div>
    <CelebrationBurst ref="celebRef" />
  </div>
</template>

<style scoped>
.tool-page {
  position: relative;
  min-height: 100vh;
}
.tool-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.grounding-bg {
  background: radial-gradient(
    ellipse at 50% 100%,
    rgba(5, 150, 105, 0.12) 0%,
    rgba(5, 150, 105, 0.04) 35%,
    transparent 70%
  );
}
</style>
