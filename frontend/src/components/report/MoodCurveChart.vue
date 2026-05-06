<script setup lang="ts">
/**
 * MoodCurveChart — 双轨情绪曲线可视化
 *
 * 核心价值：让患者、家属、治疗师一眼看到"什么时候"情绪波动，
 * 而不只是问"过去两周你觉得怎么样"。
 *
 * 双轨：
 *   1. 主轨 — 情绪分数折线 (1-5)，每个数据点带时间戳
 *   2. 副轨 — 危机时刻标记（垂直色带 + 底部标记点）
 *
 * 导出：SVG → Canvas → PNG（含标题和日期范围）
 */
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import type { MoodTrendPoint, CrisisMomentSummary } from '@/composables/useDevelopmentReport';
import type { CrisisMarker } from '@/composables/useCrisisTracker';
import { useI18n } from '@/i18n';

const props = defineProps<{
  moodData: MoodTrendPoint[];
  crisisData: CrisisMarker[];
  periodDays: number;
  periodStart: string;
  periodEnd: string;
  accentColor?: string;
}>();

const emit = defineEmits<{
  (e: 'export-ready'): void;
}>();

const { t } = useI18n();
const svgRef = ref<SVGSVGElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

// ── 图表尺寸常量 ──

const CHART = {
  width: 560,
  height: 240,
  paddingLeft: 36,
  paddingRight: 16,
  paddingTop: 20,
  paddingBottom: 40,
} as const;

const plotW = CHART.width - CHART.paddingLeft - CHART.paddingRight;
const plotH = CHART.height - CHART.paddingTop - CHART.paddingBottom;

// ── 情绪色映射 ──

const MOOD_COLORS: Record<number, string> = {
  1: '#8b5cf6',
  2: '#6366f1',
  3: '#14b8a6',
  4: '#10b981',
  5: '#f59e0b',
};

function moodColor(score: number): string {
  return MOOD_COLORS[Math.round(Math.max(1, Math.min(5, score)))] ?? '#14b8a6';
}

// ── 计算数据 ──

/** 将时间戳映射到 X 坐标 */
function timeToX(timestamp: number): number {
  const start = new Date(props.periodStart).getTime();
  const end = new Date(props.periodEnd).getTime();
  const range = end - start || 1;
  const ratio = (timestamp - start) / range;
  return CHART.paddingLeft + ratio * plotW;
}

/** 将情绪分数映射到 Y 坐标 */
function scoreToY(score: number): number {
  // Y 轴：1 在底部，5 在顶部
  const ratio = (score - 1) / 4;
  return CHART.paddingTop + plotH - ratio * plotH;
}

/** 主折线路径 (smooth catmull-rom) */
const curvePath = computed(() => {
  const pts = props.moodData;
  if (pts.length < 2) return '';

  const points = pts.map(p => ({
    x: timeToX(p.timestamp),
    y: scoreToY(p.score),
  }));

  // Catmull-Rom → 三次贝塞尔
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
});

/** 渐变填充路径（曲线下方区域） */
const areaPath = computed(() => {
  if (!curvePath.value) return '';
  const pts = props.moodData;
  const firstX = timeToX(pts[0].timestamp);
  const lastX = timeToX(pts[pts.length - 1].timestamp);
  const bottomY = CHART.paddingTop + plotH;
  return `${curvePath.value} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
});

/** 数据点坐标 */
const dataPoints = computed(() => {
  return props.moodData.map(p => ({
    x: timeToX(p.timestamp),
    y: scoreToY(p.score),
    score: p.score,
    date: p.date,
    time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: p.timestamp,
  }));
});

/** 每日最低值点 */
const dailyMinPoints = computed(() => {
  const byDay: Record<string, { score: number; timestamp: number }> = {};
  for (const p of props.moodData) {
    if (!byDay[p.date] || p.score < byDay[p.date].score) {
      byDay[p.date] = { score: p.score, timestamp: p.timestamp };
    }
  }
  return Object.entries(byDay).map(([date, { score, timestamp }]) => ({
    x: timeToX(timestamp),
    y: scoreToY(score),
    score,
    date,
  }));
});

/** 危机标记竖线数据 */
const crisisLines = computed(() => {
  return props.crisisData.map(m => ({
    x: timeToX(m.timestamp),
    topY: CHART.paddingTop,
    bottomY: CHART.paddingTop + plotH,
    moodScore: m.moodScore,
    date: new Date(m.timestamp).toISOString().slice(0, 10),
    time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    duration: Math.round(m.duration / 60),
    tools: m.toolsUsed,
  }));
});

/** X 轴日期刻度 */
const xTicks = computed(() => {
  const start = new Date(props.periodStart).getTime();
  const end = new Date(props.periodEnd).getTime();
  const days = props.periodDays;

  // 根据天数选择刻度间隔
  let interval = 1;
  if (days > 21) interval = 5;
  else if (days > 10) interval = 3;
  else if (days > 5) interval = 2;

  const ticks: { x: number; label: string }[] = [];
  const dayMs = 24 * 60 * 60 * 1000;

  for (let d = 0; d <= days; d += interval) {
    const ts = start + d * dayMs;
    if (ts > end) break;
    const date = new Date(ts);
    ticks.push({
      x: timeToX(ts),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
    });
  }

  return ticks;
});

/** Y 轴情绪刻度 */
const yTicks = [1, 2, 3, 4, 5].map(score => ({
  y: scoreToY(score),
  label: String(score),
  score,
}));

// ── Tooltip ──

const tooltip = ref<{
  visible: boolean;
  x: number;
  y: number;
  score: number;
  date: string;
  time: string;
}>({
  visible: false,
  x: 0,
  y: 0,
  score: 0,
  date: '',
  time: '',
});

function showTooltip(pt: typeof dataPoints.value[0], event: MouseEvent) {
  tooltip.value = {
    visible: true,
    x: pt.x,
    y: pt.y,
    score: pt.score,
    date: pt.date,
    time: pt.time,
  };
}

function hideTooltip() {
  tooltip.value.visible = false;
}

// ── PNG 导出 ──

const isExporting = ref(false);

async function exportPNG() {
  if (!svgRef.value || isExporting.value) return;
  isExporting.value = true;

  try {
    const svgEl = svgRef.value;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);

    // 创建高分辨率 canvas (2x)
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = CHART.width * scale;
    canvas.height = (CHART.height + 60) * scale; // 额外空间给标题
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    // 背景
    ctx.fillStyle = '#060f0d';
    ctx.fillRect(0, 0, CHART.width, CHART.height + 60);

    // 标题区域
    ctx.fillStyle = '#d0e8dc';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(t('report.moodCurve.exportTitle'), 16, 24);

    ctx.fillStyle = '#6aa88e';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${props.periodStart} — ${props.periodEnd}`, 16, 42);

    // 绘制 SVG 到 canvas
    const img = new Image();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 52, CHART.width, CHART.height);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });

    // 底部水印
    ctx.fillStyle = '#3a7a64';
    ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('IGOTU — ' + t('report.moodCurve.exportWatermark'), 16, CHART.height + 52);

    // 触发下载
    const link = document.createElement('a');
    link.download = `igotu-mood-${props.periodStart}-${props.periodEnd}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('PNG export failed:', err);
  } finally {
    isExporting.value = false;
  }
}

// 暴露给父组件
defineExpose({ exportPNG });
</script>

<template>
  <div class="mood-curve-container" ref="containerRef">
    <!-- 图表区 -->
    <svg
      ref="svgRef"
      :viewBox="`0 0 ${CHART.width} ${CHART.height}`"
      class="mood-curve-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- 曲线下方渐变 -->
        <linearGradient id="moodAreaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="accentColor ?? '#14b8a6'" stop-opacity="0.2" />
          <stop offset="100%" :stop-color="accentColor ?? '#14b8a6'" stop-opacity="0.02" />
        </linearGradient>

        <!-- 危机标记渐变 -->
        <linearGradient id="crisisGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.03" />
        </linearGradient>
      </defs>

      <!-- Y 轴辅助线 -->
      <g class="grid-lines">
        <line
          v-for="tick in yTicks"
          :key="tick.score"
          :x1="CHART.paddingLeft"
          :y1="tick.y"
          :x2="CHART.width - CHART.paddingRight"
          :y2="tick.y"
          stroke="rgba(100,220,180,0.06)"
          stroke-dasharray="3 3"
        />
      </g>

      <!-- Y 轴标签 -->
      <g class="y-axis">
        <text
          v-for="tick in yTicks"
          :key="tick.score"
          :x="CHART.paddingLeft - 8"
          :y="tick.y + 3"
          text-anchor="end"
          fill="#3a7a64"
          font-size="10"
          font-family="-apple-system, BlinkMacSystemFont, sans-serif"
        >
          {{ tick.label }}
        </text>
      </g>

      <!-- X 轴标签 -->
      <g class="x-axis">
        <text
          v-for="tick in xTicks"
          :key="tick.label"
          :x="tick.x"
          :y="CHART.paddingTop + plotH + 16"
          text-anchor="middle"
          fill="#3a7a64"
          font-size="9"
          font-family="-apple-system, BlinkMacSystemFont, sans-serif"
        >
          {{ tick.label }}
        </text>
      </g>

      <!-- 危机时刻竖线 -->
      <g class="crisis-markers" v-if="crisisLines.length > 0">
        <g v-for="(cl, i) in crisisLines" :key="'crisis-' + i">
          <!-- 竖向色带 -->
          <rect
            :x="cl.x - 3"
            :y="cl.topY"
            width="6"
            :height="cl.bottomY - cl.topY"
            fill="url(#crisisGradient)"
            rx="2"
          />
          <!-- 底部标记点 -->
          <circle
            :cx="cl.x"
            :cy="cl.bottomY + 6"
            r="3"
            fill="#f59e0b"
            opacity="0.7"
          />
        </g>
      </g>

      <!-- 渐变填充区域 -->
      <path
        v-if="areaPath"
        :d="areaPath"
        fill="url(#moodAreaGradient)"
      />

      <!-- 主曲线 -->
      <path
        v-if="curvePath"
        :d="curvePath"
        fill="none"
        :stroke="accentColor ?? '#14b8a6'"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="mood-line"
      />

      <!-- 数据点 -->
      <g class="data-points">
        <circle
          v-for="(pt, i) in dataPoints"
          :key="'pt-' + i"
          :cx="pt.x"
          :cy="pt.y"
          r="3"
          :fill="moodColor(pt.score)"
          stroke="#060f0d"
          stroke-width="1.5"
          class="data-dot"
          @mouseenter="showTooltip(pt, $event)"
          @mouseleave="hideTooltip"
        />
      </g>

      <!-- 每日最低值标记 (空心菱形) -->
      <g class="daily-min-markers" v-if="dailyMinPoints.length > 1">
        <g v-for="(mp, i) in dailyMinPoints" :key="'min-' + i">
          <polygon
            v-if="mp.score <= 2"
            :points="`${mp.x},${mp.y - 5} ${mp.x + 4},${mp.y} ${mp.x},${mp.y + 5} ${mp.x - 4},${mp.y}`"
            fill="none"
            stroke="#8b5cf6"
            stroke-width="1.2"
            opacity="0.7"
          />
        </g>
      </g>

      <!-- Tooltip (SVG 内) -->
      <g v-if="tooltip.visible" class="tooltip-group">
        <!-- 垂直参考线 -->
        <line
          :x1="tooltip.x"
          :y1="CHART.paddingTop"
          :x2="tooltip.x"
          :y2="CHART.paddingTop + plotH"
          stroke="rgba(100,220,180,0.2)"
          stroke-width="1"
          stroke-dasharray="2 2"
        />
        <!-- 背景框 -->
        <rect
          :x="tooltip.x + 8"
          :y="tooltip.y - 28"
          width="80"
          height="24"
          rx="4"
          fill="rgba(10,25,20,0.9)"
          stroke="rgba(100,220,180,0.15)"
        />
        <!-- 文字 -->
        <text
          :x="tooltip.x + 14"
          :y="tooltip.y - 14"
          fill="#d0e8dc"
          font-size="10"
          font-family="-apple-system, BlinkMacSystemFont, sans-serif"
        >
          {{ tooltip.time }} · {{ tooltip.score }}/5
        </text>
      </g>

      <!-- 图例 -->
      <g class="legend" :transform="`translate(${CHART.paddingLeft}, ${CHART.height - 8})`">
        <!-- 情绪线 -->
        <line x1="0" y1="0" x2="14" y2="0" :stroke="accentColor ?? '#14b8a6'" stroke-width="2" />
        <text x="18" y="3" fill="#6aa88e" font-size="8" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
          {{ t('report.moodCurve.legendMood') }}
        </text>

        <!-- 危机标记 -->
        <rect x="80" y="-4" width="6" height="8" fill="#f59e0b" opacity="0.5" rx="1" />
        <text x="90" y="3" fill="#6aa88e" font-size="8" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
          {{ t('report.moodCurve.legendCrisis') }}
        </text>

        <!-- 每日最低 -->
        <polygon points="166,-4 169,0 166,4 163,0" fill="none" stroke="#8b5cf6" stroke-width="1" />
        <text x="174" y="3" fill="#6aa88e" font-size="8" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
          {{ t('report.moodCurve.legendDailyMin') }}
        </text>
      </g>
    </svg>

    <!-- 无数据提示 -->
    <div v-if="moodData.length < 2" class="no-data-overlay">
      <p>{{ t('report.noMoodData') }}</p>
    </div>

    <!-- 导出按钮 -->
    <button
      v-if="moodData.length >= 2"
      class="export-btn"
      :disabled="isExporting"
      @click="exportPNG"
    >
      {{ isExporting ? t('report.moodCurve.exporting') : t('report.moodCurve.exportBtn') }}
    </button>
  </div>
</template>

<style scoped>
.mood-curve-container {
  position: relative;
  width: 100%;
}

.mood-curve-svg {
  width: 100%;
  height: auto;
  display: block;
}

/* 数据点交互 */
.data-dot {
  cursor: pointer;
  transition: r 0.15s ease;
}
.data-dot:hover {
  r: 5;
}

/* 主曲线微动画 */
.mood-line {
  filter: drop-shadow(0 0 3px rgba(20, 184, 166, 0.3));
}

/* 无数据覆盖 */
.no-data-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 15, 13, 0.6);
  border-radius: 0.75rem;
}
.no-data-overlay p {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* 导出按钮 */
.export-btn {
  margin-top: 0.5rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  font-size: 0.7rem;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.2s;
  float: right;
}
.export-btn:hover:not(:disabled) {
  color: var(--mood-nav-active-text);
  border-color: var(--mood-accent);
  background: var(--mood-hover-bg);
}
.export-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .data-dot { transition: none !important; }
}

/* ── Low energy mode ── */
body.low-energy .mood-line {
  filter: none;
}
</style>
