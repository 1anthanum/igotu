<script setup lang="ts">
/**
 * CrisisSoundscapeView — 声景通道的全屏独立页面
 *
 * 在 Sanctuary 内嵌使用外，也可作为独立路由 /crisis/soundscape 访问。
 * 全屏深色背景 + 居中 SoundScape 组件。
 */
import { useRouter } from 'vue-router';
import SoundScape from '@/components/crisis/SoundScape.vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const router = useRouter();
const moodTheme = useMoodThemeStore();

function goBack() {
  router.push('/');
}
</script>

<template>
  <div class="crisis-view">
    <SoundScape />
    <button class="crisis-back" @click="goBack">←</button>
  </div>
</template>

<style scoped>
.crisis-view {
  min-height: calc(100dvh - 56px);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.crisis-back {
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.3s;
}
.crisis-back:hover { opacity: 0.8; }
</style>
