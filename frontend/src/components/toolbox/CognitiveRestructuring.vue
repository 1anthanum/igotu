<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useI18n } from '@/i18n';
import { saveCognitiveRecord } from '@/api/toolbox';

const router = useRouter();
const moodTheme = useMoodThemeStore();
const { t } = useI18n();

const distortionsList = computed(() => [
  { name: t('cognitive.distortions.allOrNothing.name'), desc: t('cognitive.distortions.allOrNothing.desc') },
  { name: t('cognitive.distortions.overgeneralization.name'), desc: t('cognitive.distortions.overgeneralization.desc') },
  { name: t('cognitive.distortions.mentalFilter.name'), desc: t('cognitive.distortions.mentalFilter.desc') },
  { name: t('cognitive.distortions.mindReading.name'), desc: t('cognitive.distortions.mindReading.desc') },
  { name: t('cognitive.distortions.catastrophizing.name'), desc: t('cognitive.distortions.catastrophizing.desc') },
  { name: t('cognitive.distortions.shouldStatements.name'), desc: t('cognitive.distortions.shouldStatements.desc') },
  { name: t('cognitive.distortions.labeling.name'), desc: t('cognitive.distortions.labeling.desc') },
  { name: t('cognitive.distortions.personalization.name'), desc: t('cognitive.distortions.personalization.desc') },
]);

const DISTORTIONS = computed(() => distortionsList.value);

const emotionsList = computed(() => t('cognitive.emotions'));
const EMOTIONS = computed(() => Array.isArray(emotionsList.value) ? emotionsList.value : []);

const step = ref(0);
const thought = ref('');
const selectedEmotions = ref<string[]>([]);
const intensity = ref(5);
const selectedDistortions = ref<string[]>([]);
const supportingEvidence = ref('');
const counterEvidence = ref('');
const balancedThought = ref('');
const intensityAfter = ref(5);
const isDone = ref(false);
const saving = ref(false);

const STEP_LABELS = computed(() => [
  t('cognitive.steps.capture'),
  t('cognitive.steps.emotions'),
  t('cognitive.steps.distortions'),
  t('cognitive.steps.supportingEvidence'),
  t('cognitive.steps.counterEvidence'),
  t('cognitive.steps.balancedThought'),
]);

function toggleEmotion(e: string) {
  const idx = selectedEmotions.value.indexOf(e);
  if (idx >= 0) selectedEmotions.value.splice(idx, 1);
  else selectedEmotions.value.push(e);
}

function toggleDistortion(d: string) {
  const idx = selectedDistortions.value.indexOf(d);
  if (idx >= 0) selectedDistortions.value.splice(idx, 1);
  else selectedDistortions.value.push(d);
}

function next() {
  if (step.value < 5) step.value++;
  else complete();
}

function prev() {
  if (step.value > 0) step.value--;
}

async function complete() {
  isDone.value = true;
  saving.value = true;
  try {
    await saveCognitiveRecord({
      thought: thought.value,
      emotions: selectedEmotions.value,
      distortions: selectedDistortions.value,
      intensity_before: intensity.value,
      supporting_evidence: supportingEvidence.value,
      counter_evidence: counterEvidence.value,
      balanced_thought: balancedThought.value,
      intensity_after: intensityAfter.value,
    });
  } catch { /* silent */ }
  saving.value = false;
}

function restart() {
  step.value = 0;
  thought.value = '';
  selectedEmotions.value = [];
  intensity.value = 5;
  selectedDistortions.value = [];
  supportingEvidence.value = '';
  counterEvidence.value = '';
  balancedThought.value = '';
  intensityAfter.value = 5;
  isDone.value = false;
}

function getStepData(i: number): string {
  switch (i) {
    case 0: return thought.value || t('cognitive.placeholders.unfilled');
    case 1: return selectedEmotions.value.join('、') || t('cognitive.placeholders.unselected');
    case 2: return selectedDistortions.value.join('、') || t('cognitive.placeholders.unselected');
    case 3: return supportingEvidence.value || t('cognitive.placeholders.unfilled');
    case 4: return counterEvidence.value || t('cognitive.placeholders.unfilled');
    case 5: return balancedThought.value || t('cognitive.placeholders.unfilled');
    default: return '';
  }
}
</script>

<template>
  <div class="tool-page">
    <div class="tool-bg cognitive-bg" />
    <div class="py-6 max-w-2xl mx-auto px-4 relative z-10">
    <button
      @click="router.push('/toolbox')"
      class="text-sm mb-4 flex items-center gap-1 transition-colors"
      style="color: var(--text-muted);"
    >
      ← {{ t('common.back') }}
    </button>

    <h1 class="text-xl font-semibold mb-1" style="color: var(--text-primary);">{{ t('cognitive.title') }}</h1>
    <p class="text-sm mb-2" style="color: var(--text-secondary);">
      {{ moodTheme.isLowEnergy ? t('cognitive.subtitleLow') : t('cognitive.subtitleNormal') }}
    </p>
    <p v-if="moodTheme.isLowEnergy" class="text-xs mb-6" style="color: var(--text-muted);">
      {{ t('cognitive.lowHint') }}
    </p>
    <p v-else class="mb-6" />

    <!-- Complete -->
    <div v-if="isDone" class="space-y-4 animate-float-in">
      <div class="text-center py-6">
        <div
          class="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-3"
          :style="{ background: moodTheme.palette.accentSoft, boxShadow: `0 0 40px ${moodTheme.palette.glow}` }"
        >
          <span class="text-3xl">💡</span>
        </div>
        <h2 class="text-xl font-semibold" :style="{ color: moodTheme.palette.accent }">{{ t('cognitive.doneTitle') }}</h2>
        <p class="text-sm" style="color: var(--text-secondary);">{{ t('cognitive.doneMsg') }}</p>
      </div>

      <div class="card p-4 space-y-3">
        <div v-for="(label, i) in STEP_LABELS" :key="i">
          <p class="text-sm font-medium" style="color: var(--text-muted);">{{ label }}:</p>
          <p
            class="text-sm"
            :style="{ color: i === 5 ? moodTheme.palette.accent : 'var(--text-primary)', fontWeight: i === 5 ? '600' : '400' }"
          >
            {{ getStepData(i) }}
          </p>
        </div>
        <div>
          <p class="text-sm font-medium" style="color: var(--text-muted);">情绪强度变化:</p>
          <p class="text-sm" style="color: var(--text-primary);">{{ intensity }} → {{ intensityAfter }}</p>
        </div>
      </div>

      <div class="flex gap-3">
        <button @click="restart" class="btn-secondary flex-1">{{ t('cognitive.retryBtn') }}</button>
        <button @click="router.push('/toolbox')" class="btn-ghost flex-1">{{ t('common.backToToolbox') }}</button>
      </div>
    </div>

    <!-- Steps -->
    <div v-else class="space-y-6">
      <!-- Progress -->
      <div class="h-1 rounded-full overflow-hidden" style="background: var(--border-medium);">
        <div
          class="h-full rounded-full transition-all duration-500"
          :style="{ width: ((step + 1) / 6 * 100) + '%', background: moodTheme.palette.accent }"
        />
      </div>

      <!-- Step indicator -->
      <div class="flex justify-center gap-1.5">
        <div
          v-for="i in 6"
          :key="i"
          class="w-1.5 h-1.5 rounded-full transition-all"
          :style="{
            background: i - 1 <= step ? moodTheme.palette.accent : 'var(--border-medium)',
            transform: i - 1 === step ? 'scale(1.5)' : 'scale(1)',
          }"
        />
      </div>

      <!-- Step 0: Capture thought -->
      <div v-if="step === 0" class="animate-float-in" :key="'s0'">
        <h2 class="text-base font-medium mb-2" style="color: var(--text-primary);">{{ t('cognitive.stepTitles.s1') }}</h2>
        <p class="text-sm mb-3" style="color: var(--text-secondary);">{{ t('cognitive.stepDescs.s1') }}</p>
        <textarea v-model="thought" :placeholder="t('cognitive.placeholders.thought')" class="input-field w-full text-sm resize-none" rows="4" />
      </div>

      <!-- Step 1: Identify emotions -->
      <div v-else-if="step === 1" class="animate-float-in" :key="'s1'">
        <h2 class="text-base font-medium mb-2" style="color: var(--text-primary);">{{ t('cognitive.stepTitles.s2') }}</h2>
        <p class="text-sm mb-3" style="color: var(--text-secondary);">{{ t('cognitive.stepDescs.s2') }}</p>
        <div :class="moodTheme.isLowEnergy ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 gap-2'" class="mb-4">
          <button
            v-for="e in EMOTIONS"
            :key="e"
            @click="toggleEmotion(e)"
            :class="moodTheme.isLowEnergy ? 'px-4 py-3 rounded-xl text-base' : 'px-3 py-2 rounded-xl text-sm'"
            class="transition-all"
            :style="selectedEmotions.includes(e)
              ? { background: moodTheme.palette.navActive, color: moodTheme.palette.navActiveText, border: `1px solid ${moodTheme.palette.accent}60` }
              : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }"
          >
            {{ e }}
          </button>
        </div>
        <div>
          <label class="text-sm" style="color: var(--text-secondary);">{{ t('cognitive.intensityLabel') }}</label>
          <input type="range" v-model.number="intensity" min="1" max="10" class="range-slider w-full mt-1" />
          <p class="text-xs text-right" :style="{ color: moodTheme.palette.accent }">{{ intensity }}</p>
        </div>
      </div>

      <!-- Step 2: Identify distortions -->
      <div v-else-if="step === 2" class="animate-float-in" :key="'s2'">
        <h2 class="text-base font-medium mb-2" style="color: var(--text-primary);">{{ t('cognitive.stepTitles.s3') }}</h2>
        <p class="text-sm mb-3" style="color: var(--text-secondary);">{{ t('cognitive.stepDescs.s3') }}</p>
        <div class="space-y-2">
          <button
            v-for="d in DISTORTIONS"
            :key="d.name"
            @click="toggleDistortion(d.name)"
            class="w-full text-left px-4 py-3 rounded-xl transition-all"
            :style="selectedDistortions.includes(d.name)
              ? { background: moodTheme.palette.navActive, border: `1px solid ${moodTheme.palette.accent}60` }
              : { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }"
          >
            <span class="text-sm font-medium" style="color: var(--text-primary);">{{ d.name }}</span>
            <span class="text-xs ml-2" style="color: var(--text-muted);">— {{ d.desc }}</span>
          </button>
        </div>
      </div>

      <!-- Step 3: Supporting evidence -->
      <div v-else-if="step === 3" class="animate-float-in" :key="'s3'">
        <h2 class="text-base font-medium mb-2" style="color: var(--text-primary);">{{ t('cognitive.stepTitles.s4') }}</h2>
        <p class="text-sm mb-3" style="color: var(--text-secondary);">{{ t('cognitive.stepDescs.s4') }}</p>
        <textarea v-model="supportingEvidence" :placeholder="t('cognitive.placeholders.evidence')" class="input-field w-full text-sm resize-none" rows="4" />
      </div>

      <!-- Step 4: Counter evidence -->
      <div v-else-if="step === 4" class="animate-float-in" :key="'s4'">
        <h2 class="text-base font-medium mb-2" style="color: var(--text-primary);">{{ t('cognitive.stepTitles.s5') }}</h2>
        <p class="text-sm mb-3" style="color: var(--text-secondary);">{{ t('cognitive.stepDescs.s5') }}</p>
        <textarea v-model="counterEvidence" :placeholder="t('cognitive.placeholders.counterEvidence')" class="input-field w-full text-sm resize-none" rows="4" />
      </div>

      <!-- Step 5: Balanced thought -->
      <div v-else-if="step === 5" class="animate-float-in" :key="'s5'">
        <h2 class="text-base font-medium mb-2" style="color: var(--text-primary);">{{ t('cognitive.stepTitles.s6') }}</h2>
        <p class="text-sm mb-3" style="color: var(--text-secondary);" v-html="t('cognitive.stepDescs.s6')"></p>

        <div v-if="thought" class="card p-3 mb-3 text-sm" style="color: var(--text-muted);">
          {{ t('cognitive.originalThought') }}: {{ thought }}
        </div>

        <textarea v-model="balancedThought" :placeholder="t('cognitive.placeholders.balanced')" class="input-field w-full text-sm resize-none" rows="4" />

        <div class="mt-4">
          <label class="text-sm" style="color: var(--text-secondary);">{{ t('cognitive.intensityAfter') }}</label>
          <input type="range" v-model.number="intensityAfter" min="1" max="10" class="range-slider w-full mt-1" />
          <p class="text-xs text-right" :style="{ color: moodTheme.palette.accent }">{{ intensityAfter }}</p>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex gap-3">
        <button v-if="step > 0" @click="prev" class="btn-secondary flex-1">← {{ t('common.prev') }}</button>
        <button @click="next" class="btn-primary flex-1">
          {{ step < 5 ? t('common.next') + ' →' : t('cognitive.completeBtn') }}
        </button>
      </div>

      <button
        @click="router.push('/toolbox')"
        class="safe-exit-hint"
      >
        {{ t('cognitive.exitHint') }} →
      </button>
    </div>
    </div>
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
.cognitive-bg {
  background: radial-gradient(
    ellipse at 50% 100%,
    rgba(217, 119, 6, 0.10) 0%,
    rgba(217, 119, 6, 0.03) 35%,
    transparent 70%
  );
}
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
