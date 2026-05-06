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

// ── Demo mode: local empathic responses when API is unavailable ──
const DEMO_RESPONSES_ZH: Record<string, string[]> = {
  low: [
    '我听到你了。你不需要假装没事。待在这里就好。',
    '这种感觉很难受。你愿意多说一些吗？没有也没关系。',
    '你来这里本身就很不容易了。我在这里陪着你。',
  ],
  neutral: [
    '嗯，我在听。你想聊什么都可以。',
    '有时候说不清也没关系。我们可以慢慢来。',
    '你今天有什么事情在脑子里转吗？不着急，慢慢说。',
  ],
  high: [
    '听起来不错！是什么让你感觉好一些的？',
    '我能感受到你的能量。享受这个时刻吧。',
    '好状态！想聊聊最近有什么收获吗？',
  ],
  fallback: [
    '我在这里。你想说什么都可以，或者什么都不说也行。',
    '每个人的节奏不一样，你的节奏就是最好的。',
    '谢谢你愿意和我说话。我一直都在。',
  ],
};

const DEMO_RESPONSES_EN: Record<string, string[]> = {
  low: [
    'I hear you. You don\'t have to pretend everything is fine. Just being here is enough.',
    'That sounds really tough. Would you like to tell me more? It\'s okay if not.',
    'Coming here took courage. I\'m here with you.',
  ],
  neutral: [
    'I\'m listening. You can talk about anything you want.',
    'It\'s okay not to have it all figured out. We can take it slow.',
    'Is there something on your mind today? No rush, take your time.',
  ],
  high: [
    'That sounds great! What helped you feel better?',
    'I can feel your energy. Enjoy this moment.',
    'Good vibes! Want to share what\'s been going well?',
  ],
  fallback: [
    'I\'m here. You can say anything, or nothing at all.',
    'Everyone has their own pace. Yours is just right.',
    'Thank you for talking to me. I\'m always here.',
  ],
};

let _demoResponseIndex = 0;

function getDemoResponse(content: string, lang: string, moodScore: number): string {
  const pool = lang.startsWith('zh') ? DEMO_RESPONSES_ZH : DEMO_RESPONSES_EN;
  let category = 'fallback';
  if (moodScore <= 2) category = 'low';
  else if (moodScore >= 4) category = 'high';
  else if (moodScore === 3) category = 'neutral';

  const responses = pool[category];
  const idx = _demoResponseIndex % responses.length;
  _demoResponseIndex++;
  return responses[idx];
}

export const useChatStore = defineStore('chat', () => {
  const { t, locale } = useI18n();
  const sessions = ref<ChatSession[]>([]);
  const currentSessionId = ref<string | null>(null);
  const messages = ref<ChatMessage[]>([]);
  const sending = ref(false);
  const loading = ref(false);
  const isDemoMode = ref(false);

  async function fetchSessions() {
    try {
      sessions.value = await getSessions();
      isDemoMode.value = false;
    } catch {
      sessions.value = [];
      isDemoMode.value = true;
    }
  }

  async function startNewSession() {
    // Demo mode: create local-only session
    if (isDemoMode.value) {
      const localSession: ChatSession = {
        id: 'demo-' + Date.now(),
        title: t('common.newConversation'),
        message_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      sessions.value.unshift(localSession);
      currentSessionId.value = localSession.id;
      messages.value = [];
      return localSession;
    }

    try {
      const session = await createSession();
      sessions.value.unshift(session);
      currentSessionId.value = session.id;
      messages.value = [];
      return session;
    } catch {
      // Fallback to demo mode
      isDemoMode.value = true;
      return startNewSession();
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

  async function sendMessage(content: string, moodScore = 3) {
    if (!currentSessionId.value || sending.value) return null;

    // Auto-name session from first user message if still "新对话"
    const sessionIdx = sessions.value.findIndex(s => s.id === currentSessionId.value);
    const isFirstMessage = messages.value.length === 0;
    if (isFirstMessage && sessionIdx >= 0 && sessions.value[sessionIdx].title === t('common.newConversation')) {
      const autoTitle = content.length > 12 ? content.slice(0, 12) + '…' : content;
      sessions.value[sessionIdx] = { ...sessions.value[sessionIdx], title: autoTitle };
      // Fire-and-forget backend rename (skip in demo mode)
      if (!isDemoMode.value) {
        apiRenameSession(currentSessionId.value, autoTitle).catch(() => {});
      }
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

    // Demo mode: generate local empathic response
    if (isDemoMode.value) {
      // Simulate typing delay (600-1200ms)
      await new Promise(r => setTimeout(r, 600 + Math.random() * 600));
      const demoContent = getDemoResponse(content, locale.value || 'zh', moodScore);
      const assistantMsg: ChatMessage = {
        id: 'demo-reply-' + Date.now(),
        session_id: currentSessionId.value!,
        role: 'assistant',
        content: demoContent,
        created_at: new Date().toISOString(),
      };
      messages.value.push(assistantMsg);
      sending.value = false;
      return { role: 'assistant' as const, content: demoContent };
    }

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
      // On API failure, fallback to demo response instead of error
      isDemoMode.value = true;
      const demoContent = getDemoResponse(content, locale.value || 'zh', moodScore);
      messages.value.push({
        id: 'demo-fallback-' + Date.now(),
        session_id: currentSessionId.value!,
        role: 'assistant',
        content: demoContent,
        created_at: new Date().toISOString(),
      });
      return { role: 'assistant' as const, content: demoContent };
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
    sessions, currentSessionId, messages, sending, loading, isDemoMode,
    fetchSessions, startNewSession, loadSession, sendMessage, renameSession, removeSession,
  };
});
