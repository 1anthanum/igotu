<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { BLOOM_SIZE, RARE_BLOOM_CONFIG, type BloomStage, type RareBloomType } from '@/composables/useSessionTree';

const props = defineProps<{
  bloomStage: BloomStage;
  activityScore: number;
  title: string;
  isActive: boolean;
  isNew: boolean;
  isWatering: boolean;
  rareBloomTypes: RareBloomType[];
  cx: number;
  cy: number;
}>();

const emit = defineEmits<{
  click: [];
  'long-press': [];
}>();

const moodTheme = useMoodThemeStore();

const radius = computed(() => BLOOM_SIZE[props.bloomStage]);

const glowOpacity = computed(() => {
  const base = props.activityScore / 100;
  return base * moodTheme.palette.glowIntensity;
});

const fillOpacity = computed(() => {
  switch (props.bloomStage) {
    case 'seed': return 0.3;
    case 'sprout': return 0.5;
    case 'leaf': return 0.7;
    case 'flower': return 0.85;
    case 'fruit': return 1;
  }
});

const animClass = computed(() => props.isNew ? 'bloom-anim' : '');

/** 稀有绽放外环颜色（取第一个稀有类型的颜色） */
const rareRingColor = computed(() => {
  if (props.rareBloomTypes.length === 0) return null;
  return RARE_BLOOM_CONFIG[props.rareBloomTypes[0]].ringColor;
});

/** 深度对话节点放大 */
const sizeMultiplier = computed(() =>
  props.rareBloomTypes.includes('deep_talk') ? 1.1 : 1
);

// ── Long-press detection ──
let pressTimer: ReturnType<typeof setTimeout> | null = null;
let pressStart = { x: 0, y: 0 };
const LONG_PRESS_MS = 500;
const MOVE_THRESHOLD = 10;

function onPointerDown(e: PointerEvent) {
  pressStart = { x: e.clientX, y: e.clientY };
  pressTimer = setTimeout(() => {
    emit('long-press');
    pressTimer = null;
  }, LONG_PRESS_MS);
}

function onPointerMove(e: PointerEvent) {
  if (!pressTimer) return;
  const dx = e.clientX - pressStart.x;
  const dy = e.clientY - pressStart.y;
  if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

function onPointerUp() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
    // Short click
    emit('click');
  }
}

function onPointerCancel() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

onBeforeUnmount(() => {
  if (pressTimer) clearTimeout(pressTimer);
});
</script>

<template>
  <g
    :class="animClass"
    :transform="`translate(${cx}, ${cy}) scale(${sizeMultiplier})`"
    style="cursor: pointer;"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <!-- Rare bloom outer ring -->
    <circle
      v-if="rareRingColor"
      :r="radius * 2.5"
      fill="none"
      :stroke="rareRingColor"
      stroke-width="1.5"
      :stroke-opacity="0.4"
      stroke-dasharray="4 3"
      class="rare-ring"
    />

    <!-- Glow halo -->
    <circle
      :r="radius * 2"
      :fill="moodTheme.palette.accent"
      :opacity="glowOpacity * 0.3"
      :style="isActive ? `filter: blur(${radius}px);` : `filter: blur(${radius * 0.7}px);`"
    />

    <!-- Main node -->
    <circle
      :r="radius"
      :fill="moodTheme.palette.accent"
      :opacity="fillOpacity"
      :stroke="isActive ? moodTheme.palette.navActiveText : 'none'"
      :stroke-width="isActive ? 2 : 0"
      class="transition-all"
      style="transition: r 0.5s, opacity 0.5s;"
    />

    <!-- Inner core (bright dot) -->
    <circle
      :r="radius * 0.35"
      fill="white"
      :opacity="fillOpacity * 0.5"
    />

    <!-- Watering animation -->
    <g v-if="isWatering" class="watering-group">
      <!-- Water drops -->
      <circle
        v-for="n in 3"
        :key="'drop-' + n"
        :cx="(n - 2) * 4"
        :cy="-(radius + 10)"
        r="2"
        fill="#60a5fa"
        opacity="0.8"
        class="water-drop"
        :style="{ animationDelay: `${(n - 1) * 0.15}s` }"
      />
      <!-- Ripple at base -->
      <circle
        :r="radius * 0.5"
        fill="none"
        stroke="#60a5fa"
        stroke-width="1"
        opacity="0.5"
        class="water-ripple"
      />
    </g>

    <!-- Title (shown on hover via CSS) -->
    <text
      :y="-(radius * sizeMultiplier + 8)"
      text-anchor="middle"
      :fill="moodTheme.palette.navActiveText"
      font-size="10"
      class="node-label"
      style="pointer-events: none;"
    >
      {{ title.slice(0, 8) }}{{ title.length > 8 ? '…' : '' }}
    </text>

    <!-- Rare bloom indicator emoji (bottom) -->
    <text
      v-if="rareBloomTypes.length > 0"
      :y="radius + 12"
      text-anchor="middle"
      font-size="8"
      style="pointer-events: none;"
    >
      {{ rareBloomTypes.map(t => RARE_BLOOM_CONFIG[t].emoji).join('') }}
    </text>
  </g>
</template>

<style scoped>
.node-label {
  opacity: 0;
  transition: opacity 0.3s;
}
g:hover .node-label {
  opacity: 1;
}
.bloom-anim {
  animation: bloom-grow 0.8s ease-out both;
}
.transition-all {
  transition: all 0.3s ease;
}

/* Rare bloom ring pulse */
.rare-ring {
  animation: rare-ring-pulse 3s ease-in-out infinite;
}
@keyframes rare-ring-pulse {
  0%, 100% { stroke-opacity: 0.2; }
  50% { stroke-opacity: 0.6; }
}

/* Watering animation */
.water-drop {
  animation: water-fall 0.8s ease-in both;
}
@keyframes water-fall {
  0% { transform: translateY(0); opacity: 0.8; }
  100% { transform: translateY(30px); opacity: 0; r: 1; }
}

.water-ripple {
  animation: ripple-out 0.8s ease-out 0.3s both;
}
@keyframes ripple-out {
  0% { r: 2; opacity: 0.6; }
  100% { r: 20; opacity: 0; }
}

/* Low energy: disable animations */
:global(body.low-energy) .rare-ring { animation: none; stroke-opacity: 0.3; }
:global(body.low-energy) .water-drop { animation: none; display: none; }
:global(body.low-energy) .water-ripple { animation: none; display: none; }

@media (prefers-reduced-motion: reduce) {
  .rare-ring { animation: none !important; }
  .bloom-anim { animation: none !important; }
  .water-drop { animation: none !important; }
  .water-ripple { animation: none !important; }
}
</style>
