export interface AchievementTemplate {
  id: string;
  title: string;
  emoji: string | null;
  category: string;
  sort_order: number;
  is_active: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  emoji: string | null;
  category: string | null;
  note: string | null;
  recorded_date: string;
  created_at: string;
}

export interface CalendarDay {
  date: string;
  count: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
