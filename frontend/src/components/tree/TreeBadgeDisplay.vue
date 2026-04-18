<script setup lang="ts">
import { computed } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { RARE_BLOOM_CONFIG, type RareBloomType, type StreakInfo } from '@/composables/useSessionTree';

const props = defineProps<{
  rareBloomCollection: Record<RareBloomType, number>;
  streak: StreakInfo;
}>();

const moodTheme = useMoodThemeStore();

const allTypes: RareBloomType[] = ['night_bloom', 'early_bird', 'deep_talk', 'quick_checkin'];

const badges = computed(() =>
  allTypes.map(type => ({
    type,
    config: RARE_BLOOM_CONFIG[type],
    count: props.rareBloomCollection[type],
    unlocked: props.rareBloomCollection[type] > 0,
  }))
);
</script>

<template>
  <div class="badge-display">
    <!-- Rare bloom badges -->
    <div class="flex items-center gap-1.5 flex-wrap justify-center">
      <span
        v-for="badge in badges"
        :key="badge.type"
        class="badge-chip"
        :class="{ unlocked: badge.unlocked }"
        :style="badge.unlocked ? {
          background: badge.config.ringColor + '15',
          borderColor: badge.config.ringColor + '40',
          color: badge.config.ringColor,
        } : {}"
        :title="badge.config.description"
      >
        <span class="badge-emoji">{{ badge.config.emoji }}</span>
        <span v-if="badge.unlocked" class="badge-count">×{{ badge.count }}</span>
      </span>

      <!-- Streak badge -->
      <span
        v-if="streak.isActive && streak.days >= 2"
        class="badge-chip unlocked streak-badge"
        :style="{
          background: moodTheme.palette.navActive,
          borderColor: moodTheme.palette.accent + '40',
          color: moodTheme.palette.accent,
        }"
        title="连续签到天数"
      >
        <span class="badge-emoji">🔥</span>
        <span class="badge-count">{{ streak.days }}天</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.badge-display {
  padding: 4px 0;
}

.badge-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  transition: all 0.3s;
  white-space: nowrap;
}

.badge-chip:not(.unlocked) {
  opacity: 0.35;
  filter: grayscale(1);
}

.badge-emoji {
  font-size: 11px;
}

.badge-count {
  font-weight: 500;
  font-size: 9px;
}

.streak-badge {
  animation: streak-pulse 3s ease-in-out infinite;
}

@keyframes streak-pulse {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 8px var(--mood-glow); }
}

:global(body.low-energy) .streak-badge { animation: none; }

@media (prefers-reduced-motion: reduce) {
  .streak-badge { animation: none !important; }
}
</style>
