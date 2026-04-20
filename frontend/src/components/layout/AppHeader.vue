<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from '@/i18n';

const auth = useAuthStore();
const moodTheme = useMoodThemeStore();
const router = useRouter();
const route = useRoute();
const { t, isEn, setLocale } = useI18n();

function toggleLocale() {
  setLocale(isEn.value ? 'zh' : 'en');
}

const NAV_ITEMS = computed(() => [
  { to: '/', name: 'home', label: t('nav.home'), icon: '🏠' },
  { to: '/chat', name: 'chat', label: t('nav.chat'), icon: '💭' },
  { to: '/toolbox', name: 'toolbox', label: t('nav.toolbox'), icon: '🧰', prefix: '/toolbox' },
  { to: '/mood', name: 'mood', label: t('nav.mood'), icon: '🌿' },
  { to: '/analytics', name: 'analytics', label: t('nav.analytics'), icon: '📊' },
  { to: '/therapy', name: 'therapy', label: t('nav.therapy'), icon: '🌉' },
  { to: '/settings', name: 'settings', label: t('nav.settings'), icon: '⚙️' },
]);

function handleLogout() {
  auth.logout();
  router.push('/login');
}

function isActive(name: string, prefix?: string): boolean {
  if (prefix) return route.path.startsWith(prefix);
  return route.name === name;
}
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b backdrop-blur-md"
    style="background: rgba(6,15,13,0.88); border-color: var(--border-subtle);"
  >
    <div class="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
      <!-- Logo -->
      <router-link to="/" class="flex items-center gap-2 group">
        <span class="text-xl transition-transform group-hover:scale-110">🌱</span>
        <span
          class="font-bold text-lg tracking-wide"
          style="color: var(--mood-accent);"
        >
          IGOTU
        </span>
      </router-link>

      <!-- Navigation -->
      <nav class="flex items-center gap-0.5">
        <router-link
          v-for="item in NAV_ITEMS"
          :key="item.name"
          :to="item.to"
          class="nav-item rounded-xl text-sm font-medium transition-all duration-200"
          :class="{ 'low-energy-nav': moodTheme.isLowEnergy }"
          :style="isActive(item.name, item.prefix)
            ? { background: 'var(--mood-nav-active)', color: 'var(--mood-nav-active-text)' }
            : { color: 'var(--text-muted)' }"
          @mouseenter="($event.target as HTMLElement).style.color = isActive(item.name, item.prefix) ? '' : 'var(--text-primary)'"
          @mouseleave="($event.target as HTMLElement).style.color = isActive(item.name, item.prefix) ? 'var(--mood-nav-active-text)' : 'var(--text-muted)'"
        >
          <!-- Low energy: show icon always, text only for active -->
          <template v-if="moodTheme.isLowEnergy">
            <span class="nav-icon">{{ item.icon }}</span>
            <span v-if="isActive(item.name, item.prefix)" class="nav-label-active">{{ item.label }}</span>
          </template>
          <!-- Normal: show text -->
          <template v-else>
            {{ item.label }}
          </template>
        </router-link>

        <!-- Language toggle -->
        <button
          @click="toggleLocale"
          class="ml-1 px-2 py-1 rounded-lg text-xs transition-colors duration-200"
          :style="{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }"
          @mouseenter="($event.target as HTMLElement).style.borderColor = 'var(--mood-accent)'"
          @mouseleave="($event.target as HTMLElement).style.borderColor = 'var(--border-subtle)'"
          :title="isEn ? '切换到中文' : 'Switch to English'"
        >
          {{ isEn ? '中文' : 'EN' }}
        </button>

        <!-- Demo: show login/register; Authenticated: show logout -->
        <router-link
          v-if="auth.isDemo"
          to="/login"
          class="ml-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 login-btn"
        >
          {{ t('nav.loginRegister') }}
        </router-link>
        <button
          v-else
          @click="handleLogout"
          class="ml-2 px-3 py-1.5 rounded-xl text-sm transition-colors duration-200"
          style="color: var(--text-muted);"
          @mouseenter="($event.target as HTMLElement).style.color = '#fca5a5'"
          @mouseleave="($event.target as HTMLElement).style.color = 'var(--text-muted)'"
        >
          {{ moodTheme.isLowEnergy ? '🚪' : t('nav.logout') }}
        </button>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.nav-item {
  padding: 6px 12px;
}
.nav-item.low-energy-nav {
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.nav-icon {
  font-size: 1.1rem;
}
.nav-label-active {
  font-size: 0.75rem;
}
.login-btn {
  color: var(--mood-accent);
  border: 1px solid var(--mood-accent);
  text-decoration: none;
  white-space: nowrap;
}
.login-btn:hover {
  background: var(--mood-accent);
  color: var(--bg-primary);
}
</style>
