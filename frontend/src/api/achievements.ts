import apiClient from './client';
import type { Achievement, AchievementTemplate, CalendarDay, PaginatedResponse } from '@/types/achievement';

export async function logAchievement(data: {
  templateId?: string;
  title: string;
  emoji?: string;
  category?: string;
  note?: string;
  recordedDate?: string;
}): Promise<Achievement> {
  const { data: result } = await apiClient.post('/achievements', data);
  return result;
}

export async function getAchievements(params?: {
  page?: number;
  limit?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedResponse<Achievement>> {
  const { data } = await apiClient.get('/achievements', { params });
  return data;
}

export async function getTodayAchievements(): Promise<{ items: Achievement[]; count: number }> {
  const { data } = await apiClient.get('/achievements/today');
  return data;
}

export async function getCalendarData(days?: number): Promise<CalendarDay[]> {
  const { data } = await apiClient.get('/achievements/calendar', { params: { days } });
  return data;
}

export async function deleteAchievement(id: string): Promise<void> {
  await apiClient.delete(`/achievements/${id}`);
}

export async function getTemplates(): Promise<AchievementTemplate[]> {
  const { data } = await apiClient.get('/templates');
  return data;
}

export async function createTemplate(template: {
  title: string;
  emoji?: string;
  category: string;
}): Promise<AchievementTemplate> {
  const { data } = await apiClient.post('/templates', template);
  return data;
}
