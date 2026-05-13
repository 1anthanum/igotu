/**
 * VEM 集成测试
 * 覆盖：微反馈提交、健康数据摄入、VEM 摘要代理、事件桥接逻辑
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { query } from '../config/database';

let accessToken = '';

// ── Setup: register + login ──
beforeAll(async () => {
  // 尝试注册（如果已存在则登录）
  const regRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'vem-test@test.com', username: 'vemtest', password: '123456' });

  if (regRes.status === 201) {
    accessToken = regRes.body.accessToken;
  } else {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'vem-test@test.com', password: '123456' });
    accessToken = loginRes.body.accessToken;
  }
});

// ── Micro Feedback ──
describe('VEM Micro Feedback API', () => {
  it('POST /api/vem/micro-feedback -- 提交微反馈', async () => {
    const res = await request(app)
      .post('/api/vem/micro-feedback')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        prompt_id: 'mf_2026_05_13_evening_001',
        chip_id: 'yes',
        context: '下午确实效率更高',
        source: 'igotu_home',
      });

    expect(res.status).toBe(201);
    expect(res.body.prompt_id).toBe('mf_2026_05_13_evening_001');
    expect(res.body.chip_id).toBe('yes');
  });

  it('POST /api/vem/micro-feedback -- 缺少 prompt_id 返回 400', async () => {
    const res = await request(app)
      .post('/api/vem/micro-feedback')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ chip_id: 'yes' });

    expect(res.status).toBe(400);
  });

  it('POST /api/vem/micro-feedback -- 缺少 chip_id 返回 400', async () => {
    const res = await request(app)
      .post('/api/vem/micro-feedback')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ prompt_id: 'test' });

    expect(res.status).toBe(400);
  });

  it('POST /api/vem/micro-feedback -- context 截断到 80 字', async () => {
    const longContext = 'a'.repeat(200);
    const res = await request(app)
      .post('/api/vem/micro-feedback')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        prompt_id: 'mf_truncate_test',
        chip_id: 'no',
        context: longContext,
      });

    expect(res.status).toBe(201);

    // 验证数据库中存储的 context 被截断
    const dbResult = query(
      'SELECT context FROM micro_feedback WHERE prompt_id = ?',
      ['mf_truncate_test']
    );
    expect(dbResult.rows[0].context.length).toBe(80);
  });

  it('POST /api/vem/micro-feedback -- 无效 source 回退为 igotu_home', async () => {
    const res = await request(app)
      .post('/api/vem/micro-feedback')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        prompt_id: 'mf_source_test',
        chip_id: 'partial',
        source: 'invalid_source',
      });

    expect(res.status).toBe(201);

    const dbResult = query(
      'SELECT source FROM micro_feedback WHERE prompt_id = ?',
      ['mf_source_test']
    );
    expect(dbResult.rows[0].source).toBe('igotu_home');
  });

  it('POST /api/vem/micro-feedback -- 未认证返回 401', async () => {
    const res = await request(app)
      .post('/api/vem/micro-feedback')
      .send({ prompt_id: 'test', chip_id: 'yes' });

    expect(res.status).toBe(401);
  });
});

// ── Health Ingest ──
describe('VEM Health Ingest API', () => {
  it('POST /api/vem/health/ingest -- 提交健康快照', async () => {
    const res = await request(app)
      .post('/api/vem/health/ingest')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        hrv_ms: 58.5,
        sleep_hours: 7.2,
        sleep_deep_pct: 0.22,
        resting_hr: 62,
        steps: 8500,
        workout_min: 30,
        cycle_day: null,
        recorded_date: '2026-05-12',
      });

    expect(res.status).toBe(201);
    expect(res.body.recorded_date).toBe('2026-05-12');
    expect(res.body.status).toBe('ingested');
  });

  it('POST /api/vem/health/ingest -- 同一天可覆盖更新', async () => {
    const res = await request(app)
      .post('/api/vem/health/ingest')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        hrv_ms: 65.0,
        sleep_hours: 8.0,
        recorded_date: '2026-05-12',
      });

    expect(res.status).toBe(201);

    // 验证只有一条记录
    const dbResult = query(
      "SELECT * FROM health_snapshots WHERE recorded_date = '2026-05-12'",
      []
    );
    expect(dbResult.rows.length).toBe(1);
    expect(dbResult.rows[0].hrv_ms).toBe(65.0);
    expect(dbResult.rows[0].sleep_hours).toBe(8.0);
  });

  it('POST /api/vem/health/ingest -- 缺少 recorded_date 返回 400', async () => {
    const res = await request(app)
      .post('/api/vem/health/ingest')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ hrv_ms: 58.5, sleep_hours: 7.2 });

    expect(res.status).toBe(400);
  });

  it('POST /api/vem/health/ingest -- 无效日期格式返回 400', async () => {
    const res = await request(app)
      .post('/api/vem/health/ingest')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ recorded_date: '2026/05/12' });

    expect(res.status).toBe(400);
  });

  it('POST /api/vem/health/ingest -- 部分字段为 null 也能成功', async () => {
    const res = await request(app)
      .post('/api/vem/health/ingest')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        hrv_ms: null,
        sleep_hours: 6.5,
        recorded_date: '2026-05-11',
      });

    expect(res.status).toBe(201);
  });

  it('GET /api/vem/health/history -- 获取健康历史', async () => {
    const res = await request(app)
      .get('/api/vem/health/history?days=30')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Daily Summary (VEM not configured) ──
describe('VEM Daily Summary API', () => {
  it('GET /api/vem/daily-summary -- VEM 未配置时返回 available: false', async () => {
    const res = await request(app)
      .get('/api/vem/daily-summary')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });

  it('GET /api/vem/feedback-prompt -- VEM 未配置时返回 available: false', async () => {
    const res = await request(app)
      .get('/api/vem/feedback-prompt')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });
});

// ── VEM Outbox ──
describe('VEM Outbox (event bridging)', () => {
  it('mood 写入后 VEM_BASE_URL 未配置不产生 outbox 记录', async () => {
    // 先记录一条情绪
    await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ mood_score: 4, mood_emoji: '😊', mood_label: '不错' });

    // VEM_BASE_URL 为空，不应有 outbox 记录
    const outbox = query('SELECT COUNT(*) as cnt FROM vem_outbox', []);
    expect(outbox.rows[0].cnt).toBe(0);
  });
});

// ── VEMBridge 单元测试 ──
describe('VEMBridge service', () => {
  it('emitVEMEvent 在 VEM_BASE_URL 为空时静默跳过', async () => {
    // 动态 import 以便测试
    const { emitVEMEvent } = await import('../services/VEMBridge');

    // 不应抛出异常
    expect(() => {
      emitVEMEvent('test.event', 'user-123', { foo: 'bar' });
    }).not.toThrow();
  });

  it('各便捷 emit 函数在 VEM 未配置时静默跳过', async () => {
    const bridge = await import('../services/VEMBridge');

    expect(() => {
      bridge.emitMoodLogged('user-123', {
        mood_score: 3, mood_emoji: '😐', mood_label: '还行', has_note: false,
      });
      bridge.emitCBTCompleted('user-123', {
        intensity_before: 8, intensity_after: 4,
        distortions: ['灾难化'], emotions: ['焦虑'],
      });
      bridge.emitExerciseCompleted('user-123', {
        type: 'breathing', technique: '4-7-8',
      });
      bridge.emitPHQ9Scored('user-123', {
        score: 12, functional_impact: 2,
      });
      bridge.emitChatUserMsg('user-123', {
        length: 50, sentiment_hint: 0,
      });
      bridge.emitAchievementLogged('user-123', {
        category: 'self-care', emoji: '🧘', from_template: true,
      });
      bridge.emitHealthSnapshot('user-123', {
        hrv_ms: 55, sleep_hours: 7, sleep_deep_pct: 0.2,
        resting_hr: 60, steps: 8000, workout_min: 30,
        cycle_day: null, recorded_date: '2026-05-13',
      });
    }).not.toThrow();
  });
});
