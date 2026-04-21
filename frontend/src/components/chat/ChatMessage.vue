<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import ChoiceButtons from './ChoiceButtons.vue';

const props = defineProps<{
  role: 'user' | 'assistant';
  content: string;
  isLast?: boolean;
}>();

const isVisible = ref(false);
onMounted(() => {
  // Tiny delay → triggers CSS transition for entrance animation
  requestAnimationFrame(() => { isVisible.value = true; });
});

const emit = defineEmits<{
  selectChoice: [text: string];
}>();

function parseChoices(text: string): { body: string; choices: { key: string; text: string }[] } {
  const fencedMatch = text.match(/```choices\n([\s\S]*?)```/);
  if (fencedMatch) {
    const body = text.slice(0, fencedMatch.index).trim();
    const remainder = text.slice((fencedMatch.index || 0) + fencedMatch[0].length).trim();
    const fullBody = remainder ? (body ? body + '\n' + remainder : remainder) : body;
    const choices: { key: string; text: string }[] = [];
    for (const line of fencedMatch[1].trim().split('\n')) {
      const m = line.trim().match(/^([A-F])\.\s*(.+)/);
      if (m) choices.push({ key: m[1], text: m[2] });
    }
    return { body: fullBody, choices };
  }

  const lines = text.split('\n');
  const bodyLines: string[] = [];
  const choiceItems: { key: string; text: string }[] = [];
  let inChoices = false;

  for (const line of lines) {
    const m = line.trim().match(/^([A-F])\.\s*(.+)/);
    if (m) {
      inChoices = true;
      choiceItems.push({ key: m[1], text: m[2] });
    } else {
      if (inChoices && line.trim() === '') continue;
      if (inChoices && !m) inChoices = false;
      bodyLines.push(line);
    }
  }

  if (choiceItems.length > 0) {
    return { body: bodyLines.join('\n').trim(), choices: choiceItems };
  }

  return { body: text, choices: [] };
}

const parsed = computed(() => {
  if (props.role === 'assistant') return parseChoices(props.content);
  return { body: props.content, choices: [] };
});
</script>

<template>
  <div
    class="flex gap-3 mb-4 chat-bubble-entrance"
    :class="[
      role === 'user' ? 'flex-row-reverse from-right' : 'from-left',
      isVisible ? 'entered' : '',
    ]"
  >
    <!-- Avatar -->
    <div
      class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg"
      :style="role === 'assistant'
        ? { background: 'var(--mood-accent-soft)' }
        : { background: 'var(--bg-card)' }"
    >
      {{ role === 'assistant' ? '🌱' : '🙂' }}
    </div>

    <!-- Bubble -->
    <div
      class="max-w-[min(80%,640px)] rounded-2xl px-4 py-3 text-sm leading-relaxed"
      :style="role === 'user'
        ? { background: 'var(--mood-hover-bg)', color: 'var(--text-primary)', borderRadius: '1rem 0.25rem 1rem 1rem' }
        : { background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '0.25rem 1rem 1rem 1rem' }"
    >
      <div
        class="whitespace-pre-wrap"
        :class="{ 'text-shimmer': role === 'assistant' && isVisible }"
      >{{ parsed.body }}</div>

      <ChoiceButtons
        v-if="role === 'assistant' && parsed.choices.length > 0 && isLast"
        :choices="parsed.choices"
        @select="emit('selectChoice', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-bubble-entrance {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  opacity: 0;
}
.chat-bubble-entrance.from-left  { transform: translateX(-16px); }
.chat-bubble-entrance.from-right { transform: translateX(16px); }
.chat-bubble-entrance.entered {
  opacity: 1;
  transform: translateX(0);
}

/* C11: Text shimmer — single-pass gradient sweep on assistant messages */
.text-shimmer {
  background: linear-gradient(
    90deg,
    var(--text-primary) 0%,
    var(--text-primary) 35%,
    var(--mood-nav-active-text) 50%,
    var(--text-primary) 65%,
    var(--text-primary) 100%
  );
  background-size: 250% 100%;
  background-position: 100% 0;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: text-shimmer-sweep 2s ease 0.6s 1 forwards;
}

@keyframes text-shimmer-sweep {
  0% { background-position: 100% 0; }
  100% { background-position: -50% 0; }
}

/* Low-energy: disable shimmer */
:global(body.low-energy) .text-shimmer {
  animation: none;
  background: none;
  -webkit-text-fill-color: var(--text-primary);
}

@media (prefers-reduced-motion: reduce) {
  .chat-bubble-entrance {
    transition: none !important;
    opacity: 1;
    transform: none;
  }
  .text-shimmer {
    animation: none !important;
    background: none !important;
    -webkit-text-fill-color: var(--text-primary) !important;
  }
}
</style>
