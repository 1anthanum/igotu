<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@/i18n';
import { useAchievementStore } from '@/stores/achievements';
import TemplateSelector from './TemplateSelector.vue';

const { t } = useI18n();
const store = useAchievementStore();
const isExpanded = ref(false);
const showCustom = ref(false);
const customTitle = ref('');

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
  showCustom.value = false;
}

async function handleQuickLog(template: any) {
  await store.quickLog(template);
  isExpanded.value = false;
}

async function handleCustomLog() {
  if (!customTitle.value.trim()) return;
  await store.logCustom({ title: customTitle.value.trim(), category: 'custom' });
  customTitle.value = '';
  showCustom.value = false;
  isExpanded.value = false;
}
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
    <!-- Expanded panel -->
    <transition name="page">
      <div
        v-if="isExpanded"
        class="card w-72 animate-scale-in"
        style="box-shadow: 0 8px 40px rgba(0,0,0,0.4);"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold" style="color: var(--text-primary);">{{ t('achievements.logAchievement') }}</h3>
          <button @click="isExpanded = false" style="color: var(--text-muted);">×</button>
        </div>

        <!-- Template grid -->
        <TemplateSelector
          :templates="store.templates"
          :loading="store.loading"
          @select="handleQuickLog"
        />

        <!-- Custom input toggle -->
        <div class="mt-3 pt-3" style="border-top: 1px solid var(--border-subtle);">
          <div v-if="!showCustom">
            <button
              @click="showCustom = true"
              class="text-xs transition-colors"
              style="color: var(--text-muted);"
            >
              {{ t('achievements.customAchievement') }}
            </button>
          </div>
          <div v-else class="flex gap-2">
            <input
              v-model="customTitle"
              type="text"
              :placeholder="t('achievements.achievementPlaceholder')"
              class="input-field text-sm py-2"
              @keyup.enter="handleCustomLog"
              autofocus
            />
            <button
              @click="handleCustomLog"
              :disabled="!customTitle.trim()"
              class="btn-primary text-sm px-3 py-2 disabled:opacity-30"
            >
              记
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Success feedback -->
    <transition name="page">
      <div
        v-if="store.justLogged"
        class="px-4 py-2 rounded-xl text-sm font-medium shadow-md"
        style="background: var(--mood-accent-soft); color: var(--mood-accent);"
      >
        {{ t('achievements.seedPlanted') }}
      </div>
    </transition>

    <!-- Floating action button -->
    <button @click="toggleExpanded" class="btn-quick-log">
      <span v-if="!isExpanded">✨</span>
      <span v-else class="text-xl">×</span>
    </button>
  </div>
</template>
