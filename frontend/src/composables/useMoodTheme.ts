/**
 * IGOTU — 情绪响应式主题系统 v2
 *
 * 视觉基底：生物光（Bioluminescence）
 * 深墨绿背景中透出柔和自然光，配色随情绪分数动态变化。
 *
 * 情绪映射（自然光隐喻）:
 *   1 (很低落) → 紫罗兰：深夜的萤火虫
 *   2 (不太好) → 靛蓝：黎明前的微光
 *   3 (一般)   → 青绿：安静的苔藓
 *   4 (还不错) → 翠绿：新叶舒展
 *   5 (很好)   → 暖琥珀：阳光穿过树冠
 */

import { ref, computed, watch } from 'vue';
import { defineStore } from 'pinia';

// ── 5 种情绪的色彩映射 ──────────────────────────────────

interface MoodPalette {
  /** 主强调色 */
  accent: string;
  /** 次要强调（深底色） */
  accentSoft: string;
  /** 卡片上的微弱发光底色 */
  glow: string;
  /** 渐变起始 */
  gradientFrom: string;
  /** 渐变终止 */
  gradientTo: string;
  /** 用于 heatmap/图表的主色 */
  chart: string;
  /** 按钮悬浮 */
  hoverBg: string;
  /** 活跃导航 */
  navActive: string;
  /** 导航文字 */
  navActiveText: string;
  /** 光线条颜色（卡片顶部装饰线） */
  lightLine: string;
  /** 舒适光晕（低情绪时的温暖包裹色） */
  comfortGlow: string;
  /** 光效强度（0-1，用于粒子/卡片发光的全局倍率） */
  glowIntensity: number;
  /** 自适应排版：正文字重 */
  fontWeight: number;
  /** 自适应排版：行高 */
  lineHeight: number;
  /** 自适应排版：字距 (em) */
  letterSpacing: number;
}

const PALETTES: Record<number, MoodPalette> = {
  // 1 — 深夜的萤火虫（紫罗兰）
  1: {
    accent: '#8b5cf6',
    accentSoft: '#2e1065',
    glow: 'rgba(139,92,246,0.08)',
    gradientFrom: '#2e1065',
    gradientTo: '#1a0a3e',
    chart: '#8b5cf6',
    hoverBg: 'rgba(139,92,246,0.1)',
    navActive: 'rgba(139,92,246,0.15)',
    navActiveText: '#a78bfa',
    lightLine: 'rgba(139,92,246,0.25)',
    comfortGlow: 'rgba(139,92,246,0.04)',
    glowIntensity: 0.3,
    fontWeight: 300,
    lineHeight: 1.9,
    letterSpacing: 0.02,
  },
  // 2 — 黎明前的微光（靛蓝）
  2: {
    accent: '#6366f1',
    accentSoft: '#1e1b4b',
    glow: 'rgba(99,102,241,0.08)',
    gradientFrom: '#1e1b4b',
    gradientTo: '#0f0d2e',
    chart: '#6366f1',
    hoverBg: 'rgba(99,102,241,0.1)',
    navActive: 'rgba(99,102,241,0.15)',
    navActiveText: '#818cf8',
    lightLine: 'rgba(99,102,241,0.25)',
    comfortGlow: 'rgba(99,102,241,0.03)',
    glowIntensity: 0.5,
    fontWeight: 300,
    lineHeight: 1.8,
    letterSpacing: 0.015,
  },
  // 3 — 安静的苔藓（青绿）
  3: {
    accent: '#14b8a6',
    accentSoft: '#0a2e28',
    glow: 'rgba(20,184,166,0.08)',
    gradientFrom: '#0a2e28',
    gradientTo: '#061a17',
    chart: '#14b8a6',
    hoverBg: 'rgba(20,184,166,0.1)',
    navActive: 'rgba(20,184,166,0.15)',
    navActiveText: '#2dd4bf',
    lightLine: 'rgba(20,184,166,0.25)',
    comfortGlow: 'transparent',
    glowIntensity: 0.6,
    fontWeight: 400,
    lineHeight: 1.7,
    letterSpacing: 0,
  },
  // 4 — 新叶舒展（翠绿）
  4: {
    accent: '#10b981',
    accentSoft: '#052e16',
    glow: 'rgba(16,185,129,0.08)',
    gradientFrom: '#052e16',
    gradientTo: '#021a0d',
    chart: '#10b981',
    hoverBg: 'rgba(16,185,129,0.1)',
    navActive: 'rgba(16,185,129,0.15)',
    navActiveText: '#34d399',
    lightLine: 'rgba(16,185,129,0.25)',
    comfortGlow: 'transparent',
    glowIntensity: 0.8,
    fontWeight: 400,
    lineHeight: 1.65,
    letterSpacing: -0.005,
  },
  // 5 — 阳光穿过树冠（暖琥珀）
  5: {
    accent: '#f59e0b',
    accentSoft: '#451a03',
    glow: 'rgba(245,158,11,0.08)',
    gradientFrom: '#451a03',
    gradientTo: '#2a1001',
    chart: '#f59e0b',
    hoverBg: 'rgba(245,158,11,0.1)',
    navActive: 'rgba(245,158,11,0.15)',
    navActiveText: '#fbbf24',
    lightLine: 'rgba(245,158,11,0.25)',
    comfortGlow: 'transparent',
    glowIntensity: 1.0,
    fontWeight: 500,
    lineHeight: 1.6,
    letterSpacing: -0.01,
  },
};

// 默认（未记录情绪时）使用 mood 3 的配色
const DEFAULT_MOOD = 3;

// 颜色过渡时长（毫秒），让配色变化像日出日落一样自然
const TRANSITION_DURATION = 2500;

// ── Pinia Store ──────────────────────────────────────────

export const useMoodThemeStore = defineStore('moodTheme', () => {
  const currentMood = ref<number>(DEFAULT_MOOD);

  const palette = computed<MoodPalette>(() => PALETTES[currentMood.value] || PALETTES[DEFAULT_MOOD]);

  /** 低能量模式：情绪 ≤ 2 时激活，界面自动简化 */
  const isLowEnergy = computed(() => currentMood.value <= 2);

  /** 动画速度倍率：低情绪时放慢动画 */
  const animationSpeed = computed(() => {
    if (currentMood.value === 1) return 0.5;
    if (currentMood.value === 2) return 0.7;
    return 1;
  });

  function setMood(score: number) {
    const clamped = Math.max(1, Math.min(5, Math.round(score)));
    currentMood.value = clamped;
    localStorage.setItem('igotu_last_mood', String(clamped));
    applyToDOM();
  }

  /** 平滑设置情绪（用于 AI 对话联动，带过渡动画） */
  function setMoodSmooth(score: number) {
    // 先启用过渡
    document.documentElement.style.setProperty(
      '--mood-transition',
      `${TRANSITION_DURATION}ms ease`
    );
    setMood(score);
    // 过渡结束后移除，避免影响其他交互
    setTimeout(() => {
      document.documentElement.style.setProperty('--mood-transition', '0ms');
    }, TRANSITION_DURATION);
  }

  function applyToDOM() {
    const p = palette.value;
    const root = document.documentElement;
    root.style.setProperty('--mood-accent', p.accent);
    root.style.setProperty('--mood-accent-soft', p.accentSoft);
    root.style.setProperty('--mood-glow', p.glow);
    root.style.setProperty('--mood-gradient-from', p.gradientFrom);
    root.style.setProperty('--mood-gradient-to', p.gradientTo);
    root.style.setProperty('--mood-chart', p.chart);
    root.style.setProperty('--mood-hover-bg', p.hoverBg);
    root.style.setProperty('--mood-nav-active', p.navActive);
    root.style.setProperty('--mood-nav-active-text', p.navActiveText);
    root.style.setProperty('--mood-light-line', p.lightLine);
    root.style.setProperty('--mood-comfort-glow', p.comfortGlow);
    root.style.setProperty('--glow-intensity', String(p.glowIntensity));
    root.style.setProperty('--animation-speed', String(animationSpeed.value));

    // 自适应排版
    root.style.setProperty('--mood-font-weight', String(p.fontWeight));
    root.style.setProperty('--mood-line-height', String(p.lineHeight));
    root.style.setProperty('--mood-letter-spacing', `${p.letterSpacing}em`);

    // Toggle low-energy class on body for global CSS adaptations
    if (isLowEnergy.value) {
      document.body.classList.add('low-energy');
    } else {
      document.body.classList.remove('low-energy');
    }
  }

  function init() {
    const saved = localStorage.getItem('igotu_last_mood');
    if (saved) {
      currentMood.value = Math.max(1, Math.min(5, parseInt(saved, 10) || DEFAULT_MOOD));
    }
    applyToDOM();
  }

  // Watch for changes
  watch(palette, () => applyToDOM());

  /** 只读情绪分数（供外部组件读取） */
  const moodScore = computed(() => currentMood.value);

  return { currentMood, moodScore, palette, isLowEnergy, animationSpeed, setMood, setMoodSmooth, init };
});

// ── 工具函数：情绪对应的 emoji 和标签 ──────────────────

export const MOOD_CONFIG = [
  { score: 1, emoji: '😢', label: '很低落', color: '#8b5cf6', metaphor: '深夜的萤火虫' },
  { score: 2, emoji: '😕', label: '不太好', color: '#6366f1', metaphor: '黎明前的微光' },
  { score: 3, emoji: '😐', label: '一般',   color: '#14b8a6', metaphor: '安静的苔藓' },
  { score: 4, emoji: '🙂', label: '还不错', color: '#10b981', metaphor: '新叶舒展' },
  { score: 5, emoji: '😊', label: '很好',   color: '#f59e0b', metaphor: '阳光穿过树冠' },
] as const;
