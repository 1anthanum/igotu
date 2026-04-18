<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const router = useRouter();
const auth = useAuthStore();
const moodTheme = useMoodThemeStore();
const dismissed = ref(false);

function goRegister() {
  auth.exitDemo();
  router.push('/login');
}
</script>

<template>
  <Teleport to="body">
    <transition name="banner-slide">
      <div
        v-if="!dismissed"
        class="demo-banner"
        :style="{ borderColor: moodTheme.palette.accent + '30' }"
      >
        <span class="banner-text">
          🌿 你正在体验模式 · 数据不会保存
        </span>
        <button
          class="banner-register"
          :style="{ color: moodTheme.palette.accent }"
          @click="goRegister"
        >
          注册以保存记录
        </button>
        <button class="banner-close" @click="dismissed = true">✕</button>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.demo-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid;
  backdrop-filter: blur(12px);
  font-size: 0.75rem;
}

.banner-text { color: var(--text-secondary); }
.banner-register {
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.banner-register:hover { opacity: 0.8; }
.banner-close {
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.7rem;
  padding: 0.25rem;
  margin-left: 0.5rem;
}

.banner-slide-enter-active { transition: transform 0.3s ease; }
.banner-slide-leave-active { transition: transform 0.2s ease; }
.banner-slide-enter-from { transform: translateY(-100%); }
.banner-slide-leave-to { transform: translateY(-100%); }
</style>
