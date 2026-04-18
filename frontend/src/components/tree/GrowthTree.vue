<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useChatStore } from '@/stores/chat';
import { useSessionTree, BLOOM_EMOJI, type TreeNode as TreeNodeType } from '@/composables/useSessionTree';
import TreeNode from './TreeNode.vue';
import TreeNodePopover from './TreeNodePopover.vue';
import TreeBadgeDisplay from './TreeBadgeDisplay.vue';

const emit = defineEmits<{
  'select-session': [sessionId: string];
  'new-chat': [];
  close: [];
}>();

const moodTheme = useMoodThemeStore();
const chatStore = useChatStore();
const {
  nodes, stats, rareBloomCollection, streak,
  currentMilestone, nextMilestone, checkMilestone,
  STREAK_MILESTONES,
} = useSessionTree();

const svgWidth = 320;
const svgHeight = 400;
const newNodeId = ref<string | null>(null);
const wateringNodeId = ref<string | null>(null);

// ── Popover state ──
const popoverNode = ref<TreeNodeType | null>(null);
const popoverAnchor = ref({ x: 0, y: 0 });
const popoverEditMode = ref(false);

function showPopover(node: TreeNodeType, editMode = false) {
  // Convert node SVG position to viewport coordinates
  const svgEl = document.querySelector('.growth-tree-svg');
  if (svgEl) {
    const rect = svgEl.getBoundingClientRect();
    const nodeX = node.x * svgWidth;
    const nodeY = (1 - node.y) * svgHeight;
    popoverAnchor.value = {
      x: rect.left + (nodeX / svgWidth) * rect.width,
      y: rect.top + (nodeY / svgHeight) * rect.height,
    };
  }
  popoverNode.value = node;
  popoverEditMode.value = editMode;
}

function closePopover() {
  popoverNode.value = null;
  popoverEditMode.value = false;
}

function onNodeClick(node: TreeNodeType) {
  showPopover(node, false);
}

function onNodeLongPress(node: TreeNodeType) {
  showPopover(node, true);
}

function onPopoverSelectSession(sessionId: string) {
  emit('select-session', sessionId);
  closePopover();
}

// ── Watch for new sessions → bloom animation ──
watch(() => chatStore.sessions.length, (newLen, oldLen) => {
  if (newLen > oldLen && chatStore.sessions[0]) {
    newNodeId.value = chatStore.sessions[0].id;
    const milestone = checkMilestone(newLen);
    if (milestone) {
      showMilestone.value = milestone;
      setTimeout(() => { showMilestone.value = null; }, 3000);
    }
    setTimeout(() => { newNodeId.value = null; }, 1500);
  }
});

// ── Watch for messages → watering animation ──
watch(() => chatStore.messages.length, (newLen, oldLen) => {
  if (newLen > oldLen && chatStore.currentSessionId) {
    wateringNodeId.value = chatStore.currentSessionId;
    setTimeout(() => { wateringNodeId.value = null; }, 1000);
  }
});

const showMilestone = ref<{ count: number; label: string; emoji: string } | null>(null);

/** 树干路径 — 从底部中央到顶部，微微弯曲 */
const trunkPath = computed(() => {
  const midX = svgWidth / 2;
  return `M ${midX} ${svgHeight - 20} C ${midX - 15} ${svgHeight * 0.6}, ${midX + 15} ${svgHeight * 0.35}, ${midX} 30`;
});

/** 每个节点到树干的分支路径 */
function branchPath(node: { x: number; y: number }): string {
  const nodeX = node.x * svgWidth;
  const nodeY = (1 - node.y) * svgHeight;
  const trunkX = svgWidth / 2;
  const ctrlX = trunkX + (nodeX - trunkX) * 0.3;
  const ctrlY = nodeY + 15;
  return `M ${trunkX} ${nodeY + 10} Q ${ctrlX} ${ctrlY}, ${nodeX} ${nodeY}`;
}

/** 低能量模式 — 简化为列表 */
const isSimpleMode = computed(() => moodTheme.isLowEnergy);

// ── Environment layer — mood-based weather elements ──
const moodLevel = computed(() => moodTheme.moodScore);

/** 萤火虫数据 (mood 1-2) */
const fireflies = computed(() => {
  if (moodLevel.value > 2) return [];
  return Array.from({ length: 7 }, (_, i) => ({
    cx: 30 + (i * 43 + 17) % (svgWidth - 60),
    cy: 40 + (i * 67 + 23) % (svgHeight - 100),
    r: 1.5 + (i % 3) * 0.5,
    delay: (i * 0.7).toFixed(1),
    duration: (4 + (i % 3)).toFixed(1),
  }));
});

/** 薄雾椭圆 (mood 3) */
const mistPatches = computed(() => {
  if (moodLevel.value !== 3) return [];
  return [
    { cx: svgWidth * 0.2, cy: svgHeight * 0.7, rx: 60, ry: 12, delay: '0' },
    { cx: svgWidth * 0.65, cy: svgHeight * 0.5, rx: 50, ry: 10, delay: '1.2' },
    { cx: svgWidth * 0.4, cy: svgHeight * 0.85, rx: 70, ry: 14, delay: '2.4' },
    { cx: svgWidth * 0.8, cy: svgHeight * 0.35, rx: 40, ry: 8, delay: '0.8' },
  ];
});

/** 云朵路径 (mood 4) */
const clouds = computed(() => {
  if (moodLevel.value !== 4) return [];
  return [
    { x: 20, y: 40, scale: 0.8, delay: '0', duration: '12' },
    { x: 120, y: 70, scale: 0.6, delay: '3', duration: '10' },
    { x: 220, y: 30, scale: 0.7, delay: '6', duration: '11' },
    { x: 60, y: 90, scale: 0.5, delay: '1.5', duration: '9' },
  ];
});

/** 阳光穿林光线 (mood 5) */
const sunrays = computed(() => {
  if (moodLevel.value < 5) return [];
  return [
    { x1: svgWidth - 20, y1: 10, x2: svgWidth * 0.3, y2: svgHeight * 0.6, opacity: 0.15, delay: '0' },
    { x1: svgWidth - 40, y1: 0, x2: svgWidth * 0.15, y2: svgHeight * 0.5, opacity: 0.1, delay: '1' },
    { x1: svgWidth, y1: 30, x2: svgWidth * 0.5, y2: svgHeight * 0.7, opacity: 0.12, delay: '2' },
  ];
});

/** 地面草丛密度 */
const grassBlades = computed(() => {
  const total = stats.value.total;
  let count = 2;
  if (total > 5) count = 5;
  if (total > 20) count = 9;

  const blades: { x: number; h: number; lean: number; hasFlower: boolean }[] = [];
  const baseY = svgHeight - 14;
  const spreadStart = svgWidth * 0.2;
  const spreadEnd = svgWidth * 0.8;

  for (let i = 0; i < count; i++) {
    const t = count <= 1 ? 0.5 : i / (count - 1);
    const x = spreadStart + t * (spreadEnd - spreadStart) + ((i * 13 + 7) % 11 - 5);
    const h = 10 + (i * 7 + 3) % 12;
    const lean = ((i % 2 === 0 ? -1 : 1) * ((i * 5 + 2) % 7)) * 0.4;
    blades.push({ x, h, lean, hasFlower: total > 20 && i % 3 === 0 });
  }
  return blades;
});

/** 云朵 SVG path (简单的云形) */
function cloudPath(scale: number): string {
  const s = scale;
  return `M${0*s},${10*s} Q${5*s},${0*s} ${15*s},${2*s} Q${22*s},${-4*s} ${30*s},${3*s} Q${38*s},${-2*s} ${40*s},${6*s} Q${45*s},${4*s} ${42*s},${10*s} Z`;
}
</script>

<template>
  <div class="growth-tree-panel animate-float-in">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-lg">🌳</span>
        <h2 class="text-sm font-medium" style="color: var(--text-primary);">成长树</h2>
        <!-- Streak display -->
        <span
          v-if="streak.isActive && streak.days >= 2"
          class="text-[10px] px-2 py-0.5 rounded-full"
          :style="{ background: moodTheme.palette.navActive, color: moodTheme.palette.accent }"
        >
          🔥 {{ streak.days }}天
        </span>
      </div>
      <button
        @click="emit('close')"
        class="text-sm px-2 py-1 rounded-lg transition-colors"
        style="color: var(--text-muted);"
      >
        ✕
      </button>
    </div>

    <!-- Milestone notification -->
    <div
      v-if="showMilestone"
      class="text-center py-2 mb-3 rounded-xl animate-float-in"
      :style="{ background: moodTheme.palette.navActive, border: `1px solid ${moodTheme.palette.accent}40` }"
    >
      <span class="text-lg">{{ showMilestone.emoji }}</span>
      <p class="text-xs mt-1" :style="{ color: moodTheme.palette.navActiveText }">{{ showMilestone.label }}</p>
    </div>

    <!-- Low-energy: simple list view -->
    <div v-if="isSimpleMode" class="space-y-2 max-h-64 overflow-y-auto">
      <button
        v-for="node in nodes"
        :key="node.sessionId"
        @click="emit('select-session', node.sessionId)"
        class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
        :style="node.sessionId === chatStore.currentSessionId
          ? { background: moodTheme.palette.navActive, color: moodTheme.palette.navActiveText }
          : { color: 'var(--text-secondary)' }"
      >
        <span
          class="w-2.5 h-2.5 rounded-full flex-shrink-0"
          :style="{ background: moodTheme.palette.accent, opacity: node.activityScore / 100 * 0.8 + 0.2 }"
        />
        <span class="truncate">{{ node.title }}</span>
        <span class="text-[10px] ml-auto flex-shrink-0" style="color: var(--text-muted);">
          {{ BLOOM_EMOJI[node.bloomStage] }}
        </span>
      </button>
    </div>

    <!-- Normal: SVG tree view -->
    <div v-else class="relative">
      <svg
        :width="svgWidth"
        :height="svgHeight"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        class="mx-auto growth-tree-svg"
      >
        <!-- SVG filters -->
        <defs>
          <filter id="tree-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="mist-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <!-- Sunray gradient -->
          <linearGradient id="sunray-grad" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="moodTheme.palette.accent" stop-opacity="0.25" />
            <stop offset="100%" :stop-color="moodTheme.palette.accent" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- ═══ Environment layer ═══ -->
        <g class="env-layer">
          <!-- Moon (mood 1-2) -->
          <g v-if="moodLevel <= 2">
            <circle
              :cx="svgWidth - 40" cy="35" r="12"
              :fill="moodTheme.palette.accent"
              opacity="0.15"
            />
            <circle
              :cx="svgWidth - 36" cy="32" r="10"
              fill="var(--bg-primary)"
            />
          </g>

          <!-- Fireflies (mood 1-2) -->
          <circle
            v-for="(ff, i) in fireflies"
            :key="'ff-' + i"
            :cx="ff.cx"
            :cy="ff.cy"
            :r="ff.r"
            :fill="moodTheme.palette.accent"
            class="firefly"
            :style="{
              animationDelay: `${ff.delay}s`,
              animationDuration: `${ff.duration}s`,
            }"
          />

          <!-- Mist patches (mood 3) -->
          <ellipse
            v-for="(m, i) in mistPatches"
            :key="'mist-' + i"
            :cx="m.cx"
            :cy="m.cy"
            :rx="m.rx"
            :ry="m.ry"
            :fill="moodTheme.palette.accent"
            opacity="0.06"
            filter="url(#mist-blur)"
            class="mist-patch"
            :style="{ animationDelay: `${m.delay}s` }"
          />

          <!-- Clouds (mood 4) -->
          <path
            v-for="(c, i) in clouds"
            :key="'cloud-' + i"
            :d="cloudPath(c.scale)"
            :transform="`translate(${c.x}, ${c.y})`"
            :fill="moodTheme.palette.accent"
            opacity="0.08"
            class="cloud"
            :style="{
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
            }"
          />

          <!-- Sunrays (mood 5) -->
          <line
            v-for="(ray, i) in sunrays"
            :key="'ray-' + i"
            :x1="ray.x1" :y1="ray.y1"
            :x2="ray.x2" :y2="ray.y2"
            stroke="url(#sunray-grad)"
            :stroke-width="20"
            stroke-linecap="round"
            :opacity="ray.opacity"
            class="sunray"
            :style="{ animationDelay: `${ray.delay}s` }"
          />
        </g>

        <!-- Trunk -->
        <path
          :d="trunkPath"
          fill="none"
          :stroke="moodTheme.palette.accent"
          stroke-width="3"
          :stroke-opacity="streak.isActive && streak.days >= 3 ? 0.4 : 0.25"
          stroke-linecap="round"
        />

        <!-- Branches -->
        <path
          v-for="node in nodes"
          :key="'branch-' + node.sessionId"
          :d="branchPath(node)"
          fill="none"
          :stroke="moodTheme.palette.accent"
          stroke-width="1.5"
          :stroke-opacity="0.15 + node.activityScore / 100 * 0.2"
          stroke-linecap="round"
        />

        <!-- Nodes -->
        <TreeNode
          v-for="node in nodes"
          :key="'node-' + node.sessionId"
          :bloom-stage="node.bloomStage"
          :activity-score="node.activityScore"
          :title="node.title"
          :is-active="node.sessionId === chatStore.currentSessionId"
          :is-new="node.sessionId === newNodeId"
          :is-watering="node.sessionId === wateringNodeId"
          :rare-bloom-types="node.rareBloomTypes"
          :cx="node.x * svgWidth"
          :cy="(1 - node.y) * svgHeight"
          @click="onNodeClick(node)"
          @long-press="onNodeLongPress(node)"
        />

        <!-- ═══ Enhanced Ground ═══ -->
        <g>
          <!-- Base mound -->
          <ellipse
            :cx="svgWidth / 2"
            :cy="svgHeight - 10"
            :rx="svgWidth * 0.38"
            ry="8"
            :fill="moodTheme.palette.accentSoft"
            opacity="0.3"
          />
          <!-- Secondary mound -->
          <ellipse
            :cx="svgWidth / 2 - 20"
            :cy="svgHeight - 8"
            :rx="svgWidth * 0.25"
            ry="5"
            :fill="moodTheme.palette.accent"
            opacity="0.08"
          />

          <!-- Grass blades -->
          <g v-for="(blade, i) in grassBlades" :key="'grass-' + i">
            <line
              :x1="blade.x"
              :y1="svgHeight - 14"
              :x2="blade.x + blade.lean * blade.h"
              :y2="svgHeight - 14 - blade.h"
              :stroke="moodTheme.palette.accent"
              stroke-width="1.5"
              stroke-opacity="0.3"
              stroke-linecap="round"
            />
            <!-- Small flower on some blades -->
            <circle
              v-if="blade.hasFlower"
              :cx="blade.x + blade.lean * blade.h"
              :cy="svgHeight - 14 - blade.h - 2"
              r="2"
              :fill="moodTheme.palette.accent"
              opacity="0.5"
            />
          </g>
        </g>
      </svg>
    </div>

    <!-- Badge display (rare blooms + streak) -->
    <TreeBadgeDisplay
      v-if="!isSimpleMode"
      :rare-bloom-collection="rareBloomCollection"
      :streak="streak"
      class="mt-2"
    />

    <!-- Stats -->
    <div class="flex items-center justify-center gap-4 mt-3 text-xs" style="color: var(--text-muted);">
      <span>🌱 {{ stats.total }} 次对话</span>
      <span v-if="stats.blooming > 0">🌸 {{ stats.blooming }} 朵花已开</span>
      <span v-if="nextMilestone" :style="{ color: moodTheme.palette.accent }">
        下一个: {{ nextMilestone.emoji }} {{ nextMilestone.label }}
      </span>
    </div>

    <!-- New chat button -->
    <button
      @click="emit('new-chat')"
      class="w-full mt-3 py-2.5 rounded-xl text-sm font-medium transition-all"
      :style="{
        background: moodTheme.palette.navActive,
        color: moodTheme.palette.navActiveText,
        border: `1px solid ${moodTheme.palette.accent}30`,
      }"
    >
      + 种下新种子
    </button>

    <!-- Node popover -->
    <TreeNodePopover
      v-if="popoverNode"
      :session-id="popoverNode.sessionId"
      :title="popoverNode.title"
      :message-count="popoverNode.messageCount"
      :bloom-stage="popoverNode.bloomStage"
      :rare-bloom-types="popoverNode.rareBloomTypes"
      :created-at="popoverNode.createdAt"
      :anchor-x="popoverAnchor.x"
      :anchor-y="popoverAnchor.y"
      :edit-mode="popoverEditMode"
      @close="closePopover"
      @select-session="onPopoverSelectSession"
    />
  </div>
</template>

<style scoped>
.growth-tree-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 1.25rem;
  padding: 1rem;
  backdrop-filter: blur(12px);
}

/* ── Environment animations ── */
.firefly {
  animation: firefly-float 4s ease-in-out infinite alternate;
}
.mist-patch {
  animation: mist-drift 6s ease-in-out infinite alternate;
}
.cloud {
  animation: cloud-drift 10s linear infinite;
}
.sunray {
  animation: sunray-glow 4s ease-in-out infinite alternate;
}

@keyframes firefly-float {
  0% { opacity: 0.1; transform: translateY(0) translateX(0); }
  50% { opacity: 0.6; }
  100% { opacity: 0.15; transform: translateY(-15px) translateX(8px); }
}
@keyframes mist-drift {
  0% { transform: translateY(0); opacity: 0.04; }
  100% { transform: translateY(-8px); opacity: 0.08; }
}
@keyframes cloud-drift {
  0% { transform: translateX(0); }
  100% { transform: translateX(40px); }
}
@keyframes sunray-glow {
  0% { opacity: 0.05; }
  100% { opacity: 0.2; }
}

/* Low energy: hide environment layer */
:global(body.low-energy) .env-layer { display: none; }

@media (prefers-reduced-motion: reduce) {
  .firefly, .mist-patch, .cloud, .sunray { animation: none !important; }
}
</style>
