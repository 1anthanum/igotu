<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from '@/i18n';
import { useMoodStore } from '@/stores/mood';
import { useMoodThemeStore, MOOD_CONFIG } from '@/composables/useMoodTheme';

const { t } = useI18n();
const moodStore = useMoodStore();
const moodTheme = useMoodThemeStore();
const note = ref('');
const showNote = ref(false);
const hoveredMood = ref<number | null>(null);

// B8: Poetic feedback state
const poeticLine = ref('');
const showPoetic = ref(false);
const pickerShrunk = ref(false);
let poeticTimer: ReturnType<typeof setTimeout> | null = null;

async function selectMood(mood: typeof MOOD_CONFIG[number]) {
  await moodStore.log({
    mood_score: mood.score,
    mood_emoji: mood.emoji,
    mood_label: mood.label,
    note: note.value || undefined,
  });
  note.value = '';
  showNote.value = false;

  // Pick a random poetic line for this mood level
  const lines = t(`moodPoetic.${mood.score}`);
  if (Array.isArray(lines) && lines.length > 0) {
    poeticLine.value = lines[Math.floor(Math.random() * lines.length)];
  } else {
    poeticLine.value = t('moodPicker.seedPlanted');
  }

  // Trigger the transition
  pickerShrunk.value = true;
  showPoetic.value = true;

  // Auto-dismiss after 3.5s
  if (poeticTimer) clearTimeout(poeticTimer);
  poeticTimer = setTimeout(() => {
    showPoetic.value = false;
    pickerShrunk.value = false;
  }, 3500);
}
</script>

<template>
  <div
    class="card-glow p-6 animate-float-in picker-container"
    :class="{ 'picker-shrunk': pickerShrunk }"
    style="animation-delay: 0.1s;"
  >
    <p class="text-sm mb-5" style="color: var(--text-secondary);">
      {{ t('moodPicker.instruction') }}
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
        {{ t('moodPicker.addNote') }}
      </button>
      <div v-else class="input-focus-wrapper">
        <textarea
          v-model="note"
          :placeholder="t('moodPicker.notePlaceholder')"
          class="input-field w-full text-sm resize-none"
          rows="2"
        />
      </div>
    </div>

    <!-- B8: Poetic feedback card (replaces simple text) -->
    <transition name="poetic-rise">
      <div
        v-if="showPoetic"
        class="poetic-card mt-4"
        :style="{
          background: `linear-gradient(135deg, ${moodTheme.palette.accentSoft}, ${moodTheme.palette.gradientTo})`,
          border: `1px solid ${moodTheme.palette.accent}20`,
        }"
      >
        <div class="poetic-glow" :style="{ background: moodTheme.palette.accent }" />
        <p class="poetic-text" :style="{ color: moodTheme.palette.navActiveText }">
          {{ poeticLine }}
        </p>
        <p class="text-micro mt-2 text-center" style="opacity: 0.5;">
          {{ t('moodPicker.seedPlanted') }}
        </p>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.mood-bar {
  cursor: pointer;
}

/* B8: Picker shrinks slightly when poetic card appears */
.picker-container {
  transition: transform 0.5s ease, padding 0.5s ease;
}
.picker-shrunk {
  transform: scale(0.97);
}

/* B8: Poetic feedback card */
.poetic-card {
  border-radius: 1rem;
  padding: 1.25rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.poetic-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  opacity: 0.06;
  transform: translate(-50%, -50%);
  filter: blur(30px);
  animation: poetic-pulse 2s ease-in-out infinite;
}

.poetic-text {
  font-size: 0.9375rem;
  font-weight: 500;
  letter-spacing: 0.03em;
  line-height: 1.6;
  position: relative;
  z-index: 1;
}

/* Transition: slide up + fade in */
.poetic-rise-enter-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.poetic-rise-leave-active {
  transition: all 0.4s ease;
}
.poetic-rise-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.95);
}
.poetic-rise-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

@keyframes poetic-pulse {
  0%, 100% { opacity: 0.04; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.1; transform: translate(-50%, -50%) scale(1.5); }
}

@media (prefers-reduced-motion: reduce) {
  .picker-container { transition: none; }
  .poetic-rise-enter-active,
  .poetic-rise-leave-active { transition: none; }
  .poetic-glow { animation: none; }
}
</style>
