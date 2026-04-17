<script setup lang="ts">
defineProps<{
  choices: { key: string; text: string }[];
}>();

const emit = defineEmits<{
  select: [text: string];
}>();
</script>

<template>
  <div class="flex flex-wrap gap-2 mt-3">
    <button
      v-for="choice in choices"
      :key="choice.key"
      @click="emit('select', choice.text)"
      class="px-3 py-2 text-sm rounded-xl transition-all active:scale-95"
      style="
        background: var(--mood-hover-bg);
        color: var(--mood-accent);
        border: 1px solid color-mix(in srgb, var(--mood-accent) 30%, transparent);
      "
    >
      {{ choice.key }}. {{ choice.text }}
    </button>
  </div>
</template>
