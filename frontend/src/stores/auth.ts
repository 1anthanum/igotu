import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as authApi from '@/api/auth';
import type { User } from '@/types/user';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(localStorage.getItem('access_token'));
  const isDemo = ref(false);

  const isAuthenticated = computed(() => !!accessToken.value || isDemo.value);

  function enterDemo() {
    isDemo.value = true;
  }

  function exitDemo() {
    isDemo.value = false;
  }

  async function register(email: string, username: string, password: string) {
    const result = await authApi.register(email, username, password);
    user.value = result.user;
    accessToken.value = result.accessToken;
    localStorage.setItem('access_token', result.accessToken);
    localStorage.setItem('refresh_token', result.refreshToken);
  }

  async function login(email: string, password: string) {
    const result = await authApi.login(email, password);
    user.value = result.user;
    accessToken.value = result.accessToken;
    localStorage.setItem('access_token', result.accessToken);
    localStorage.setItem('refresh_token', result.refreshToken);
  }

  function logout() {
    user.value = null;
    accessToken.value = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  return { user, accessToken, isAuthenticated, isDemo, register, login, logout, enterDemo, exitDemo };
});
