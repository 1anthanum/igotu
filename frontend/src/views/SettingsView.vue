<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

const auth = useAuthStore();
const moodTheme = useMoodThemeStore();
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
    message.value = '已保存';
    setTimeout(() => { message.value = ''; }, 2000);
  } catch (err: any) {
    message.value = err.response?.data?.error || '保存失败';
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
    alert('导出失败，请稍后重试');
  }
}
</script>

<template>
  <div class="pt-6 space-y-6">
    <h1 class="text-xl font-semibold animate-float-in" style="color: var(--text-primary);">⚙️ 设置</h1>

    <!-- Profile -->
    <div class="card animate-float-in" style="animation-delay: 0.1s;">
      <h2 class="text-sm font-semibold mb-4" style="color: var(--text-primary);">个人信息</h2>
      <div class="space-y-3">
        <div>
          <label class="text-xs block mb-1" style="color: var(--text-muted);">用户名</label>
          <input v-model="username" class="input-field" />
        </div>
        <div class="flex items-center gap-3">
          <button @click="saveProfile" :disabled="loading" class="btn-primary text-sm">
            {{ loading ? '保存中...' : '保存' }}
          </button>
          <span v-if="message" class="text-sm" :style="{ color: moodTheme.palette.accent }">{{ message }}</span>
        </div>
      </div>
    </div>

    <!-- Data & Privacy -->
    <div class="card animate-float-in" style="animation-delay: 0.2s;">
      <h2 class="text-sm font-semibold mb-4" style="color: var(--text-primary);">数据与隐私</h2>
      <p class="text-sm mb-3" style="color: var(--text-secondary);">你的数据只属于你。你可以随时导出或删除。</p>
      <div class="space-y-2">
        <button @click="exportData" class="btn-secondary text-sm w-full">
          导出我的所有数据 (JSON)
        </button>
      </div>
    </div>

    <!-- About -->
    <div class="card animate-float-in" style="animation-delay: 0.3s;">
      <h2 class="text-sm font-semibold mb-2" style="color: var(--text-primary);">关于 IGOTU</h2>
      <p class="text-sm leading-relaxed" style="color: var(--text-secondary);">
        IGOTU 是你的一站式情绪健康伙伴。我们提供 AI 对话陪伴、呼吸引导、
        扎根练习、认知重构、情绪追踪和微成就记录，帮助你在困难的日子里，
        一步一步地照顾好自己。
      </p>
      <p class="text-sm leading-relaxed mt-2" style="color: var(--text-secondary);">
        这里没有「应该」，没有「必须」，没有压力。你的节奏就是最好的节奏。
      </p>
    </div>
  </div>
</template>
