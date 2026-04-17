<script setup lang="ts">
import { ref } from 'vue';
import { useMoodStore } from '@/stores/mood';
import { MOOD_CONFIG } from '@/composables/useMoodTheme';

const moodStore = useMoodStore();
const note = ref('');
const showNote = ref(false);
const hoveredMood = ref<number | null>(null);

async function selectMood(mood: typeof MOOD_CONFIG[number]) {
  await moodStore.log({
    mood_score: mood.score,
    mood_emoji: mood.emoji,
    mood_label: mood.label,
    note: note.value || undefined,
  });
  note.value = '';
  showNote.value = false;
}
</script>

<template>
  <div class="card-glow p-6 animate-float-in" style="animation-delay: 0.1s;">
    <p class="text-sm mb-5" style="color: var(--text-secondary);">
      不用思考太多，选一个最接近此刻的感受。
    </p>

    <!-- Spectrum selector: bars with varying heights -->
    <div class="flex items-end justify-center gap-3">
      <button
        v-for="mood in MOOD_CONFIG"
        :key="mood.score"
        @click="selectMood(mood)"
        @mouseenter="hoveredMood = mood.score"
        @mouseleave="hoveredMood = null"
        class="mood-bar flex flex-col items-center gap-2 transition-all duration-300 active:scale-95"
        :style="{
          transform: hoveredMood === mood.score ? 'translateY(-6px)' : 'translateY(0)',
        }"
      >
        <!-- Bar -->
        <div
          class="rounded-xl transition-all duration-300"
          :style="{
            width: '40px',
            height: `${40 + mood.score * 16}px`,
            background: hoveredMood === mood.score
              ? `linear-gradient(to top, ${mood.color}40, ${mood.color})`
              : `linear-gradient(to top, ${mood.color}15, ${mood.color}60)`,
            boxShadow: hoveredMood === mood.score
              ? `0 0 20px ${mood.color}30, 0 0 40px ${mood.color}10`
              : 'none',
            border: `1px solid ${hoveredMood === mood.score ? mood.color + '60' : mood.color + '20'}`,
          }"
        />
        <!-- Emoji -->
        <span
          class="text-2xl transition-transform duration-300"
          :style="{ transform: hoveredMood === mood.score ? 'scale(1.3)' : 'scale(1)' }"
        >
          {{ mood.emoji }}
        </span>
        <!-- Label + metaphor -->
        <div class="text-center">
          <span
            class="text-xs block transition-colors"
            :style="{ color: hoveredMood === mood.score ? mood.color : 'var(--text-muted)' }"
          >
            {{ mood.label }}
          </span>
          <span
            v-if="hoveredMood === mood.score"
            class="text-[10px] block mt-0.5 animate-fade-in"
            :style="{ color: mood.color + 'aa' }"
          >
            {{ mood.metaphor }}
          </span>
        </div>
      </button>
    </div>

    <!-- Optional note -->
    <div class="mt-4">
      <button
        v-if="!showNote"
        @click="showNote = true"
        class="text-xs transition-colors"
        style="color: var(--text-muted);"
      >
        + 添加备注
      </button>
      <textarea
        v-else
        v-model="note"
        placeholder="想说点什么吗？（可选）"
        class="input-field w-full text-sm resize-none"
        rows="2"
      />
    </div>

    <!-- Success feedback -->
    <transition name="page">
      <div
        v-if="moodStore.justLogged"
        class="mt-3 text-center text-sm font-medium"
        style="color: var(--mood-accent);"
      >
        🌱 种子已种下
      </div>
    </transition>
  </div>
</template>

<style scoped>
.mood-bar {
  cursor: pointer;
}
</style>
