/**
 * VEM 集成路由
 *
 * /api/vem/micro-feedback — 接收来自 VEM/Slack/iGotU 首页的微反馈
 * /api/vem/health/ingest  — 接收 Apple Health 数据（via iOS Shortcuts）
 * /api/vem/daily-summary  — 代理查询 VEM 的每日能量摘要
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { env } from '../config/environment';
import { emitHealthSnapshot } from '../services/VEMBridge';

const router = Router();

// ── POST /api/vem/micro-feedback ──
// 接收 3-chip 微反馈，存本地 + 转发给 VEM
router.post('/micro-feedback', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { prompt_id, chip_id, context, source } = req.body;

    if (!prompt_id || typeof prompt_id !== 'string') {
      return res.status(400).json({ error: 'prompt_id is required' });
    }
    if (!chip_id || typeof chip_id !== 'string') {
      return res.status(400).json({ error: 'chip_id is required' });
    }

    const validSources = ['slack', 'igotu_home', 'vem_dash'];
    const feedbackSource = validSources.includes(source) ? source : 'igotu_home';

    const id = uuidv4();
    query(
      `INSERT INTO micro_feedback (id, user_id, prompt_id, chip_id, context, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, prompt_id, chip_id, context?.slice(0, 80) || null, feedbackSource]
    );

    // 同时转发给 VEM（如果配置了）
    if (env.VEM_BASE_URL) {
      const body = JSON.stringify({
        prompt_id,
        chip_id,
        context: context?.slice(0, 80) || null,
        source: feedbackSource,
        user_id: userId,
        ts: new Date().toISOString(),
      });

      setImmediate(async () => {
        try {
          await fetch(`${env.VEM_BASE_URL}/micro-feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-VEM-Source': 'igotu' },
            body,
          });
        } catch {}
      });
    }

    res.status(201).json({ id, prompt_id, chip_id });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/vem/health/ingest ──
// 接收来自 iOS Shortcuts 的 Apple Health 每日快照
router.post('/health/ingest', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const {
      hrv_ms,
      sleep_hours,
      sleep_deep_pct,
      resting_hr,
      steps,
      workout_min,
      cycle_day,
      recorded_date,
    } = req.body;

    if (!recorded_date || !/^\d{4}-\d{2}-\d{2}$/.test(recorded_date)) {
      return res.status(400).json({ error: 'recorded_date (YYYY-MM-DD) is required' });
    }

    const id = uuidv4();

    // UPSERT: 同一天的数据可以覆盖更新
    query(
      `INSERT INTO health_snapshots
        (id, user_id, hrv_ms, sleep_hours, sleep_deep_pct, resting_hr, steps, workout_min, cycle_day, recorded_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, recorded_date) DO UPDATE SET
        hrv_ms = excluded.hrv_ms,
        sleep_hours = excluded.sleep_hours,
        sleep_deep_pct = excluded.sleep_deep_pct,
        resting_hr = excluded.resting_hr,
        steps = excluded.steps,
        workout_min = excluded.workout_min,
        cycle_day = excluded.cycle_day,
        created_at = datetime('now')`,
      [id, userId, hrv_ms ?? null, sleep_hours ?? null, sleep_deep_pct ?? null,
       resting_hr ?? null, steps ?? null, workout_min ?? null, cycle_day ?? null, recorded_date]
    );

    // 转发到 VEM
    emitHealthSnapshot(userId, {
      hrv_ms: hrv_ms ?? null,
      sleep_hours: sleep_hours ?? null,
      sleep_deep_pct: sleep_deep_pct ?? null,
      resting_hr: resting_hr ?? null,
      steps: steps ?? null,
      workout_min: workout_min ?? null,
      cycle_day: cycle_day ?? null,
      recorded_date,
    });

    res.status(201).json({ recorded_date, status: 'ingested' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/vem/health/history ──
// 查询用户的健康快照历史
router.get('/health/history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const result = query(
      `SELECT * FROM health_snapshots
       WHERE user_id = ? AND recorded_date >= ?
       ORDER BY recorded_date DESC`,
      [userId, cutoffStr]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/vem/daily-summary ──
// 代理请求 VEM Engine 的每日能量摘要
router.get('/daily-summary', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!env.VEM_BASE_URL) {
      return res.json({
        available: false,
        message: 'VEM not configured',
      });
    }

    const userId = req.user!.sub;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    try {
      const vemRes = await fetch(
        `${env.VEM_BASE_URL}/api/daily-summary?user_id=${encodeURIComponent(userId)}`,
        {
          headers: { 'X-VEM-Source': 'igotu' },
          signal: controller.signal,
        }
      );

      if (!vemRes.ok) {
        return res.json({ available: false, message: 'VEM unavailable' });
      }

      const data = await vemRes.json() as Record<string, unknown>;
      res.json({ available: true, ...data });
    } catch {
      res.json({ available: false, message: 'VEM unreachable' });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    next(err);
  }
});

// ── GET /api/vem/feedback-prompt ──
// 代理请求 VEM 的当日微反馈问题
router.get('/feedback-prompt', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!env.VEM_BASE_URL) {
      return res.json({ available: false });
    }

    const userId = req.user!.sub;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    try {
      const vemRes = await fetch(
        `${env.VEM_BASE_URL}/api/feedback-prompt?user_id=${encodeURIComponent(userId)}`,
        {
          headers: { 'X-VEM-Source': 'igotu' },
          signal: controller.signal,
        }
      );

      if (!vemRes.ok) {
        return res.json({ available: false });
      }

      const data = await vemRes.json() as Record<string, unknown>;
      res.json({ available: true, ...data });
    } catch {
      res.json({ available: false });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    next(err);
  }
});

export default router;
