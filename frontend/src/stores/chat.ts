import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  createSession,
  getSessions,
  getMessages,
  sendMessage as apiSendMessage,
  renameSession as apiRenameSession,
  deleteSession,
  type ChatSession,
  type ChatMessage,
} from '@/api/chat';

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<ChatSession[]>([]);
  const currentSessionId = ref<string | null>(null);
  const messages = ref<ChatMessage[]>([]);
  const sending = ref(false);
  const loading = ref(false);

  async function fetchSessions() {
    sessions.value = await getSessions();
  }

  async function startNewSession() {
    const session = await createSession();
    sessions.value.unshift(session);
    currentSessionId.value = session.id;
    messages.value = [];
    return session;
  }

  async function loadSession(sessionId: string) {
    loading.value = true;
    try {
      currentSessionId.value = sessionId;
      messages.value = await getMessages(sessionId);
    } finally {
      loading.value = false;
    }
  }

  async function sendMessage(content: string) {
    if (!currentSessionId.value || sending.value) return null;

    // Optimistic: add user message
    const userMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      session_id: currentSessionId.value,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    messages.value.push(userMsg);

    sending.value = true;
    try {
      const reply = await apiSendMessage(currentSessionId.value, content);
      const assistantMsg: ChatMessage = {
        id: 'temp-reply-' + Date.now(),
        session_id: currentSessionId.value!,
        role: 'assistant',
        content: reply.content,
        created_at: new Date().toISOString(),
      };
      messages.value.push(assistantMsg);
      // Return the full API response (includes mood_score if present)
      return reply;
    } catch (err: any) {
      // Add error message as assistant reply
      messages.value.push({
        id: 'error-' + Date.now(),
        session_id: currentSessionId.value!,
        role: 'assistant',
        content: err.response?.data?.error || '发送失败，请稍后重试。',
        created_at: new Date().toISOString(),
      });
      return null;
    } finally {
      sending.value = false;
    }
  }

  async function renameSession(sessionId: string, title: string) {
    const updated = await apiRenameSession(sessionId, title);
    const idx = sessions.value.findIndex(s => s.id === sessionId);
    if (idx >= 0) sessions.value[idx] = { ...sessions.value[idx], title: updated.title };
    return updated;
  }

  async function removeSession(sessionId: string) {
    await deleteSession(sessionId);
    sessions.value = sessions.value.filter(s => s.id !== sessionId);
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = null;
      messages.value = [];
    }
  }

  return {
    sessions, currentSessionId, messages, sending, loading,
    fetchSessions, startNewSession, loadSession, sendMessage, renameSession, removeSession,
  };
});
