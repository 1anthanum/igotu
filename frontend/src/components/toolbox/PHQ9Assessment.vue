<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { submitPHQ9, getPHQ9History, type PHQ9Result } from '@/api/toolbox';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const router = useRouter();
const moodTheme = useMoodThemeStore();

const QUESTIONS = [
  { text: '做事时提不起劲或没有兴趣', emoji: '😶', short: '提不起劲' },
  { text: '感到心情低落、沮丧或绝望', emoji: '😔', short: '心情低落' },
  { text: '入睡困难、睡不安稳或睡眠过多', emoji: '🌙', short: '睡眠问题' },
  { text: '感觉疲倦或没有活力', emoji: '🔋', short: '没有活力' },
  { text: '食欲不振或吃太多', emoji: '🍽️', short: '食欲变化' },
  { text: '觉得自己很糟糕——或觉得自己很失败，或让自己或家人失望', emoji: '💭', short: '自我否定' },
  { text: '对事物专注有困难，例如阅读报纸或看电视时', emoji: '🔍', short: '难以专注' },
  { text: '动作或说话速度缓慢到别人已经察觉？或正好相反——坐立不安、动来动去的情况比平常更多', emoji: '🐢', short: '行为变化' },
  { text: '有不如死掉或用某种方式伤害自己的念头', emoji: '🆘', short: '自伤念头' },
];

const OPTIONS = [
  { label: '完全没有', value: 0 },
  { label: '有几天', value: 1 },
  { label: '一半以上天数', value: 2 },
  { label: '几乎每天', value: 3 },
];

const FUNC_QUESTION = '这些问题给你的工作、家务或与他人相处造成了多大的困难？';
const FUNC_OPTIONS = ['没有困难', '有些困难', '很困难', '极其困难'];

const SEVERITY_LEVELS = [
  { min: 0, max: 4, label: '极轻微', color: '#6EE7B7', desc: '你的症状处于最低范围。继续关注自己的状态，保持现有的健康习惯。' },
  { min: 5, max: 9, label: '轻度抑郁', color: '#FCD34D', desc: '你可能正在经历轻度抑郁症状。建议持续观察，如果症状持续两周以上，考虑咨询专业人士。' },
  { min: 10, max: 14, label: '中度抑郁', color: '#FB923C', desc: '你的症状已达到中度水平。建议尽快与你的医生或心理咨询师讨论，评估是否需要调整治疗方案。' },
  { min: 15, max: 19, label: '中重度抑郁', color: '#FDA4AF', desc: '你正在经历较为严重的抑郁症状。强烈建议与你的精神科医生沟通，可能需要调整药物或增加心理治疗。' },
  { min: 20, max: 27, label: '重度抑郁', color: '#EF4444', desc: '你的症状处于严重水平。请尽快联系你的医生。如果你有自伤想法，请立即寻求专业帮助。' },
];

const step = ref(0);
const answers = ref<Record<number, number>>({});
const funcImpact = ref<number | null>(null);
const isDone = ref(false);
const saving = ref(false);
const saved = ref(false);
const history = ref<PHQ9Result[]>([]);

const score = computed(() => Object.values(answers.value).reduce((s, v) => s + v, 0));
const severity = computed(() => {
  for (const level of SEVERITY_LEVELS) {
    if (score.value >= level.min && score.value <= level.max) return level;
  }
  return SEVERITY_LEVELS[SEVERITY_LEVELS.length - 1];
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
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  history.value = await getPHQ9History();
});

function formatDate(ts: string) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getSeverityColor(s: string) {
  return SEVERITY_LEVELS.find(l => l.label === s)?.color || '#A1A1AA';
}
</script>

<template>
  <div class="py-6 max-w-2xl mx-auto px-4">
    <!-- Back button -->
    <button
      @click="router.push('/toolbox')"
      class="text-sm mb-4 flex items-center gap-1 transition-colors"
      style="color: var(--text-muted);"
      @mouseenter="($event.target as HTMLElement).style.color = 'var(--text-primary)'"
      @mouseleave="($event.target as HTMLElement).style.color = 'var(--text-muted)'"
    >
      ← 返回工具箱
    </button>

    <h1 class="text-xl font-semibold mb-1" style="color: var(--text-primary);">PHQ-9 自评</h1>
    <p class="text-sm mb-2" style="color: var(--text-muted);">过去两周内，以下问题困扰你的频率是？</p>
    <p class="text-xs mb-6" style="color: var(--text-muted);">
      {{ moodTheme.isLowEnergy ? '慢慢来，随时可以停下。' : '这不是考试，没有对错。' }}
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
        <div v-for="lv in SEVERITY_LEVELS" :key="lv.label" class="text-center">
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
        你在第9题（自伤想法）报告了非零分数。请务必与你的医生讨论这一点。
      </div>

      <!-- Functional impact display -->
      <div v-if="funcImpact !== null" class="card p-4 text-sm">
        <span style="color: var(--text-muted);">功能影响：</span>
        <span style="color: var(--text-primary);" class="font-medium">{{ FUNC_OPTIONS[funcImpact] }}</span>
      </div>

      <!-- Actions -->
      <div class="grid grid-cols-2 gap-3">
        <button @click="saveResult" :disabled="saving || saved" class="btn-primary">
          {{ saved ? '已保存 ✓' : saving ? '保存中...' : '保存结果' }}
        </button>
        <button @click="restart" class="btn-secondary">重新评估</button>
      </div>

      <p class="text-xs text-center" style="color: var(--text-muted);">
        PHQ-9 是筛查工具，不是诊断。分数反映的是过去两周的症状频率。请将结果带给你的医生或心理咨询师讨论。
      </p>

      <!-- History -->
      <div v-if="history.length > 0" class="card p-4 animate-float-in" style="animation-delay: 0.3s;">
        <h3 class="text-sm font-medium mb-3" style="color: var(--text-muted);">历史记录</h3>
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
      <p class="font-medium" style="color: var(--text-primary);">附加问题</p>
      <p class="text-sm" style="color: var(--text-muted);">{{ FUNC_QUESTION }}</p>
      <div class="space-y-2">
        <button
          v-for="(opt, i) in FUNC_OPTIONS"
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
          ← 上一题
        </button>
        <button @click="isDone = true" class="safe-exit-hint text-xs">
          跳过这一题，直接看结果 →
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
          v-for="(q, i) in QUESTIONS"
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
          <span class="text-3xl">{{ QUESTIONS[step].emoji }}</span>
        </div>
        <p
          class="text-center font-medium"
          :class="moodTheme.isLowEnergy ? 'text-base' : 'text-lg'"
          style="color: var(--text-primary);"
        >
          {{ moodTheme.isLowEnergy ? QUESTIONS[step].short : QUESTIONS[step].text }}
        </p>
        <p v-if="moodTheme.isLowEnergy" class="text-xs text-center mt-1" style="color: var(--text-muted);">
          {{ QUESTIONS[step].text }}
        </p>
      </div>

      <div :class="moodTheme.isLowEnergy ? 'space-y-3' : 'space-y-2'">
        <button
          v-for="opt in OPTIONS"
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
          ← 上一题
        </button>
        <span v-else />
        <button
          @click="router.push('/toolbox')"
          class="safe-exit-hint text-xs"
        >
          稍后再说 · 进度已保存 →
        </button>
      </div>
    </div>
  </div>
</template>
