<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import ChatMessage from '@/components/chat/ChatMessage.vue';

const chatStore = useChatStore();
const moodTheme = useMoodThemeStore();
const input = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

const OPENING_MESSAGE = '你来了。今天的状态，更接近哪一个？';
const OPENING_CHOICES = [
  { key: 'A', text: '脑子里很吵，停不下来' },
  { key: 'B', text: '什么都不想做，很空' },
  { key: 'C', text: '有具体的事情让我难受' },
  { key: 'D', text: '说不清楚，就是不好' },
  { key: 'E', text: '还行，就是想聊聊' },
];

const showOpening = ref(false);

onMounted(async () => {
  await chatStore.fetchSessions();
  if (chatStore.sessions.length === 0) {
    showOpening.value = true;
  } else {
    await chatStore.loadSession(chatStore.sessions[0].id);
  }
});

async function startNewChat() {
  const session = await chatStore.startNewSession();
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
  }

  input.value = '';
  const response = await chatStore.sendMessage(content);

  // AI 情绪联动：如果后端返回了 mood_score，平滑更新主题
  if (response && typeof response === 'object' && 'mood_score' in response) {
    moodTheme.setMoodSmooth((response as any).mood_score);
  }

  scrollToBottom();
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
  <div class="py-4 flex flex-col" style="height: calc(100vh - 56px);">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-base"
          :style="{ background: moodTheme.palette.accentSoft, border: `1.5px solid ${moodTheme.palette.accent}30` }"
        >
          🌱
        </div>
        <div>
          <h1 class="text-sm font-medium" style="color: var(--text-primary);">小树</h1>
          <div class="flex items-center gap-1">
            <span
              class="w-1.5 h-1.5 rounded-full"
              :style="{ background: moodTheme.palette.accent }"
              style="animation: bio-breathe 2s ease-in-out infinite;"
            />
            <span class="text-[10px]" style="color: var(--text-muted);">在线陪伴</span>
          </div>
        </div>
      </div>
      <button
        @click="startNewChat"
        class="text-sm transition-colors"
        :style="{ color: moodTheme.palette.accent }"
      >
        + 新对话
      </button>
    </div>

    <!-- Session list -->
    <div v-if="chatStore.sessions.length > 1" class="mb-3">
      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="session in chatStore.sessions.slice(0, 5)"
          :key="session.id"
          @click="loadSession(session.id)"
          class="px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all"
          :style="session.id === chatStore.currentSessionId
            ? { background: moodTheme.palette.navActive, color: moodTheme.palette.navActiveText, border: `1px solid ${moodTheme.palette.accent}40` }
            : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }"
        >
          {{ session.title }}
        </button>
      </div>
    </div>

    <!-- Messages area -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto space-y-1 pb-4">
      <!-- Opening message -->
      <div v-if="showOpening && chatStore.messages.length === 0">
        <ChatMessage
          role="assistant"
          :content="OPENING_MESSAGE + '\n\n```choices\n' + OPENING_CHOICES.map(c => c.key + '. ' + c.text).join('\n') + '\n```'"
          :is-last="true"
          @select-choice="sendMessage($event)"
        />
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
          class="w-8 h-8 rounded-full flex items-center justify-content text-lg flex-shrink-0"
          :style="{ background: moodTheme.palette.accentSoft }"
          style="display: flex; align-items: center; justify-content: center;"
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
      <form @submit.prevent="sendMessage()" class="flex gap-2">
        <input
          v-model="input"
          :disabled="chatStore.sending"
          placeholder="在这里，慢慢说..."
          class="input-field flex-1 text-sm"
          autocomplete="off"
        />
        <button
          type="submit"
          :disabled="!input.trim() || chatStore.sending"
          class="btn-primary px-4 disabled:opacity-40"
        >
          发送
        </button>
      </form>
      <p class="text-[10px] text-center mt-2" style="color: var(--text-muted);">
        AI 对话不替代专业医疗。如需紧急帮助，请拨打 400-161-9995
      </p>
    </div>
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
