<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { saveCognitiveRecord } from '@/api/toolbox';

const router = useRouter();
const moodTheme = useMoodThemeStore();

const DISTORTIONS = [
  { name: '全或无思维', desc: '非黑即白，没有中间地带' },
  { name: '过度概括', desc: '从一件事推导出全局结论' },
  { name: '心理过滤', desc: '只关注负面，忽略正面' },
  { name: '读心术', desc: '猜测别人在想什么' },
  { name: '灾难化', desc: '自动往最坏的方向想' },
  { name: '应该思维', desc: '"我应该""我必须"' },
  { name: '贴标签', desc: '给自己定性，而非描述行为' },
  { name: '个人化', desc: '把不是你的责任揽到自己身上' },
];

const EMOTIONS = ['焦虑', '自我厌恶', '无望', '悲伤', '愤怒', '羞耻', '空虚', '恐惧', '内疚'];

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

const STEP_LABELS = ['捕捉想法', '识别情绪', '识别认知扭曲', '支持证据', '反面证据', '平衡思考'];

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
    case 0: return thought.value || '（未填写）';
    case 1: return selectedEmotions.value.join('、') || '（未选择）';
    case 2: return selectedDistortions.value.join('、') || '（未选择）';
    case 3: return supportingEvidence.value || '（未填写）';
    case 4: return counterEvidence.value || '（未填写）';
    case 5: return balancedThought.value || '（未填写）';
    default: return '';
  }
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

    <h1 class="text-xl font-semibold mb-1" style="color: var(--text-primary);">想法检验</h1>
    <p class="text-sm mb-2" style="color: var(--text-secondary);">
      {{ moodTheme.isLowEnergy ? '一步一步来，不用急' : '用认知行为疗法的方法，检验你脑海中的想法' }}
    </p>
    <p v-if="moodTheme.isLowEnergy" class="text-xs mb-6" style="color: var(--text-muted);">
      写多写少都可以，写不出来也没关系
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
        <h2 class="text-xl font-semibold" :style="{ color: moodTheme.palette.accent }">分析完成</h2>
        <p class="text-sm" style="color: var(--text-secondary);">每一次检验那个声音，你都在削弱它的力量。</p>
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
        <button @click="restart" class="btn-secondary flex-1">再做一次</button>
        <button @click="router.push('/toolbox')" class="btn-ghost flex-1">返回工具箱</button>
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
        <h2 class="text-base font-medium mb-2" style="color: var(--text-primary);">第1步：捕捉想法</h2>
        <p class="text-sm mb-3" style="color: var(--text-secondary);">写下那个让你难受的想法，原封不动地写。</p>
        <textarea v-model="thought" placeholder="例如：我什么都做不好..." class="input-field w-full text-sm resize-none" rows="4" />
      </div>

      <!-- Step 1: Identify emotions -->
      <div v-else-if="step === 1" class="animate-float-in" :key="'s1'">
        <h2 class="text-base font-medium mb-2" style="color: var(--text-primary);">第2步：识别情绪</h2>
        <p class="text-sm mb-3" style="color: var(--text-secondary);">这个想法带来了什么情绪？（可以多选）</p>
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
          <label class="text-sm" style="color: var(--text-secondary);">情绪强度 (1-10)</label>
          <input type="range" v-model.number="intensity" min="1" max="10" class="range-slider w-full mt-1" />
          <p class="text-xs text-right" :style="{ color: moodTheme.palette.accent }">{{ intensity }}</p>
        </div>
      </div>

      <!-- Step 2: Identify distortions -->
      <div v-else-if="step === 2" class="animate-float-in" :key="'s2'">
        <h2 class="text-base font-medium mb-2" style="color: var(--text-primary);">第3步：识别认知扭曲</h2>
        <p class="text-sm mb-3" style="color: var(--text-secondary);">这个想法可能用了哪种认知扭曲？（可以多选）</p>
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
        <h2 class="text-base font-medium mb-2" style="color: var(--text-primary);">第4步：寻找支持证据</h2>
        <p class="text-sm mb-3" style="color: var(--text-secondary);">有什么证据支持这个想法？尽量客观，写事实而非感受。</p>
        <textarea v-model="supportingEvidence" placeholder="尽量写事实，不是感受..." class="input-field w-full text-sm resize-none" rows="4" />
      </div>

      <!-- Step 4: Counter evidence -->
      <div v-else-if="step === 4" class="animate-float-in" :key="'s4'">
        <h2 class="text-base font-medium mb-2" style="color: var(--text-primary);">第5步：反面证据</h2>
        <p class="text-sm mb-3" style="color: var(--text-secondary);">有什么证据反驳这个想法？想想过去的经历。</p>
        <textarea v-model="counterEvidence" placeholder="哪些经历跟这个想法矛盾..." class="input-field w-full text-sm resize-none" rows="4" />
      </div>

      <!-- Step 5: Balanced thought -->
      <div v-else-if="step === 5" class="animate-float-in" :key="'s5'">
        <h2 class="text-base font-medium mb-2" style="color: var(--text-primary);">第6步：平衡思考</h2>
        <p class="text-sm mb-3" style="color: var(--text-secondary);">基于以上分析，一个<strong>更准确</strong>（不是更乐观——是更准确）的想法是什么？</p>

        <div v-if="thought" class="card p-3 mb-3 text-sm" style="color: var(--text-muted);">
          原始想法：{{ thought }}
        </div>

        <textarea v-model="balancedThought" placeholder="一个更接近事实的描述..." class="input-field w-full text-sm resize-none" rows="4" />

        <div class="mt-4">
          <label class="text-sm" style="color: var(--text-secondary);">现在情绪强度 (1-10)</label>
          <input type="range" v-model.number="intensityAfter" min="1" max="10" class="range-slider w-full mt-1" />
          <p class="text-xs text-right" :style="{ color: moodTheme.palette.accent }">{{ intensityAfter }}</p>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex gap-3">
        <button v-if="step > 0" @click="prev" class="btn-secondary flex-1">← 上一步</button>
        <button @click="next" class="btn-primary flex-1">
          {{ step < 5 ? '下一步 →' : '完成检验' }}
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

<style scoped>
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
