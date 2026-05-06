/**
 * ChatMessage component unit tests
 *
 * Tests message rendering, choice parsing, shimmer class,
 * and entrance animation behavior.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ChatMessage from '@/components/chat/ChatMessage.vue';

// Stub ChoiceButtons to simplify
vi.mock('@/components/chat/ChoiceButtons.vue', () => ({
  default: {
    name: 'ChoiceButtons',
    template: '<div class="choice-buttons-stub" />',
    props: ['choices'],
    emits: ['select'],
  },
}));

describe('ChatMessage', () => {
  it('renders user message text', () => {
    const wrapper = mount(ChatMessage, {
      props: { role: 'user', content: '你好' },
    });
    expect(wrapper.text()).toContain('你好');
  });

  it('renders assistant message text', () => {
    const wrapper = mount(ChatMessage, {
      props: { role: 'assistant', content: '你好，我是小苗' },
    });
    expect(wrapper.text()).toContain('你好，我是小苗');
  });

  it('applies from-right class for user messages', () => {
    const wrapper = mount(ChatMessage, {
      props: { role: 'user', content: 'test' },
    });
    expect(wrapper.find('.from-right').exists()).toBe(true);
  });

  it('applies from-left class for assistant messages', () => {
    const wrapper = mount(ChatMessage, {
      props: { role: 'assistant', content: 'test' },
    });
    expect(wrapper.find('.from-left').exists()).toBe(true);
  });

  it('shows 🌱 avatar for assistant', () => {
    const wrapper = mount(ChatMessage, {
      props: { role: 'assistant', content: 'hello' },
    });
    expect(wrapper.text()).toContain('🌱');
  });

  it('shows 🙂 avatar for user', () => {
    const wrapper = mount(ChatMessage, {
      props: { role: 'user', content: 'hello' },
    });
    expect(wrapper.text()).toContain('🙂');
  });

  it('parses fenced choice blocks', async () => {
    const content = '请选择一个选项:\n```choices\nA. 深呼吸\nB. 散步\nC. 写日记\n```';
    const wrapper = mount(ChatMessage, {
      props: { role: 'assistant', content, isLast: true },
    });
    // Body should not contain the raw choice block
    expect(wrapper.text()).toContain('请选择一个选项');
    expect(wrapper.text()).not.toContain('```choices');
  });

  it('parses inline A-F choice lines', () => {
    const content = '我建议你试试:\nA. 冥想\nB. 运动';
    const wrapper = mount(ChatMessage, {
      props: { role: 'assistant', content, isLast: true },
    });
    expect(wrapper.text()).toContain('我建议你试试');
  });

  it('applies text-shimmer class on assistant messages after mount', async () => {
    const wrapper = mount(ChatMessage, {
      props: { role: 'assistant', content: 'test shimmer' },
    });
    // Wait for requestAnimationFrame (simulated by happy-dom)
    await new Promise(r => setTimeout(r, 50));
    await wrapper.vm.$nextTick();

    const bodyDiv = wrapper.find('.whitespace-pre-wrap');
    expect(bodyDiv.classes()).toContain('text-shimmer');
  });

  it('does NOT apply text-shimmer class on user messages', async () => {
    const wrapper = mount(ChatMessage, {
      props: { role: 'user', content: 'test no shimmer' },
    });
    await new Promise(r => setTimeout(r, 50));
    await wrapper.vm.$nextTick();

    const bodyDiv = wrapper.find('.whitespace-pre-wrap');
    expect(bodyDiv.classes()).not.toContain('text-shimmer');
  });

  it('chat bubble max-width uses min(80%, 640px)', () => {
    const wrapper = mount(ChatMessage, {
      props: { role: 'assistant', content: 'test' },
    });
    const bubble = wrapper.find('.rounded-2xl');
    expect(bubble.classes()).toContain('max-w-[min(80%,640px)]');
  });
});
