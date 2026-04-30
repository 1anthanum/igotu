<script setup lang="ts">
import { ref, onMounted } from 'vue';

/**
 * Lightweight password gate that wraps the entire app.
 *
 * On mount, calls /api/health to detect whether the backend requires
 * a password. If 401, shows the password form. On successful submit,
 * calls /api/access-gate/check which sets a cookie; we then unlock.
 */

const status = ref<'checking' | 'unlocked' | 'gated'>('checking');
const password = ref('');
const error = ref('');
const submitting = ref(false);

async function probe() {
  try {
    const r = await fetch('/api/health', { credentials: 'include' });
    if (r.ok) {
      status.value = 'unlocked';
    } else if (r.status === 401) {
      status.value = 'gated';
    } else {
      // Other errors — let the app load and surface its own error
      status.value = 'unlocked';
    }
  } catch {
    status.value = 'unlocked';
  }
}

async function submit() {
  if (!password.value.trim()) return;
  submitting.value = true;
  error.value = '';
  try {
    const r = await fetch('/api/access-gate/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password: password.value.trim() }),
    });
    if (r.ok) {
      status.value = 'unlocked';
    } else {
      error.value = 'Wrong password — ask Jacie for the correct one.';
    }
  } catch {
    error.value = 'Network error.';
  } finally {
    submitting.value = false;
  }
}

onMounted(probe);
</script>

<template>
  <div v-if="status === 'checking'" class="gate-loading">
    <div class="spinner" />
  </div>

  <div v-else-if="status === 'gated'" class="gate-shell">
    <form class="gate-card" @submit.prevent="submit">
      <div class="gate-title">🌿 IGOTU</div>
      <div class="gate-subtitle">Private alpha — please enter the access password.</div>

      <input
        v-model="password"
        type="password"
        autofocus
        placeholder="Access password"
        class="gate-input"
      />

      <div v-if="error" class="gate-error">{{ error }}</div>

      <button
        type="submit"
        class="gate-button"
        :disabled="submitting || !password.trim()"
      >
        {{ submitting ? 'Verifying…' : 'Enter' }}
      </button>
    </form>
  </div>

  <slot v-else />
</template>

<style scoped>
.gate-loading,
.gate-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 30% 30%, #1a3a2a 0%, #0a1f14 80%);
  color: #d6f0d8;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: #6ce29a;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.gate-card {
  width: min(420px, 90vw);
  padding: 32px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(16px);
}

.gate-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.gate-subtitle {
  font-size: 13px;
  opacity: 0.7;
  margin-bottom: 20px;
}

.gate-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #d6f0d8;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
}

.gate-error {
  margin-top: 10px;
  font-size: 13px;
  color: #ff8888;
}

.gate-button {
  margin-top: 16px;
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #6ce29a, #3a9080);
  color: #0a1f14;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.gate-button:disabled {
  opacity: 0.6;
  cursor: wait;
}
</style>
