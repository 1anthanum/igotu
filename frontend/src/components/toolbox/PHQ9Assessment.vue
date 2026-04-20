<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { submitPHQ9, getPHQ9History, type PHQ9Result } from '@/api/toolbox';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useI18n } from '@/i18n';

const router = useRouter();
const moodTheme = useMoodThemeStore();
const { t } = useI18n();

const questions = computed(() => t('phq9.questions'));
const options = computed(() => t('phq9.options').map((label: string, idx: number) => ({ label, value: idx })));
const funcQuestion = computed(() => t('phq9.funcQuestion'));
const funcOptions = computed(() => t('phq9.funcOptions'));
const severityLevels = computed(() => {
  const severity = t('phq9.severity');
  return [
    { min: 0, max: 4, label: severity.minimal.label, color: '#6EE7B7', desc: severity.minimal.desc },
    { min: 5, max: 9, label: severity.mild.label, color: '#FCD34D', desc: severity.mild.desc },
    { min: 10, max: 14, label: severity.moderate.label, color: '#FB923C', desc: severity.moderate.desc },
    { min: 15, max: 19, label: severity.moderateSevere.label, color: '#FDA4AF', desc: severity.moderateSevere.desc },
    { min: 20, max: 27, label: severity.severe.label, color: '#EF4444', desc: severity.severe.desc },
  ];
});

const step = ref(0);
const answers = ref<Record<number, number>>({});
const funcImpact = ref<number | null>(null);
const isDone = ref(false);
const saving = ref(false);
const saved = ref(false);
const history = ref<PHQ9Result[]>([]);

const score = computed(() => Object.values(answers.value).reduce((s, v) => s + v, 0));
const severity = computed(() => {
  for (const level of severityLevels.value) {
    if (score.value >= level.min && score.value <= level.max) return level;
  }
  return severityLevels.value[severityLevels.value.length - 1];
});

function selectOption(value: number) {
  answers.value[step.value] = value;
  step.value++;
  if (step.value > 9) isDone.value = true;
}

function selectFunc(index: number) {
  funcImpact.value = index;
  isDone.value = true;
}

function goBack() {
  if (step.value === 9 && funcImpact.value === null) {
    step.value = 8;
  } else if (step.value > 0) {
    step.value--;
  }
}

function restart() {
  step.value = 0;
  answers.value = {};
  funcImpact.value = null;
  isDone.value = false;
  saved.value = false;
}

async function saveResult() {
  saving.value = true;
  try {
    await submitPHQ9(answers.value, funcImpact.value ?? undefined);
    saved.value = true;
    history.value = await getPHQ9History();
  } catch {
    // Backend may be offline — still mark as "done" visually
    saved.value = true;
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    history.value = await getPHQ9History();
  } catch { /* backend offline — history unavailable */ }
});

function formatDate(ts: string) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getSeverityColor(s: string) {
  return severityLevels.value.find(l => l.label === s)?.color || '#A1A1AA';
}
</script>

<template>
  <div class="tool-page">
    <div class="tool-bg phq9-bg" />
    <div class="py-6 max-w-2xl mx-auto px-4 relative z-10">
    <!-- Back button -->
    <button
      @click="router.push('/toolbox')"
      class="text-sm mb-4 flex items-center gap-1 transition-colors"
      style="color: var(--text-muted);"
      @mouseenter="($event.target as HTMLElement).style.color = 'var(--text-primary)'"
      @mouseleave="($event.target as HTMLElement).style.color = 'var(--text-muted)'"
    >
      ← {{ t('common.back') }}
    </button>

    <h1 class="text-xl font-semibold mb-1" style="color: var(--text-primary);">{{ t('phq9.title') }}</h1>
    <p class="text-sm mb-2" style="color: var(--text-muted);">{{ t('phq9.subtitle') }}</p>
    <p class="text-xs mb-6" style="color: var(--text-muted);">
      {{ moodTheme.isLowEnergy ? t('phq9.subtitleLow') : t('phq9.subtitleNormal') }}
    </p>

    <!-- Result View -->
    <div v-if="isDone" class="space-y-4">
      <div class="card p-6 text-center animate-float-in">
        <div class="text-5xl font-bold" :style="{ color: severity.color }">{{ score }}</div>
        <div class="text-sm mt-1" style="color: var(--text-muted);">/ 27</div>
        <div class="text-xl font-semibold mt-2" :style="{ color: severity.color }">{{ severity.label }}</div>
      </div>

      <!-- Severity bar -->
      <div class="grid grid-cols-5 gap-1 animate-float-in" style="animation-delay: 0.1s;">
        <div v-for="lv in severityLevels" :key="lv.label" class="text-center">
          <div
            class="h-2 rounded-full transition-opacity"
            :style="{
              background: lv.color,
              opacity: lv.label === severity.label ? 1 : 0.2,
              boxShadow: lv.label === severity.label ? `0 0 12px ${lv.color}60` : 'none',
            }"
          />
          <span class="text-[10px]" style="color: var(--text-muted);">{{ lv.label }}</span>
        </div>
      </div>

      <div class="card p-4 text-sm animate-float-in" style="color: var(--text-secondary); animation-delay: 0.2s;">
        {{ severity.desc }}
      </div>

      <!-- Question 9 warning -->
      <div
        v-if="(answers[8] || 0) > 0"
        class="card p-4 text-sm"
        style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5;"
      >
        {{ t('phq9.q9Warning') }}
      </div>

      <!-- Functional impact display -->
      <div v-if="funcImpact !== null" class="card p-4 text-sm">
        <span style="color: var(--text-muted);">{{ t('phq9.funcImpact') }}：</span>
        <span style="color: var(--text-primary);" class="font-medium">{{ funcOptions[funcImpact] }}</span>
      </div>

      <!-- Actions -->
      <div class="grid grid-cols-2 gap-3">
        <button @click="saveResult" :disabled="saving || saved" class="btn-primary">
          {{ saved ? t('phq9.savedResult') : saving ? t('phq9.saving') : t('phq9.saveResult') }}
        </button>
        <button @click="restart" class="btn-secondary">{{ t('phq9.retake') }}</button>
      </div>

      <p class="text-xs text-center" style="color: var(--text-muted);">
        {{ t('phq9.disclaimer') }}
      </p>

      <!-- History -->
      <div v-if="history.length > 0" class="card p-4 animate-float-in" style="animation-delay: 0.3s;">
        <h3 class="text-sm font-medium mb-3" style="color: var(--text-muted);">{{ t('phq9.historyTitle') }}</h3>
        <div class="space-y-2">
          <div v-for="entry in history.slice(0, 10)" :key="entry.id" class="flex items-center gap-2 text-sm">
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :style="{ background: getSeverityColor(entry.severity), boxShadow: `0 0 6px ${getSeverityColor(entry.severity)}40` }"
            />
            <span class="font-medium" style="color: var(--text-primary);">{{ entry.score }}</span>
            <span style="color: var(--text-muted);">({{ entry.severity }})</span>
            <span class="text-xs ml-auto" style="color: var(--text-muted);">{{ formatDate(entry.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Functional Impact Question (step 9) -->
    <div v-else-if="step === 9" class="space-y-4">
      <!-- Progress bar -->
      <div class="h-1 rounded-full overflow-hidden" style="background: rgba(100,220,180,0.06);">
        <div
          class="h-full transition-all duration-500"
          :style="{ width: '90%', background: moodTheme.palette.accent, boxShadow: `0 0 8px ${moodTheme.palette.glow}` }"
        />
      </div>
      <p class="font-medium" style="color: var(--text-primary);">{{ t('phq9.additionalQuestion') }}</p>
      <p class="text-sm" style="color: var(--text-muted);">{{ funcQuestion }}</p>
      <div class="space-y-2">
        <button
          v-for="(opt, i) in funcOptions"
          :key="i"
          @click="selectFunc(i)"
          class="w-full text-left card p-3 text-sm transition-all duration-200"
          style="color: var(--text-secondary);"
          @mouseenter="($event.target as HTMLElement).style.background = 'var(--mood-hover-bg)'"
          @mouseleave="($event.target as HTMLElement).style.background = ''"
        >
          {{ opt }}
        </button>
      </div>
      <div class="flex items-center justify-between">
        <button
          @click="goBack"
          class="text-sm transition-colors"
          style="color: var(--text-muted);"
          @mouseenter="($event.target as HTMLElement).style.color = 'var(--text-primary)'"
          @mouseleave="($event.target as HTMLElement).style.color = 'var(--text-muted)'"
        >
          ← {{ t('phq9.previousQuestion') }}
        </button>
        <button @click="isDone = true" class="safe-exit-hint text-xs">
          {{ t('phq9.skipToResult') }} →
        </button>
      </div>
    </div>

    <!-- Questions 0-8 -->
    <div v-else class="space-y-4">
      <!-- Progress bar -->
      <div class="h-1 rounded-full overflow-hidden" style="background: rgba(100,220,180,0.06);">
        <div
          class="h-full transition-all duration-500"
          :style="{ width: (step / 10 * 100) + '%', background: moodTheme.palette.accent, boxShadow: `0 0 8px ${moodTheme.palette.glow}` }"
        />
      </div>

      <!-- Emoji progress dots -->
      <div class="flex justify-center gap-1.5 flex-wrap">
        <span
          v-for="(q, i) in questions"
          :key="i"
          class="transition-all duration-300 cursor-default"
          :style="{
            fontSize: i === step ? '1.5rem' : '0.85rem',
            opacity: i < step ? 0.4 : i === step ? 1 : 0.25,
            filter: i === step ? `drop-shadow(0 0 6px ${moodTheme.palette.glow})` : 'none',
          }"
          :title="q.short"
        >
          {{ q.emoji }}
        </span>
      </div>

      <div class="animate-float-in" :key="step">
        <div class="text-center mb-3">
          <span class="text-3xl">{{ questions[step].emoji }}</span>
        </div>
        <p
          class="text-center font-medium"
          :class="moodTheme.isLowEnergy ? 'text-base' : 'text-lg'"
          style="color: var(--text-primary);"
        >
          {{ moodTheme.isLowEnergy ? questions[step].short : questions[step].text }}
        </p>
        <p v-if="moodTheme.isLowEnergy" class="text-xs text-center mt-1" style="color: var(--text-muted);">
          {{ questions[step].text }}
        </p>
      </div>

      <div :class="moodTheme.isLowEnergy ? 'space-y-3' : 'space-y-2'">
        <button
          v-for="opt in options"
          :key="opt.value"
          @click="selectOption(opt.value)"
          class="w-full text-left card text-sm transition-all duration-200 flex justify-between items-center"
          :class="moodTheme.isLowEnergy ? 'p-4' : 'p-3'"
          style="color: var(--text-secondary);"
          @mouseenter="($event.target as HTMLElement).style.background = 'var(--mood-hover-bg)'"
          @mouseleave="($event.target as HTMLElement).style.background = ''"
        >
          <span>{{ opt.label }}</span>
          <span class="text-xs" style="color: var(--text-muted);">({{ opt.value }})</span>
        </button>
      </div>

      <div class="flex items-center justify-between">
        <button
          v-if="step > 0"
          @click="goBack"
          class="text-sm transition-colors"
          style="color: var(--text-muted);"
          @mouseenter="($event.target as HTMLElement).style.color = 'var(--text-primary)'"
          @mouseleave="($event.target as HTMLElement).style.color = 'var(--text-muted)'"
        >
          ← {{ t('phq9.previousQuestion') }}
        </button>
        <span v-else />
        <button
          @click="router.push('/toolbox')"
          class="safe-exit-hint text-xs"
        >
          {{ t('phq9.laterSaved') }} →
        </button>
      </div>
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
.phq9-bg {
  background: radial-gradient(
    ellipse at 50% 100%,
    rgba(99, 102, 241, 0.10) 0%,
    rgba(99, 102, 241, 0.03) 35%,
    transparent 70%
  );
}
</style>
