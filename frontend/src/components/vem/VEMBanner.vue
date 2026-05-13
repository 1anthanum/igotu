<script setup lang="ts">
/**
 * VEMBanner — 首页"今日能量"横幅
 *
 * 拉取 VEM daily-summary，显示 5 个能量指数环 + 天气预报一句话。
 * VEM 不可用时静默隐藏，不影响正常使用体验。
 * 高度固定 80px，放在 HomePage 顶部。
 */
import { ref, onMounted } from 'vue';
import { getDailySummary, type VEMDailySummary } from '@/api/vem';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useI18n } from '@/i18n';

const { t } = useI18n();
const moodTheme = useMoodThemeStore();

const summary = ref<VEMDailySummary | null>(null);
const loading = ref(true);

const indices = [
  { key: 'vitality', emoji: '⚡', labelKey: 'vem.vitality' },
  { key: 'stress', emoji: '🔥', labelKey: 'vem.stress' },
  { key: 'clarity', emoji: '💎', labelKey: 'vem.clarity' },
  { key: 'momentum', emoji: '🚀', labelKey: 'vem.momentum' },
  { key: 'recovery', emoji: '🌿', labelKey: 'vem.recovery' },
];

function getIndexValue(key: string): number | null {
  if (!summary.value) return null;
  const val = (summary.value as Record<string, unknown>)[key];
  return typeof val === 'number' ? Math.round(val) : null;
}

function getCircleProgress(value: number | null): string {
  if (value === null) return '0';
  const circumference = 2 * Math.PI * 14; // r=14
  const progress = Math.max(0, Math.min(100, value)) / 100;
  return `${circumference * progress} ${circumference * (1 - progress)}`;
}

onMounted(async () => {
  try {
    const data = await getDailySummary();
    if (data.available) {
      summary.value = data;
    }
  } catch {
    // VEM 不可用时静默处理
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <!-- 仅在 VEM 可用且有数据时显示 -->
  <div
    v-if="summary?.available"
    class="vem-banner card animate-float-in"
  >
    <!-- 天气 emoji + 预报文案 -->
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xl">{{ summary.weather_emoji || '🌤️' }}</span>
      <p class="text-sm flex-1" style="color: var(--text-secondary);">
        {{ summary.insight_text || t('vem.defaultInsight') }}
      </p>
    </div>

    <!-- 5 个指数环 -->
    <div class="flex justify-between px-2">
      <div
        v-for="idx in indices"
        :key="idx.key"
        class="flex flex-col items-center gap-1"
      >
        <div class="relative w-9 h-9">
          <svg viewBox="0 0 32 32" class="w-full h-full -rotate-90">
            <!-- 背景环 -->
            <circle
              cx="16" cy="16" r="14"
              fill="none"
              stroke="var(--bg-secondary, rgba(255,255,255,0.05))"
              stroke-width="2.5"
            />
            <!-- 进度环 -->
            <circle
              cx="16" cy="16" r="14"
              fill="none"
              :stroke="moodTheme.palette.accent"
              stroke-width="2.5"
              stroke-linecap="round"
              :stroke-dasharray="getCircleProgress(getIndexValue(idx.key))"
              class="transition-all duration-700"
            />
          </svg>
          <span class="absolute inset-0 flex items-center justify-center text-xs font-medium" style="color: var(--text-primary);">
            {{ getIndexValue(idx.key) ?? '–' }}
          </span>
        </div>
        <span class="text-[10px]" style="color: var(--text-muted);">
          {{ t(idx.labelKey) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vem-banner {
  padding: 12px 16px;
}
</style>
