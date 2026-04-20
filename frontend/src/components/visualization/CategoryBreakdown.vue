<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/i18n';

const { t } = useI18n();

const props = defineProps<{
  categoryCounts: Record<string, number>;
}>();

const categoryNames: Record<string, string> = {
  'self-care': '自我照顾',
  'movement': '运动/出门',
  'social': '社交',
  'nutrition': '饮食',
  'rest': '休息',
  'hygiene': '卫生',
  'productivity': '做事',
  'custom': '自定义',
};

const categoryColors: Record<string, string> = {
  'self-care': '#8b5cf6',
  'movement': '#10b981',
  'social': '#f59e0b',
  'nutrition': '#14b8a6',
  'rest': '#6366f1',
  'hygiene': '#34d399',
  'productivity': '#a78bfa',
  'custom': '#3a7a64',
};

const total = computed(() =>
  Object.values(props.categoryCounts).reduce((a, b) => a + b, 0)
);

const sorted = computed(() =>
  Object.entries(props.categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, count]) => ({
      category: cat,
      name: categoryNames[cat] || cat,
      count,
      color: categoryColors[cat] || '#6b7280',
      percent: total.value > 0 ? Math.round((count / total.value) * 100) : 0,
    }))
);
</script>

<template>
  <div class="card" v-if="total > 0">
    <h3 class="text-sm font-semibold mb-4" style="color: var(--text-primary);">{{ t('visualization.categoryBreakdown') }}</h3>
    <div class="space-y-3">
      <div v-for="item in sorted" :key="item.category" class="flex items-center gap-3">
        <div class="w-20 text-xs truncate" style="color: var(--text-muted);">{{ item.name }}</div>
        <div class="flex-1 h-5 rounded-full overflow-hidden" style="background: rgba(100,220,180,0.06);">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{ width: `${item.percent}%`, backgroundColor: item.color }"
          />
        </div>
        <div class="w-12 text-xs text-right" style="color: var(--text-muted);">{{ item.count }}{{ t('visualization.times') }}</div>
      </div>
    </div>
  </div>
</template>
