<script setup lang="ts">
import { computed } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useOnboarding } from '@/composables/useOnboarding';

const moodTheme = useMoodThemeStore();
const onboarding = useOnboarding();

const show = computed(() => onboarding.shouldShowWelcome.value);

const features = [
  { icon: '💬', title: '对话', desc: '和小树聊聊，什么都可以说' },
  { icon: '🧰', title: '工具箱', desc: '呼吸练习、想法检验等自助工具' },
  { icon: '📊', title: '情绪', desc: '追踪你的情绪变化趋势' },
  { icon: '🌳', title: '成长树', desc: '每次对话，树上就多一片叶子' },
];

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
            <h2 class="text-lg font-semibold" style="color: var(--text-primary);">欢迎来到 IGOTU</h2>
            <p class="text-sm mt-1" style="color: var(--text-secondary);">
              这里是你的安全空间。没有评判，只有陪伴。
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
            开始使用
          </button>
          <button
            @click="skip"
            class="safe-exit-hint w-full"
          >
            跳过引导
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
