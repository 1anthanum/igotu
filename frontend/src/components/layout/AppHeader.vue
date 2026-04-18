<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useRouter, useRoute } from 'vue-router';

const auth = useAuthStore();
const moodTheme = useMoodThemeStore();
const router = useRouter();
const route = useRoute();

const NAV_ITEMS = [
  { to: '/', name: 'home', label: '首页', icon: '🏠' },
  { to: '/chat', name: 'chat', label: '对话', icon: '💭' },
  { to: '/toolbox', name: 'toolbox', label: '工具箱', icon: '🧰', prefix: '/toolbox' },
  { to: '/mood', name: 'mood', label: '情绪', icon: '🌿' },
  { to: '/analytics', name: 'analytics', label: '分析', icon: '📊' },
  { to: '/settings', name: 'settings', label: '设置', icon: '⚙️' },
];

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
    <div class="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
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

        <button
          @click="handleLogout"
          class="ml-2 px-3 py-1.5 rounded-xl text-sm transition-colors duration-200"
          style="color: var(--text-muted);"
          @mouseenter="($event.target as HTMLElement).style.color = '#fca5a5'"
          @mouseleave="($event.target as HTMLElement).style.color = 'var(--text-muted)'"
        >
          {{ moodTheme.isLowEnergy ? '🚪' : '退出' }}
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
</style>
