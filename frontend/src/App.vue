<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import AppHeader from '@/components/layout/AppHeader.vue';

const auth = useAuthStore();
const moodTheme = useMoodThemeStore();

onMounted(() => {
  moodTheme.init();
});
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--bg-primary); color: var(--text-primary);">
    <AppHeader v-if="auth.isAuthenticated" />
    <main class="max-w-2xl mx-auto px-4 pb-24">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>
