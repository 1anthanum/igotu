export interface EncouragementMessage {
  message: string;
  type: string;
  icon: string;
}

export interface WeeklySummary {
  weekStart: string;
  totalAchievements: number;
  categoryCounts: Record<string, number>;
  dailyCounts: { date: string; count: number }[];
  message: string;
}

export interface MonthlySummary {
  monthStart: string;
  totalAchievements: number;
  categoryCounts: Record<string, number>;
  weeklyBreakdown: { week: string; count: number }[];
  avgPerDay: number;
}

export interface PatternInsight {
  type: string;
  message: string;
  icon: string;
  confidence: number;
}
