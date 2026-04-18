<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import CrisisPrepResult from './CrisisPrepResult.vue';

const moodTheme = useMoodThemeStore();

// ── Step flow ──
const currentStep = ref(1);
const showResult = ref(false);

// ── Step 1: Symptoms ──
const SYMPTOM_OPTIONS = [
  { id: 'anxiety', label: '焦虑不安', emoji: '😰' },
  { id: 'insomnia', label: '失眠/睡眠困难', emoji: '🌙' },
  { id: 'fatigue', label: '持续疲惫/无力感', emoji: '😴' },
  { id: 'mood_swings', label: '情绪波动大', emoji: '🎭' },
  { id: 'self_criticism', label: '过度自我否定', emoji: '💭' },
  { id: 'appetite', label: '食欲明显变化', emoji: '🍽️' },
  { id: 'concentration', label: '注意力难以集中', emoji: '🧠' },
  { id: 'withdrawal', label: '不想与人交流', emoji: '🚪' },
  { id: 'hopelessness', label: '感到绝望', emoji: '🌑' },
  { id: 'crying', label: '频繁哭泣', emoji: '😢' },
  { id: 'panic', label: '恐慌/惊恐发作', emoji: '💥' },
  { id: 'numbness', label: '情感麻木', emoji: '🧊' },
  { id: 'self_harm_thoughts', label: '有自我伤害的想法', emoji: '⚠️' },
];
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

const SEVERITY_OPTIONS: { value: Severity; label: string; color: string }[] = [
  { value: 'mild', label: '轻度', color: '#10b981' },
  { value: 'moderate', label: '中度', color: '#f59e0b' },
  { value: 'severe', label: '严重', color: '#ef4444' },
];

const DURATION_OPTIONS = [
  { days: 1, label: '1天以内' },
  { days: 3, label: '2-3天' },
  { days: 7, label: '约一周' },
  { days: 14, label: '两周左右' },
  { days: 30, label: '一个月以上' },
];

// ── Step 3: Trigger ──
const triggerText = ref('');

// ── Step 4: Goals ──
const GOAL_OPTIONS = [
  { id: 'listen', label: '希望有人倾听', emoji: '👂' },
  { id: 'coping', label: '需要应对策略', emoji: '🛠️' },
  { id: 'assess', label: '评估是否需要专业帮助', emoji: '🏥' },
  { id: 'safety', label: '有自我伤害的想法，需要支持', emoji: '🆘' },
];
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
    ...SYMPTOM_OPTIONS.find(s => s.id === id)!,
    severity: severityMap.value[id] || 'moderate',
  })),
  durationDays: durationDays.value,
  trigger: triggerText.value.trim(),
  goals: selectedGoals.value.map(id => GOAL_OPTIONS.find(g => g.id === id)!),
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
  <div class="crisis-prep-page pt-4 pb-24">
    <!-- Safety banner -->
    <div class="safety-banner animate-float-in">
      <span class="safety-icon">⚠️</span>
      <p>如果你正处于紧急危险中，请<strong>立即拨打 988 或 911</strong></p>
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
          📞 988 电话准备
        </h1>
        <p class="text-xs mt-1" style="color: var(--text-muted);">
          帮你整理想法，降低打电话的焦虑
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
          <h2 class="step-title">你最近有哪些感受？</h2>
          <p class="step-hint">选择所有符合的（可多选）</p>
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
          <h2 class="step-title">程度和持续时间</h2>

          <div class="severity-section">
            <div
              v-for="id in selectedSymptoms"
              :key="id"
              class="severity-row"
            >
              <span class="severity-label">
                {{ SYMPTOM_OPTIONS.find(s => s.id === id)?.emoji }}
                {{ SYMPTOM_OPTIONS.find(s => s.id === id)?.label }}
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
            <p class="step-hint mt-4">持续了多久？</p>
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
          <h2 class="step-title">有什么事触发了这些感受吗？</h2>
          <p class="step-hint">这是可选的，写不出来也没关系</p>
          <textarea
            v-model="triggerText"
            class="trigger-textarea input-field"
            placeholder="比如：最近工作压力很大 / 和家人发生了冲突 / 不确定原因..."
            rows="4"
            maxlength="200"
          />
          <p class="char-count" style="color: var(--text-muted);">
            {{ triggerText.length }}/200
          </p>
        </div>

        <!-- Step 4: Goals -->
        <div v-if="currentStep === 4" class="step animate-float-in" key="s4">
          <h2 class="step-title">你希望通过这个电话得到什么？</h2>
          <p class="step-hint">选择最符合的（可多选）</p>
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
        <button v-if="currentStep > 1" class="btn-secondary" @click="prevStep">上一步</button>
        <div v-else />
        <button
          class="btn-primary"
          :disabled="!canProceed"
          @click="nextStep"
        >
          {{ currentStep === 4 ? '生成准备信息' : '下一步' }}
        </button>
      </div>
    </template>

    <!-- Disclaimer -->
    <p class="disclaimer">
      此工具帮助你整理想法，不替代专业评估。所有信息仅在你的设备上处理，不会上传到任何服务器。
    </p>
  </div>
</template>

<style scoped>
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
