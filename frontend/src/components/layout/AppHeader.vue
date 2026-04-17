<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useRouter, useRoute } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

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
          v-for="item in [
            { to: '/', name: 'home', label: '首页' },
            { to: '/chat', name: 'chat', label: '对话' },
            { to: '/toolbox', name: 'toolbox', label: '工具箱', prefix: '/toolbox' },
            { to: '/mood', name: 'mood', label: '情绪' },
            { to: '/analytics', name: 'analytics', label: '分析' },
            { to: '/settings', name: 'settings', label: '设置' },
          ]"
          :key="item.name"
          :to="item.to"
          class="px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200"
          :style="isActive(item.name, item.prefix)
            ? { background: 'var(--mood-nav-active)', color: 'var(--mood-nav-active-text)' }
            : { color: 'var(--text-muted)' }"
          @mouseenter="($event.target as HTMLElement).style.color = isActive(item.name, item.prefix) ? '' : 'var(--text-primary)'"
          @mouseleave="($event.target as HTMLElement).style.color = isActive(item.name, item.prefix) ? 'var(--mood-nav-active-text)' : 'var(--text-muted)'"
        >
          {{ item.label }}
        </router-link>

        <button
          @click="handleLogout"
          class="ml-2 px-3 py-1.5 rounded-xl text-sm transition-colors duration-200"
          style="color: var(--text-muted);"
          @mouseenter="($event.target as HTMLElement).style.color = '#fca5a5'"
          @mouseleave="($event.target as HTMLElement).style.color = 'var(--text-muted)'"
        >
          退出
        </button>
      </nav>
    </div>
  </header>
</template>
