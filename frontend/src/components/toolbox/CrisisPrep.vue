<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useI18n } from '@/i18n';
import CrisisPrepResult from './CrisisPrepResult.vue';

const moodTheme = useMoodThemeStore();
const { t } = useI18n();

// ── Step flow ──
const currentStep = ref(1);
const showResult = ref(false);

// ── Step 1: Symptoms ──
const symptomOptions = computed(() => [
  { id: 'anxiety', label: t('crisisPrep.symptoms.anxiety'), emoji: '😰' },
  { id: 'insomnia', label: t('crisisPrep.symptoms.insomnia'), emoji: '🌙' },
  { id: 'fatigue', label: t('crisisPrep.symptoms.fatigue'), emoji: '😴' },
  { id: 'mood_swings', label: t('crisisPrep.symptoms.moodSwings'), emoji: '🎭' },
  { id: 'self_criticism', label: t('crisisPrep.symptoms.selfCriticism'), emoji: '💭' },
  { id: 'appetite', label: t('crisisPrep.symptoms.appetite'), emoji: '🍽️' },
  { id: 'concentration', label: t('crisisPrep.symptoms.concentration'), emoji: '🧠' },
  { id: 'withdrawal', label: t('crisisPrep.symptoms.withdrawal'), emoji: '🚪' },
  { id: 'hopelessness', label: t('crisisPrep.symptoms.hopelessness'), emoji: '🌑' },
  { id: 'crying', label: t('crisisPrep.symptoms.crying'), emoji: '😢' },
  { id: 'panic', label: t('crisisPrep.symptoms.panic'), emoji: '💥' },
  { id: 'numbness', label: t('crisisPrep.symptoms.numbness'), emoji: '🧊' },
  { id: 'self_harm_thoughts', label: t('crisisPrep.symptoms.selfHarmThoughts'), emoji: '⚠️' },
]);
const SYMPTOM_OPTIONS = computed(() => symptomOptions.value);
const selectedSymptoms = ref<string[]>([]);

function toggleSymptom(id: string) {
  const i = selectedSymptoms.value.indexOf(id);
  if (i >= 0) selectedSymptoms.value.splice(i, 1);
  else selectedSymptoms.value.push(id);
}

// ── Step 2: Severity & Duration ──
type Severity = 'mild' | 'moderate' | 'severe';
const severityMap = ref<Record<string, Severity>>({});
const durationDays = ref(7);

const severityOptions = computed(() => [
  { value: 'mild' as Severity, label: t('crisisPrep.severity.mild'), color: '#10b981' },
  { value: 'moderate' as Severity, label: t('crisisPrep.severity.moderate'), color: '#f59e0b' },
  { value: 'severe' as Severity, label: t('crisisPrep.severity.severe'), color: '#ef4444' },
]);
const SEVERITY_OPTIONS = computed(() => severityOptions.value);

const durationOptions = computed(() => [
  { days: 1, label: t('crisisPrep.duration.d1') },
  { days: 3, label: t('crisisPrep.duration.d3') },
  { days: 7, label: t('crisisPrep.duration.d7') },
  { days: 14, label: t('crisisPrep.duration.d14') },
  { days: 30, label: t('crisisPrep.duration.d30') },
]);
const DURATION_OPTIONS = computed(() => durationOptions.value);

// ── Step 3: Trigger ──
const triggerText = ref('');

// ── Step 4: Goals ──
const goalOptions = computed(() => [
  { id: 'listen', label: t('crisisPrep.goals.listen'), emoji: '👂' },
  { id: 'coping', label: t('crisisPrep.goals.coping'), emoji: '🛠️' },
  { id: 'assess', label: t('crisisPrep.goals.assess'), emoji: '🏥' },
  { id: 'safety', label: t('crisisPrep.goals.safety'), emoji: '🆘' },
]);
const GOAL_OPTIONS = computed(() => goalOptions.value);
const selectedGoals = ref<string[]>([]);

function toggleGoal(id: string) {
  const i = selectedGoals.value.indexOf(id);
  if (i >= 0) selectedGoals.value.splice(i, 1);
  else selectedGoals.value.push(id);
}

// ── Navigation ──
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1: return selectedSymptoms.value.length > 0;
    case 2: return Object.keys(severityMap.value).length > 0;
    case 3: return true; // optional
    case 4: return selectedGoals.value.length > 0;
    default: return false;
  }
});

function nextStep() {
  if (currentStep.value === 2) {
    // Auto-fill severity for any selected symptoms without severity
    for (const id of selectedSymptoms.value) {
      if (!severityMap.value[id]) severityMap.value[id] = 'moderate';
    }
  }
  if (currentStep.value < 4) {
    currentStep.value++;
  } else {
    showResult.value = true;
  }
}

function prevStep() {
  if (currentStep.value > 1) currentStep.value--;
}

// ── Build prep data for result ──
const prepData = computed(() => ({
  symptoms: selectedSymptoms.value.map(id => ({
    ...SYMPTOM_OPTIONS.value.find(s => s.id === id)!,
    severity: severityMap.value[id] || 'moderate',
  })),
  durationDays: durationDays.value,
  trigger: triggerText.value.trim(),
  goals: selectedGoals.value.map(id => GOAL_OPTIONS.value.find(g => g.id === id)!),
}));

function startOver() {
  showResult.value = false;
  currentStep.value = 1;
  selectedSymptoms.value = [];
  severityMap.value = {};
  durationDays.value = 7;
  triggerText.value = '';
  selectedGoals.value = [];
}
</script>

<template>
  <div class="tool-page">
    <div class="tool-bg crisis-bg" />
    <div class="crisis-prep-page pt-4 pb-24 relative z-10">
    <!-- Safety banner -->
    <div class="safety-banner animate-float-in">
      <span class="safety-icon">⚠️</span>
      <p v-html="t('crisisPrep.safetyBanner')"></p>
    </div>

    <!-- Show result or steps -->
    <CrisisPrepResult
      v-if="showResult"
      :data="prepData"
      @start-over="startOver"
    />

    <template v-else>
      <!-- Header -->
      <div class="prep-header animate-float-in">
        <h1 class="text-lg font-medium" style="color: var(--text-primary);">
          📞 {{ t('crisisPrep.title') }}
        </h1>
        <p class="text-xs mt-1" style="color: var(--text-muted);">
          {{ t('crisisPrep.subtitle') }}
        </p>
      </div>

      <!-- Progress bar -->
      <div class="progress-bar animate-float-in-delay-1">
        <div
          class="progress-fill"
          :style="{ width: `${(currentStep / 4) * 100}%`, background: moodTheme.palette.accent }"
        />
      </div>

      <!-- Step content -->
      <div class="step-container">
        <!-- Step 1: Symptoms -->
        <div v-if="currentStep === 1" class="step animate-float-in" key="s1">
          <h2 class="step-title">{{ t('crisisPrep.step1Title') }}</h2>
          <p class="step-hint">{{ t('crisisPrep.step1Hint') }}</p>
          <div class="symptom-grid">
            <button
              v-for="opt in SYMPTOM_OPTIONS"
              :key="opt.id"
              class="symptom-chip"
              :class="{ selected: selectedSymptoms.includes(opt.id) }"
              :style="selectedSymptoms.includes(opt.id)
                ? { background: moodTheme.palette.navActive, borderColor: moodTheme.palette.accent + '50' }
                : {}"
              @click="toggleSymptom(opt.id)"
            >
              <span>{{ opt.emoji }}</span>
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <!-- Step 2: Severity & Duration -->
        <div v-if="currentStep === 2" class="step animate-float-in" key="s2">
          <h2 class="step-title">{{ t('crisisPrep.step2Title') }}</h2>

          <div class="severity-section">
            <div
              v-for="id in selectedSymptoms"
              :key="id"
              class="severity-row"
            >
              <span class="severity-label">
                {{ SYMPTOM_OPTIONS.find((s: any) => s.id === id)?.emoji }}
                {{ SYMPTOM_OPTIONS.find((s: any) => s.id === id)?.label }}
              </span>
              <div class="severity-btns">
                <button
                  v-for="sev in SEVERITY_OPTIONS"
                  :key="sev.value"
                  class="sev-btn"
                  :class="{ active: severityMap[id] === sev.value }"
                  :style="severityMap[id] === sev.value ? { background: sev.color + '25', color: sev.color, borderColor: sev.color + '50' } : {}"
                  @click="severityMap[id] = sev.value"
                >
                  {{ sev.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="duration-section">
            <p class="step-hint mt-4">{{ t('crisisPrep.step2Duration') }}</p>
            <div class="duration-options">
              <button
                v-for="dur in DURATION_OPTIONS"
                :key="dur.days"
                class="dur-btn"
                :class="{ active: durationDays === dur.days }"
                :style="durationDays === dur.days
                  ? { background: moodTheme.palette.navActive, borderColor: moodTheme.palette.accent + '50' }
                  : {}"
                @click="durationDays = dur.days"
              >
                {{ dur.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Step 3: Trigger -->
        <div v-if="currentStep === 3" class="step animate-float-in" key="s3">
          <h2 class="step-title">{{ t('crisisPrep.step3Title') }}</h2>
          <p class="step-hint">{{ t('crisisPrep.step3Hint') }}</p>
          <textarea
            v-model="triggerText"
            class="trigger-textarea input-field"
            :placeholder="t('crisisPrep.step3Placeholder')"
            rows="4"
            maxlength="200"
          />
          <p class="char-count" style="color: var(--text-muted);">
            {{ triggerText.length }}/200
          </p>
        </div>

        <!-- Step 4: Goals -->
        <div v-if="currentStep === 4" class="step animate-float-in" key="s4">
          <h2 class="step-title">{{ t('crisisPrep.step4Title') }}</h2>
          <p class="step-hint">{{ t('crisisPrep.step4Hint') }}</p>
          <div class="goal-options">
            <button
              v-for="opt in GOAL_OPTIONS"
              :key="opt.id"
              class="goal-btn"
              :class="{ selected: selectedGoals.includes(opt.id) }"
              :style="selectedGoals.includes(opt.id)
                ? { background: moodTheme.palette.navActive, borderColor: moodTheme.palette.accent + '50' }
                : {}"
              @click="toggleGoal(opt.id)"
            >
              <span class="goal-emoji">{{ opt.emoji }}</span>
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Navigation buttons -->
      <div class="step-nav">
        <button v-if="currentStep > 1" class="btn-secondary" @click="prevStep">{{ t('common.prev') }}</button>
        <div v-else />
        <button
          class="btn-primary"
          :disabled="!canProceed"
          @click="nextStep"
        >
          {{ currentStep === 4 ? t('crisisPrep.generateBtn') : t('common.next') }}
        </button>
      </div>
    </template>

    <!-- Disclaimer -->
    <p class="disclaimer">
      {{ t('crisisPrep.disclaimer') }}
    </p>
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
.crisis-bg {
  background: radial-gradient(
    ellipse at 50% 100%,
    rgba(219, 39, 119, 0.08) 0%,
    rgba(219, 39, 119, 0.03) 35%,
    transparent 70%
  );
}

.crisis-prep-page { max-width: 500px; margin: 0 auto; }

.safety-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 0.875rem;
  font-size: 0.8rem;
  color: #fca5a5;
  margin-bottom: 1.25rem;
}
.safety-icon { font-size: 1.1rem; flex-shrink: 0; }

.prep-header { margin-bottom: 1rem; }

.progress-bar {
  height: 3px;
  background: var(--border-subtle);
  border-radius: 2px;
  margin-bottom: 1.5rem;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;
}

.step-container { min-height: 300px; }
.step-title { font-size: 1rem; font-weight: 500; color: var(--text-primary); margin-bottom: 0.25rem; }
.step-hint { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1rem; }

/* Symptom grid */
.symptom-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.symptom-chip {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-subtle);
  background: var(--bg-card);
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.symptom-chip:hover { border-color: var(--border-medium); }
.symptom-chip.selected { color: var(--text-primary); font-weight: 500; }

/* Severity */
.severity-section { display: flex; flex-direction: column; gap: 0.6rem; }
.severity-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.severity-label { font-size: 0.75rem; color: var(--text-secondary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.severity-btns { display: flex; gap: 0.3rem; flex-shrink: 0; }
.sev-btn {
  font-size: 0.65rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

/* Duration */
.duration-options { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.dur-btn {
  font-size: 0.75rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.625rem;
  border: 1px solid var(--border-subtle);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.dur-btn.active { color: var(--text-primary); }

/* Trigger */
.trigger-textarea {
  resize: none;
  font-size: 0.85rem;
  line-height: 1.5;
}
.char-count { font-size: 0.65rem; text-align: right; margin-top: 0.25rem; }

/* Goals */
.goal-options { display: flex; flex-direction: column; gap: 0.5rem; }
.goal-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1rem;
  border-radius: 0.875rem;
  border: 1px solid var(--border-subtle);
  background: var(--bg-card);
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}
.goal-btn.selected { color: var(--text-primary); font-weight: 500; }
.goal-emoji { font-size: 1.1rem; }

/* Navigation */
.step-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
}

.disclaimer {
  margin-top: 2rem;
  font-size: 0.65rem;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.5;
}

@media (prefers-reduced-motion: reduce) {
  .progress-fill { transition: none !important; }
  .symptom-chip, .sev-btn, .dur-btn, .goal-btn { transition: none !important; }
}
</style>
