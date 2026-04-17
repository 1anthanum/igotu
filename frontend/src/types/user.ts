export interface User {
  id: string;
  email: string;
  username: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface UserPreferences {
  theme: string;
  language: string;
  show_streak: boolean;
  daily_reminder_enabled: boolean;
  daily_reminder_time: string;
}
