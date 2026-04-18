<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import GuideTooltip from '@/components/onboarding/GuideTooltip.vue';

const router = useRouter();
const moodTheme = useMoodThemeStore();

const tools = computed(() => {
  const allTools = [
    { icon: '📋', name: 'PHQ-9 自评', desc: '标准化抑郁筛查问卷，追踪症状变化', shortDesc: '了解你现在的状态', route: '/toolbox/phq9', lowEnergyFirst: false },
    { icon: '🌬️', name: '呼吸引导', desc: '三种呼吸技巧，帮助你缓解焦虑', shortDesc: '跟着圆圈呼吸就好', route: '/toolbox/breathing', lowEnergyFirst: true },
    { icon: '🌍', name: '扎根练习 5-4-3-2-1', desc: '用五感把自己拉回当下', shortDesc: '用五感回到当下', route: '/toolbox/grounding', lowEnergyFirst: false },
    { icon: '🔍', name: '想法检验', desc: '认知行为疗法：检验自动化消极想法', shortDesc: '检验消极想法', route: '/toolbox/cognitive', lowEnergyFirst: false },
    { icon: '📞', name: '988 电话准备', desc: '整理你的感受和症状，降低求助焦虑', shortDesc: '帮你准备好打电话', route: '/toolbox/crisis-prep', lowEnergyFirst: false, isCrisis: true },
  ];

  if (moodTheme.isLowEnergy) {
    return [...allTools].sort((a, b) => (b.lowEnergyFirst ? 1 : 0) - (a.lowEnergyFirst ? 1 : 0));
  }
  return allTools;
});

function getToolDesc(tool: typeof tools.value[number]) {
  return moodTheme.isLowEnergy ? tool.shortDesc : tool.desc;
}
</script>

<template>
  <div class="py-6 space-y-6">
    <div class="animate-float-in">
      <h1 class="text-xl font-semibold" style="color: var(--text-primary);">🌿 工具箱</h1>
      <p class="text-sm mt-1" style="color: var(--text-secondary);">这些工具随时可用，没有对错之分</p>
    </div>

    <!-- Low energy comfort message -->
    <div
      v-if="moodTheme.isLowEnergy"
      class="rounded-2xl p-4 text-center text-sm animate-float-in"
      :style="{
        background: moodTheme.palette.glow,
        border: `1px solid ${moodTheme.palette.accent}10`,
        color: moodTheme.palette.navActiveText,
        animationDelay: '0.05s',
      }"
    >
      什么都不想做？也可以只是待在这里。
    </div>

    <div id="toolbox-list" class="space-y-3">
      <button
        v-for="(tool, i) in tools"
        :key="tool.route"
        @click="router.push(tool.route)"
        class="card w-full p-4 flex items-center gap-4 text-left transition-all active:scale-[0.99] animate-float-in relative"
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
          <p class="text-xs mt-0.5" style="color: var(--text-muted);">{{ getToolDesc(tool) }}</p>
        </div>
        <span style="color: var(--text-muted);">→</span>

        <span
          v-if="moodTheme.isLowEnergy && tool.lowEnergyFirst"
          class="absolute top-2 right-3 text-[10px] px-2 py-0.5 rounded-full font-medium"
          :style="{ background: moodTheme.palette.accent, color: 'var(--text-inverse)' }"
        >
          推荐
        </span>
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
        {{ moodTheme.isLowEnergy
          ? '打开这个页面，就已经迈出了一步。'
          : '每一次使用工具，都是在花园里浇了一次水。哪怕只是打开看看，也算。'
        }}
      </p>
    </div>
    <!-- Onboarding tooltip -->
    <GuideTooltip
      tip-id="toolbox-breathing"
      title="推荐从这里开始"
      description="呼吸练习是最简单的自助方式，随时可以用。"
      target-selector="#toolbox-list"
      position="top"
    />
  </div>
</template>
