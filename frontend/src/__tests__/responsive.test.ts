/**
 * Responsive layout unit tests
 *
 * Verifies that key CSS classes and responsive patterns
 * are correctly applied in component templates.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Mock router
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), afterEach: vi.fn() }),
  useRoute: () => ({ name: 'home', path: '/', meta: {} }),
  RouterLink: {
    name: 'RouterLink',
    template: '<a><slot /></a>',
    props: ['to'],
  },
  RouterView: {
    name: 'RouterView',
    template: '<div />',
  },
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    isDemo: false,
    logout: vi.fn(),
  }),
}));

vi.mock('@/composables/useMoodTheme', () => ({
  useMoodThemeStore: () => ({
    isLowEnergy: false,
    palette: {
      accent: '#14b8a6',
      accentSoft: '#0a2e28',
      navActive: 'rgba(20,184,166,0.15)',
      navActiveText: '#2dd4bf',
    },
    init: vi.fn(),
  }),
}));

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    isEn: { value: false },
    setLocale: vi.fn(),
  }),
}));

import AppHeader from '@/components/layout/AppHeader.vue';

describe('Responsive: AppHeader', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('uses app-container class instead of max-w-5xl', () => {
    const wrapper = mount(AppHeader);
    const container = wrapper.find('.app-container');
    expect(container.exists()).toBe(true);
    // Should NOT have max-w-5xl
    const maxW = wrapper.find('.max-w-5xl');
    expect(maxW.exists()).toBe(false);
  });

  it('has responsive px-4 sm:px-6 padding', () => {
    const wrapper = mount(AppHeader);
    const container = wrapper.find('.app-container');
    expect(container.classes()).toContain('px-4');
  });

  it('renders nav-icon-responsive elements for icon-only mode', () => {
    const wrapper = mount(AppHeader);
    const icons = wrapper.findAll('.nav-icon-responsive');
    // Should have 7 nav items with responsive icons
    expect(icons.length).toBe(7);
  });

  it('renders nav-label-responsive elements for text mode', () => {
    const wrapper = mount(AppHeader);
    const labels = wrapper.findAll('.nav-label-responsive');
    expect(labels.length).toBe(7);
  });

  it('each nav item has a title attribute for tooltip on icon mode', () => {
    const wrapper = mount(AppHeader);
    const navItems = wrapper.findAll('.nav-item');
    for (const item of navItems) {
      expect(item.attributes('title')).toBeTruthy();
    }
  });
});

describe('Responsive: TemplateSelector grid', () => {
  it('uses responsive grid-cols-3 lg:grid-cols-4', async () => {
    // Mock the store
    vi.mock('@/stores/achievements', () => ({
      useAchievementStore: () => ({
        templates: [
          { id: '1', emoji: '🌱', title: 'A' },
          { id: '2', emoji: '☀️', title: 'B' },
          { id: '3', emoji: '🌊', title: 'C' },
          { id: '4', emoji: '🔥', title: 'D' },
        ],
      }),
    }));

    const { default: TemplateSelector } = await import(
      '@/components/achievements/TemplateSelector.vue'
    );
    const wrapper = mount(TemplateSelector, {
      props: {
        templates: [
          { id: '1', emoji: '🌱', title: 'A', category: 'selfcare', sort_order: 0, is_active: true },
          { id: '2', emoji: '☀️', title: 'B', category: 'selfcare', sort_order: 1, is_active: true },
        ],
        loading: false,
      },
    });

    const grid = wrapper.find('.grid');
    expect(grid.classes()).toContain('grid-cols-3');
    expect(grid.classes()).toContain('lg:grid-cols-4');
  });
});
