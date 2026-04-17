import { query } from '../config/database';
import { formatDate, startOfWeek, startOfMonth, daysAgo } from '../utils/dateUtils';
import { ENCOURAGEMENT } from '../utils/constants';

export interface WeeklySummary {
  weekStart: string;
  totalAchievements: number;
  categoryCounts: Record<string, number>;
  dailyCounts: { date: string; count: number }[];
  message: string;
}

export interface PatternInsight {
  type: string;
  message: string;
  icon: string;
  confidence: number;
}

export class AnalyticsService {
  /**
   * Get weekly summary — always positive framing
   */
  getWeeklySummary(userId: string): WeeklySummary {
    const weekStart = formatDate(startOfWeek());

    // Total this week
    const totalResult = query(
      `SELECT COUNT(*) as total FROM achievements
       WHERE user_id = ? AND recorded_date >= ?`,
      [userId, weekStart]
    );
    const total = totalResult.rows[0].total;

    // By category
    const categoryResult = query(
      `SELECT category, COUNT(*) as count FROM achievements
       WHERE user_id = ? AND recorded_date >= ?
       GROUP BY category ORDER BY count DESC`,
      [userId, weekStart]
    );
    const categoryCounts: Record<string, number> = {};
    for (const row of categoryResult.rows) {
      categoryCounts[row.category] = row.count;
    }

    // Daily breakdown this week
    const dailyResult = query(
      `SELECT recorded_date as date, COUNT(*) as count
       FROM achievements
       WHERE user_id = ? AND recorded_date >= ?
       GROUP BY recorded_date ORDER BY recorded_date`,
      [userId, weekStart]
    );

    return {
      weekStart,
      totalAchievements: total,
      categoryCounts,
      dailyCounts: dailyResult.rows,
      message: ENCOURAGEMENT.weekly_summary(total),
    };
  }

  /**
   * Get monthly summary
   */
  getMonthlySummary(userId: string) {
    const monthStart = formatDate(startOfMonth());

    const totalResult = query(
      `SELECT COUNT(*) as total FROM achievements
       WHERE user_id = ? AND recorded_date >= ?`,
      [userId, monthStart]
    );

    const categoryResult = query(
      `SELECT category, COUNT(*) as count FROM achievements
       WHERE user_id = ? AND recorded_date >= ?
       GROUP BY category ORDER BY count DESC`,
      [userId, monthStart]
    );

    // Weekly breakdown using strftime for SQLite
    const weeklyResult = query(
      `SELECT date(recorded_date, 'weekday 0', '-6 days') as week, COUNT(*) as count
       FROM achievements
       WHERE user_id = ? AND recorded_date >= ?
       GROUP BY week
       ORDER BY week`,
      [userId, monthStart]
    );

    const total = totalResult.rows[0].total;

    return {
      monthStart,
      totalAchievements: total,
      categoryCounts: Object.fromEntries(categoryResult.rows.map((r: any) => [r.category, r.count])),
      weeklyBreakdown: weeklyResult.rows,
      avgPerDay: total > 0 ? +(total / new Date().getDate()).toFixed(1) : 0,
    };
  }

  /**
   * Detect patterns — ALWAYS framed positively
   */
  detectPatterns(userId: string): PatternInsight[] {
    const insights: PatternInsight[] = [];
    const ninetyDaysAgo = formatDate(daysAgo(90));

    // 1. Most common category
    const topCategory = query(
      `SELECT category, COUNT(*) as count FROM achievements
       WHERE user_id = ? AND recorded_date >= ?
       GROUP BY category ORDER BY count DESC LIMIT 1`,
      [userId, ninetyDaysAgo]
    );

    if (topCategory.rows.length > 0) {
      const cat = topCategory.rows[0];
      const categoryNames: Record<string, string> = {
        'self-care': '自我照顾', 'movement': '运动/出门', 'social': '社交',
        'nutrition': '饮食', 'rest': '休息', 'hygiene': '卫生',
        'productivity': '做事', 'custom': '自定义',
      };
      insights.push({
        type: 'top_category',
        message: `你最常做的是「${categoryNames[cat.category] || cat.category}」类的事，累计 ${cat.count} 次！`,
        icon: '⭐',
        confidence: 0.9,
      });
    }

    // 2. Most active day of week (SQLite: strftime('%w', date) returns 0=Sunday..6=Saturday)
    const bestDay = query(
      `SELECT CAST(strftime('%w', recorded_date) AS INTEGER) as dow, COUNT(*) as count
       FROM achievements
       WHERE user_id = ? AND recorded_date >= ?
       GROUP BY dow ORDER BY count DESC LIMIT 1`,
      [userId, ninetyDaysAgo]
    );

    if (bestDay.rows.length > 0) {
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const d = bestDay.rows[0];
      insights.push({
        type: 'best_day',
        message: `${dayNames[d.dow]}是你最活跃的一天，平均比其他天多做更多事`,
        icon: '📅',
        confidence: 0.75,
      });
    }

    // 3. Current streak (consecutive days with at least 1 achievement)
    // SQLite version using julianday for date arithmetic
    const streakResult = query(
      `WITH date_series AS (
         SELECT DISTINCT recorded_date FROM achievements
         WHERE user_id = ?
         ORDER BY recorded_date DESC
       ),
       numbered AS (
         SELECT recorded_date,
                ROW_NUMBER() OVER (ORDER BY recorded_date DESC) as rn
         FROM date_series
       ),
       gaps AS (
         SELECT recorded_date,
                julianday(recorded_date) + rn as grp
         FROM numbered
       )
       SELECT COUNT(*) as streak_length
       FROM gaps
       WHERE grp = (SELECT grp FROM gaps LIMIT 1)`,
      [userId]
    );

    if (streakResult.rows.length > 0 && streakResult.rows[0].streak_length > 1) {
      const streak = streakResult.rows[0].streak_length;
      insights.push({
        type: 'current_streak',
        message: `你已经连续 ${streak} 天在记录了，太棒了！`,
        icon: '🔥',
        confidence: 1.0,
      });
    }

    // 4. Growth trend — compare last 2 weeks
    const twoWeeksAgo = formatDate(daysAgo(14));
    const oneWeekAgo = formatDate(daysAgo(7));

    const lastWeek = query(
      `SELECT COUNT(*) as count FROM achievements
       WHERE user_id = ? AND recorded_date >= ?`,
      [userId, oneWeekAgo]
    );
    const prevWeek = query(
      `SELECT COUNT(*) as count FROM achievements
       WHERE user_id = ? AND recorded_date >= ? AND recorded_date < ?`,
      [userId, twoWeeksAgo, oneWeekAgo]
    );

    const lastCount = lastWeek.rows[0].count;
    const prevCount = prevWeek.rows[0].count;

    if (lastCount > prevCount && prevCount > 0) {
      insights.push({
        type: 'growth',
        message: `这周比上周多做了 ${lastCount - prevCount} 件事，你在进步！`,
        icon: '📈',
        confidence: 0.8,
      });
    }

    return insights;
  }
}

export const analyticsService = new AnalyticsService();
