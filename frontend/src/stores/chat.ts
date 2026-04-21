import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useI18n } from '@/i18n';
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
  const { t } = useI18n();
  const sessions = ref<ChatSession[]>([]);
  const currentSessionId = ref<string | null>(null);
  const messages = ref<ChatMessage[]>([]);
  const sending = ref(false);
  const loading = ref(false);

  async function fetchSessions() {
    try {
      sessions.value = await getSessions();
    } catch {
      sessions.value = [];
    }
  }

  async function startNewSession() {
    try {
      const session = await createSession();
      sessions.value.unshift(session);
      currentSessionId.value = session.id;
      messages.value = [];
      return session;
    } catch {
      return null;
    }
  }

  async function loadSession(sessionId: string) {
    loading.value = true;
    try {
      currentSessionId.value = sessionId;
      messages.value = await getMessages(sessionId);
    } catch {
      messages.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function sendMessage(content: string) {
    if (!currentSessionId.value || sending.value) return null;

    // Auto-name session from first user message if still "新对话"
    const sessionIdx = sessions.value.findIndex(s => s.id === currentSessionId.value);
    const isFirstMessage = messages.value.length === 0;
    if (isFirstMessage && sessionIdx >= 0 && sessions.value[sessionIdx].title === t('common.newConversation')) {
      const autoTitle = content.length > 12 ? content.slice(0, 12) + '…' : content;
      sessions.value[sessionIdx] = { ...sessions.value[sessionIdx], title: autoTitle };
      // Fire-and-forget backend rename
      apiRenameSession(currentSessionId.value, autoTitle).catch(() => {});
    }

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
        content: err.response?.data?.error || t('common.sendFailed'),
        created_at: new Date().toISOString(),
      });
      return null;
    } finally {
      sending.value = false;
    }
  }

  async function renameSession(sessionId: string, title: string) {
    try {
      const updated = await apiRenameSession(sessionId, title);
      const idx = sessions.value.findIndex(s => s.id === sessionId);
      if (idx >= 0) sessions.value[idx] = { ...sessions.value[idx], title: updated.title };
      return updated;
    } catch {
      return null;
    }
  }

  async function removeSession(sessionId: string) {
    try {
      await deleteSession(sessionId);
      sessions.value = sessions.value.filter(s => s.id !== sessionId);
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null;
        messages.value = [];
      }
    } catch { /* silent */ }
  }

  return {
    sessions, currentSessionId, messages, sending, loading,
    fetchSessions, startNewSession, loadSession, sendMessage, renameSession, removeSession,
  };
});
