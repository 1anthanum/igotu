import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track whether a redirect is already in progress to avoid multiple redirects
let isRedirecting = false;

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Skip redirect for optional/background API calls (exercises, mood logs, etc.)
      const optionalPaths = ['/exercises', '/phq9', '/cognitive', '/chat/sessions'];
      const requestPath = error.config?.url || '';
      const isOptional = optionalPaths.some(p => requestPath.includes(p));

      if (isOptional) {
        // Don't attempt refresh or redirect — just fail silently
        return Promise.reject(error);
      }

      // Try to refresh token for critical API calls
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('access_token', data.accessToken);
          localStorage.setItem('refresh_token', data.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiClient(error.config);
        } catch {
          // Refresh failed, redirect to login (only once)
          if (!isRedirecting) {
            isRedirecting = true;
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
