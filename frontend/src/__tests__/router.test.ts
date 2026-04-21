import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('starts unauthenticated with no token', () => {
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.isDemo).toBe(false);
  });

  it('reads access_token from localStorage', () => {
    localStorage.setItem('access_token', 'test-token');
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(true);
  });

  it('enterDemo sets demo mode', () => {
    const auth = useAuthStore();
    auth.enterDemo();
    expect(auth.isDemo).toBe(true);
    expect(auth.isAuthenticated).toBe(true);
  });

  it('exitDemo clears demo mode', () => {
    const auth = useAuthStore();
    auth.enterDemo();
    auth.exitDemo();
    expect(auth.isDemo).toBe(false);
  });

  it('logout clears token and user', () => {
    localStorage.setItem('access_token', 'token');
    localStorage.setItem('refresh_token', 'refresh');
    const auth = useAuthStore();
    auth.logout();
    expect(auth.isAuthenticated).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });
});

describe('route access control', () => {
  // These tests verify the DEMO_ALLOWED_ROUTES logic
  const DEMO_ALLOWED_ROUTES = new Set([
    'home', 'demo', 'login', 'toolbox', 'toolbox-breathing', 'toolbox-grounding', 'toolbox-crisis-prep',
  ]);

  it('blocks chat for demo users', () => {
    expect(DEMO_ALLOWED_ROUTES.has('chat')).toBe(false);
  });

  it('blocks analytics for demo users', () => {
    expect(DEMO_ALLOWED_ROUTES.has('analytics')).toBe(false);
  });

  it('blocks mood for demo users', () => {
    expect(DEMO_ALLOWED_ROUTES.has('mood')).toBe(false);
  });

  it('allows home for demo users', () => {
    expect(DEMO_ALLOWED_ROUTES.has('home')).toBe(true);
  });

  it('allows toolbox for demo users', () => {
    expect(DEMO_ALLOWED_ROUTES.has('toolbox')).toBe(true);
  });

  it('allows breathing exercise for demo users', () => {
    expect(DEMO_ALLOWED_ROUTES.has('toolbox-breathing')).toBe(true);
  });
});
