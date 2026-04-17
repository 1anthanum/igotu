import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/user/profile
router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = query(
      'SELECT id, email, username, timezone, created_at FROM users WHERE id = ?',
      [req.user!.sub]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/user/profile
router.put('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, timezone } = req.body;
    query(
      `UPDATE users SET
         username = COALESCE(?, username),
         timezone = COALESCE(?, timezone),
         updated_at = datetime('now')
       WHERE id = ?`,
      [username, timezone, req.user!.sub]
    );
    const result = query(
      'SELECT id, email, username, timezone FROM users WHERE id = ?',
      [req.user!.sub]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/user/preferences
router.get('/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = query(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [req.user!.sub]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    next(err);
  }
});

// PUT /api/user/preferences
router.put('/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { theme, language, show_streak, daily_reminder_enabled, daily_reminder_time } = req.body;
    query(
      `UPDATE user_preferences SET
         theme = COALESCE(?, theme),
         language = COALESCE(?, language),
         show_streak = COALESCE(?, show_streak),
         daily_reminder_enabled = COALESCE(?, daily_reminder_enabled),
         daily_reminder_time = COALESCE(?, daily_reminder_time),
         updated_at = datetime('now')
       WHERE user_id = ?`,
      [theme, language, show_streak, daily_reminder_enabled, daily_reminder_time, req.user!.sub]
    );
    const result = query(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [req.user!.sub]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/user/export — Export ALL user data (JSON)
router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const user = query('SELECT id, email, username, created_at FROM users WHERE id = ?', [userId]);
    const achievements = query('SELECT * FROM achievements WHERE user_id = ? ORDER BY recorded_date', [userId]);
    const templates = query('SELECT * FROM achievement_templates WHERE user_id = ?', [userId]);
    const moodCheckins = query('SELECT * FROM mood_checkins WHERE user_id = ? ORDER BY recorded_date', [userId]);
    const moodEntries = query('SELECT * FROM mood_entries WHERE user_id = ? ORDER BY recorded_at', [userId]);
    const prefs = query('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
    const phq9 = query('SELECT * FROM phq9_results WHERE user_id = ? ORDER BY created_at', [userId]);
    const exercises = query('SELECT * FROM exercise_logs WHERE user_id = ? ORDER BY completed_at', [userId]);
    const cognitive = query('SELECT * FROM cognitive_records WHERE user_id = ? ORDER BY created_at', [userId]);
    const chatSessions = query('SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY created_at', [userId]);

    // Gather chat messages for all sessions
    const sessionIds = chatSessions.rows.map((s: any) => s.id);
    const chatMessages: Record<string, any[]> = {};
    for (const sid of sessionIds) {
      const msgs = query('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC', [sid]);
      chatMessages[sid] = msgs.rows;
    }

    res.json({
      exportedAt: new Date().toISOString(),
      version: '1.0',
      user: user.rows[0],
      preferences: prefs.rows[0] || null,
      achievements: achievements.rows,
      templates: templates.rows,
      moodCheckins: moodCheckins.rows,
      moodEntries: moodEntries.rows,
      phq9Results: phq9.rows,
      exerciseLogs: exercises.rows,
      cognitiveRecords: cognitive.rows,
      chatSessions: chatSessions.rows,
      chatMessages,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/user/import — Import user data from JSON export
router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const data = req.body;

    if (!data || !data.version) {
      return res.status(400).json({ error: '无效的导入文件格式' });
    }

    const stats = { achievements: 0, templates: 0, moodCheckins: 0, moodEntries: 0, phq9: 0, exercises: 0, cognitive: 0, chatSessions: 0, chatMessages: 0 };

    // Import templates
    if (Array.isArray(data.templates)) {
      for (const t of data.templates) {
        try {
          query(
            `INSERT OR IGNORE INTO achievement_templates (id, user_id, title, emoji, category, sort_order, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [t.id, userId, t.title, t.emoji || '⭐', t.category || 'custom', t.sort_order || 0, t.is_active ?? 1]
          );
          stats.templates++;
        } catch { /* skip duplicates */ }
      }
    }

    // Import achievements
    if (Array.isArray(data.achievements)) {
      for (const a of data.achievements) {
        try {
          query(
            `INSERT OR IGNORE INTO achievements (id, user_id, template_id, title, emoji, category, note, recorded_date, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [a.id, userId, a.template_id, a.title, a.emoji, a.category, a.note || '', a.recorded_date, a.created_at]
          );
          stats.achievements++;
        } catch { /* skip duplicates */ }
      }
    }

    // Import mood checkins (legacy table from migration 001)
    if (Array.isArray(data.moodCheckins)) {
      for (const m of data.moodCheckins) {
        try {
          query(
            `INSERT OR IGNORE INTO mood_checkins (id, user_id, mood_score, energy_level, note, recorded_date)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [m.id, userId, m.mood_score, m.energy_level, m.note || '', m.recorded_date]
          );
          stats.moodCheckins++;
        } catch { /* skip duplicates */ }
      }
    }

    // Import mood entries (enhanced table from migration 002)
    if (Array.isArray(data.moodEntries)) {
      for (const m of data.moodEntries) {
        try {
          query(
            `INSERT OR IGNORE INTO mood_entries (id, user_id, mood_score, mood_emoji, mood_label, note, recorded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [m.id, userId, m.mood_score, m.mood_emoji, m.mood_label, m.note || '', m.recorded_at]
          );
          stats.moodEntries++;
        } catch { /* skip duplicates */ }
      }
    }

    // Import PHQ-9 results
    if (Array.isArray(data.phq9Results)) {
      for (const p of data.phq9Results) {
        try {
          query(
            `INSERT OR IGNORE INTO phq9_results (id, user_id, score, severity, answers, functional_impact, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [p.id, userId, p.score, p.severity, p.answers, p.functional_impact, p.created_at]
          );
          stats.phq9++;
        } catch { /* skip duplicates */ }
      }
    }

    // Import exercise logs
    if (Array.isArray(data.exerciseLogs)) {
      for (const e of data.exerciseLogs) {
        try {
          query(
            `INSERT OR IGNORE INTO exercise_logs (id, user_id, type, technique, data, completed_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [e.id, userId, e.type, e.technique, e.data || '{}', e.completed_at]
          );
          stats.exercises++;
        } catch { /* skip duplicates */ }
      }
    }

    // Import cognitive records
    if (Array.isArray(data.cognitiveRecords)) {
      for (const c of data.cognitiveRecords) {
        try {
          query(
            `INSERT OR IGNORE INTO cognitive_records (id, user_id, thought, emotions, distortions, intensity_before, supporting_evidence, counter_evidence, balanced_thought, intensity_after, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [c.id, userId, c.thought, c.emotions, c.distortions, c.intensity_before, c.supporting_evidence, c.counter_evidence, c.balanced_thought, c.intensity_after, c.created_at]
          );
          stats.cognitive++;
        } catch { /* skip duplicates */ }
      }
    }

    // Import chat sessions + messages
    if (Array.isArray(data.chatSessions)) {
      for (const s of data.chatSessions) {
        try {
          query(
            `INSERT OR IGNORE INTO chat_sessions (id, user_id, title, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
            [s.id, userId, s.title, s.created_at, s.updated_at]
          );
          stats.chatSessions++;

          const msgs = data.chatMessages?.[s.id];
          if (Array.isArray(msgs)) {
            for (const m of msgs) {
              try {
                query(
                  `INSERT OR IGNORE INTO chat_messages (id, session_id, user_id, role, content, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)`,
                  [m.id, s.id, userId, m.role, m.content, m.created_at]
                );
                stats.chatMessages++;
              } catch { /* skip */ }
            }
          }
        } catch { /* skip duplicates */ }
      }
    }

    res.json({
      success: true,
      message: '数据导入完成',
      imported: stats,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
