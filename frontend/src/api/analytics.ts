import apiClient from './client';
import type { WeeklySummary, MonthlySummary, PatternInsight, EncouragementMessage } from '@/types/api';

export async function getWeeklySummary(): Promise<WeeklySummary> {
  const { data } = await apiClient.get('/analytics/weekly');
  return data;
}

export async function getMonthlySummary(): Promise<MonthlySummary> {
  const { data } = await apiClient.get('/analytics/monthly');
  return data;
}

export async function getPatterns(): Promise<PatternInsight[]> {
  const { data } = await apiClient.get('/analytics/patterns');
  return data;
}

export async function getEncouragement(): Promise<EncouragementMessage[]> {
  const { data } = await apiClient.get('/encouragement/current');
  return data;
}
