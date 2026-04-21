<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import type { Achievement } from '@/types/achievement';

const moodTheme = useMoodThemeStore();

const props = defineProps<{
  achievement: Achievement;
}>();

const emit = defineEmits<{
  delete: [id: string];
}>();

// B7: "Just planted" detection — if created within last 3 seconds
const isNew = ref(false);

onMounted(() => {
  const createdTime = new Date(props.achievement.created_at).getTime();
  if (Date.now() - createdTime < 3000) {
    isNew.value = true;
    setTimeout(() => { isNew.value = false; }, 1200);
  }
});

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
    <!-- Seed emoji with growth animation -->
    <span
      class="text-xl flex-shrink-0 seed-icon"
      :class="{ 'seed-pop': isNew }"
    >
      {{ achievement.emoji || '✨' }}
      <!-- Glow ring for new seeds -->
      <span
        v-if="isNew"
        class="seed-glow-ring"
        :style="{ borderColor: moodTheme.palette.accent }"
      />
    </span>

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

<style scoped>
.seed-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.seed-pop {
  animation: seed-grow 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.seed-glow-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid;
  opacity: 0;
  animation: seed-ring-expand 1s ease-out both;
  pointer-events: none;
}

@keyframes seed-grow {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.4); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes seed-ring-expand {
  0% { transform: scale(0.5); opacity: 0.6; }
  100% { transform: scale(2); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .seed-pop { animation: none; }
  .seed-glow-ring { animation: none; display: none; }
}
</style>
