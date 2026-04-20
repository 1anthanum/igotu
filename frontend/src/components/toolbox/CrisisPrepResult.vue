<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useI18n } from '@/i18n';

interface SymptomData {
  id: string;
  label: string;
  emoji: string;
  severity: 'mild' | 'moderate' | 'severe';
}

interface GoalData {
  id: string;
  label: string;
  emoji: string;
}

interface PrepData {
  symptoms: SymptomData[];
  durationDays: number;
  trigger: string;
  goals: GoalData[];
}

const props = defineProps<{ data: PrepData }>();
const emit = defineEmits<{ 'start-over': [] }>();

const moodTheme = useMoodThemeStore();
const { t } = useI18n();
const activeTab = ref<'structured' | 'script'>('structured');
const copied = ref(false);

const SEVERITY_LABELS = computed(() => ({
  mild: t('crisisPrep.severity.mild'),
  moderate: t('crisisPrep.severity.moderate'),
  severe: t('crisisPrep.severity.severe'),
}));

const SEVERITY_COLORS: Record<string, string> = {
  mild: '#10b981',
  moderate: '#f59e0b',
  severe: '#ef4444',
};

function durationLabel(days: number): string {
  if (days <= 1) return t('crisisResult.durationLabels.lessThanDay');
  if (days <= 3) return t('crisisResult.durationLabels.twothreeDays');
  if (days <= 7) return t('crisisResult.durationLabels.aboutWeek');
  if (days <= 14) return t('crisisResult.durationLabels.aboutTwoWeeks');
  return t('crisisResult.durationLabels.overMonth');
}

// ── Structured text (for clipboard) ──
const structuredText = computed(() => {
  const lines: string[] = [];
  lines.push(`=== ${t('crisisResult.structuredHeader')} ===\n`);

  lines.push(t('crisisResult.structuredSymptoms'));
  for (const s of props.data.symptoms) {
    lines.push(`  ${s.emoji} ${s.label} — ${SEVERITY_LABELS.value[s.severity]}`);
  }

  lines.push(`\n${t('crisisResult.structuredDuration')}${durationLabel(props.data.durationDays)}`);

  if (props.data.trigger) {
    lines.push(`\n${t('crisisResult.structuredTrigger')}${props.data.trigger}`);
  }

  lines.push(`\n${t('crisisResult.structuredGoals')}`);
  for (const g of props.data.goals) {
    lines.push(`  ${g.emoji} ${g.label}`);
  }

  return lines.join('\n');
});

// ── Natural language script ──
const scriptText = computed(() => {
  const symptoms = props.data.symptoms;
  const mainSymptoms = symptoms.slice(0, 3).map(s => s.label).join('、');
  const extraCount = symptoms.length > 3 ? t('crisisResult.scriptExtraSymptoms', { count: symptoms.length - 3 }) : '';

  const duration = durationLabel(props.data.durationDays);
  const severity = symptoms.some(s => s.severity === 'severe') ? t('crisisResult.scriptSeveritySevere')
    : symptoms.some(s => s.severity === 'moderate') ? t('crisisResult.scriptSeverityModerate') : t('crisisResult.scriptSeverityMild');

  const goals = props.data.goals.map(g => g.label.replace('希望', '').replace('需要', '')).join('，');

  let script = `${t('crisisResult.scriptGreeting')}\n\n`;
  script += t('crisisResult.scriptIntroduction', { duration, mainSymptoms });
  if (extraCount) script += `，${extraCount}`;
  script += `。${t('crisisResult.scriptSeverity', { severity })}\n\n`;

  if (props.data.trigger) {
    script += `${t('crisisResult.scriptTrigger', { trigger: props.data.trigger })}\n\n`;
  }

  script += t('crisisResult.scriptGoal', { goals });

  return script;
});

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    // Fallback: select text
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  }
}
</script>

<template>
  <div class="result-container animate-float-in">
    <h2 class="result-title">{{ t('crisisResult.title') }}</h2>

    <!-- Tab switcher -->
    <div class="tab-selector mb-4">
      <button :class="{ active: activeTab === 'structured' }" @click="activeTab = 'structured'">
        📋 {{ t('crisisResult.tabStructured') }}
      </button>
      <button :class="{ active: activeTab === 'script' }" @click="activeTab = 'script'">
        💬 {{ t('crisisResult.tabScript') }}
      </button>
    </div>

    <!-- Tab 1: Structured -->
    <div v-if="activeTab === 'structured'" class="result-card">
      <div class="result-section">
        <h3 class="section-label">📋 {{ t('crisisResult.sectionSymptoms') }}</h3>
        <div class="symptom-tags">
          <span
            v-for="s in data.symptoms"
            :key="s.id"
            class="symptom-tag"
          >
            {{ s.emoji }} {{ s.label }}
            <span
              class="sev-badge"
              :style="{ background: SEVERITY_COLORS[s.severity] + '20', color: SEVERITY_COLORS[s.severity] }"
            >
              {{ SEVERITY_LABELS[s.severity] }}
            </span>
          </span>
        </div>
      </div>

      <div class="result-section">
        <h3 class="section-label">⏱ {{ t('crisisResult.sectionDuration') }}</h3>
        <p class="section-value">{{ durationLabel(data.durationDays) }}</p>
      </div>

      <div v-if="data.trigger" class="result-section">
        <h3 class="section-label">💡 {{ t('crisisResult.sectionTrigger') }}</h3>
        <p class="section-value">{{ data.trigger }}</p>
      </div>

      <div class="result-section">
        <h3 class="section-label">🎯 {{ t('crisisResult.sectionGoals') }}</h3>
        <div class="goal-tags">
          <span v-for="g in data.goals" :key="g.id" class="goal-tag">
            {{ g.emoji }} {{ g.label }}
          </span>
        </div>
      </div>

      <button class="copy-btn" @click="copyText(structuredText)">
        {{ copied ? `✓ ${t('common.copied')}` : `📋 ${t('crisisResult.copyAll')}` }}
      </button>
    </div>

    <!-- Tab 2: Script -->
    <div v-if="activeTab === 'script'" class="result-card">
      <p class="script-intro" style="color: var(--text-muted);">
        {{ t('crisisResult.scriptIntro') }}
      </p>
      <div class="script-text">
        {{ scriptText }}
      </div>
      <button class="copy-btn" @click="copyText(scriptText)">
        {{ copied ? `✓ ${t('common.copied')}` : `📋 ${t('crisisResult.copyScript')}` }}
      </button>
    </div>

    <!-- Action buttons -->
    <div class="action-buttons mt-4">
      <a href="tel:988" class="call-btn btn-primary">
        {{ t('crisisResult.call988') }}
      </a>
      <a href="sms:988" class="sms-btn btn-secondary">
        {{ t('crisisResult.sms988') }}
      </a>
    </div>

    <button class="start-over-btn" @click="emit('start-over')">
      {{ t('crisisResult.startOver') }}
    </button>
  </div>
</template>

<style scoped>
.result-container { margin-top: 1rem; }
.result-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.result-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 1.25rem;
  padding: 1.25rem;
  backdrop-filter: blur(8px);
}

.result-section {
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
}
.result-section:last-of-type { border-bottom: none; margin-bottom: 0.5rem; }

.section-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}
.section-value {
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.5;
}

.symptom-tags, .goal-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.symptom-tag, .goal-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  padding: 0.3rem 0.6rem;
  border-radius: 0.5rem;
  background: var(--mood-hover-bg);
  color: var(--text-primary);
}
.sev-badge {
  font-size: 0.6rem;
  padding: 0.1rem 0.35rem;
  border-radius: 0.3rem;
  font-weight: 500;
}

.script-intro { font-size: 0.75rem; margin-bottom: 0.75rem; }
.script-text {
  font-size: 0.85rem;
  line-height: 1.7;
  color: var(--text-primary);
  white-space: pre-wrap;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.75rem;
  border: 1px solid var(--border-subtle);
}

.copy-btn {
  display: block;
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.6rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--mood-accent);
  background: var(--mood-hover-bg);
  border: 1px solid var(--mood-accent);
  border-opacity: 0.3;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
.copy-btn:hover { background: var(--mood-nav-active); }

.action-buttons {
  display: flex;
  gap: 0.75rem;
}
.call-btn, .sms-btn {
  flex: 1;
  text-align: center;
  text-decoration: none;
  font-size: 0.9rem;
}

.start-over-btn {
  display: block;
  margin: 1rem auto 0;
  font-size: 0.75rem;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
}
.start-over-btn:hover { color: var(--text-secondary); }
</style>
