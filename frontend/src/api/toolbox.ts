import apiClient from './client';

// PHQ-9
export interface PHQ9Result {
  id: string;
  score: number;
  severity: string;
  answers: Record<string, number>;
  functional_impact: number | null;
  created_at: string;
}

export async function submitPHQ9(answers: Record<string, number>, functional_impact?: number) {
  const res = await apiClient.post('/phq9', { answers, functional_impact });
  return res.data as PHQ9Result;
}

export async function getPHQ9History(limit = 20) {
  const res = await apiClient.get('/phq9', { params: { limit } });
  return res.data as PHQ9Result[];
}

export async function getLatestPHQ9() {
  const res = await apiClient.get('/phq9/latest');
  return res.data as PHQ9Result | null;
}

// Exercises
export interface ExerciseLog {
  id: string;
  type: 'breathing' | 'grounding';
  technique: string;
  data: Record<string, any>;
  completed_at: string;
}

export async function logExercise(data: { type: string; technique?: string; data?: Record<string, any> }) {
  const res = await apiClient.post('/exercises', data);
  return res.data as ExerciseLog;
}

export async function getExerciseHistory(type?: string, limit = 20) {
  const res = await apiClient.get('/exercises', { params: { type, limit } });
  return res.data as ExerciseLog[];
}

export async function getExerciseStats() {
  const res = await apiClient.get('/exercises/stats');
  return res.data as { type: string; count: string; last_completed: string }[];
}

// Cognitive Restructuring
export interface CognitiveRecord {
  id: string;
  thought: string;
  emotions: string[];
  distortions: string[];
  intensity_before: number;
  supporting_evidence: string;
  counter_evidence: string;
  balanced_thought: string;
  intensity_after: number;
  created_at: string;
}

export async function saveCognitiveRecord(data: Partial<CognitiveRecord>) {
  const res = await apiClient.post('/cognitive', data);
  return res.data as CognitiveRecord;
}

export async function getCognitiveHistory(limit = 20) {
  const res = await apiClient.get('/cognitive', { params: { limit } });
  return res.data as CognitiveRecord[];
}
