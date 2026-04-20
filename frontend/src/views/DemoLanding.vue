<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const router = useRouter();
const { t } = useI18n();
const auth = useAuthStore();
const moodTheme = useMoodThemeStore();

function startDemo() {
  auth.enterDemo();
  moodTheme.init();
  router.push('/');
}

function goLogin() {
  router.push('/login');
}
</script>

<template>
  <div class="demo-landing pt-12">
    <!-- Hero -->
    <div class="text-center animate-float-in">
      <div class="hero-glow" />
      <h1 class="hero-title">
        <span class="hero-emoji">🌿</span>
        <br />
        IGOTU
      </h1>
      <p class="hero-subtitle">{{ t('demo.heroSubtitle') }}</p>
      <p class="hero-desc">
        {{ t('demo.heroDesc') }}
      </p>
    </div>

    <!-- Feature highlights -->
    <div class="features animate-float-in-delay-1">
      <div class="feature-item">
        <span class="feature-icon">🎨</span>
        <div>
          <p class="feature-title">{{ t('demo.featureColor') }}</p>
          <p class="feature-desc">{{ t('demo.featureColorDesc') }}</p>
        </div>
      </div>
      <div class="feature-item">
        <span class="feature-icon">🍃</span>
        <div>
          <p class="feature-title">{{ t('demo.featureRelax') }}</p>
          <p class="feature-desc">{{ t('demo.featureRelaxDesc') }}</p>
        </div>
      </div>
      <div class="feature-item">
        <span class="feature-icon">📞</span>
        <div>
          <p class="feature-title">{{ t('demo.featureCrisis') }}</p>
          <p class="feature-desc">{{ t('demo.featureCrisisDesc') }}</p>
        </div>
      </div>
    </div>

    <!-- CTA buttons -->
    <div class="cta-section animate-float-in-delay-2">
      <button class="btn-primary w-full" @click="startDemo">
        {{ t('demo.quickStart') }}
      </button>
      <button class="btn-secondary w-full mt-3" @click="goLogin">
        {{ t('demo.loginRegister') }}
      </button>
      <p class="demo-note">
        {{ t('demo.demoNote') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.demo-landing {
  max-width: 360px;
  margin: 0 auto;
  padding: 0 1rem 4rem;
}

.hero-glow {
  width: 80px;
  height: 80px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  background: radial-gradient(circle, var(--mood-glow), transparent);
  filter: blur(20px);
}

.hero-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}
.hero-emoji { font-size: 2.5rem; }
.hero-subtitle {
  font-size: 0.95rem;
  color: var(--mood-accent);
  margin-top: 0.25rem;
}
.hero-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.75rem;
  line-height: 1.6;
}

.features {
  margin: 2rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 1rem;
  backdrop-filter: blur(8px);
}
.feature-icon { font-size: 1.5rem; flex-shrink: 0; }
.feature-title { font-size: 0.85rem; font-weight: 500; color: var(--text-primary); }
.feature-desc { font-size: 0.7rem; color: var(--text-muted); margin-top: 0.1rem; }

.cta-section { margin-top: 2rem; }
.demo-note {
  text-align: center;
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.75rem;
}
</style>
