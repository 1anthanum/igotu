<script setup lang="ts">
/**
 * DayTimeline — "一日之光"时间线
 *
 * 横向时间轴（6am - midnight），标注当天的事件：
 * - 情绪记录（mood dots）
 * - 成就打卡（seed dots）
 * - 对话会话（chat dots）
 *
 * 视觉：每个事件是一个情绪色彩点，hover 显示详情。
 * 为用户提供"今天做了什么"的一览式非文字自我肯定。
 */
import { computed } from 'vue';
import { useMoodThemeStore, MOOD_CONFIG } from '@/composables/useMoodTheme';
import { useAchievementStore } from '@/stores/achievements';
import { useI18n } from '@/i18n';

const moodTheme = useMoodThemeStore();
const achievements = useAchievementStore();
const { t } = useI18n();

interface TimelineEvent {
  type: 'mood' | 'seed' | 'chat';
  hour: number;      // 0-24 (fractional)
  label: string;
  color: string;
  emoji: string;
}

// Gather mood entries from today (localStorage)
function getTodayMoodEvents(): TimelineEvent[] {
  try {
    const raw = localStorage.getItem('igotu_mood_log');
    if (!raw) return [];
    const all = JSON.parse(raw) as Array<{ score: number; timestamp: number }>;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTs = todayStart.getTime();

    return all
      .filter(e => e.timestamp >= todayTs)
      .map(e => {
        const d = new Date(e.timestamp);
        const hour = d.getHours() + d.getMinutes() / 60;
        const config = MOOD_CONFIG.find(m => m.score === e.score) || MOOD_CONFIG[2];
        return {
          type: 'mood' as const,
          hour,
          label: config.label,
          color: config.color,
          emoji: config.emoji,
        };
      });
  } catch { return []; }
}

// Gather achievement events from today
function getTodaySeedEvents(): TimelineEvent[] {
  return achievements.todayAchievements.map(a => {
    const d = new Date(a.created_at);
    const hour = d.getHours() + d.getMinutes() / 60;
    return {
      type: 'seed' as const,
      hour,
      label: a.title,
      color: moodTheme.palette.accent,
      emoji: a.emoji || '🌱',
    };
  });
}

const events = computed<TimelineEvent[]>(() => {
  return [...getTodayMoodEvents(), ...getTodaySeedEvents()]
    .sort((a, b) => a.hour - b.hour);
});

const hasEvents = computed(() => events.value.length > 0);

// Timeline spans 6am-midnight (18 hours displayed)
const TIMELINE_START = 6;  // 6am
const TIMELINE_END = 24;   // midnight
const TIMELINE_RANGE = TIMELINE_END - TIMELINE_START;

function hourToPercent(hour: number): number {
  const clamped = Math.max(TIMELINE_START, Math.min(TIMELINE_END, hour));
  return ((clamped - TIMELINE_START) / TIMELINE_RANGE) * 100;
}

// Hour markers
const hourMarkers = [6, 9, 12, 15, 18, 21, 24];
</script>

<template>
  <div v-if="hasEvents" class="card animate-float-in" style="animation-delay: 0.2s;">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-section" style="color: var(--text-primary);">
        ☀️ {{ t('dayTimeline.title') }}
      </h2>
      <span class="text-micro">{{ events.length }} {{ t('dayTimeline.events') }}</span>
    </div>

    <!-- Timeline track -->
    <div class="timeline-track">
      <!-- Background line -->
      <div class="timeline-line" :style="{ background: `linear-gradient(90deg, var(--border-subtle), ${moodTheme.palette.accent}20, var(--border-subtle))` }" />

      <!-- Hour markers -->
      <div
        v-for="h in hourMarkers"
        :key="h"
        class="timeline-marker"
        :style="{ left: `${hourToPercent(h)}%` }"
      >
        <span class="timeline-marker-label">{{ h === 24 ? '0' : h }}</span>
      </div>

      <!-- Event dots -->
      <div
        v-for="(evt, i) in events"
        :key="i"
        class="timeline-dot"
        :style="{
          left: `${hourToPercent(evt.hour)}%`,
          background: evt.color,
          boxShadow: `0 0 8px ${evt.color}40`,
        }"
        :title="`${evt.emoji} ${evt.label}`"
      >
        <span class="timeline-dot-emoji">{{ evt.emoji }}</span>
      </div>

      <!-- "Now" indicator -->
      <div
        class="timeline-now"
        :style="{ left: `${hourToPercent(new Date().getHours() + new Date().getMinutes() / 60)}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.timeline-track {
  position: relative;
  height: 48px;
  margin: 0 8px;
}

.timeline-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 1px;
  transform: translateY(-50%);
}

.timeline-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
}

.timeline-marker-label {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.6rem;
  color: var(--text-muted);
  opacity: 0.5;
}

.timeline-marker::before {
  content: '';
  display: block;
  width: 1px;
  height: 8px;
  background: var(--border-medium);
  margin: 0 auto;
}

.timeline-dot {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: default;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 2;
}

.timeline-dot:hover {
  transform: translate(-50%, -50%) scale(1.6);
  z-index: 3;
}

.timeline-dot-emoji {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.timeline-dot:hover .timeline-dot-emoji {
  opacity: 1;
}

.timeline-now {
  position: absolute;
  top: 50%;
  width: 3px;
  height: 20px;
  background: var(--mood-accent);
  border-radius: 1.5px;
  transform: translate(-50%, -50%);
  opacity: 0.5;
  animation: now-pulse 3s ease-in-out infinite;
  z-index: 1;
}

@keyframes now-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}

@media (prefers-reduced-motion: reduce) {
  .timeline-dot { transition: none; }
  .timeline-now { animation: none; opacity: 0.5; }
}
</style>
