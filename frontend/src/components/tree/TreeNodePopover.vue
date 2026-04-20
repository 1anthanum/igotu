<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useI18n } from '@/i18n';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useChatStore } from '@/stores/chat';
import { BLOOM_EMOJI, RARE_BLOOM_CONFIG, type BloomStage, type RareBloomType } from '@/composables/useSessionTree';

const props = defineProps<{
  sessionId: string;
  title: string;
  messageCount: number;
  bloomStage: BloomStage;
  rareBloomTypes: RareBloomType[];
  createdAt: string;
  /** Viewport coordinates where popover should anchor */
  anchorX: number;
  anchorY: number;
  /** Start in edit mode (from long-press) */
  editMode?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  'select-session': [sessionId: string];
}>();

const { t } = useI18n();
const moodTheme = useMoodThemeStore();
const chatStore = useChatStore();
const isEditing = ref(props.editMode || false);
const editTitle = ref(props.title);
const titleInput = ref<HTMLInputElement | null>(null);
const saving = ref(false);

const formattedDate = computed(() => {
  const d = new Date(props.createdAt);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hour}:${minute}`;
});

const popoverStyle = computed(() => {
  // Position above the anchor, centered
  const maxWidth = 240;
  let left = props.anchorX - maxWidth / 2;
  // Clamp to viewport
  left = Math.max(8, Math.min(window.innerWidth - maxWidth - 8, left));
  const top = Math.max(8, props.anchorY - 180);
  return {
    position: 'fixed' as const,
    left: `${left}px`,
    top: `${top}px`,
    width: `${maxWidth}px`,
    zIndex: '1500',
  };
});

function startEdit() {
  isEditing.value = true;
  editTitle.value = props.title;
  nextTick(() => titleInput.value?.focus());
}

async function saveTitle() {
  const trimmed = editTitle.value.trim();
  if (!trimmed || trimmed === props.title) {
    isEditing.value = false;
    return;
  }
  saving.value = true;
  try {
    await chatStore.renameSession(props.sessionId, trimmed);
  } catch { /* silent */ }
  saving.value = false;
  isEditing.value = false;
}

function openSession() {
  emit('select-session', props.sessionId);
  emit('close');
}

// Close on outside click
function onOutsideClick(e: MouseEvent) {
  const el = (e.target as HTMLElement);
  if (!el.closest('.tree-popover')) {
    emit('close');
  }
}

onMounted(() => {
  setTimeout(() => document.addEventListener('click', onOutsideClick), 100);
  if (props.editMode) {
    nextTick(() => titleInput.value?.focus());
  }
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onOutsideClick);
});
</script>

<template>
  <Teleport to="body">
    <div :style="popoverStyle" class="tree-popover animate-float-in">
      <!-- Title -->
      <div class="mb-2">
        <div v-if="isEditing" class="flex gap-1">
          <input
            ref="titleInput"
            v-model="editTitle"
            @keydown.enter="saveTitle"
            @keydown.escape="isEditing = false"
            :disabled="saving"
            class="flex-1 px-2 py-1 text-sm rounded-lg"
            style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--mood-accent); outline: none;"
            maxlength="50"
          />
          <button
            @click="saveTitle"
            class="text-xs px-2 rounded-lg"
            :style="{ background: moodTheme.palette.navActive, color: moodTheme.palette.navActiveText }"
          >
            ✓
          </button>
        </div>
        <div v-else class="flex items-center gap-1">
          <span class="text-sm font-medium flex-1 truncate" style="color: var(--text-primary);">
            {{ BLOOM_EMOJI[bloomStage] }} {{ title }}
          </span>
          <button
            @click="startEdit"
            class="text-[10px] px-1.5 py-0.5 rounded"
            style="color: var(--text-muted);"
          >
            ✏️
          </button>
        </div>
      </div>

      <!-- Info row -->
      <div class="flex items-center gap-3 text-[10px] mb-2" style="color: var(--text-muted);">
        <span>💬 {{ messageCount }} {{ t('growthTree.messageCount') }}</span>
        <span>📅 {{ formattedDate }}</span>
      </div>

      <!-- Rare bloom badges -->
      <div v-if="rareBloomTypes.length > 0" class="flex gap-1.5 mb-2">
        <span
          v-for="type in rareBloomTypes"
          :key="type"
          class="text-[10px] px-2 py-0.5 rounded-full"
          :style="{
            background: RARE_BLOOM_CONFIG[type].ringColor + '20',
            color: RARE_BLOOM_CONFIG[type].ringColor,
            border: `1px solid ${RARE_BLOOM_CONFIG[type].ringColor}40`,
          }"
          :title="RARE_BLOOM_CONFIG[type].description"
        >
          {{ RARE_BLOOM_CONFIG[type].emoji }} {{ RARE_BLOOM_CONFIG[type].label }}
        </span>
      </div>

      <!-- Action -->
      <button
        @click="openSession"
        class="w-full py-1.5 text-xs rounded-lg transition-colors"
        :style="{
          background: moodTheme.palette.navActive,
          color: moodTheme.palette.navActiveText,
        }"
      >
        {{ t('growthTree.openChat') }}
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.tree-popover {
  background: var(--bg-card);
  border: 1px solid var(--mood-accent);
  border-radius: 14px;
  padding: 12px;
  backdrop-filter: blur(16px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5), 0 0 20px var(--mood-glow);
}
</style>
