<script setup lang="ts">
/**
 * SoundScape — Layer 1 感官通道：声景
 *
 * 零文字交互的声景播放器。
 * - 点击播放/暂停当前情绪对应的声景
 * - 长按切换到下一个声景（不显示列表）
 * - 视觉反馈：波形动画 + 柔和 glow
 *
 * 设计原则：
 * - 零认知负荷：不需要选择，自动匹配情绪
 * - 单焦点：屏幕上只有一个交互元素
 * - 感官优先：声音是主角，视觉是辅助
 */
import { ref, computed, onUnmounted, watch } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const moodTheme = useMoodThemeStore();

// ── 声景配置 ──
interface Soundscape {
  id: string;
  /** 情绪对应的声景列表 */
  moods: number[];
  /** 音频文件路径（相对于 public/） */
  src: string;
  /** 显示 icon */
  icon: string;
}

const SOUNDSCAPES: Soundscape[] = [
  { id: 'rain',    moods: [1],    src: '/audio/rain.mp3',    icon: '🌧️' },
  { id: 'night',   moods: [1],    src: '/audio/night.mp3',   icon: '🌙' },
  { id: 'stream',  moods: [2],    src: '/audio/stream.mp3',  icon: '💧' },
  { id: 'wind',    moods: [2],    src: '/audio/wind.mp3',    icon: '🍃' },
  { id: 'forest',  moods: [3, 4], src: '/audio/forest.mp3',  icon: '🌿' },
  { id: 'birds',   moods: [4, 5], src: '/audio/birds.mp3',   icon: '🐦' },
];

// ── 状态 ──
const isPlaying = ref(false);
const currentIndex = ref(0);
const audioReady = ref(false);
const volume = ref(0.6);
const isFadingIn = ref(false);

/** 当前情绪可用的声景 */
const availableScapes = computed(() => {
  const mood = moodTheme.currentMood;
  const matched = SOUNDSCAPES.filter(s => s.moods.includes(mood));
  // 至少返回一个（fallback 到最近情绪的声景）
  return matched.length > 0 ? matched : SOUNDSCAPES.filter(s => s.moods.includes(3));
});

const currentScape = computed(() => {
  const scapes = availableScapes.value;
  return scapes[currentIndex.value % scapes.length];
});

// ── Audio 管理 ──
let audioEl: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let gainNode: GainNode | null = null;
let noiseSource: AudioBufferSourceNode | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
/** 是否正在使用程序化白噪声（mp3 不可用时的 fallback） */
const usingNoiseFallback = ref(false);

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/**
 * 程序化生成噪声 buffer。
 * type: 'white' = 平坦频谱（所有频率等能量）
 *       'pink'  = 1/f 频谱（低频更强，更接近自然声）
 *       'brown' = 1/f² 频谱（深沉低频，接近雨声/瀑布）
 */
function generateNoiseBuffer(
  ctx: AudioContext,
  durationSec: number = 4,
  type: 'white' | 'pink' | 'brown' = 'pink'
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'pink') {
    // Paul Kellet's pink noise algorithm
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else {
    // Brown noise (random walk, clamped)
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }

  return buffer;
}

/** 情绪 → 噪声类型映射 */
function noiseTypeForMood(mood: number): 'white' | 'pink' | 'brown' {
  if (mood <= 1) return 'brown';  // 深沉包裹感
  if (mood <= 2) return 'pink';   // 温和自然
  return 'white';                 // 轻快
}

/**
 * 启动程序化噪声播放（当 mp3 文件不可用时的 fallback）。
 * 使用 AudioBufferSourceNode + GainNode 实现 fade 控制。
 */
function startNoiseFallback(): boolean {
  try {
    ensureAudioContext();
    if (!audioCtx) return false;

    stopNoiseFallback();

    const noiseType = noiseTypeForMood(moodTheme.currentMood);
    const buffer = generateNoiseBuffer(audioCtx, 4, noiseType);

    noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

    noiseSource.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noiseSource.start();

    // Fade in over 2 seconds
    gainNode.gain.linearRampToValueAtTime(volume.value * 0.5, audioCtx.currentTime + 2);

    usingNoiseFallback.value = true;
    return true;
  } catch {
    return false;
  }
}

function stopNoiseFallback() {
  if (noiseSource) {
    try { noiseSource.stop(); } catch { /* already stopped */ }
    noiseSource.disconnect();
    noiseSource = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
  usingNoiseFallback.value = false;
}

function createAudio(src: string) {
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute('src');
    audioEl.load();
  }

  audioEl = new Audio(src);
  audioEl.loop = true;
  audioEl.volume = 0; // Start at 0 for fade-in
  audioEl.preload = 'auto';

  audioEl.addEventListener('canplaythrough', () => {
    audioReady.value = true;
  }, { once: true });

  audioEl.addEventListener('error', () => {
    audioReady.value = false;
  });
}

function fadeIn(duration = 2000) {
  if (!audioEl) return;
  isFadingIn.value = true;
  const steps = 40;
  const stepTime = duration / steps;
  const targetVol = volume.value;
  let step = 0;

  clearFadeTimer();
  audioEl.volume = 0;

  fadeTimer = setInterval(() => {
    step++;
    if (!audioEl) { clearFadeTimer(); return; }

    // Ease-in curve
    const progress = step / steps;
    const eased = progress * progress; // quadratic ease-in
    audioEl.volume = Math.min(targetVol * eased, 1);

    if (step >= steps) {
      clearFadeTimer();
      audioEl.volume = targetVol;
      isFadingIn.value = false;
    }
  }, stepTime);
}

function fadeOut(duration = 1500): Promise<void> {
  return new Promise(resolve => {
    if (!audioEl || audioEl.volume === 0) {
      resolve();
      return;
    }
    const steps = 30;
    const stepTime = duration / steps;
    const startVol = audioEl.volume;
    let step = 0;

    clearFadeTimer();

    fadeTimer = setInterval(() => {
      step++;
      if (!audioEl) { clearFadeTimer(); resolve(); return; }

      const progress = step / steps;
      audioEl.volume = Math.max(startVol * (1 - progress), 0);

      if (step >= steps) {
        clearFadeTimer();
        audioEl.volume = 0;
        audioEl.pause();
        resolve();
      }
    }, stepTime);
  });
}

function clearFadeTimer() {
  if (fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

// ── 交互 ──
async function togglePlay() {
  ensureAudioContext();

  if (isPlaying.value) {
    if (usingNoiseFallback.value) {
      // Fade out noise
      if (gainNode && audioCtx) {
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
        setTimeout(() => stopNoiseFallback(), 1600);
      }
    } else {
      await fadeOut();
    }
    isPlaying.value = false;
    return;
  }

  // 尝试加载 mp3
  const scape = currentScape.value;
  createAudio(scape.src);

  try {
    await audioEl!.play();
    fadeIn();
    isPlaying.value = true;
  } catch {
    // mp3 播放失败 → fallback 到程序化噪声
    if (startNoiseFallback()) {
      isPlaying.value = true;
    } else {
      isPlaying.value = false;
    }
  }
}

/** 长按切换声景 */
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let isLongPress = false;

function onPointerDown() {
  isLongPress = false;
  longPressTimer = setTimeout(async () => {
    isLongPress = true;
    await switchScape();
  }, 600);
}

function onPointerUp() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  if (!isLongPress) {
    togglePlay();
  }
}

function onPointerCancel() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

async function switchScape() {
  const wasPlaying = isPlaying.value;

  if (wasPlaying) {
    if (usingNoiseFallback.value) {
      stopNoiseFallback();
    } else if (audioEl) {
      await fadeOut(800);
    }
  }

  currentIndex.value = (currentIndex.value + 1) % availableScapes.value.length;

  if (wasPlaying) {
    const scape = currentScape.value;
    createAudio(scape.src);
    try {
      await audioEl!.play();
      fadeIn();
      isPlaying.value = true;
    } catch {
      // mp3 失败 → 噪声 fallback（切换声景时噪声类型也重新生成）
      if (startNoiseFallback()) {
        isPlaying.value = true;
      } else {
        isPlaying.value = false;
      }
    }
  }
}

// ── 波形动画数据 ──
const WAVE_BARS = 24;
const waveBars = computed(() => {
  return Array.from({ length: WAVE_BARS }, (_, i) => {
    // 静态时高度很低；播放时各条有不同的动画延迟
    const delay = (i * 0.08).toFixed(2);
    const baseHeight = isPlaying.value ? 8 + (i % 5) * 3 : 3;
    return { delay, baseHeight };
  });
});

// ── 情绪变化时重置索引 ──
watch(() => moodTheme.currentMood, () => {
  currentIndex.value = 0;
});

// ── 清理 ──
onUnmounted(() => {
  clearFadeTimer();
  if (longPressTimer) clearTimeout(longPressTimer);
  stopNoiseFallback();
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute('src');
    audioEl = null;
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
});
</script>

<template>
  <div class="soundscape">
    <!-- 中央交互区 -->
    <div
      class="sound-orb"
      :class="{ 'is-playing': isPlaying }"
      :style="{
        '--orb-color': moodTheme.palette.accent,
        '--orb-glow': moodTheme.palette.glow,
      }"
      @pointerdown.prevent="onPointerDown"
      @pointerup.prevent="onPointerUp"
      @pointercancel="onPointerCancel"
      @contextmenu.prevent
      role="button"
      :aria-label="isPlaying ? 'Pause soundscape' : 'Play soundscape'"
      tabindex="0"
      @keydown.enter.prevent="togglePlay"
      @keydown.space.prevent="togglePlay"
    >
      <!-- 外层 glow -->
      <div class="orb-glow" :class="{ active: isPlaying }" />

      <!-- 波形条 -->
      <div class="wave-container" :class="{ active: isPlaying }">
        <div
          v-for="(bar, i) in waveBars"
          :key="i"
          class="wave-bar"
          :style="{
            animationDelay: `${bar.delay}s`,
            height: `${bar.baseHeight}px`,
            background: moodTheme.palette.accent,
          }"
        />
      </div>

      <!-- 中央 icon -->
      <span class="orb-icon">{{ isPlaying ? currentScape.icon : '🎵' }}</span>
    </div>

    <!-- 极淡的状态提示 -->
    <p class="sound-hint" :class="{ visible: !isPlaying }">
      {{ isPlaying ? '' : '' }}
    </p>
  </div>
</template>

<style scoped>
.soundscape {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0;
}

/* ── Orb ── */
.sound-orb {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  touch-action: none;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  transition: transform 0.2s ease, border-color 0.4s ease;
}
.sound-orb:active {
  transform: scale(0.93);
}
.sound-orb.is-playing {
  border-color: var(--orb-color);
}

/* ── Glow ring ── */
.orb-glow {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--orb-glow), transparent 70%);
  opacity: 0;
  transition: opacity 1.5s ease;
  pointer-events: none;
}
.orb-glow.active {
  opacity: 0.5;
  animation: glow-pulse 4s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.08); }
}

/* ── Wave bars ── */
.wave-container {
  position: absolute;
  bottom: 16px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 24px;
  overflow: hidden;
}
.wave-bar {
  width: 2px;
  border-radius: 1px;
  opacity: 0.25;
  transition: height 0.3s ease, opacity 0.3s ease;
}
.wave-container.active .wave-bar {
  opacity: 0.7;
  animation: wave-dance 1.2s ease-in-out infinite alternate;
}

@keyframes wave-dance {
  0% { height: 4px; }
  50% { height: 18px; }
  100% { height: 6px; }
}

/* ── Icon ── */
.orb-icon {
  font-size: 1.6rem;
  z-index: 1;
  transition: transform 0.3s ease;
}
.sound-orb.is-playing .orb-icon {
  animation: icon-float 3s ease-in-out infinite;
}

@keyframes icon-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* ── Hint ── */
.sound-hint {
  font-size: 0.65rem;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.5s ease;
  min-height: 1em;
}
.sound-hint.visible {
  opacity: 0.4;
}

/* ── Low energy & reduced motion ── */
:global(body.low-energy) .orb-glow {
  animation: none !important;
}
:global(body.low-energy) .wave-container.active .wave-bar {
  animation-duration: 3s;
}

@media (prefers-reduced-motion: reduce) {
  .orb-glow, .wave-bar, .orb-icon {
    animation: none !important;
  }
  .wave-container.active .wave-bar {
    animation: none !important;
    opacity: 0.5;
  }
}
</style>
