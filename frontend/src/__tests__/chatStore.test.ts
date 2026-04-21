import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useChatStore } from '@/stores/chat';

// Mock the API module
vi.mock('@/api/chat', () => ({
  createSession: vi.fn(),
  getSessions: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  renameSession: vi.fn().mockResolvedValue({}),
  deleteSession: vi.fn(),
}));

import * as chatApi from '@/api/chat';

describe('chatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('fetchSessions', () => {
    it('loads sessions from API', async () => {
      const mockSessions = [
        { id: '1', title: 'Test', message_count: 5, created_at: '2025-01-01', updated_at: '2025-01-01' },
      ];
      vi.mocked(chatApi.getSessions).mockResolvedValue(mockSessions);

      const store = useChatStore();
      await store.fetchSessions();

      expect(store.sessions).toEqual(mockSessions);
    });

    it('sets sessions to empty array on API error', async () => {
      vi.mocked(chatApi.getSessions).mockRejectedValue(new Error('Network error'));

      const store = useChatStore();
      await store.fetchSessions();

      expect(store.sessions).toEqual([]);
    });

    it('does not throw on API failure', async () => {
      vi.mocked(chatApi.getSessions).mockRejectedValue(new Error('401'));

      const store = useChatStore();
      await expect(store.fetchSessions()).resolves.toBeUndefined();
    });
  });

  describe('startNewSession', () => {
    it('creates a session and prepends to list', async () => {
      const mockSession = { id: 'new-1', title: '新对话', message_count: 0, created_at: '2025-01-01', updated_at: '2025-01-01' };
      vi.mocked(chatApi.createSession).mockResolvedValue(mockSession);

      const store = useChatStore();
      const result = await store.startNewSession();

      expect(result).toEqual(mockSession);
      expect(store.sessions[0]).toEqual(mockSession);
      expect(store.currentSessionId).toBe('new-1');
      expect(store.messages).toEqual([]);
    });

    it('returns null on API error without crashing', async () => {
      vi.mocked(chatApi.createSession).mockRejectedValue(new Error('Network'));

      const store = useChatStore();
      const result = await store.startNewSession();

      expect(result).toBeNull();
    });
  });

  describe('loadSession', () => {
    it('loads messages for a session', async () => {
      const mockMessages = [
        { id: 'm1', session_id: 's1', role: 'user' as const, content: 'Hello', created_at: '2025-01-01' },
        { id: 'm2', session_id: 's1', role: 'assistant' as const, content: 'Hi', created_at: '2025-01-01' },
      ];
      vi.mocked(chatApi.getMessages).mockResolvedValue(mockMessages);

      const store = useChatStore();
      await store.loadSession('s1');

      expect(store.currentSessionId).toBe('s1');
      expect(store.messages).toEqual(mockMessages);
      expect(store.loading).toBe(false);
    });

    it('sets empty messages on API error', async () => {
      vi.mocked(chatApi.getMessages).mockRejectedValue(new Error('404'));

      const store = useChatStore();
      await store.loadSession('s1');

      expect(store.messages).toEqual([]);
      expect(store.loading).toBe(false);
    });

    it('sets loading state correctly', async () => {
      let resolvePromise: (value: any) => void;
      const pending = new Promise(r => { resolvePromise = r; });
      vi.mocked(chatApi.getMessages).mockReturnValue(pending as any);

      const store = useChatStore();
      const loadPromise = store.loadSession('s1');

      expect(store.loading).toBe(true);
      resolvePromise!([]);
      await loadPromise;
      expect(store.loading).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('sends message and adds assistant reply', async () => {
      vi.mocked(chatApi.createSession).mockResolvedValue({
        id: 's1', title: '新对话', message_count: 0, created_at: '', updated_at: '',
      });
      vi.mocked(chatApi.sendMessage).mockResolvedValue({ role: 'assistant', content: 'Reply' });

      const store = useChatStore();
      await store.startNewSession();
      await store.sendMessage('Hello');

      expect(store.messages).toHaveLength(2);
      expect(store.messages[0].role).toBe('user');
      expect(store.messages[0].content).toBe('Hello');
      expect(store.messages[1].role).toBe('assistant');
      expect(store.messages[1].content).toBe('Reply');
      expect(store.sending).toBe(false);
    });

    it('adds error message as assistant reply on failure', async () => {
      vi.mocked(chatApi.createSession).mockResolvedValue({
        id: 's1', title: '新对话', message_count: 0, created_at: '', updated_at: '',
      });
      vi.mocked(chatApi.sendMessage).mockRejectedValue(new Error('Timeout'));

      const store = useChatStore();
      await store.startNewSession();
      await store.sendMessage('Hello');

      expect(store.messages).toHaveLength(2);
      expect(store.messages[1].role).toBe('assistant');
      expect(store.sending).toBe(false);
    });

    it('returns null when no session is active', async () => {
      const store = useChatStore();
      const result = await store.sendMessage('Hello');
      expect(result).toBeNull();
    });

    it('prevents concurrent sends', async () => {
      vi.mocked(chatApi.createSession).mockResolvedValue({
        id: 's1', title: '新对话', message_count: 0, created_at: '', updated_at: '',
      });

      let resolveFirst: (v: any) => void;
      vi.mocked(chatApi.sendMessage).mockImplementation(() =>
        new Promise(r => { resolveFirst = r; })
      );

      const store = useChatStore();
      await store.startNewSession();

      const first = store.sendMessage('First');
      const second = store.sendMessage('Second');

      expect(store.sending).toBe(true);
      resolveFirst!({ role: 'assistant', content: 'Reply' });
      await first;
      const secondResult = await second;

      // Second call should be rejected because sending was true
      expect(secondResult).toBeNull();
    });
  });

  describe('removeSession', () => {
    it('removes session from list', async () => {
      vi.mocked(chatApi.getSessions).mockResolvedValue([
        { id: 's1', title: 'One', message_count: 0, created_at: '', updated_at: '' },
        { id: 's2', title: 'Two', message_count: 0, created_at: '', updated_at: '' },
      ]);
      vi.mocked(chatApi.deleteSession).mockResolvedValue(undefined);

      const store = useChatStore();
      await store.fetchSessions();
      await store.removeSession('s1');

      expect(store.sessions).toHaveLength(1);
      expect(store.sessions[0].id).toBe('s2');
    });

    it('clears current session if deleted', async () => {
      vi.mocked(chatApi.getSessions).mockResolvedValue([
        { id: 's1', title: 'One', message_count: 0, created_at: '', updated_at: '' },
      ]);
      vi.mocked(chatApi.getMessages).mockResolvedValue([]);
      vi.mocked(chatApi.deleteSession).mockResolvedValue(undefined);

      const store = useChatStore();
      await store.fetchSessions();
      await store.loadSession('s1');
      await store.removeSession('s1');

      expect(store.currentSessionId).toBeNull();
      expect(store.messages).toEqual([]);
    });

    it('does not crash on API error', async () => {
      vi.mocked(chatApi.deleteSession).mockRejectedValue(new Error('500'));

      const store = useChatStore();
      await expect(store.removeSession('s1')).resolves.toBeUndefined();
    });
  });
});
