<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/i18n';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useOnboarding } from '@/composables/useOnboarding';

const { t } = useI18n();
const moodTheme = useMoodThemeStore();
const onboarding = useOnboarding();

const show = computed(() => onboarding.shouldShowWelcome.value);

const features = computed(() => [
  { icon: '💬', title: t('onboarding.featureChat'), desc: t('onboarding.featureChatDesc') },
  { icon: '🧰', title: t('onboarding.featureToolbox'), desc: t('onboarding.featureToolboxDesc') },
  { icon: '📊', title: t('onboarding.featureMood'), desc: t('onboarding.featureMoodDesc') },
  { icon: '🌳', title: t('onboarding.featureGrowth'), desc: t('onboarding.featureGrowthDesc') },
]);

function start() {
  onboarding.markWelcomeSeen();
}

function skip() {
  onboarding.skipAllGuides();
}
</script>

<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="show" class="modal-overlay" @click.self="start">
        <div class="modal-content animate-float-in">
          <!-- Header -->
          <div class="text-center mb-5">
            <div
              class="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-3"
              :style="{
                background: moodTheme.palette.accentSoft,
                boxShadow: `0 0 60px ${moodTheme.palette.glow}`,
              }"
            >
              <span class="text-3xl">🌱</span>
            </div>
            <h2 class="text-lg font-semibold" style="color: var(--text-primary);">{{ t('onboarding.welcomeTitle') }}</h2>
            <p class="text-sm mt-1" style="color: var(--text-secondary);">
              {{ t('onboarding.welcomeSubtitle') }}
            </p>
          </div>

          <!-- Feature grid -->
          <div class="grid grid-cols-2 gap-3 mb-5">
            <div
              v-for="feat in features"
              :key="feat.title"
              class="p-3 rounded-xl text-center"
              style="background: var(--bg-secondary); border: 1px solid var(--border-subtle);"
            >
              <span class="text-xl">{{ feat.icon }}</span>
              <p class="text-xs font-medium mt-1" :style="{ color: moodTheme.palette.navActiveText }">
                {{ feat.title }}
              </p>
              <p class="text-[10px] mt-0.5" style="color: var(--text-muted);">{{ feat.desc }}</p>
            </div>
          </div>

          <!-- Actions -->
          <button
            @click="start"
            class="btn-primary w-full mb-2"
          >
            {{ t('onboarding.startButton') }}
          </button>
          <button
            @click="skip"
            class="safe-exit-hint w-full"
          >
            {{ t('onboarding.skipButton') }}
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-content {
  max-width: 360px;
  width: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 1.5rem;
  padding: 1.5rem;
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 60px rgba(0, 0, 0, 0.5), 0 0 40px var(--mood-glow);
}

.modal-fade-enter-active { transition: all 0.4s ease; }
.modal-fade-leave-active { transition: all 0.3s ease; }
.modal-fade-enter-from { opacity: 0; }
.modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal-content { transform: scale(0.9); }
</style>
