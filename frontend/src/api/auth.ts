import apiClient from './client';
import type { AuthResponse } from '@/types/user';

export async function register(email: string, username: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post('/auth/register', { email, username, password });
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}
