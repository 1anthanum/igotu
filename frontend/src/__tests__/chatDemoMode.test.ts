/**
 * Chat store demo mode unit tests
 *
 * Tests the offline/demo fallback behavior of the chat store:
 * - API failure triggers demo mode
 * - Local session creation with demo- prefix
 * - Mood-appropriate response selection
 * - Locale-aware responses (zh / en)
 * - Auto-naming sessions from first message
 * - API send failure graceful fallback
 * - Typing delay simulation
 * - Sequential response cycling via _demoResponseIndex
 */
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Mock i18n before importing the store
vi.mock('@/i18n', () => {
  const localeMock = { value: 'zh' };
  return {
    useI18n: () => ({
      t: (key: string) => {
        if (key === 'common.newConversation') return '新对话';
        return key;
      },
      locale: localeMock,
    }),
    // Expose for tests that need to change locale
    __localeMock: localeMock,
  };
});

// Mock the API module
vi.mock('@/api/chat', () => ({
  createSession: vi.fn(),
  getSessions: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  renameSession: vi.fn().mockResolvedValue({}),
  deleteSession: vi.fn(),
}));

import { useChatStore } from '@/stores/chat';
import {
  getSessions,
  createSession,
  sendMessage as apiSendMessage,
} from '@/api/chat';

// Access the locale mock for locale-switching tests
const { __localeMock } = await import('@/i18n') as any;

describe('Chat store — demo mode', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    // Reset locale to zh before each test
    __localeMock.value = 'zh';
    // Use fake timers for delay tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── 1. fetchSessions failure activates demo mode ──
  it('sets isDemoMode to true when fetchSessions API fails', async () => {
    (getSessions as Mock).mockRejectedValueOnce(new Error('Network error'));
    const store = useChatStore();

    await store.fetchSessions();

    expect(store.isDemoMode).toBe(true);
    expect(store.sessions).toEqual([]);
  });

  // ── 2. Demo session IDs have demo- prefix ──
  it('creates local sessions with demo- prefix IDs in demo mode', async () => {
    (getSessions as Mock).mockRejectedValueOnce(new Error('offline'));
    const store = useChatStore();
    await store.fetchSessions();

    const session = await store.startNewSession();

    expect(session).toBeDefined();
    expect(session!.id).toMatch(/^demo-/);
    expect(store.currentSessionId).toBe(session!.id);
    expect(store.sessions).toHaveLength(1);
  });

  // ── 3. Low mood (1-2) selects low-mood responses ──
  it('returns low-mood Chinese responses when moodScore <= 2', async () => {
    (getSessions as Mock).mockRejectedValueOnce(new Error('offline'));
    const store = useChatStore();
    await store.fetchSessions();
    await store.startNewSession();

    const lowMoodResponses = [
      '我听到你了。你不需要假装没事。待在这里就好。',
      '这种感觉很难受。你愿意多说一些吗？没有也没关系。',
      '你来这里本身就很不容易了。我在这里陪着你。',
    ];

    const promise = store.sendMessage('我很难过', 1);
    await vi.advanceTimersByTimeAsync(1500);
    const reply = await promise;

    expect(reply).toBeDefined();
    expect(lowMoodResponses).toContain(reply!.content);
  });

  // ── 4. High mood (4-5) selects high-mood responses ──
  it('returns high-mood responses when moodScore >= 4', async () => {
    (getSessions as Mock).mockRejectedValueOnce(new Error('offline'));
    const store = useChatStore();
    await store.fetchSessions();
    await store.startNewSession();

    const highMoodResponses = [
      '听起来不错！是什么让你感觉好一些的？',
      '我能感受到你的能量。享受这个时刻吧。',
      '好状态！想聊聊最近有什么收获吗？',
    ];

    const promise = store.sendMessage('今天很开心', 5);
    await vi.advanceTimersByTimeAsync(1500);
    const reply = await promise;

    expect(reply).toBeDefined();
    expect(highMoodResponses).toContain(reply!.content);
  });

  // ── 5. Neutral mood (3) selects neutral responses ──
  it('returns neutral responses when moodScore is 3', async () => {
    (getSessions as Mock).mockRejectedValueOnce(new Error('offline'));
    const store = useChatStore();
    await store.fetchSessions();
    await store.startNewSession();

    const neutralResponses = [
      '嗯，我在听。你想聊什么都可以。',
      '有时候说不清也没关系。我们可以慢慢来。',
      '你今天有什么事情在脑子里转吗？不着急，慢慢说。',
    ];

    const promise = store.sendMessage('还行吧', 3);
    await vi.advanceTimersByTimeAsync(1500);
    const reply = await promise;

    expect(reply).toBeDefined();
    expect(neutralResponses).toContain(reply!.content);
  });

  // ── 6. English locale returns English responses ──
  it('returns English responses when locale is en', async () => {
    __localeMock.value = 'en';
    (getSessions as Mock).mockRejectedValueOnce(new Error('offline'));
    const store = useChatStore();
    await store.fetchSessions();
    await store.startNewSession();

    const enFallbackResponses = [
      "I'm here. You can say anything, or nothing at all.",
      "Everyone has their own pace. Yours is just right.",
      "Thank you for talking to me. I'm always here.",
    ];
    const enLowResponses = [
      "I hear you. You don't have to pretend everything is fine. Just being here is enough.",
      "That sounds really tough. Would you like to tell me more? It's okay if not.",
      "Coming here took courage. I'm here with you.",
    ];
    const allEnglish = [...enFallbackResponses, ...enLowResponses];

    // moodScore=1 → low category in English
    const promise = store.sendMessage('I feel sad', 1);
    await vi.advanceTimersByTimeAsync(1500);
    const reply = await promise;

    expect(reply).toBeDefined();
    expect(enLowResponses).toContain(reply!.content);
  });

  // ── 7. Auto-naming: first message renames session, truncated to 12 chars + ellipsis ──
  it('auto-renames session from first message, truncated to 12 chars', async () => {
    (getSessions as Mock).mockRejectedValueOnce(new Error('offline'));
    const store = useChatStore();
    await store.fetchSessions();
    await store.startNewSession();

    const longMessage = '这是一段非常长的消息，用于测试自动命名功能是否截断';

    const promise = store.sendMessage(longMessage, 3);
    await vi.advanceTimersByTimeAsync(1500);
    await promise;

    // Session title should be first 12 chars + ellipsis
    const session = store.sessions.find(s => s.id === store.currentSessionId);
    expect(session).toBeDefined();
    expect(session!.title).toBe(longMessage.slice(0, 12) + '…');
  });

  // ── 8. Short first message is used as title without truncation ──
  it('uses short first message as title without truncation', async () => {
    (getSessions as Mock).mockRejectedValueOnce(new Error('offline'));
    const store = useChatStore();
    await store.fetchSessions();
    await store.startNewSession();

    const shortMessage = '你好';

    const promise = store.sendMessage(shortMessage, 3);
    await vi.advanceTimersByTimeAsync(1500);
    await promise;

    const session = store.sessions.find(s => s.id === store.currentSessionId);
    expect(session).toBeDefined();
    expect(session!.title).toBe('你好');
  });

  // ── 9. API send failure falls back to demo mode ──
  it('falls back to demo response when API sendMessage fails', async () => {
    // Start in normal mode (fetchSessions succeeds)
    (getSessions as Mock).mockResolvedValueOnce([]);
    (createSession as Mock).mockResolvedValueOnce({
      id: 'server-session-1',
      title: '新对话',
      message_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    (apiSendMessage as Mock).mockRejectedValueOnce(new Error('Server error'));

    const store = useChatStore();
    await store.fetchSessions();
    expect(store.isDemoMode).toBe(false);

    await store.startNewSession();

    const promise = store.sendMessage('hello', 3);
    await vi.advanceTimersByTimeAsync(1500);
    const reply = await promise;

    // Should have switched to demo mode
    expect(store.isDemoMode).toBe(true);
    // Should still get a response (not an error)
    expect(reply).toBeDefined();
    expect(reply!.role).toBe('assistant');
    expect(reply!.content.length).toBeGreaterThan(0);
  });

  // ── 10. Demo mode typing delay is between 600-1200ms ──
  it('simulates a typing delay of at least 600ms in demo mode', async () => {
    (getSessions as Mock).mockRejectedValueOnce(new Error('offline'));
    const store = useChatStore();
    await store.fetchSessions();
    await store.startNewSession();

    const promise = store.sendMessage('test', 3);

    // At 500ms, the reply should NOT have resolved yet (sending still true)
    await vi.advanceTimersByTimeAsync(500);
    expect(store.sending).toBe(true);

    // At 1300ms (beyond max 1200ms), it should have resolved
    await vi.advanceTimersByTimeAsync(800);
    await promise;
    expect(store.sending).toBe(false);
  });

  // ── 11. Sequential demo responses cycle through the pool ──
  it('cycles through demo responses sequentially via _demoResponseIndex', async () => {
    (getSessions as Mock).mockRejectedValueOnce(new Error('offline'));
    const store = useChatStore();
    await store.fetchSessions();
    await store.startNewSession();

    const replies: string[] = [];

    // Send 4 messages with same mood to observe cycling (pool size is 3)
    for (let i = 0; i < 4; i++) {
      const promise = store.sendMessage(`msg ${i}`, 5);
      await vi.advanceTimersByTimeAsync(1500);
      const reply = await promise;
      replies.push(reply!.content);
    }

    // The 4th response should equal the 1st (cycling through 3-item pool)
    expect(replies[3]).toBe(replies[0]);
    // First three should all be different from each other
    const uniqueFirst3 = new Set(replies.slice(0, 3));
    expect(uniqueFirst3.size).toBe(3);
  });

  // ── 12. User message is added optimistically to messages array ──
  it('adds user message to messages array before demo reply arrives', async () => {
    (getSessions as Mock).mockRejectedValueOnce(new Error('offline'));
    const store = useChatStore();
    await store.fetchSessions();
    await store.startNewSession();

    const promise = store.sendMessage('optimistic check', 3);

    // Before the timer resolves, user message should already be present
    expect(store.messages).toHaveLength(1);
    expect(store.messages[0].role).toBe('user');
    expect(store.messages[0].content).toBe('optimistic check');

    // After timer, assistant reply is added
    await vi.advanceTimersByTimeAsync(1500);
    await promise;

    expect(store.messages).toHaveLength(2);
    expect(store.messages[1].role).toBe('assistant');
  });
});
