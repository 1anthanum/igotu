import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { formatDate, daysAgo } from '../utils/dateUtils';

export interface LogAchievementInput {
  userId: string;
  templateId?: string;
  title: string;
  emoji?: string;
  category?: string;
  note?: string;
  recordedDate?: string; // YYYY-MM-DD, defaults to today
}

export interface CalendarData {
  date: string;
  count: number;
}

export class AchievementService {
  /**
   * Log a new achievement — the core action, must be fast
   */
  log(input: LogAchievementInput) {
    const id = uuidv4();
    query(
      `INSERT INTO achievements (id, user_id, template_id, title, emoji, category, note, recorded_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.userId,
        input.templateId || null,
        input.title,
        input.emoji || null,
        input.category || 'custom',
        input.note || null,
        input.recordedDate || formatDate(new Date()),
      ]
    );

    const result = query(
      'SELECT id, title, emoji, category, note, recorded_date, created_at FROM achievements WHERE id = ?',
      [id]
    );
    return result.rows[0];
  }

  /**
   * Get achievements list with pagination and filters
   */
  list(userId: string, options: {
    page?: number;
    limit?: number;
    category?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = ?';
    const params: any[] = [userId];

    if (options.category) {
      whereClause += ' AND category = ?';
      params.push(options.category);
    }
    if (options.startDate) {
      whereClause += ' AND recorded_date >= ?';
      params.push(options.startDate);
    }
    if (options.endDate) {
      whereClause += ' AND recorded_date <= ?';
      params.push(options.endDate);
    }

    const countResult = query(
      `SELECT COUNT(*) as count FROM achievements ${whereClause}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const result = query(
      `SELECT id, title, emoji, category, note, recorded_date, created_at
       FROM achievements ${whereClause}
       ORDER BY recorded_date DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      dataParams
    );

    const total = countResult.rows[0].count;

    return {
      items: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get calendar heatmap data — count per day for the last N days
   */
  getCalendarData(userId: string, days: number = 365): CalendarData[] {
    const startDate = formatDate(daysAgo(days));
    const result = query(
      `SELECT recorded_date as date, COUNT(*) as count
       FROM achievements
       WHERE user_id = ? AND recorded_date >= ?
       GROUP BY recorded_date
       ORDER BY recorded_date`,
      [userId, startDate]
    );
    return result.rows;
  }

  /**
   * Get today's achievements count
   */
  getTodayCount(userId: string): number {
    const today = formatDate(new Date());
    const result = query(
      'SELECT COUNT(*) as count FROM achievements WHERE user_id = ? AND recorded_date = ?',
      [userId, today]
    );
    return result.rows[0].count;
  }

  /**
   * Get today's achievements
   */
  getToday(userId: string) {
    const today = formatDate(new Date());
    const result = query(
      `SELECT id, title, emoji, category, note, created_at
       FROM achievements
       WHERE user_id = ? AND recorded_date = ?
       ORDER BY created_at DESC`,
      [userId, today]
    );
    return result.rows;
  }

  /**
   * Delete an achievement
   */
  delete(userId: string, achievementId: string) {
    const result = query(
      'DELETE FROM achievements WHERE id = ? AND user_id = ?',
      [achievementId, userId]
    );
    return result.rowCount > 0;
  }
}

export const achievementService = new AchievementService();
