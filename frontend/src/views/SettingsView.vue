<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useI18n } from '@/i18n';

const auth = useAuthStore();
const moodTheme = useMoodThemeStore();
const { t, locale, setLocale } = useI18n();
const username = ref('');
const loading = ref(false);
const message = ref('');

onMounted(async () => {
  try {
    const { data } = await apiClient.get('/user/profile');
    username.value = data.username;
  } catch {
    // ignore
  }
});

async function saveProfile() {
  loading.value = true;
  message.value = '';
  try {
    await apiClient.put('/user/profile', { username: username.value });
    message.value = t('common.saved');
    setTimeout(() => { message.value = ''; }, 2000);
  } catch (err: any) {
    message.value = err.response?.data?.error || t('common.saveFailed');
  } finally {
    loading.value = false;
  }
}

async function exportData() {
  try {
    const { data } = await apiClient.get('/user/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `igotu-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    alert(t('common.exportFailed'));
  }
}
</script>

<template>
  <div class="pt-6 space-y-6">
    <h1 class="text-xl font-semibold animate-float-in" style="color: var(--text-primary);">⚙️ {{ t('settings.title') }}</h1>

    <!-- Profile -->
    <div class="card animate-float-in" style="animation-delay: 0.1s;">
      <h2 class="text-sm font-semibold mb-4" style="color: var(--text-primary);">{{ t('settings.profile') }}</h2>
      <div class="space-y-3">
        <div>
          <label class="text-xs block mb-1" style="color: var(--text-muted);">{{ t('settings.usernameLabel') }}</label>
          <input v-model="username" class="input-field" />
        </div>
        <div class="flex items-center gap-3">
          <button @click="saveProfile" :disabled="loading" class="btn-primary text-sm">
            {{ loading ? t('common.saving') : t('common.save') }}
          </button>
          <span v-if="message" class="text-sm" :style="{ color: moodTheme.palette.accent }">{{ message }}</span>
        </div>
      </div>
    </div>

    <!-- Language -->
    <div class="card animate-float-in" style="animation-delay: 0.15s;">
      <h2 class="text-sm font-semibold mb-4" style="color: var(--text-primary);">{{ t('settings.language') }}</h2>
      <div class="flex gap-2">
        <button
          @click="setLocale('zh')"
          :class="{ active: locale === 'zh' }"
          class="lang-btn"
          :style="locale === 'zh' ? { background: moodTheme.palette.navActive, color: moodTheme.palette.accent } : {}"
        >
          {{ t('settings.langZh') }}
        </button>
        <button
          @click="setLocale('en')"
          :class="{ active: locale === 'en' }"
          class="lang-btn"
          :style="locale === 'en' ? { background: moodTheme.palette.navActive, color: moodTheme.palette.accent } : {}"
        >
          {{ t('settings.langEn') }}
        </button>
      </div>
    </div>

    <!-- Data & Privacy -->
    <div class="card animate-float-in" style="animation-delay: 0.25s;">
      <h2 class="text-sm font-semibold mb-4" style="color: var(--text-primary);">{{ t('settings.dataPrivacy') }}</h2>
      <p class="text-sm mb-3" style="color: var(--text-secondary);">{{ t('settings.dataPrivacyDesc') }}</p>
      <div class="space-y-2">
        <button @click="exportData" class="btn-secondary text-sm w-full">
          {{ t('settings.exportBtn') }}
        </button>
      </div>
    </div>

    <!-- About -->
    <div class="card animate-float-in" style="animation-delay: 0.35s;">
      <h2 class="text-sm font-semibold mb-2" style="color: var(--text-primary);">{{ t('settings.aboutTitle') }}</h2>
      <p class="text-sm leading-relaxed" style="color: var(--text-secondary);">
        {{ t('settings.aboutP1') }}
      </p>
      <p class="text-sm leading-relaxed mt-2" style="color: var(--text-secondary);">
        {{ t('settings.aboutP2') }}
      </p>
    </div>
  </div>
</template>
