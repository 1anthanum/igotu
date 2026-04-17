import apiClient from './client';

export interface MoodEntry {
  id: string;
  mood_score: number;
  mood_emoji: string;
  mood_label: string;
  note?: string;
  recorded_at: string;
}

export async function logMood(data: { mood_score: number; mood_emoji: string; mood_label: string; note?: string }) {
  const res = await apiClient.post('/mood', data);
  return res.data as MoodEntry;
}

export async function getMoodEntries(limit = 50, offset = 0) {
  const res = await apiClient.get('/mood', { params: { limit, offset } });
  return res.data as { entries: MoodEntry[]; total: number };
}

export async function getTodayMoods() {
  const res = await apiClient.get('/mood/today');
  return res.data as MoodEntry[];
}

export async function getMoodTrend(days = 30) {
  const res = await apiClient.get('/mood/trend', { params: { days } });
  return res.data as MoodEntry[];
}
