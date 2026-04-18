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
  const [r, g, b] = hexToRgb(moodTheme.palette.accent);

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

    // Draw glow
    const gradient = ctx.createRadialGradient(drawX, p.y, 0, drawX, p.y, p.size * 4);
    gradient.addColorStop(0, `rgba(${r},${g},${b},${p.opacity})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(drawX, p.y, p.size * 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw core
    ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity * 1.5})`;
    ctx.beginPath();
    ctx.arc(drawX, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

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

// Respond to mood changes
watch(() => moodTheme.palette.accent, () => {
  if (canvas.value) {
    const count = getParticleCount();
    while (particles.length > count) particles.pop();
    while (particles.length < count) {
      particles.push(createParticle(canvas.value.width, canvas.value.height));
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
