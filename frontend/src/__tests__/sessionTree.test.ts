import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSessionTree, BLOOM_EMOJI, BLOOM_SIZE } from '@/composables/useSessionTree';

// Mock chat API
vi.mock('@/api/chat', () => ({
  createSession: vi.fn(),
  getSessions: vi.fn().mockResolvedValue([]),
  getMessages: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn(),
  renameSession: vi.fn(),
  deleteSession: vi.fn(),
}));

import { useChatStore } from '@/stores/chat';

describe('useSessionTree', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('returns empty nodes when no sessions', () => {
    const tree = useSessionTree();
    expect(tree.nodes.value).toEqual([]);
    expect(tree.stats.value.total).toBe(0);
  });

  it('computes correct bloom stages', () => {
    const store = useChatStore();
    store.sessions = [
      { id: 's1', title: 'Seed', message_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 's2', title: 'Sprout', message_count: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 's3', title: 'Leaf', message_count: 8, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 's4', title: 'Flower', message_count: 25, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 's5', title: 'Fruit', message_count: 50, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];

    const tree = useSessionTree();
    const stages = tree.nodes.value.map(n => n.bloomStage);
    expect(stages).toContain('seed');
    expect(stages).toContain('sprout');
    expect(stages).toContain('leaf');
    expect(stages).toContain('flower');
    expect(stages).toContain('fruit');
  });

  it('positions nodes within valid range (0.05-0.95)', () => {
    const store = useChatStore();
    store.sessions = Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`, title: `Session ${i}`, message_count: i * 3,
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date(Date.now() - i * 86400000).toISOString(),
    }));

    const tree = useSessionTree();
    for (const node of tree.nodes.value) {
      expect(node.x).toBeGreaterThanOrEqual(0.1);
      expect(node.x).toBeLessThanOrEqual(0.9);
      expect(node.y).toBeGreaterThanOrEqual(0.05);
      expect(node.y).toBeLessThanOrEqual(0.95);
    }
  });

  it('calculates activity score (recent = higher)', () => {
    const store = useChatStore();
    store.sessions = [
      { id: 's1', title: 'Recent', message_count: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 's2', title: 'Old', message_count: 5, created_at: new Date(Date.now() - 7 * 86400000).toISOString(), updated_at: new Date(Date.now() - 7 * 86400000).toISOString() },
    ];

    const tree = useSessionTree();
    const recent = tree.nodes.value.find(n => n.title === 'Recent');
    const old = tree.nodes.value.find(n => n.title === 'Old');
    expect(recent!.activityScore).toBeGreaterThan(old!.activityScore);
  });

  it('detects night_bloom for sessions created at night', () => {
    const store = useChatStore();
    const nightTime = new Date();
    nightTime.setHours(23, 30, 0, 0);
    store.sessions = [
      { id: 's1', title: 'Night', message_count: 5, created_at: nightTime.toISOString(), updated_at: nightTime.toISOString() },
    ];

    const tree = useSessionTree();
    expect(tree.nodes.value[0].rareBloomTypes).toContain('night_bloom');
  });

  it('detects deep_talk for sessions with 20+ messages', () => {
    const store = useChatStore();
    store.sessions = [
      { id: 's1', title: 'Deep', message_count: 25, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];

    const tree = useSessionTree();
    expect(tree.nodes.value[0].rareBloomTypes).toContain('deep_talk');
  });

  it('computes streak correctly', () => {
    const store = useChatStore();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);

    store.sessions = [
      { id: 's1', title: 'Today', message_count: 1, created_at: today.toISOString(), updated_at: today.toISOString() },
      { id: 's2', title: 'Yesterday', message_count: 1, created_at: yesterday.toISOString(), updated_at: yesterday.toISOString() },
      { id: 's3', title: 'Day before', message_count: 1, created_at: dayBefore.toISOString(), updated_at: dayBefore.toISOString() },
    ];

    const tree = useSessionTree();
    expect(tree.streak.value.isActive).toBe(true);
    expect(tree.streak.value.days).toBe(3);
  });

  it('streak is inactive if no recent sessions', () => {
    const store = useChatStore();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    store.sessions = [
      { id: 's1', title: 'Old', message_count: 1, created_at: threeDaysAgo.toISOString(), updated_at: threeDaysAgo.toISOString() },
    ];

    const tree = useSessionTree();
    expect(tree.streak.value.isActive).toBe(false);
  });

  it('checkMilestone returns milestone at exact count', () => {
    const tree = useSessionTree();
    const milestone = tree.checkMilestone(5);
    expect(milestone).toBeTruthy();
    expect(milestone!.emoji).toBe('🌿');
  });

  it('checkMilestone returns null for non-milestone count', () => {
    const tree = useSessionTree();
    expect(tree.checkMilestone(3)).toBeNull();
  });

  it('rareBloomCollection counts all types', () => {
    const tree = useSessionTree();
    const collection = tree.rareBloomCollection.value;
    expect(collection).toHaveProperty('night_bloom');
    expect(collection).toHaveProperty('early_bird');
    expect(collection).toHaveProperty('deep_talk');
    expect(collection).toHaveProperty('quick_checkin');
  });
});

describe('BLOOM_EMOJI / BLOOM_SIZE constants', () => {
  it('BLOOM_EMOJI has all stages', () => {
    expect(BLOOM_EMOJI.seed).toBeTruthy();
    expect(BLOOM_EMOJI.sprout).toBeTruthy();
    expect(BLOOM_EMOJI.leaf).toBeTruthy();
    expect(BLOOM_EMOJI.flower).toBeTruthy();
    expect(BLOOM_EMOJI.fruit).toBeTruthy();
  });

  it('BLOOM_SIZE increases with stage', () => {
    expect(BLOOM_SIZE.seed).toBeLessThan(BLOOM_SIZE.sprout);
    expect(BLOOM_SIZE.sprout).toBeLessThan(BLOOM_SIZE.leaf);
    expect(BLOOM_SIZE.leaf).toBeLessThan(BLOOM_SIZE.flower);
    expect(BLOOM_SIZE.flower).toBeLessThan(BLOOM_SIZE.fruit);
  });
});
