<script setup lang="ts">
/**
 * CrisisBreathingView — 简化呼吸的全屏独立页面
 *
 * 全屏深色背景 + 居中 BreathingMinimal 组件。
 * 自动启动，无按钮、无文字。
 */
import { useRouter } from 'vue-router';
import BreathingMinimal from '@/components/crisis/BreathingMinimal.vue';

const router = useRouter();

function goBack() {
  router.push('/');
}
</script>

<template>
  <div class="crisis-view">
    <BreathingMinimal />
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
