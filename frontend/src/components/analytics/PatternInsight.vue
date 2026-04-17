<script setup lang="ts">
import type { PatternInsight } from '@/types/api';

defineProps<{
  insights: PatternInsight[];
}>();
</script>

<template>
  <div v-if="insights.length > 0" class="card">
    <h3 class="text-sm font-semibold mb-3" style="color: var(--text-primary);">你的模式</h3>
    <div class="space-y-3">
      <div
        v-for="(insight, i) in insights"
        :key="i"
        class="flex items-start gap-3 rounded-xl p-3 animate-float-in"
        :style="{ background: 'var(--mood-hover-bg)', animationDelay: `${i * 150}ms` }"
      >
        <span class="text-xl flex-shrink-0">{{ insight.icon }}</span>
        <p class="text-sm leading-relaxed" style="color: var(--text-secondary);">{{ insight.message }}</p>
      </div>
    </div>
  </div>
</template>
