<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useOnboarding } from '@/composables/useOnboarding';

const props = defineProps<{
  tipId: string;
  title: string;
  description: string;
  /** CSS selector or ref element to anchor to */
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}>();

const moodTheme = useMoodThemeStore();
const onboarding = useOnboarding();

const visible = ref(false);
const tooltipStyle = ref<Record<string, string>>({});
const pos = props.position || 'bottom';

function calculatePosition() {
  if (!props.targetSelector) {
    // Fallback: center of screen
    tooltipStyle.value = {
      position: 'fixed',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '1000',
    };
    return;
  }

  const target = document.querySelector(props.targetSelector);
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const gap = 10;

  switch (pos) {
    case 'bottom':
      tooltipStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + gap}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: 'translateX(-50%)',
        zIndex: '1000',
      };
      break;
    case 'top':
      tooltipStyle.value = {
        position: 'fixed',
        bottom: `${window.innerHeight - rect.top + gap}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: 'translateX(-50%)',
        zIndex: '1000',
      };
      break;
    case 'right':
      tooltipStyle.value = {
        position: 'fixed',
        top: `${rect.top + rect.height / 2}px`,
        left: `${rect.right + gap}px`,
        transform: 'translateY(-50%)',
        zIndex: '1000',
      };
      break;
    case 'left':
      tooltipStyle.value = {
        position: 'fixed',
        top: `${rect.top + rect.height / 2}px`,
        right: `${window.innerWidth - rect.left + gap}px`,
        transform: 'translateY(-50%)',
        zIndex: '1000',
      };
      break;
  }
}

function dismiss() {
  onboarding.markTooltipSeen(props.tipId);
  visible.value = false;
}

onMounted(() => {
  // Delay tooltip appearance for smooth UX
  setTimeout(() => {
    if (onboarding.shouldShowTooltip(props.tipId)) {
      calculatePosition();
      visible.value = true;
    }
  }, 1200);
});

// Recalculate on resize
function onResize() {
  if (visible.value) calculatePosition();
}
onMounted(() => window.addEventListener('resize', onResize));
onBeforeUnmount(() => window.removeEventListener('resize', onResize));
</script>

<template>
  <Teleport to="body">
    <transition name="tooltip-fade">
      <div
        v-if="visible"
        :style="tooltipStyle"
        class="guide-tooltip animate-float-in"
        :class="`arrow-${pos}`"
      >
        <p class="text-xs font-medium mb-0.5" :style="{ color: moodTheme.palette.navActiveText }">
          {{ title }}
        </p>
        <p class="text-xs" style="color: var(--text-secondary);">
          {{ description }}
        </p>
        <button
          @click="dismiss"
          class="text-[10px] mt-2 px-3 py-1 rounded-lg transition-colors"
          :style="{
            background: moodTheme.palette.navActive,
            color: moodTheme.palette.navActiveText,
          }"
        >
          知道了
        </button>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.guide-tooltip {
  max-width: 220px;
  padding: 12px 14px;
  background: var(--bg-card);
  border: 1px solid var(--mood-accent);
  border-radius: 12px;
  backdrop-filter: blur(16px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 0 20px var(--mood-glow);
}

/* Arrow indicators */
.arrow-bottom::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: var(--bg-card);
  border-left: 1px solid var(--mood-accent);
  border-top: 1px solid var(--mood-accent);
}
.arrow-top::before {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(225deg);
  width: 10px;
  height: 10px;
  background: var(--bg-card);
  border-left: 1px solid var(--mood-accent);
  border-top: 1px solid var(--mood-accent);
}

.tooltip-fade-enter-active { transition: all 0.3s ease; }
.tooltip-fade-leave-active { transition: all 0.2s ease; }
.tooltip-fade-enter-from { opacity: 0; transform: translateX(-50%) translateY(8px); }
.tooltip-fade-leave-to { opacity: 0; }
</style>
