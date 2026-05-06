/**
 * useDynamicSky — 动态天空背景系统
 *
 * 设计理念：
 * 1. 时间维度：基于当前时刻，模拟自然的日出→白天→日落→夜晚循环
 * 2. 情绪维度：结合 mood score 调整"天气"——低情绪偏阴雨/雾，高情绪偏晴朗/温暖
 * 3. 视觉表现：通过 CSS 变量驱动页面背景渐变色、光晕、粒子氛围
 *
 * 天空阶段（基于小时）：
 *   00-05 → 深夜 (deep night)
 *   05-07 → 黎明 (dawn)
 *   07-10 → 早晨 (morning)
 *   10-16 → 白天 (day)
 *   16-18 → 黄昏 (dusk)
 *   18-21 → 傍晚 (evening)
 *   21-24 → 夜晚 (night)
 *
 * 情绪天气叠加：
 *   mood 1 → 暴雨/深雾（冷色压暗）
 *   mood 2 → 阴天/薄雾
 *   mood 3 → 平静/微云
 *   mood 4 → 晴朗/通透
 *   mood 5 → 阳光灿烂/暖光
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

export interface SkyState {
  /** 时间段名称 */
  phase: 'deepNight' | 'dawn' | 'morning' | 'day' | 'dusk' | 'evening' | 'night';
  /** 背景渐变 CSS */
  gradient: string;
  /** 环境光颜色（用于页面微光效果） */
  ambientColor: string;
  /** 环境光强度 0-1 */
  ambientIntensity: number;
  /** 天气描述（用于粒子系统） */
  weather: 'storm' | 'fog' | 'overcast' | 'clear' | 'sunny';
  /** 天气粒子不透明度 0-1 */
  particleOpacity: number;
}

// ── 时间段基础色板 ──────────────────────────────────────

interface TimeColors {
  skyTop: string;
  skyBottom: string;
  ambient: string;
  intensity: number;
}

const TIME_PALETTES: Record<string, TimeColors> = {
  deepNight:  { skyTop: '#0a0e1a', skyBottom: '#0f1628', ambient: '#1a1a4e', intensity: 0.15 },
  dawn:       { skyTop: '#1a1035', skyBottom: '#2d1f4e', ambient: '#6b4fa0', intensity: 0.35 },
  morning:    { skyTop: '#1a2a3a', skyBottom: '#2a3f4e', ambient: '#6bb8d4', intensity: 0.55 },
  day:        { skyTop: '#142028', skyBottom: '#1a3040', ambient: '#88c8e8', intensity: 0.65 },
  dusk:       { skyTop: '#1f1520', skyBottom: '#2e1a28', ambient: '#d4786b', intensity: 0.45 },
  evening:    { skyTop: '#12101e', skyBottom: '#1a1430', ambient: '#8b6bab', intensity: 0.3 },
  night:      { skyTop: '#080c18', skyBottom: '#0e1424', ambient: '#3a3a7e', intensity: 0.2 },
};

// ── 情绪天气修正 ──────────────────────────────────────

interface WeatherModifier {
  weather: SkyState['weather'];
  /** 将天空色调偏移：正值暖化，负值冷化 */
  warmth: number;
  /** 对亮度的修正：-1到+1 */
  brightness: number;
  /** 粒子不透明度 */
  particleOpacity: number;
  /** 饱和度修正 */
  saturation: number;
}

const MOOD_WEATHER: Record<number, WeatherModifier> = {
  1: { weather: 'storm',    warmth: -0.3, brightness: -0.25, particleOpacity: 0.6, saturation: -0.2 },
  2: { weather: 'fog',      warmth: -0.15, brightness: -0.12, particleOpacity: 0.4, saturation: -0.1 },
  3: { weather: 'overcast', warmth: 0,    brightness: 0,     particleOpacity: 0.15, saturation: 0 },
  4: { weather: 'clear',    warmth: 0.1,  brightness: 0.08,  particleOpacity: 0.05, saturation: 0.1 },
  5: { weather: 'sunny',    warmth: 0.25, brightness: 0.15,  particleOpacity: 0.02, saturation: 0.2 },
};

// ── 工具函数 ──────────────────────────────────────

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToCSS(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function getTimePhase(hour: number): SkyState['phase'] {
  if (hour < 5) return 'deepNight';
  if (hour < 7) return 'dawn';
  if (hour < 10) return 'morning';
  if (hour < 16) return 'day';
  if (hour < 18) return 'dusk';
  if (hour < 21) return 'evening';
  return 'night';
}

/**
 * 在两个时间段之间平滑过渡（在小时边界附近做30分钟渐变）
 */
function getBlendedTimeColors(hour: number, minute: number): TimeColors {
  const phase = getTimePhase(hour);
  const colors = TIME_PALETTES[phase];

  // 在每个阶段的前30分钟，和前一阶段做混合
  const phaseStartHours: Record<string, number> = {
    deepNight: 0, dawn: 5, morning: 7, day: 10, dusk: 16, evening: 18, night: 21,
  };

  const startHour = phaseStartHours[phase];
  const minutesIntoPhase = (hour - startHour) * 60 + minute;

  if (minutesIntoPhase < 30 && phase !== 'deepNight') {
    // Blend with previous phase
    const prevPhase = getTimePhase(hour - 1);
    const prevColors = TIME_PALETTES[prevPhase];
    const t = minutesIntoPhase / 30; // 0 to 1 over 30 minutes
    return {
      skyTop: blendHex(prevColors.skyTop, colors.skyTop, t),
      skyBottom: blendHex(prevColors.skyBottom, colors.skyBottom, t),
      ambient: blendHex(prevColors.ambient, colors.ambient, t),
      intensity: prevColors.intensity + (colors.intensity - prevColors.intensity) * t,
    };
  }

  return colors;
}

function blendHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

// ── 主要 Composable ──────────────────────────────────────

export function useDynamicSky(getMood: () => number) {
  const skyState = ref<SkyState>(computeSkyState(getMood()));
  let updateTimer: ReturnType<typeof setInterval> | null = null;

  function computeSkyState(mood: number): SkyState {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    const phase = getTimePhase(hour);
    const timeColors = getBlendedTimeColors(hour, minute);
    const moodMod = MOOD_WEATHER[mood] || MOOD_WEATHER[3];

    // Apply mood weather modifiers to time-based sky colors
    const topHSL = hexToHSL(timeColors.skyTop);
    const bottomHSL = hexToHSL(timeColors.skyBottom);
    const ambientHSL = hexToHSL(timeColors.ambient);

    // Warmth shifts hue (positive = toward orange/warm, negative = toward blue/cold)
    const hueShift = moodMod.warmth * 30; // max ±9 degrees

    // Apply modifiers
    const adjustedTop = hslToCSS(
      topHSL.h + hueShift,
      Math.max(0, Math.min(100, topHSL.s + moodMod.saturation * 30)),
      Math.max(0, Math.min(100, topHSL.l + moodMod.brightness * 15))
    );
    const adjustedBottom = hslToCSS(
      bottomHSL.h + hueShift,
      Math.max(0, Math.min(100, bottomHSL.s + moodMod.saturation * 30)),
      Math.max(0, Math.min(100, bottomHSL.l + moodMod.brightness * 15))
    );
    const adjustedAmbient = hslToCSS(
      ambientHSL.h + hueShift,
      Math.max(0, Math.min(100, ambientHSL.s + moodMod.saturation * 20)),
      Math.max(0, Math.min(100, ambientHSL.l + moodMod.brightness * 10))
    );

    const gradient = `linear-gradient(180deg, ${adjustedTop} 0%, ${adjustedBottom} 70%, ${adjustedTop} 100%)`;

    return {
      phase,
      gradient,
      ambientColor: adjustedAmbient,
      ambientIntensity: Math.max(0, Math.min(1, timeColors.intensity + moodMod.brightness * 0.2)),
      weather: moodMod.weather,
      particleOpacity: moodMod.particleOpacity,
    };
  }

  function update() {
    skyState.value = computeSkyState(getMood());
    applyToDOM();
  }

  function applyToDOM() {
    const root = document.documentElement;
    const s = skyState.value;
    root.style.setProperty('--sky-gradient', s.gradient);
    root.style.setProperty('--sky-ambient', s.ambientColor);
    root.style.setProperty('--sky-ambient-intensity', String(s.ambientIntensity));
    root.style.setProperty('--sky-particle-opacity', String(s.particleOpacity));
    root.style.setProperty('--sky-phase', s.phase);
  }

  // React to mood changes immediately
  watch(getMood, () => update());

  // Pause updates when page is not visible
  function onVisibilityChange() {
    if (document.hidden) {
      if (updateTimer) { clearInterval(updateTimer); updateTimer = null; }
    } else {
      update(); // Refresh immediately on return
      if (!updateTimer) updateTimer = setInterval(update, 5 * 60 * 1000);
    }
  }

  onMounted(() => {
    update();
    updateTimer = setInterval(update, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onUnmounted(() => {
    if (updateTimer) clearInterval(updateTimer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });

  return {
    skyState,
    update,
  };
}
