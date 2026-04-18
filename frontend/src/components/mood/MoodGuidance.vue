<script setup lang="ts">
/**
 * MoodGuidance v2 — 温和引导（仅 mood 3+ 显示）
 *
 * 设计变更 (v2):
 * - mood ≤ 2 时不再显示（由 Sanctuary 模式替代，零任务推送）
 * - 语言更柔和：从"建议做什么"变为"现在适合什么"
 * - 加入治疗桥梁入口
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const emit = defineEmits<{ 'task-done': [label: string] }>();

const router = useRouter();
const moodTheme = useMoodThemeStore();

interface GuidanceCard {
  emoji: string;
  title: string;
  desc: string;
  route: string;
  taskLabel: string;
}

const cards = computed<GuidanceCard[]>(() => {
  const mood = moodTheme.currentMood;

  // mood ≤ 2: 不显示引导（Sanctuary 模式接管）
  if (mood <= 2) return [];

  if (mood <= 3) {
    return [
      { emoji: '💭', title: '聊聊今天', desc: '说出来会轻松一些', route: '/chat', taskLabel: '完成一次对话' },
      { emoji: '🌿', title: '记录感受', desc: '给此刻的心情留个印记', route: '/mood', taskLabel: '记录心情' },
    ];
  }
  // mood 4-5
  return [
    { emoji: '📝', title: '整理一下', desc: '好状态适合梳理思路', route: '/chat', taskLabel: '完成总结规划' },
    { emoji: '🌉', title: '治疗笔记', desc: '记录想和治疗师分享的事', route: '/therapy', taskLabel: '更新治疗笔记' },
  ];
});

function goTo(card: GuidanceCard) {
  sessionStorage.setItem('igotu_guidance_task', card.taskLabel);
  router.push(card.route);
}
</script>

<template>
  <div v-if="cards.length > 0" class="guidance-section animate-float-in-delay-1">
    <p class="guidance-label" style="color: var(--text-muted);">
      现在适合
    </p>
    <div class="guidance-cards">
      <button
        v-for="card in cards"
        :key="card.route"
        class="guidance-card"
        :style="{
          border: `1px solid ${moodTheme.palette.accent}15`,
          background: 'var(--bg-card)',
        }"
        @click="goTo(card)"
      >
        <span class="guidance-emoji">{{ card.emoji }}</span>
        <div class="guidance-text">
          <span class="guidance-title" :style="{ color: moodTheme.palette.navActiveText }">
            {{ card.title }}
          </span>
          <span class="guidance-desc">{{ card.desc }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.guidance-section {
  margin: 1rem 0 1.5rem;
}
.guidance-label {
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
}
.guidance-cards {
  display: flex;
  gap: 0.75rem;
}
.guidance-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 0.75rem;
  border-radius: 1rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  backdrop-filter: blur(8px);
}
.guidance-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px var(--mood-glow);
  border-color: var(--mood-accent) !important;
}
.guidance-card:active { transform: scale(0.97); }

.guidance-emoji { font-size: 1.5rem; flex-shrink: 0; }
.guidance-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.guidance-title { font-size: 0.85rem; font-weight: 500; }
.guidance-desc { font-size: 0.7rem; color: var(--text-muted); line-height: 1.3; }

@media (max-width: 480px) {
  .guidance-cards { flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  .guidance-card { transition: none !important; }
}
</style>
