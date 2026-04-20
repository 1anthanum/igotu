<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@/i18n';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const { t } = useI18n();
const auth = useAuthStore();

const REMEMBER_KEY = 'igotu_remember';

const isLogin = ref(true);
const email = ref('');
const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const error = ref('');
const loading = ref(false);
const mounted = ref(false);

onMounted(() => {
  // Restore saved credentials
  try {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      email.value = data.email || '';
      password.value = data.password || '';
      rememberMe.value = true;
    }
  } catch { /* ignore */ }
  setTimeout(() => (mounted.value = true), 50);
});

async function handleSubmit() {
  error.value = '';
  loading.value = true;
  try {
    if (isLogin.value) {
      await auth.login(email.value, password.value);
    } else {
      await auth.register(email.value, username.value, password.value);
    }
    // Save or clear remembered credentials
    if (rememberMe.value) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: email.value, password: password.value }));
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    router.push('/');
  } catch (err: any) {
    error.value = err.response?.data?.error || t('common.operationFailed');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-wrapper">
    <!-- Bio-luminescent particles -->
    <div class="particles-layer">
      <div
        v-for="i in 6"
        :key="i"
        class="bio-particle"
        :style="{
          left: `${8 + i * 14}%`,
          top: `${15 + (i % 3) * 25}%`,
          animationDelay: `${i * 1.5}s`,
          animationDuration: `${5 + i * 1.5}s`,
          width: `${3 + i * 1.5}px`,
          height: `${3 + i * 1.5}px`,
        }"
      />
    </div>

    <!-- Ambient glow -->
    <div class="ambient-glow" />

    <!-- Content -->
    <div class="login-content" :class="{ 'is-visible': mounted }">
      <!-- Brand -->
      <div class="brand-section">
        <!-- Leaf icon -->
        <div class="leaf-icon">
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M32 8c-12 8-20 20-20 32 8-4 14-2 20 4 6-6 12-8 20-4 0-12-8-24-20-32z"
                  fill="rgba(100,220,180,0.1)" stroke="var(--mood-accent)" stroke-width="1.5" stroke-opacity="0.5"/>
            <path d="M32 20v28M32 28c-6-2-10 2-14 6M32 36c6-2 10 2 14 6"
                  stroke="var(--mood-accent)" stroke-width="1" stroke-opacity="0.3" fill="none"/>
          </svg>
        </div>
        <h1 class="brand-title">IGOTU</h1>
        <p class="brand-subtitle">{{ t('login.brandSubtitle') }}</p>
      </div>

      <!-- Form Card -->
      <div class="login-card">
        <div class="tab-selector">
          <button @click="isLogin = true" :class="{ active: isLogin }">{{ t('login.tabLogin') }}</button>
          <button @click="isLogin = false" :class="{ active: !isLogin }">{{ t('login.tabRegister') }}</button>
        </div>

        <form @submit.prevent="handleSubmit" class="login-form">
          <input v-model="email" type="email" :placeholder="t('login.emailPlaceholder')" required class="input-field" />
          <input v-if="!isLogin" v-model="username" type="text" :placeholder="t('login.usernamePlaceholder')" required minlength="2" class="input-field" />
          <input v-model="password" type="password" :placeholder="t('login.passwordPlaceholder')" required minlength="6" class="input-field" />

          <label v-if="isLogin" class="remember-row">
            <input v-model="rememberMe" type="checkbox" class="remember-checkbox" />
            <span class="remember-label">{{ t('login.rememberMe') }}</span>
          </label>

          <div v-if="error" class="error-msg">{{ error }}</div>

          <button type="submit" :disabled="loading" class="btn-primary w-full">
            <span v-if="loading" class="loading-dots"><span /><span /><span /></span>
            <span v-else>{{ isLogin ? t('login.submitLogin') : t('login.submitRegister') }}</span>
          </button>
        </form>
      </div>

      <!-- Demo link -->
      <router-link to="/demo" class="demo-link">
        {{ t('login.demoLink') }}
      </router-link>

      <p class="footer-note">{{ t('login.footerNote') }}</p>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 1rem;
  background: radial-gradient(ellipse at 50% 60%, rgba(10,60,50,0.4) 0%, var(--bg-primary) 70%);
}

/* ── Bio particles ── */
.particles-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.bio-particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, var(--mood-accent), transparent);
  animation: bio-breathe ease-in-out infinite;
  filter: blur(1px);
}

/* ── Ambient glow ── */
.ambient-glow {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--mood-glow) 0%, transparent 70%);
  pointer-events: none;
  filter: blur(60px);
}

/* ── Content entrance ── */
.login-content {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 380px;
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.8s ease, transform 0.8s ease;
}
.login-content.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* ── Brand ── */
.brand-section {
  text-align: center;
  margin-bottom: 2rem;
}
.leaf-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  filter: drop-shadow(0 0 12px var(--mood-glow));
  animation: pulse-glow 4s ease-in-out infinite;
}
.brand-title {
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: var(--mood-accent);
}
.brand-subtitle {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

/* ── Card ── */
.login-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 1.25rem;
  padding: 1.5rem;
  backdrop-filter: blur(12px);
  position: relative;
  overflow: hidden;
}
.login-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--mood-light-line), transparent);
  pointer-events: none;
}

/* ── Form ── */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin-top: 1.25rem;
}

/* ── Remember me ── */
.remember-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  margin: -0.25rem 0;
}
.remember-checkbox {
  width: 15px;
  height: 15px;
  accent-color: var(--mood-accent);
  cursor: pointer;
  border-radius: 3px;
}
.remember-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  transition: color 0.2s;
}
.remember-row:hover .remember-label {
  color: var(--text-secondary);
}

/* ── Error ── */
.error-msg {
  text-align: center;
  font-size: 0.875rem;
  color: #fca5a5;
  background: rgba(239,68,68,0.1);
  border-radius: 0.75rem;
  padding: 0.5rem 0.75rem;
}

/* ── Loading dots ── */
.loading-dots {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.loading-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-inverse);
  animation: dot-pulse 1.2s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.15s; }
.loading-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes dot-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.2); }
}

/* ── Demo link ── */
.demo-link {
  display: block;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 1rem;
  text-decoration: none;
  transition: color 0.2s;
}
.demo-link:hover { color: var(--mood-accent); }

/* ── Footer ── */
.footer-note {
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 1.5rem;
}

@keyframes pulse-glow {
  0%, 100% { filter: drop-shadow(0 0 12px var(--mood-glow)); }
  50% { filter: drop-shadow(0 0 24px var(--mood-glow)) drop-shadow(0 0 40px var(--mood-glow)); }
}
@keyframes bio-breathe {
  0%, 100% { opacity: 0.15; transform: scale(0.8); }
  50% { opacity: 0.5; transform: scale(1.2); }
}
</style>
