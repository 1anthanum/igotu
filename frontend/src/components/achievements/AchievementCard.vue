<script setup lang="ts">
import type { Achievement } from '@/types/achievement';

defineProps<{
  achievement: Achievement;
}>();

const emit = defineEmits<{
  delete: [id: string];
}>();

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div
    class="flex items-center gap-3 py-3 px-4 rounded-xl animate-fade-in group transition-colors"
    style="background: var(--mood-hover-bg);"
  >
    <span class="text-xl flex-shrink-0">{{ achievement.emoji || '✨' }}</span>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium truncate" style="color: var(--text-primary);">{{ achievement.title }}</p>
      <p v-if="achievement.note" class="text-xs truncate mt-0.5" style="color: var(--text-muted);">{{ achievement.note }}</p>
    </div>
    <span class="text-xs flex-shrink-0" style="color: var(--text-muted);">{{ formatTime(achievement.created_at) }}</span>
    <button
      @click="emit('delete', achievement.id)"
      class="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity text-sm"
      style="color: var(--text-muted);"
      title="删除"
    >
      ×
    </button>
  </div>
</template>
