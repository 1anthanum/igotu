<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const moodTheme = useMoodThemeStore();
const canvas = ref<HTMLCanvasElement | null>(null);
let animationId: number | null = null;
let particles: Particle[] = [];

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  drift: number;
  driftPhase: number;
  opacity: number;
  opacityDir: number;
  maxOpacity: number;
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.innerWidth < 768;

// Cache RGB values to avoid per-frame hex parsing
let cachedRgb: [number, number, number] = [100, 220, 180];
let cachedAccent = '';

function getParticleCount(): number {
  if (prefersReducedMotion) return 0;
  if (moodTheme.isLowEnergy) return isMobile ? 6 : 10;
  return isMobile ? 15 : 25;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [100, 220, 180];
}

function createParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: h + Math.random() * 100,
    size: 1 + Math.random() * 2.5,
    speedY: 0.15 + Math.random() * 0.35,
    drift: 15 + Math.random() * 25,
    driftPhase: Math.random() * Math.PI * 2,
    opacity: 0,
    opacityDir: 1,
    maxOpacity: 0.15 + Math.random() * 0.35,
  };
}

function initParticles(w: number, h: number) {
  const count = getParticleCount();
  particles = [];
  for (let i = 0; i < count; i++) {
    const p = createParticle(w, h);
    p.y = Math.random() * h; // Spread initially
    p.opacity = Math.random() * p.maxOpacity;
    particles.push(p);
  }
}

function animate() {
  const c = canvas.value;
  if (!c) return;
  const ctx = c.getContext('2d');
  if (!ctx) return;

  const w = c.width;
  const h = c.height;
  const speedMultiplier = moodTheme.isLowEnergy ? 0.5 : 1;

  // Cache RGB conversion — only reparse when accent changes
  const accent = moodTheme.palette.accent;
  if (accent !== cachedAccent) {
    cachedAccent = accent;
    cachedRgb = hexToRgb(accent);
  }
  const [r, g, b] = cachedRgb;

  ctx.clearRect(0, 0, w, h);

  for (const p of particles) {
    // Move upward
    p.y -= p.speedY * speedMultiplier;
    p.driftPhase += 0.005 * speedMultiplier;

    // Sine-wave horizontal drift
    const dx = Math.sin(p.driftPhase) * p.drift;
    const drawX = p.x + dx;

    // Fade in/out
    p.opacity += p.opacityDir * 0.003 * speedMultiplier;
    if (p.opacity >= p.maxOpacity) { p.opacity = p.maxOpacity; p.opacityDir = -1; }
    if (p.opacity <= 0) { p.opacity = 0; p.opacityDir = 1; }

    // Reset when off screen
    if (p.y < -20) {
      Object.assign(p, createParticle(w, h));
    }

    // Skip nearly-invisible particles (avoid expensive draw calls)
    if (p.opacity < 0.01) continue;

    // Draw glow — use simpler circle + globalAlpha instead of per-particle gradient
    const radius = p.size * 4;
    ctx.globalAlpha = p.opacity * 0.6;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(drawX, p.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw core (brighter center dot)
    ctx.globalAlpha = p.opacity * 1.5;
    ctx.beginPath();
    ctx.arc(drawX, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1; // Reset
  animationId = requestAnimationFrame(animate);
}

function resize() {
  const c = canvas.value;
  if (!c) return;
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  initParticles(c.width, c.height);
}

onMounted(() => {
  if (prefersReducedMotion) return;
  resize();
  animate();
  window.addEventListener('resize', resize);
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener('resize', resize);
});

// Respond to mood changes — smooth color transition + burst
watch(() => moodTheme.palette.accent, () => {
  if (canvas.value) {
    const count = getParticleCount();
    while (particles.length > count) particles.pop();
    while (particles.length < count) {
      particles.push(createParticle(canvas.value.width, canvas.value.height));
    }

    // Spawn a burst of 5 fast-rising transition particles
    if (!prefersReducedMotion && !moodTheme.isLowEnergy) {
      const w = canvas.value.width;
      const h = canvas.value.height;
      for (let i = 0; i < 5; i++) {
        const burst = createParticle(w, h);
        burst.y = h * (0.3 + Math.random() * 0.5);  // Start mid-screen
        burst.speedY = 0.6 + Math.random() * 0.5;     // Faster
        burst.maxOpacity = 0.5 + Math.random() * 0.3;  // Brighter
        burst.opacity = burst.maxOpacity;               // Visible immediately
        burst.opacityDir = -1;                          // Fade out
        burst.size = 2 + Math.random() * 3;             // Slightly larger
        particles.push(burst);
      }
    }
  }
});
</script>

<template>
  <canvas
    ref="canvas"
    class="fixed inset-0 pointer-events-none"
    style="z-index: 0;"
  />
</template>
