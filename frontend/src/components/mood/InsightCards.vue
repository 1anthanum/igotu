<script setup lang="ts">
/**
 * InsightCards — 情绪模式洞察卡片列表
 *
 * 展示 useMoodInsights 生成的洞察：
 * - 水平滚动卡片条
 * - 每张卡片有 icon + 标题 + 描述 + 色彩装饰线
 * - 首次出现时有入场动画
 * - 无数据时不渲染
 */
import { computed } from 'vue';
import { useI18n } from '@/i18n';
import { useMoodInsights, type Insight } from '@/composables/useMoodInsights';

const { t } = useI18n();
const { insights, hasData } = useMoodInsights();

function cardStyle(insight: Insight) {
  const { h, s, l } = insight.color;
  return {
    borderTopColor: `hsl(${h},${s}%,${l}%)`,
    '--insight-accent': `hsl(${h},${s}%,${l}%)`,
    '--insight-glow': `hsla(${h},${s}%,${l}%,0.1)`,
  };
}

function getTitle(insight: Insight): string {
  return t(insight.titleKey, insight.params);
}

function getDesc(insight: Insight): string {
  // Handle nested i18n params (e.g., params.from is itself an i18n key)
  const resolvedParams: Record<string, string | number> = {};
  for (const [key, val] of Object.entries(insight.params)) {
    if (typeof val === 'string' && val.includes('.')) {
      // Might be an i18n key
      const translated = t(val);
      resolvedParams[key] = translated !== val ? translated : val;
    } else {
      resolvedParams[key] = val;
    }
  }
  return t(insight.descKey, resolvedParams);
}
</script>

<template>
  <div v-if="hasData && insights.length > 0" class="insights-container animate-float-in">
    <h3 class="insights-heading">{{ t('insights.heading') }}</h3>

    <div class="insights-scroll">
      <div
        v-for="(insight, i) in insights"
        :key="insight.id"
        class="insight-card"
        :style="{ ...cardStyle(insight), animationDelay: `${i * 0.08}s` }"
      >
        <div class="insight-icon">{{ insight.icon }}</div>
        <div class="insight-body">
          <p class="insight-title">{{ getTitle(insight) }}</p>
          <p class="insight-desc">{{ getDesc(insight) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.insights-container {
  margin: 0.5rem 0;
}

.insights-heading {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
  padding-left: 0.25rem;
}

.insights-scroll {
  display: flex;
  gap: 0.6rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.insights-scroll::-webkit-scrollbar { display: none; }

.insight-card {
  flex-shrink: 0;
  width: 200px;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: var(--bg-card);
  border-top: 2px solid;
  scroll-snap-align: start;
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  animation: insight-slide-in 0.4s ease-out both;
  transition: transform 0.2s ease;
}
.insight-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px var(--insight-glow, rgba(0,0,0,0.1));
}

@keyframes insight-slide-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.insight-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
  line-height: 1;
  margin-top: 0.1rem;
}

.insight-body {
  min-width: 0;
}

.insight-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.2rem;
  line-height: 1.3;
}

.insight-desc {
  font-size: 0.68rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

@media (prefers-reduced-motion: reduce) {
  .insight-card { animation: none !important; transition: none !important; }
}
</style>
