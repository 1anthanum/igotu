/**
 * useOnboarding — 页面引导系统
 *
 * 管理首次使用引导：欢迎 Modal + 各页面 Tooltip。
 * 低能量模式下全部跳过，不增加认知负担。
 */

import { ref, computed } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';

export interface OnboardingState {
  welcomeSeen: boolean;
  tooltips: Record<string, boolean>;
  tourCompleted: boolean;
  skipAll: boolean;
}

const STORAGE_KEY = 'igotu_onboarding';

function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return { welcomeSeen: false, tooltips: {}, tourCompleted: false, skipAll: false };
}

function saveState(state: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* silent */ }
}

const state = ref<OnboardingState>(loadState());

export function useOnboarding() {
  const moodTheme = useMoodThemeStore();

  /** 是否第一次访问 */
  const isFirstVisit = computed(() => !state.value.welcomeSeen);

  /** 是否应该显示欢迎 Modal */
  const shouldShowWelcome = computed(() => {
    if (moodTheme.isLowEnergy) return false;
    if (state.value.skipAll) return false;
    return !state.value.welcomeSeen;
  });

  /** 检查某个 tooltip 是否应该显示 */
  function shouldShowTooltip(tipId: string): boolean {
    if (moodTheme.isLowEnergy) return false;
    if (state.value.skipAll) return false;
    if (state.value.tourCompleted) return false;
    return !state.value.tooltips[tipId];
  }

  /** 标记欢迎 Modal 已看 */
  function markWelcomeSeen() {
    state.value.welcomeSeen = true;
    saveState(state.value);
  }

  /** 标记某个 tooltip 已看 */
  function markTooltipSeen(tipId: string) {
    state.value.tooltips[tipId] = true;
    saveState(state.value);
  }

  /** 跳过所有引导 */
  function skipAllGuides() {
    state.value.skipAll = true;
    state.value.welcomeSeen = true;
    state.value.tourCompleted = true;
    saveState(state.value);
  }

  /** 标记引导完成 */
  function completeTour() {
    state.value.tourCompleted = true;
    saveState(state.value);
  }

  /** 重置引导（测试用） */
  function resetOnboarding() {
    state.value = { welcomeSeen: false, tooltips: {}, tourCompleted: false, skipAll: false };
    saveState(state.value);
  }

  return {
    isFirstVisit,
    shouldShowWelcome,
    shouldShowTooltip,
    markWelcomeSeen,
    markTooltipSeen,
    skipAllGuides,
    completeTour,
    resetOnboarding,
  };
}
