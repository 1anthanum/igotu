import apiClient from './client';

// ── 类型 ──

export interface VEMDailySummary {
  available: boolean;
  message?: string;
  vitality?: number;
  stress?: number;
  clarity?: number;
  momentum?: number;
  recovery?: number;
  weather_emoji?: string;
  insight_text?: string;
  day_type?: string;
}

export interface VEMFeedbackPrompt {
  available: boolean;
  prompt_id?: string;
  question?: string;
  chips?: Array<{ id: string; label: string; emoji: string }>;
}

export interface HealthSnapshot {
  hrv_ms?: number | null;
  sleep_hours?: number | null;
  sleep_deep_pct?: number | null;
  resting_hr?: number | null;
  steps?: number | null;
  workout_min?: number | null;
  cycle_day?: number | null;
  recorded_date: string;
}

// ── API 函数 ──

export async function getDailySummary(): Promise<VEMDailySummary> {
  const res = await apiClient.get('/vem/daily-summary');
  return res.data;
}

export async function getFeedbackPrompt(): Promise<VEMFeedbackPrompt> {
  const res = await apiClient.get('/vem/feedback-prompt');
  return res.data;
}

export async function submitMicroFeedback(data: {
  prompt_id: string;
  chip_id: string;
  context?: string;
  source?: string;
}) {
  const res = await apiClient.post('/vem/micro-feedback', data);
  return res.data;
}

export async function ingestHealth(data: HealthSnapshot) {
  const res = await apiClient.post('/vem/health/ingest', data);
  return res.data;
}

export async function getHealthHistory(days = 30): Promise<HealthSnapshot[]> {
  const res = await apiClient.get('/vem/health/history', { params: { days } });
  return res.data;
}
