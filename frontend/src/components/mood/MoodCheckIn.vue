<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useMoodCheckIn, MOOD_QUESTIONS } from '@/composables/useMoodCheckIn';

const emit = defineEmits<{ done: [score: number] }>();

const moodTheme = useMoodThemeStore();
const checkIn = useMoodCheckIn();

const selectedMood = ref<number | null>(null);
const hintText = ref('');
const fadeOut = ref(false);

function pickMood(score: number) {
  selectedMood.value = score;
  const opt = MOOD_QUESTIONS.q1.options.find(o => o.score === score);
  hintText.value = opt?.hint ?? '';
  checkIn.answerQ1(score);
}

function pickEnergy(score: number) {
  checkIn.answerQ2(score);
  // Brief pause to show hint, then fade out
  fadeOut.value = true;
}

// When check-in completes, emit final score
watch(() => checkIn.isCompleted.value, (done) => {
  if (done) {
    const data = checkIn.thresholdData.value;
    const finalScore = data?.currentScore ?? 3;
    setTimeout(() => emit('done', finalScore), 600);
  }
});
</script>

<template>
  <Teleport to="body">
    <transition name="checkin-fade">
      <div
        v-if="!checkIn.isCompleted.value"
        class="checkin-overlay"
        :class="{ 'fade-out': fadeOut }"
      >
        <div class="checkin-card animate-float-in">
          <!-- Step 1: 心情 -->
          <transition name="step" mode="out-in">
            <div v-if="checkIn.currentStep.value === 1" key="q1" class="step-content">
              <p class="checkin-question">{{ MOOD_QUESTIONS.q1.question }}</p>
              <div class="emoji-row">
                <button
                  v-for="opt in MOOD_QUESTIONS.q1.options"
                  :key="opt.score"
                  class="emoji-btn"
                  :class="{ selected: selectedMood === opt.score }"
                  :style="selectedMood === opt.score
                    ? { background: moodTheme.palette.navActive, borderColor: moodTheme.palette.accent + '60' }
                    : {}"
                  @click="pickMood(opt.score)"
                >
                  <span class="emoji-icon">{{ opt.emoji }}</span>
                  <span class="emoji-label">{{ opt.label }}</span>
                </button>
              </div>
              <p v-if="hintText" class="hint-text" :style="{ color: moodTheme.palette.accent }">
                {{ hintText }}
              </p>
            </div>

            <!-- Step 2: 精力 -->
            <div v-else key="q2" class="step-content">
              <p class="checkin-question">{{ MOOD_QUESTIONS.q2.question }}</p>
              <div class="energy-row">
                <button
                  v-for="opt in MOOD_QUESTIONS.q2.options"
                  :key="opt.score"
                  class="energy-btn"
                  @click="pickEnergy(opt.score)"
                >
                  <span class="energy-emoji">{{ opt.emoji }}</span>
                  <span class="energy-label">{{ opt.label }}</span>
                </button>
              </div>
            </div>
          </transition>

          <!-- Skip -->
          <button class="skip-btn" @click="checkIn.skip(); emit('done', 3)">
            跳过
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.checkin-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 15, 13, 0.85);
  backdrop-filter: blur(16px);
  transition: opacity 0.6s ease;
}
.checkin-overlay.fade-out {
  opacity: 0;
  pointer-events: none;
}

.checkin-card {
  max-width: 400px;
  width: 90vw;
  padding: 2rem 1.5rem;
  text-align: center;
}

.step-content {
  min-height: 160px;
}

.checkin-question {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
}

.emoji-row {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.emoji-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.75rem 0.6rem;
  border-radius: 1rem;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all 0.25s ease;
  min-width: 60px;
}
.emoji-btn:hover {
  background: var(--mood-hover-bg);
  border-color: var(--border-subtle);
}
.emoji-btn.selected {
  transform: scale(1.1);
}
.emoji-icon { font-size: 1.75rem; }
.emoji-label { font-size: 0.7rem; color: var(--text-secondary); }

.hint-text {
  margin-top: 1rem;
  font-size: 0.85rem;
  font-style: italic;
  animation: float-in 0.4s ease-out;
}

.energy-row {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}
.energy-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 1rem 1.25rem;
  border-radius: 1rem;
  border: 1px solid var(--border-subtle);
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.2s;
}
.energy-btn:hover {
  border-color: var(--mood-accent);
  background: var(--mood-hover-bg);
  transform: translateY(-2px);
}
.energy-emoji { font-size: 1.5rem; }
.energy-label { font-size: 0.75rem; color: var(--text-secondary); }

.skip-btn {
  margin-top: 1.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: color 0.2s;
}
.skip-btn:hover { color: var(--text-secondary); }

/* Transitions */
.checkin-fade-enter-active { transition: opacity 0.4s ease; }
.checkin-fade-leave-active { transition: opacity 0.5s ease; }
.checkin-fade-enter-from,
.checkin-fade-leave-to { opacity: 0; }

.step-enter-active,
.step-leave-active { transition: all 0.3s ease; }
.step-enter-from { opacity: 0; transform: translateX(20px); }
.step-leave-to { opacity: 0; transform: translateX(-20px); }

@media (prefers-reduced-motion: reduce) {
  .checkin-overlay { transition: none !important; }
  .emoji-btn { transition: none !important; }
  .energy-btn { transition: none !important; }
  .hint-text { animation: none !important; }
}
</style>
