<script setup lang="ts">
/**
 * SanctuaryView — 被动陪伴模式
 *
 * 全屏成长树 + 环境层作为"只是待在这里"的体验。
 * 轻触树上节点 → 浮现情绪词（affect labeling, 不是任务）。
 * 轻触空白处 → 节点名消失。
 *
 * 设计原则：
 * - 零认知负荷：不推送任何任务或引导
 * - 被动陪伴：app 在陪你，不在等你做事
 * - 情绪命名：轻触时自然浮现情绪词，不是问卷
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useMoodThemeStore, MOOD_CONFIG } from '@/composables/useMoodTheme';
import { useSessionTree, BLOOM_EMOJI } from '@/composables/useSessionTree';
import { useChatStore } from '@/stores/chat';

const emit = defineEmits<{
  'want-chat': [];
  'want-breathe': [];
}>();

const moodTheme = useMoodThemeStore();
const chatStore = useChatStore();
const { nodes, stats, streak } = useSessionTree();

// ── SVG dimensions ──
const svgW = 360;
const svgH = 500;

// ── Tapped node: shows affect label ──
const tappedNode = ref<{ id: string; label: string; x: number; y: number } | null>(null);
let tapTimeout: ReturnType<typeof setTimeout> | null = null;

// ── Affect labeling pool — poetic, non-clinical ──
const AFFECT_WORDS: Record<number, string[]> = {
  1: ['沉重', '暗潮', '雾里', '疲惫', '寂静', '深渊'],
  2: ['微暗', '犹豫', '朦胧', '阴天', '低沉', '徘徊'],
  3: ['平静', '呼吸', '安稳', '存在', '中性', '漂流'],
  4: ['舒展', '回暖', '明朗', '轻快', '安心', '萌芽'],
  5: ['晴朗', '温暖', '饱满', '光', '绽放', '跃动'],
};

function getAffectWord(): string {
  const pool = AFFECT_WORDS[moodTheme.currentMood] || AFFECT_WORDS[3];
  return pool[Math.floor(Math.random() * pool.length)];
}

function onNodeTap(node: { sessionId: string; x: number; y: number }) {
  if (tapTimeout) clearTimeout(tapTimeout);

  const word = getAffectWord();
  tappedNode.value = {
    id: node.sessionId,
    label: word,
    x: node.x * svgW,
    y: (1 - node.y) * svgH,
  };

  // Fade after 3s
  tapTimeout = setTimeout(() => {
    tappedNode.value = null;
  }, 3000);
}

function onBackgroundTap() {
  tappedNode.value = null;
}

// ── Ambient message — rotates slowly ──
const AMBIENT_MESSAGES: Record<number, string[]> = {
  1: ['你在这里就好。', '什么都不需要做。', '萤火虫也在。'],
  2: ['慢慢来。', '天会亮的。', '你已经在了。'],
  3: ['安静也是力量。', '此刻，平静。', '呼吸。'],
  4: ['你在生长。', '新叶在舒展。', '感受光。'],
  5: ['阳光穿过了树冠。', '好日子。', '你值得这个。'],
};

const ambientIndex = ref(0);
let ambientTimer: ReturnType<typeof setInterval> | null = null;

const ambientMessage = computed(() => {
  const pool = AMBIENT_MESSAGES[moodTheme.currentMood] || AMBIENT_MESSAGES[3];
  return pool[ambientIndex.value % pool.length];
});

onMounted(() => {
  ambientTimer = setInterval(() => {
    ambientIndex.value++;
  }, 8000);
});

onUnmounted(() => {
  if (ambientTimer) clearInterval(ambientTimer);
  if (tapTimeout) clearTimeout(tapTimeout);
});

// ── Current mood metadata ──
const moodMeta = computed(() => MOOD_CONFIG.find(m => m.score === moodTheme.currentMood) || MOOD_CONFIG[2]);

// ── Tree trunk path ──
const trunkPath = computed(() => {
  const midX = svgW / 2;
  return `M ${midX} ${svgH - 30} C ${midX - 20} ${svgH * 0.55}, ${midX + 20} ${svgH * 0.3}, ${midX} 50`;
});

function branchPath(node: { x: number; y: number }): string {
  const nodeX = node.x * svgW;
  const nodeY = (1 - node.y) * svgH;
  const trunkX = svgW / 2;
  const ctrlX = trunkX + (nodeX - trunkX) * 0.3;
  const ctrlY = nodeY + 15;
  return `M ${trunkX} ${nodeY + 10} Q ${ctrlX} ${ctrlY}, ${nodeX} ${nodeY}`;
}

// ── Fireflies (mood 1-2) ──
const fireflies = computed(() => {
  if (moodTheme.currentMood > 2) return [];
  return Array.from({ length: 9 }, (_, i) => ({
    cx: 25 + (i * 41 + 13) % (svgW - 50),
    cy: 35 + (i * 61 + 19) % (svgH - 80),
    r: 1.5 + (i % 3) * 0.7,
    delay: (i * 0.8).toFixed(1),
    dur: (5 + (i % 4)).toFixed(1),
  }));
});

// ── Mist (mood 3) ──
const mistPatches = computed(() => {
  if (moodTheme.currentMood !== 3) return [];
  return [
    { cx: svgW * 0.2, cy: svgH * 0.7, rx: 70, ry: 14 },
    { cx: svgW * 0.7, cy: svgH * 0.45, rx: 55, ry: 11 },
    { cx: svgW * 0.4, cy: svgH * 0.85, rx: 80, ry: 16 },
  ];
});

// ── Sunrays (mood 5) ──
const sunrays = computed(() => {
  if (moodTheme.currentMood < 5) return [];
  return [
    { x1: svgW - 20, y1: 10, x2: svgW * 0.25, y2: svgH * 0.55 },
    { x1: svgW - 50, y1: 0, x2: svgW * 0.1, y2: svgH * 0.45 },
    { x1: svgW, y1: 40, x2: svgW * 0.45, y2: svgH * 0.65 },
  ];
});

// ── Grass ──
const grassBlades = computed(() => {
  const count = Math.min(12, 3 + stats.value.total);
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1 || 1);
    return {
      x: svgW * 0.15 + t * svgW * 0.7 + ((i * 13 + 7) % 11 - 5),
      h: 10 + (i * 7 + 3) % 14,
      lean: ((i % 2 === 0 ? -1 : 1) * ((i * 5 + 2) % 7)) * 0.3,
    };
  });
});

// ── Moon (mood 1-2) ──
const showMoon = computed(() => moodTheme.currentMood <= 2);

// ── Leaves (mood 4) ──
const floatingLeaves = computed(() => {
  if (moodTheme.currentMood !== 4) return [];
  return Array.from({ length: 4 }, (_, i) => ({
    x: 40 + i * (svgW - 80) / 3,
    y: 60 + (i * 37) % (svgH * 0.4),
    delay: (i * 1.2).toFixed(1),
  }));
});

// ── Bottom interaction hints (max 2, extremely subtle) ──
const showHints = ref(true);
</script>

<template>
  <div class="sanctuary" @click="onBackgroundTap">
    <!-- Ambient message — fades in/out -->
    <transition name="ambient-fade" mode="out-in">
      <p :key="ambientMessage" class="ambient-msg">
        {{ ambientMessage }}
      </p>
    </transition>

    <!-- Full-screen SVG scene -->
    <svg
      :width="svgW"
      :height="svgH"
      :viewBox="`0 0 ${svgW} ${svgH}`"
      class="sanctuary-svg"
    >
      <defs>
        <filter id="s-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="s-mist" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <linearGradient id="s-sunray" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="moodTheme.palette.accent" stop-opacity="0.2" />
          <stop offset="100%" :stop-color="moodTheme.palette.accent" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- ═══ Environment layer ═══ -->

      <!-- Moon (mood 1-2) -->
      <g v-if="showMoon">
        <circle :cx="svgW - 50" cy="45" r="16" :fill="moodTheme.palette.accent" opacity="0.12" />
        <circle :cx="svgW - 45" cy="41" r="13" fill="var(--bg-primary)" />
      </g>

      <!-- Fireflies (mood 1-2) -->
      <circle
        v-for="(ff, i) in fireflies" :key="'ff'+i"
        :cx="ff.cx" :cy="ff.cy" :r="ff.r"
        :fill="moodTheme.palette.accent"
        class="s-firefly"
        :style="{ animationDelay: ff.delay+'s', animationDuration: ff.dur+'s' }"
      />

      <!-- Mist (mood 3) -->
      <ellipse
        v-for="(m, i) in mistPatches" :key="'mist'+i"
        :cx="m.cx" :cy="m.cy" :rx="m.rx" :ry="m.ry"
        :fill="moodTheme.palette.accent" opacity="0.05" filter="url(#s-mist)"
        class="s-mist"
      />

      <!-- Floating leaves (mood 4) -->
      <text
        v-for="(leaf, i) in floatingLeaves" :key="'leaf'+i"
        :x="leaf.x" :y="leaf.y"
        font-size="10" class="s-leaf"
        :style="{ animationDelay: leaf.delay+'s' }"
      >🍃</text>

      <!-- Sunrays (mood 5) -->
      <line
        v-for="(ray, i) in sunrays" :key="'ray'+i"
        :x1="ray.x1" :y1="ray.y1" :x2="ray.x2" :y2="ray.y2"
        stroke="url(#s-sunray)" stroke-width="24" stroke-linecap="round"
        opacity="0.12" class="s-sunray"
      />

      <!-- ═══ Tree ═══ -->

      <!-- Trunk -->
      <path
        :d="trunkPath" fill="none"
        :stroke="moodTheme.palette.accent" stroke-width="3.5"
        stroke-opacity="0.3" stroke-linecap="round"
      />

      <!-- Branches -->
      <path
        v-for="node in nodes" :key="'br-'+node.sessionId"
        :d="branchPath(node)" fill="none"
        :stroke="moodTheme.palette.accent" stroke-width="1.5"
        :stroke-opacity="0.12 + node.activityScore / 100 * 0.2"
        stroke-linecap="round"
      />

      <!-- Node circles (clickable for affect labeling) -->
      <g
        v-for="node in nodes" :key="'nd-'+node.sessionId"
        @click.stop="onNodeTap(node)"
        class="s-node-group"
        :style="{ cursor: 'pointer' }"
      >
        <circle
          :cx="node.x * svgW" :cy="(1 - node.y) * svgH"
          :r="5 + node.activityScore / 100 * 4"
          :fill="moodTheme.palette.accent"
          :opacity="0.3 + node.activityScore / 100 * 0.5"
          filter="url(#s-glow)"
        />
        <text
          :x="node.x * svgW" :y="(1 - node.y) * svgH + 1"
          text-anchor="middle" dominant-baseline="central"
          font-size="8"
        >{{ BLOOM_EMOJI[node.bloomStage] }}</text>
      </g>

      <!-- Affect label — floats near tapped node -->
      <transition name="affect-fade">
        <g v-if="tappedNode">
          <rect
            :x="tappedNode.x - 22" :y="tappedNode.y - 28"
            width="44" height="18" rx="9"
            :fill="moodTheme.palette.accentSoft" opacity="0.85"
          />
          <text
            :x="tappedNode.x" :y="tappedNode.y - 17"
            text-anchor="middle" dominant-baseline="central"
            font-size="9" :fill="moodTheme.palette.navActiveText"
            class="affect-label"
          >{{ tappedNode.label }}</text>
        </g>
      </transition>

      <!-- Ground -->
      <ellipse
        :cx="svgW / 2" :cy="svgH - 18" :rx="svgW * 0.42" ry="10"
        :fill="moodTheme.palette.accentSoft" opacity="0.25"
      />
      <line
        v-for="(b, i) in grassBlades" :key="'g'+i"
        :x1="b.x" :y1="svgH - 22"
        :x2="b.x + b.lean * b.h" :y2="svgH - 22 - b.h"
        :stroke="moodTheme.palette.accent" stroke-width="1.2"
        stroke-opacity="0.25" stroke-linecap="round"
      />
    </svg>

    <!-- Mood metaphor — small label below tree -->
    <p class="mood-metaphor">
      <span class="mood-emoji">{{ moodMeta.emoji }}</span>
      <span>{{ moodMeta.metaphor }}</span>
    </p>

    <!-- Streak (if active) -->
    <p v-if="streak.isActive && streak.days >= 2" class="streak-label">
      🔥 连续 {{ streak.days }} 天
    </p>

    <!-- Bottom subtle hints (dismissible) -->
    <div v-if="showHints" class="sanctuary-hints">
      <button class="hint-pill" @click.stop="emit('want-breathe')">
        🍃 <span>呼吸</span>
      </button>
      <button class="hint-pill" @click.stop="emit('want-chat')">
        💭 <span>聊聊</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sanctuary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  position: relative;
  padding: 1rem 0 2rem;
  -webkit-tap-highlight-color: transparent;
}

.ambient-msg {
  font-size: 0.95rem;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 1rem;
  min-height: 1.5em;
  opacity: 0.7;
}
.ambient-fade-enter-active, .ambient-fade-leave-active {
  transition: opacity 2s ease;
}
.ambient-fade-enter-from, .ambient-fade-leave-to {
  opacity: 0;
}

.sanctuary-svg {
  max-width: 100%;
  height: auto;
}

.mood-metaphor {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  opacity: 0.6;
  margin-top: 0.5rem;
}
.mood-emoji { font-size: 0.9rem; }

.streak-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  opacity: 0.5;
  margin-top: 0.25rem;
}

/* ── Sanctuary hints ── */
.sanctuary-hints {
  position: absolute;
  bottom: 0;
  display: flex;
  gap: 0.75rem;
}
.hint-pill {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.3s;
}
.hint-pill:hover { opacity: 0.8; }
.hint-pill span { opacity: 0.7; }

/* ── SVG animations ── */
.s-firefly {
  animation: s-ff-float 5s ease-in-out infinite alternate;
}
.s-mist {
  animation: s-mist-drift 8s ease-in-out infinite alternate;
}
.s-leaf {
  animation: s-leaf-fall 7s ease-in-out infinite;
}
.s-sunray {
  animation: s-sun-glow 5s ease-in-out infinite alternate;
}

@keyframes s-ff-float {
  0% { opacity: 0.08; transform: translateY(0) translateX(0); }
  50% { opacity: 0.5; }
  100% { opacity: 0.12; transform: translateY(-18px) translateX(10px); }
}
@keyframes s-mist-drift {
  0% { transform: translateY(0); opacity: 0.03; }
  100% { transform: translateY(-10px); opacity: 0.07; }
}
@keyframes s-leaf-fall {
  0% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
  50% { transform: translateY(20px) rotate(15deg); opacity: 0.3; }
  100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
}
@keyframes s-sun-glow {
  0% { opacity: 0.06; }
  100% { opacity: 0.18; }
}

.affect-label {
  font-weight: 500;
  letter-spacing: 0.08em;
}

.s-node-group {
  transition: transform 0.2s ease;
}
.s-node-group:active {
  transform: scale(1.1);
}

@media (prefers-reduced-motion: reduce) {
  .s-firefly, .s-mist, .s-leaf, .s-sunray { animation: none !important; }
  .ambient-fade-enter-active, .ambient-fade-leave-active { transition: none !important; }
}
</style>
