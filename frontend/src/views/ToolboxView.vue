<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useI18n } from '@/i18n';
import GuideTooltip from '@/components/onboarding/GuideTooltip.vue';

const router = useRouter();
const moodTheme = useMoodThemeStore();
const { t } = useI18n();

const tools = computed(() => {
  const allTools = [
    { icon: '📋', name: t('toolbox.tools.phq9.name'), desc: t('toolbox.tools.phq9.desc'), shortDesc: t('toolbox.tools.phq9.shortDesc'), route: '/toolbox/phq9', lowEnergyFirst: false },
    { icon: '🌬️', name: t('toolbox.tools.breathing.name'), desc: t('toolbox.tools.breathing.desc'), shortDesc: t('toolbox.tools.breathing.shortDesc'), route: '/toolbox/breathing', lowEnergyFirst: true },
    { icon: '🌍', name: t('toolbox.tools.grounding.name'), desc: t('toolbox.tools.grounding.desc'), shortDesc: t('toolbox.tools.grounding.shortDesc'), route: '/toolbox/grounding', lowEnergyFirst: false },
    { icon: '🔍', name: t('toolbox.tools.cognitive.name'), desc: t('toolbox.tools.cognitive.desc'), shortDesc: t('toolbox.tools.cognitive.shortDesc'), route: '/toolbox/cognitive', lowEnergyFirst: false },
    { icon: '📞', name: t('toolbox.tools.crisisPrep.name'), desc: t('toolbox.tools.crisisPrep.desc'), shortDesc: t('toolbox.tools.crisisPrep.shortDesc'), route: '/toolbox/crisis-prep', lowEnergyFirst: false, isCrisis: true },
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
      <h1 class="text-heading" style="color: var(--text-primary);">🌿 {{ t('toolbox.title') }}</h1>
      <p class="text-caption mt-1">{{ t('toolbox.subtitle') }}</p>
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
      {{ t('toolbox.lowEnergyMsg') }}
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
          <p class="text-body font-medium" style="color: var(--text-primary);">{{ tool.name }}</p>
          <p class="text-caption mt-0.5">{{ getToolDesc(tool) }}</p>
        </div>
        <span style="color: var(--text-muted);">→</span>

        <span
          v-if="moodTheme.isLowEnergy && tool.lowEnergyFirst"
          class="absolute top-2 right-3 text-[10px] px-2 py-0.5 rounded-full font-medium"
          :style="{ background: moodTheme.palette.accent, color: 'var(--text-inverse)' }"
        >
          {{ t('common.recommend') }}
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
          ? t('toolbox.encourageLow')
          : t('toolbox.encourageNormal')
        }}
      </p>
    </div>
    <!-- Onboarding tooltip -->
    <GuideTooltip
      tip-id="toolbox-breathing"
      :title="t('toolbox.tooltipTitle')"
      :description="t('toolbox.tooltipDesc')"
      target-selector="#toolbox-list"
      position="top"
    />
  </div>
</template>
