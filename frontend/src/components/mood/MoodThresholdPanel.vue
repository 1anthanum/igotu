<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMoodThemeStore, MOOD_CONFIG } from '@/composables/useMoodTheme';
import { useMoodCheckIn, type MoodSnapshot } from '@/composables/useMoodCheckIn';

const moodTheme = useMoodThemeStore();
const checkIn = useMoodCheckIn();
const expanded = ref(false);

const data = computed(() => checkIn.thresholdData.value);

const currentConfig = computed(() =>
  MOOD_CONFIG.find(c => c.score === moodTheme.currentMood) ?? MOOD_CONFIG[2]
);

/** Sparkline SVG path from session history */
const sparklinePath = computed(() => {
  const history = data.value?.history;
  if (!history || history.length < 2) return '';

  const w = 140;
  const h = 36;
  const padding = 4;
  const usableW = w - padding * 2;
  const usableH = h - padding * 2;

  const points = history.map((snap: MoodSnapshot, i: number) => {
    const x = padding + (i / (history.length - 1)) * usableW;
    const y = padding + usableH - ((snap.score - 1) / 4) * usableH;
    return `${x},${y}`;
  });

  return `M ${points.join(' L ')}`;
});

/** Sparkline dot positions */
const sparklineDots = computed(() => {
  const history = data.value?.history;
  if (!history || history.length === 0) return [];

  const w = 140;
  const h = 36;
  const padding = 4;
  const usableW = w - padding * 2;
  const usableH = h - padding * 2;

  return history.map((snap: MoodSnapshot, i: number) => ({
    x: padding + (history.length === 1 ? usableW / 2 : (i / (history.length - 1)) * usableW),
    y: padding + usableH - ((snap.score - 1) / 4) * usableH,
    trigger: snap.trigger,
  }));
});

function triggerLabel(trigger: string): string {
  switch (trigger) {
    case 'check_in': return '心情检测';
    case 'boost': return '任务完成';
    case 'ai_sync': return 'AI 联动';
    default: return '';
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
</script>

<template>
  <!-- Floating toggle button (always visible) -->
  <div class="threshold-panel-wrapper">
    <button
      class="threshold-toggle"
      :style="{
        background: moodTheme.palette.navActive,
        borderColor: moodTheme.palette.accent + '30',
        color: moodTheme.palette.navActiveText,
      }"
      @click="expanded = !expanded"
      :title="expanded ? '收起阈值面板' : '查看心情变化'"
    >
      <span class="toggle-emoji">{{ currentConfig.emoji }}</span>
      <span v-if="data && data.delta !== 0" class="toggle-delta" :class="data.delta > 0 ? 'up' : 'down'">
        {{ data.delta > 0 ? '+' : '' }}{{ data.delta }}
      </span>
    </button>

    <!-- Expanded panel -->
    <transition name="panel-slide">
      <div
        v-if="expanded"
        class="threshold-panel"
        :style="{ borderColor: moodTheme.palette.accent + '20' }"
      >
        <!-- Current mood -->
        <div class="panel-header">
          <span class="panel-emoji">{{ currentConfig.emoji }}</span>
          <div>
            <p class="panel-label" :style="{ color: moodTheme.palette.navActiveText }">{{ currentConfig.label }}</p>
            <p class="panel-metaphor">{{ currentConfig.metaphor }}</p>
          </div>
        </div>

        <!-- Sparkline -->
        <div v-if="data && data.history.length >= 2" class="sparkline-container">
          <svg width="140" height="36" viewBox="0 0 140 36" class="sparkline-svg">
            <path
              :d="sparklinePath"
              fill="none"
              :stroke="moodTheme.palette.accent"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              :stroke-opacity="0.6"
            />
            <circle
              v-for="(dot, i) in sparklineDots"
              :key="i"
              :cx="dot.x"
              :cy="dot.y"
              :r="dot.trigger === 'boost' ? 3 : 2"
              :fill="dot.trigger === 'boost' ? moodTheme.palette.accent : moodTheme.palette.navActiveText"
              :opacity="dot.trigger === 'boost' ? 0.9 : 0.5"
            />
          </svg>
        </div>

        <!-- Delta summary -->
        <div v-if="data" class="panel-delta-row">
          <span class="delta-label">起始</span>
          <span class="delta-score">{{ data.startScore }}</span>
          <span class="delta-arrow">→</span>
          <span class="delta-label">当前</span>
          <span class="delta-score" :style="{ color: moodTheme.palette.accent }">{{ data.currentScore }}</span>
          <span
            v-if="data.delta !== 0"
            class="delta-badge"
            :class="data.delta > 0 ? 'positive' : 'negative'"
          >
            {{ data.delta > 0 ? '↑' : '↓' }}{{ Math.abs(data.delta) }}
          </span>
        </div>

        <!-- Change log -->
        <div v-if="data && data.history.length > 1" class="change-log">
          <div
            v-for="(snap, i) in data.history.slice().reverse().slice(0, 5)"
            :key="i"
            class="log-item"
          >
            <span class="log-time">{{ formatTime(snap.timestamp) }}</span>
            <span class="log-trigger">{{ triggerLabel(snap.trigger) }}</span>
            <span v-if="snap.label" class="log-label">{{ snap.label }}</span>
            <span class="log-score">{{ snap.score }}</span>
          </div>
        </div>

        <!-- No data yet -->
        <p v-if="!data" class="no-data">完成心情检测后这里会显示变化</p>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.threshold-panel-wrapper {
  position: fixed;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.threshold-toggle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  backdrop-filter: blur(8px);
}
.threshold-toggle:hover { transform: scale(1.08); }
.toggle-emoji { font-size: 1.25rem; }
.toggle-delta {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 6px;
  line-height: 1.2;
}
.toggle-delta.up { background: #10b98130; color: #10b981; }
.toggle-delta.down { background: #8b5cf630; color: #8b5cf6; }

.threshold-panel {
  width: 200px;
  background: var(--bg-card);
  border: 1px solid;
  border-radius: 1rem;
  padding: 0.75rem;
  backdrop-filter: blur(12px);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}
.panel-emoji { font-size: 1.5rem; }
.panel-label { font-size: 0.8rem; font-weight: 500; }
.panel-metaphor { font-size: 0.65rem; color: var(--text-muted); }

.sparkline-container {
  margin: 0.4rem 0;
  display: flex;
  justify-content: center;
}

.panel-delta-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: var(--text-secondary);
  justify-content: center;
  margin: 0.4rem 0;
}
.delta-score { font-weight: 600; }
.delta-arrow { color: var(--text-muted); }
.delta-badge {
  font-size: 0.6rem;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 4px;
}
.delta-badge.positive { background: #10b98120; color: #10b981; }
.delta-badge.negative { background: #8b5cf620; color: #8b5cf6; }

.change-log {
  margin-top: 0.5rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: 0.4rem;
}
.log-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.6rem;
  color: var(--text-muted);
  padding: 0.15rem 0;
}
.log-time { flex-shrink: 0; font-variant-numeric: tabular-nums; }
.log-trigger { color: var(--text-secondary); }
.log-label { color: var(--text-muted); font-style: italic; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.log-score { margin-left: auto; font-weight: 600; color: var(--mood-accent); }

.no-data { font-size: 0.7rem; color: var(--text-muted); text-align: center; padding: 0.5rem; }

/* Panel transition */
.panel-slide-enter-active { transition: all 0.3s ease; }
.panel-slide-leave-active { transition: all 0.2s ease; }
.panel-slide-enter-from { opacity: 0; transform: translateX(10px); }
.panel-slide-leave-to { opacity: 0; transform: translateX(10px); }

/* Mobile: bottom-right, smaller */
@media (max-width: 768px) {
  .threshold-panel-wrapper {
    right: 0.75rem;
    top: auto;
    bottom: 5rem;
    transform: none;
  }
  .threshold-panel { width: 180px; }
}

@media (prefers-reduced-motion: reduce) {
  .threshold-toggle { transition: none !important; }
  .panel-slide-enter-active,
  .panel-slide-leave-active { transition: none !important; }
}
</style>
