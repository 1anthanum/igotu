<script setup lang="ts">
import type { EncouragementMessage } from '@/types/api';

defineProps<{
  messages: EncouragementMessage[];
}>();
</script>

<template>
  <div v-if="messages.length > 0" class="space-y-2">
    <div
      v-for="(msg, i) in messages"
      :key="i"
      class="rounded-2xl px-5 py-4 animate-float-in"
      :style="{
        animationDelay: `${i * 100}ms`,
        background: 'linear-gradient(135deg, var(--mood-gradient-from), var(--mood-gradient-to))',
        border: '1px solid var(--border-subtle)',
      }"
    >
      <p class="text-sm leading-relaxed" style="color: var(--text-primary);">
        <span class="mr-1">{{ msg.icon }}</span>
        {{ msg.message }}
      </p>
    </div>
  </div>
</template>
