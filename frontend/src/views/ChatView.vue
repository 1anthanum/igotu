<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useOpeningPreference } from '@/composables/useOpeningPreference';
import { useI18n } from '@/i18n';
import ChatMessage from '@/components/chat/ChatMessage.vue';
import GrowthTree from '@/components/tree/GrowthTree.vue';
import GuideTooltip from '@/components/onboarding/GuideTooltip.vue';

const chatStore = useChatStore();
const moodTheme = useMoodThemeStore();
const openingPref = useOpeningPreference();
const { t } = useI18n();
const input = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const showTree = ref(false);

// ── Session rename ──
const editingSessionId = ref<string | null>(null);
const editingTitle = ref('');

function startRenameSession(session: { id: string; title: string }) {
  editingSessionId.value = session.id;
  editingTitle.value = session.title === t('common.newConversation') ? '' : session.title;
  nextTick(() => {
    const el = document.querySelector('.session-rename-input') as HTMLInputElement;
    el?.focus();
    el?.select();
  });
}

async function confirmRename(sessionId: string) {
  const title = editingTitle.value.trim();
  editingSessionId.value = null;
  if (!title) return;
  try {
    await chatStore.renameSession(sessionId, title);
  } catch { /* silent */ }
}

function cancelRename() {
  editingSessionId.value = null;
}

/**
 * 开场建议标签（非强制，仅供参考）
 * 低能量模式显示更少更简的标签
 */
const SUGGESTION_TAGS = computed(() => [
  { key: 'A', text: t('chat.suggestions.A'), icon: '🌀' },
  { key: 'B', text: t('chat.suggestions.B'), icon: '🫥' },
  { key: 'C', text: t('chat.suggestions.C'), icon: '💔' },
  { key: 'D', text: t('chat.suggestions.D'), icon: '🌫️' },
  { key: 'E', text: t('chat.suggestions.E'), icon: '💬' },
]);

const showOpening = ref(false);

/** 根据情绪和偏好计算显示哪些建议标签 */
const openingSuggestions = computed(() => {
  if (moodTheme.isLowEnergy) {
    return [
      { key: 'low1', text: t('chat.suggestions.low1'), icon: '💬' },
      { key: 'low2', text: t('chat.suggestions.low2'), icon: '🫂' },
    ];
  }
  // 如果用户上次选过某个标签，把它排到第一位
  const lastKey = openingPref.lastChoice.value;
  if (lastKey) {
    const sorted = [...SUGGESTION_TAGS.value];
    const idx = sorted.findIndex(tag => tag.key === lastKey);
    if (idx > 0) {
      const [item] = sorted.splice(idx, 1);
      sorted.unshift(item);
    }
    return sorted;
  }
  return SUGGESTION_TAGS.value;
});

/** 情绪自适应快捷回复（对话进行中时显示） */
const quickReplies = computed(() => {
  if (moodTheme.isLowEnergy) {
    return [
      { text: t('chat.quickReplies.lowHmm'), icon: '💬' },
      { text: t('chat.quickReplies.lowQuiet'), icon: '🤫' },
      { text: t('chat.quickReplies.lowStay'), icon: '🫂' },
    ];
  }
  return [
    { text: t('chat.quickReplies.ok'), icon: '🌤️' },
    { text: t('chat.quickReplies.tired'), icon: '🍃' },
    { text: t('chat.quickReplies.wantToTalk'), icon: '💭' },
    { text: t('chat.quickReplies.needHelp'), icon: '🆘' },
  ];
});

/** 开场欢迎语 */
const openingGreeting = computed(() => {
  if (moodTheme.isLowEnergy) return t('chat.greetingLow');
  if (openingPref.hasPreference.value) return t('chat.greetingReturning');
  return t('chat.greetingNew');
});

/**
 * B6: 对话深度指示器
 * 随对话轮次增加，bot 头像光圈变亮变厚
 * 超过6轮后色温微妙偏暖
 */
const conversationDepth = computed(() => {
  const rounds = Math.floor(chatStore.messages.length / 2); // pairs of user+assistant
  return Math.min(rounds, 10); // cap at 10
});

const depthRingStyle = computed(() => {
  const d = conversationDepth.value;
  const borderWidth = 1.5 + d * 0.3;  // 1.5px → 4.5px
  const glowSize = 8 + d * 4;          // 8px → 48px
  const glowOpacity = 0.15 + d * 0.05; // 0.15 → 0.65
  // After 6 rounds, blend accent toward warm
  const useWarm = d >= 6;
  const color = useWarm
    ? `color-mix(in srgb, ${moodTheme.palette.accent} 65%, #f59e0b)`
    : moodTheme.palette.accent;

  return {
    border: `${borderWidth}px solid ${color}30`,
    boxShadow: `0 0 ${glowSize}px rgba(20,184,166,${glowOpacity})`,
    transition: 'border 0.8s ease, box-shadow 0.8s ease',
  };
});

const inputPlaceholder = computed(() => {
  if (showOpening.value && chatStore.messages.length === 0) {
    return moodTheme.isLowEnergy ? t('chat.placeholderOpeningLow') : t('chat.placeholderOpening');
  }
  if (moodTheme.isLowEnergy) return t('chat.placeholderActiveLow');
  return t('chat.placeholderActive');
});

onMounted(async () => {
  await chatStore.fetchSessions();
  if (chatStore.sessions.length === 0) {
    showOpening.value = true;
  } else {
    await chatStore.loadSession(chatStore.sessions[0].id);
  }
});

async function startNewChat() {
  await chatStore.startNewSession();
  showOpening.value = true;
}

async function sendMessage(text?: string) {
  const content = text || input.value.trim();
  if (!content) return;

  if (showOpening.value) {
    if (!chatStore.currentSessionId) {
      await chatStore.startNewSession();
    }
    showOpening.value = false;

    // 记忆用户偏好
    const matchedTag = SUGGESTION_TAGS.value.find(tag => tag.text === content);
    if (matchedTag) {
      openingPref.setChoice(matchedTag.key);
    } else {
      openingPref.setFreetext();
    }
  }

  input.value = '';
  const response = await chatStore.sendMessage(content);

  if (response && typeof response === 'object' && 'mood_score' in response) {
    moodTheme.setMoodSmooth((response as any).mood_score);
  }

  scrollToBottom();
}

function selectSuggestion(tag: { key: string; text: string }) {
  sendMessage(tag.text);
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

watch(() => chatStore.messages.length, scrollToBottom);

async function loadSession(sessionId: string) {
  showOpening.value = false;
  await chatStore.loadSession(sessionId);
}
</script>

<template>
  <div class="py-4 flex flex-col" style="height: calc(100dvh - 56px);">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-base"
          :style="{ background: moodTheme.palette.accentSoft, ...depthRingStyle }"
        >
          🌱
        </div>
        <div>
          <h1 class="text-section" style="color: var(--text-primary);">{{ t('chat.botName') }}</h1>
          <div class="flex items-center gap-1">
            <span
              class="w-1.5 h-1.5 rounded-full"
              :style="{ background: moodTheme.palette.accent }"
              style="animation: bio-breathe 2s ease-in-out infinite;"
            />
            <span class="text-[10px]" style="color: var(--text-muted);">{{ t('chat.botStatus') }}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button
          id="btn-tree-toggle"
          @click="showTree = !showTree"
          class="text-lg transition-all"
          :style="{ opacity: showTree ? 1 : 0.5, transform: showTree ? 'scale(1.1)' : 'scale(1)' }"
          :title="t('chat.treeTitle')"
        >
          🌳
        </button>
        <button
          v-if="!showTree"
          @click="startNewChat"
          class="text-sm transition-colors"
          :style="{ color: moodTheme.palette.accent }"
        >
          + {{ t('common.newChat') }}
        </button>
      </div>
    </div>

    <!-- Growth Tree panel (overlay) -->
    <div v-if="showTree" class="mb-3">
      <GrowthTree
        @select-session="(id: string) => { loadSession(id); showTree = false; }"
        @new-chat="() => { startNewChat(); showTree = false; }"
        @close="showTree = false"
      />
    </div>

    <!-- Session list (only when tree is hidden) -->
    <div v-else-if="chatStore.sessions.length > 1" class="mb-3">
      <div class="flex gap-2 overflow-x-auto pb-1">
        <template v-for="session in chatStore.sessions.slice(0, 5)" :key="session.id">
          <!-- Inline rename input -->
          <form
            v-if="editingSessionId === session.id"
            @submit.prevent="confirmRename(session.id)"
            class="flex-shrink-0"
          >
            <input
              v-model="editingTitle"
              @blur="confirmRename(session.id)"
              @keydown.esc="cancelRename"
              class="session-rename-input px-3 py-1 text-xs rounded-full whitespace-nowrap w-32"
              :style="{
                background: moodTheme.palette.navActive,
                color: moodTheme.palette.navActiveText,
                border: `1px solid ${moodTheme.palette.accent}`,
                outline: 'none',
              }"
              :placeholder="t('chat.renamePlaceholder')"
              maxlength="20"
            />
          </form>
          <!-- Normal session tab: click to load, double-click to rename -->
          <button
            v-else
            @click="loadSession(session.id)"
            @dblclick.stop="startRenameSession(session)"
            class="px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all flex-shrink-0"
            :style="session.id === chatStore.currentSessionId
              ? { background: moodTheme.palette.navActive, color: moodTheme.palette.navActiveText, border: `1px solid ${moodTheme.palette.accent}40` }
              : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }"
            :title="t('chat.doubleClickRename')"
          >
            {{ session.title }}
          </button>
        </template>
      </div>
      <p v-if="chatStore.sessions.length > 1" class="text-[10px] mt-1" style="color: var(--text-muted); opacity: 0.5;">
        {{ t('chat.tagHint') }}
      </p>
    </div>

    <!-- Messages area -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto space-y-1 pb-4">
      <!-- Gentle opening (non-pressuring) -->
      <div v-if="showOpening && chatStore.messages.length === 0" class="py-8 animate-float-in">
        <div class="text-center mb-6">
          <div
            class="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3"
            :style="{ background: moodTheme.palette.accentSoft, boxShadow: `0 0 40px ${moodTheme.palette.glow}` }"
          >
            <span class="text-2xl">🌱</span>
          </div>
          <p class="text-heading" style="color: var(--text-primary);">{{ openingGreeting }}</p>
          <p v-if="!moodTheme.isLowEnergy" class="text-xs mt-1" style="color: var(--text-muted);">
            {{ t('chat.tagHint') }}
          </p>
        </div>

        <!-- Suggestion tags (not forced choices) -->
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="tag in openingSuggestions"
            :key="tag.key"
            @click="selectSuggestion(tag)"
            class="px-4 py-2 rounded-full text-sm transition-all flex items-center gap-1.5"
            style="background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border-subtle);"
            @mouseenter="($event.target as HTMLElement).style.borderColor = moodTheme.palette.accent"
            @mouseleave="($event.target as HTMLElement).style.borderColor = 'var(--border-subtle)'"
          >
            <span>{{ tag.icon }}</span>
            <span>{{ tag.text }}</span>
          </button>
        </div>
      </div>

      <!-- Chat messages -->
      <ChatMessage
        v-for="(msg, i) in chatStore.messages"
        :key="msg.id"
        :role="msg.role"
        :content="msg.content"
        :is-last="i === chatStore.messages.length - 1"
        @select-choice="sendMessage($event)"
      />

      <!-- Typing indicator -->
      <div v-if="chatStore.sending" class="flex gap-3 mb-4">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          :style="{ background: moodTheme.palette.accentSoft }"
        >
          🌱
        </div>
        <div
          class="rounded-2xl rounded-tl-sm px-4 py-3"
          style="background: var(--bg-card); border: 1px solid var(--border-subtle);"
        >
          <div class="flex gap-1.5">
            <span
              v-for="n in 3" :key="n"
              class="w-1.5 h-1.5 rounded-full"
              :style="{
                background: moodTheme.palette.accent,
                animation: 'typing-bounce 1.4s infinite',
                animationDelay: `${(n-1) * 0.2}s`,
              }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Input area -->
    <div class="pt-3" style="border-top: 1px solid var(--border-subtle);">
      <!-- Quick reply suggestions (only when conversation is active) -->
      <div v-if="chatStore.messages.length > 0" class="flex gap-2 mb-2 overflow-x-auto pb-1">
        <button
          v-for="reply in quickReplies"
          :key="reply.text"
          @click="sendMessage(reply.text)"
          :disabled="chatStore.sending"
          class="px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-all flex items-center gap-1 flex-shrink-0"
          :style="{
            background: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            border: `1px solid var(--border-subtle)`,
          }"
          @mouseenter="($event.target as HTMLElement).style.borderColor = moodTheme.palette.accent"
          @mouseleave="($event.target as HTMLElement).style.borderColor = 'var(--border-subtle)'"
        >
          <span>{{ reply.icon }}</span>
          <span>{{ reply.text }}</span>
        </button>
      </div>

      <form @submit.prevent="sendMessage()" class="flex gap-2">
        <div class="input-focus-wrapper flex-1">
          <input
            v-model="input"
            :disabled="chatStore.sending"
            :placeholder="inputPlaceholder"
            class="input-field w-full text-sm"
            autocomplete="off"
          />
        </div>
        <button
          type="submit"
          :disabled="!input.trim() || chatStore.sending"
          class="btn-primary px-4 disabled:opacity-40"
        >
          {{ t('common.send') }}
        </button>
      </form>
      <p class="text-[10px] text-center mt-2" style="color: var(--text-muted);">
        {{ t('chat.disclaimer') }}
      </p>
    </div>

    <!-- Onboarding tooltips -->
    <GuideTooltip
      tip-id="chat-tree"
      :title="t('chat.treeTooltipTitle')"
      :description="t('chat.treeTooltipDesc')"
      target-selector="#btn-tree-toggle"
      position="bottom"
    />
  </div>
</template>

<style scoped>
@keyframes bio-breathe {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
@keyframes typing-bounce {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}
</style>
