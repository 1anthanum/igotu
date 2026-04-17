<script setup lang="ts">
import type { AchievementTemplate } from '@/types/achievement';

defineProps<{
  templates: AchievementTemplate[];
  loading: boolean;
}>();

const emit = defineEmits<{
  select: [template: AchievementTemplate];
}>();
</script>

<template>
  <div class="grid grid-cols-4 gap-2">
    <button
      v-for="template in templates"
      :key="template.id"
      @click="emit('select', template)"
      :disabled="loading"
      class="template-chip"
    >
      <span class="text-2xl">{{ template.emoji || '✨' }}</span>
      <span class="text-xs font-medium leading-tight text-center" style="color: var(--text-primary);">
        {{ template.title }}
      </span>
    </button>
  </div>
</template>
