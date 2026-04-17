<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const router = useRouter();
const moodTheme = useMoodThemeStore();

const tools = [
  { icon: '📋', name: 'PHQ-9 自评', desc: '标准化抑郁筛查问卷，追踪症状变化', route: '/toolbox/phq9' },
  { icon: '🌬️', name: '呼吸引导', desc: '三种呼吸技巧，帮助你缓解焦虑', route: '/toolbox/breathing' },
  { icon: '🌍', name: '扎根练习 5-4-3-2-1', desc: '用五感把自己拉回当下', route: '/toolbox/grounding' },
  { icon: '🔍', name: '想法检验', desc: '认知行为疗法：检验自动化消极想法', route: '/toolbox/cognitive' },
];
</script>

<template>
  <div class="py-6 space-y-6">
    <div class="animate-float-in">
      <h1 class="text-xl font-semibold" style="color: var(--text-primary);">🌿 工具箱</h1>
      <p class="text-sm mt-1" style="color: var(--text-secondary);">这些工具随时可用，没有对错之分</p>
    </div>

    <div class="space-y-3">
      <button
        v-for="(tool, i) in tools"
        :key="tool.route"
        @click="router.push(tool.route)"
        class="card w-full p-4 flex items-center gap-4 text-left transition-all active:scale-[0.99] animate-float-in"
        :style="{ animationDelay: `${(i + 1) * 80}ms` }"
      >
        <div
          class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style="background: var(--mood-hover-bg);"
        >
          <span class="text-2xl">{{ tool.icon }}</span>
        </div>
        <div class="flex-1">
          <p class="font-medium text-sm" style="color: var(--text-primary);">{{ tool.name }}</p>
          <p class="text-xs mt-0.5" style="color: var(--text-muted);">{{ tool.desc }}</p>
        </div>
        <span style="color: var(--text-muted);">→</span>
      </button>
    </div>

    <div
      class="rounded-2xl p-4 text-center animate-float-in"
      :style="{
        background: `linear-gradient(135deg, ${moodTheme.palette.gradientFrom}, ${moodTheme.palette.gradientTo})`,
        border: '1px solid var(--border-subtle)',
        animationDelay: '0.4s',
      }"
    >
      <p class="text-sm" :style="{ color: moodTheme.palette.navActiveText }">
        每一次使用工具，都是在花园里浇了一次水。哪怕只是打开看看，也算。
      </p>
    </div>
  </div>
</template>
