<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

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
const activeTab = ref<'structured' | 'script'>('structured');
const copied = ref(false);

const SEVERITY_LABELS: Record<string, string> = {
  mild: '轻度',
  moderate: '中度',
  severe: '严重',
};

const SEVERITY_COLORS: Record<string, string> = {
  mild: '#10b981',
  moderate: '#f59e0b',
  severe: '#ef4444',
};

function durationLabel(days: number): string {
  if (days <= 1) return '不到一天';
  if (days <= 3) return '2-3天';
  if (days <= 7) return '大约一周';
  if (days <= 14) return '大约两周';
  return '超过一个月';
}

// ── Structured text (for clipboard) ──
const structuredText = computed(() => {
  const lines: string[] = [];
  lines.push('=== 988 电话准备信息 ===\n');

  lines.push('【主要症状】');
  for (const s of props.data.symptoms) {
    lines.push(`  ${s.emoji} ${s.label} — ${SEVERITY_LABELS[s.severity]}`);
  }

  lines.push(`\n【持续时间】${durationLabel(props.data.durationDays)}`);

  if (props.data.trigger) {
    lines.push(`\n【触发因素】${props.data.trigger}`);
  }

  lines.push('\n【求助目标】');
  for (const g of props.data.goals) {
    lines.push(`  ${g.emoji} ${g.label}`);
  }

  return lines.join('\n');
});

// ── Natural language script ──
const scriptText = computed(() => {
  const symptoms = props.data.symptoms;
  const mainSymptoms = symptoms.slice(0, 3).map(s => s.label).join('、');
  const extraCount = symptoms.length > 3 ? `还有其他${symptoms.length - 3}个问题` : '';

  const duration = durationLabel(props.data.durationDays);
  const severity = symptoms.some(s => s.severity === 'severe') ? '比较严重'
    : symptoms.some(s => s.severity === 'moderate') ? '中等程度' : '还算可以控制';

  const goals = props.data.goals.map(g => g.label.replace('希望', '').replace('需要', '')).join('，');

  let script = `你好，我想说一下我最近的情况。\n\n`;
  script += `我大概有${duration}一直在经历${mainSymptoms}`;
  if (extraCount) script += `，${extraCount}`;
  script += `。程度上我觉得${severity}。\n\n`;

  if (props.data.trigger) {
    script += `我觉得可能和这些有关：${props.data.trigger}\n\n`;
  }

  script += `我打电话是想${goals}。`;

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
    <h2 class="result-title">你的电话准备信息</h2>

    <!-- Tab switcher -->
    <div class="tab-selector mb-4">
      <button :class="{ active: activeTab === 'structured' }" @click="activeTab = 'structured'">
        📋 结构化信息
      </button>
      <button :class="{ active: activeTab === 'script' }" @click="activeTab = 'script'">
        💬 通话脚本
      </button>
    </div>

    <!-- Tab 1: Structured -->
    <div v-if="activeTab === 'structured'" class="result-card">
      <div class="result-section">
        <h3 class="section-label">📋 主要症状</h3>
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
        <h3 class="section-label">⏱ 持续时间</h3>
        <p class="section-value">{{ durationLabel(data.durationDays) }}</p>
      </div>

      <div v-if="data.trigger" class="result-section">
        <h3 class="section-label">💡 触发因素</h3>
        <p class="section-value">{{ data.trigger }}</p>
      </div>

      <div class="result-section">
        <h3 class="section-label">🎯 求助目标</h3>
        <div class="goal-tags">
          <span v-for="g in data.goals" :key="g.id" class="goal-tag">
            {{ g.emoji }} {{ g.label }}
          </span>
        </div>
      </div>

      <button class="copy-btn" @click="copyText(structuredText)">
        {{ copied ? '✓ 已复制' : '📋 复制全文' }}
      </button>
    </div>

    <!-- Tab 2: Script -->
    <div v-if="activeTab === 'script'" class="result-card">
      <p class="script-intro" style="color: var(--text-muted);">
        你可以在打电话前读一读，或者直接念出来：
      </p>
      <div class="script-text">
        {{ scriptText }}
      </div>
      <button class="copy-btn" @click="copyText(scriptText)">
        {{ copied ? '✓ 已复制' : '📋 复制脚本' }}
      </button>
    </div>

    <!-- Action buttons -->
    <div class="action-buttons mt-4">
      <a href="tel:988" class="call-btn btn-primary">
        📞 拨打 988
      </a>
      <a href="sms:988" class="sms-btn btn-secondary">
        💬 发短信到 988
      </a>
    </div>

    <button class="start-over-btn" @click="emit('start-over')">
      重新填写
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
