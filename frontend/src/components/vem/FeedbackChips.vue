<script setup lang="ts">
/**
 * FeedbackChips — VEM 微反馈胶囊
 *
 * 当 VEM 推送了一个值得验证的假设时，显示 3 个选项 + 跳过按钮。
 * 用户点击后回流到后端 /api/vem/micro-feedback。
 * 一天最多显示一次，通过 localStorage 控制。
 *
 * 设计原则：用户只需要点 1 下，不打字。
 */
import { ref, onMounted } from 'vue';
import { getFeedbackPrompt, submitMicroFeedback, type VEMFeedbackPrompt } from '@/api/vem';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useI18n } from '@/i18n';

const { t } = useI18n();
const moodTheme = useMoodThemeStore();

const prompt = ref<VEMFeedbackPrompt | null>(null);
const submitted = ref(false);
const dismissed = ref(false);
const selectedChip = ref<string | null>(null);

const STORAGE_KEY = 'igotu_vem_feedback_date';

function alreadyRespondedToday(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;
  return stored === new Date().toISOString().split('T')[0];
}

function markRespondedToday(): void {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString().split('T')[0]);
}

// 默认 chips（当 VEM 没有返回 chips 时）
const defaultChips = [
  { id: 'yes', label: '', emoji: '✅' },
  { id: 'no', label: '', emoji: '❌' },
  { id: 'partial', label: '', emoji: '🤔' },
];

async function handleChip(chipId: string) {
  if (!prompt.value?.prompt_id) return;
  selectedChip.value = chipId;

  try {
    await submitMicroFeedback({
      prompt_id: prompt.value.prompt_id,
      chip_id: chipId,
      source: 'igotu_home',
    });
  } catch {
    // 静默失败，不阻塞用户
  }

  markRespondedToday();
  submitted.value = true;

  // 2 秒后淡出
  setTimeout(() => {
    dismissed.value = true;
  }, 2000);
}

function handleSkip() {
  markRespondedToday();
  dismissed.value = true;
}

onMounted(async () => {
  if (alreadyRespondedToday()) {
    dismissed.value = true;
    return;
  }

  try {
    const data = await getFeedbackPrompt();
    if (data.available && data.prompt_id) {
      prompt.value = data;
    }
  } catch {
    // VEM 不可用时静默处理
  }
});
</script>

<template>
  <Transition name="fade-slide">
    <div
      v-if="prompt?.available && !dismissed"
      class="card animate-float-in feedback-card"
    >
      <!-- 问题 -->
      <p class="text-sm mb-3" style="color: var(--text-primary);">
        {{ prompt.question || t('vem.defaultQuestion') }}
      </p>

      <!-- Chips -->
      <div v-if="!submitted" class="flex items-center gap-2 flex-wrap">
        <button
          v-for="chip in (prompt.chips || defaultChips)"
          :key="chip.id"
          @click="handleChip(chip.id)"
          class="chip-btn"
          :style="{ borderColor: moodTheme.palette.accent + '40' }"
        >
          <span>{{ chip.emoji }}</span>
          <span v-if="chip.label" class="text-xs">{{ chip.label }}</span>
        </button>

        <button
          @click="handleSkip"
          class="text-xs ml-auto"
          style="color: var(--text-muted);"
        >
          {{ t('common.skip') }}
        </button>
      </div>

      <!-- 提交后感谢 -->
      <div v-else class="text-sm text-center py-1" :style="{ color: moodTheme.palette.accent }">
        {{ t('vem.thanksFeedback') }}
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.feedback-card {
  padding: 14px 16px;
}

.chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid;
  background: var(--bg-secondary, rgba(255,255,255,0.03));
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.chip-btn:hover {
  background: var(--mood-glow, rgba(255,255,255,0.08));
  transform: translateY(-1px);
}

.chip-btn:active {
  transform: scale(0.95);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
