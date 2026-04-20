import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

/** Demo 模式允许访问的路由名称 */
const DEMO_ALLOWED_ROUTES = new Set([
  'home', 'demo', 'login', 'toolbox', 'toolbox-breathing', 'toolbox-grounding', 'toolbox-crisis-prep',
]);

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage.vue'),
      meta: { requiresAuth: true, depth: 0 },
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/views/ChatView.vue'),
      meta: { requiresAuth: true, depth: 1 },
    },
    {
      path: '/toolbox',
      name: 'toolbox',
      component: () => import('@/views/ToolboxView.vue'),
      meta: { requiresAuth: true, depth: 1 },
    },
    {
      path: '/toolbox/phq9',
      name: 'toolbox-phq9',
      component: () => import('@/components/toolbox/PHQ9Assessment.vue'),
      meta: { requiresAuth: true, depth: 2 },
    },
    {
      path: '/toolbox/breathing',
      name: 'toolbox-breathing',
      component: () => import('@/components/toolbox/BreathingExercise.vue'),
      meta: { requiresAuth: true, depth: 2 },
    },
    {
      path: '/toolbox/grounding',
      name: 'toolbox-grounding',
      component: () => import('@/components/toolbox/GroundingExercise.vue'),
      meta: { requiresAuth: true, depth: 2 },
    },
    {
      path: '/toolbox/cognitive',
      name: 'toolbox-cognitive',
      component: () => import('@/components/toolbox/CognitiveRestructuring.vue'),
      meta: { requiresAuth: true, depth: 2 },
    },
    {
      path: '/toolbox/crisis-prep',
      name: 'toolbox-crisis-prep',
      component: () => import('@/components/toolbox/CrisisPrep.vue'),
      meta: { requiresAuth: true, depth: 2 },
    },
    {
      path: '/mood',
      name: 'mood',
      component: () => import('@/views/MoodView.vue'),
      meta: { requiresAuth: true, depth: 1 },
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: () => import('@/views/AnalyticsView.vue'),
      meta: { requiresAuth: true, depth: 1 },
    },
    {
      path: '/therapy',
      name: 'therapy',
      component: () => import('@/components/therapy/TherapyBridge.vue'),
      meta: { requiresAuth: true, depth: 1 },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true, depth: 1 },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { depth: 0 },
    },
    {
      path: '/demo',
      name: 'demo',
      component: () => import('@/views/DemoLanding.vue'),
      meta: { depth: 0 },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  // Auto-enter demo mode for unauthenticated users (experience-first)
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    auth.enterDemo();
    // Now check if the route is allowed in demo mode
    if (to.name && !DEMO_ALLOWED_ROUTES.has(to.name as string)) {
      return { name: 'home' };
    }
    // Otherwise allow access — they're now in demo mode
    return;
  }

  // Demo mode: restrict to allowed routes only
  if (auth.isDemo && to.name && !DEMO_ALLOWED_ROUTES.has(to.name as string)) {
    return { name: 'home' };
  }

  // Authenticated user on login page → redirect home
  if (to.name === 'login' && auth.isAuthenticated && !auth.isDemo) {
    return { name: 'home' };
  }
});

export default router;
