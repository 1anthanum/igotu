import { query } from '../config/database';
import { formatDate, daysAgo } from '../utils/dateUtils';
import { ENCOURAGEMENT } from '../utils/constants';

export interface EncouragementMessage {
  message: string;
  type: string;
  icon: string;
}

export class EncouragementService {
  /**
   * Get current encouragement messages for a user
   * CRITICAL: NEVER guilt-inducing, ALWAYS warm and positive
   */
  getCurrent(userId: string): EncouragementMessage[] {
    const messages: EncouragementMessage[] = [];
    const today = formatDate(new Date());

    // Check today's count
    const todayResult = query(
      'SELECT COUNT(*) as count FROM achievements WHERE user_id = ? AND recorded_date = ?',
      [userId, today]
    );
    const todayCount = todayResult.rows[0].count;

    // Daily message
    messages.push({
      message: ENCOURAGEMENT.daily_summary(todayCount),
      type: 'daily',
      icon: todayCount > 0 ? '🌟' : '💙',
    });

    // Check if user is returning after a break (no logs in 3+ days)
    const lastLogResult = query(
      `SELECT MAX(recorded_date) as last_date FROM achievements WHERE user_id = ?`,
      [userId]
    );

    if (lastLogResult.rows[0].last_date) {
      const lastDate = new Date(lastLogResult.rows[0].last_date);
      const now = new Date();
      const daysSinceLast = Math.floor(
        (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLast >= 3 && todayCount > 0) {
        // Returning after a break — extra warmth
        const msgs = ENCOURAGEMENT.returning_after_break;
        messages.push({
          message: msgs[Math.floor(Math.random() * msgs.length)],
          type: 'returning',
          icon: '💙',
        });
      }
    } else if (todayCount > 0) {
      // First ever achievement!
      const msgs = ENCOURAGEMENT.first_achievement;
      messages.push({
        message: msgs[Math.floor(Math.random() * msgs.length)],
        type: 'first',
        icon: '🌱',
      });
    }

    // Check for recent category achievement milestones
    if (todayCount > 0) {
      const todayCategories = query(
        `SELECT DISTINCT category FROM achievements
         WHERE user_id = ? AND recorded_date = ?`,
        [userId, today]
      );

      for (const row of todayCategories.rows) {
        const cat = row.category as keyof typeof ENCOURAGEMENT.category_milestone;
        if (ENCOURAGEMENT.category_milestone[cat]) {
          messages.push({
            message: ENCOURAGEMENT.category_milestone[cat],
            type: 'category',
            icon: '✨',
          });
          break; // Only one category message per load
        }
      }
    }

    return messages;
  }
}

export const encouragementService = new EncouragementService();
