import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

/** Demo 模式允许访问的路由名称 */
const DEMO_ALLOWED_ROUTES = new Set([
  'home', 'demo', 'toolbox', 'toolbox-breathing', 'toolbox-grounding', 'toolbox-crisis-prep',
]);

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/views/ChatView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/toolbox',
      name: 'toolbox',
      component: () => import('@/views/ToolboxView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/toolbox/phq9',
      name: 'toolbox-phq9',
      component: () => import('@/components/toolbox/PHQ9Assessment.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/toolbox/breathing',
      name: 'toolbox-breathing',
      component: () => import('@/components/toolbox/BreathingExercise.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/toolbox/grounding',
      name: 'toolbox-grounding',
      component: () => import('@/components/toolbox/GroundingExercise.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/toolbox/cognitive',
      name: 'toolbox-cognitive',
      component: () => import('@/components/toolbox/CognitiveRestructuring.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/toolbox/crisis-prep',
      name: 'toolbox-crisis-prep',
      component: () => import('@/components/toolbox/CrisisPrep.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/mood',
      name: 'mood',
      component: () => import('@/views/MoodView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: () => import('@/views/AnalyticsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/therapy',
      name: 'therapy',
      component: () => import('@/components/therapy/TherapyBridge.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/demo',
      name: 'demo',
      component: () => import('@/views/DemoLanding.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  // Unauthenticated user trying to access protected route
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' };
  }

  // Demo mode: restrict to allowed routes only
  if (auth.isDemo && to.name && !DEMO_ALLOWED_ROUTES.has(to.name as string)) {
    return { name: 'home' };
  }

  // Authenticated user on login page → redirect home
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'home' };
  }
});

export default router;
