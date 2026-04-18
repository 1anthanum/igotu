import apiClient from './client';

export interface ChatSession {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export async function createSession(title?: string) {
  const res = await apiClient.post('/chat/sessions', { title });
  return res.data as ChatSession;
}

export async function getSessions() {
  const res = await apiClient.get('/chat/sessions');
  return res.data as ChatSession[];
}

export async function getMessages(sessionId: string) {
  const res = await apiClient.get(`/chat/sessions/${sessionId}/messages`);
  return res.data as ChatMessage[];
}

export async function sendMessage(sessionId: string, content: string) {
  const res = await apiClient.post(`/chat/sessions/${sessionId}/messages`, { content });
  return res.data as { role: 'assistant'; content: string };
}

export async function renameSession(sessionId: string, title: string) {
  const res = await apiClient.patch(`/chat/sessions/${sessionId}`, { title });
  return res.data as ChatSession;
}

export async function deleteSession(sessionId: string) {
  await apiClient.delete(`/chat/sessions/${sessionId}`);
}
