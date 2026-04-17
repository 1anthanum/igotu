/**
 * IGOTU API 集成测试
 * 覆盖所有主要端点：注册/登录 → 成就 → 模板 → 情绪 → PHQ-9 → 练习 → 认知重构 → 分析
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';

let accessToken = '';
let userId = '';

// ── Auth ────────────────────────────────────────
describe('Auth API', () => {
  it('POST /api/auth/register — 创建新用户', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', username: '测试', password: '123456' });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    accessToken = res.body.accessToken;
    userId = res.body.user.id;
  });

  it('POST /api/auth/register — 重复注册返回 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', username: '测试', password: '123456' });

    expect(res.status).toBe(409);
  });

  it('POST /api/auth/login — 登录成功', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken; // 刷新 token
  });

  it('POST /api/auth/login — 密码错误返回 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });
});

// ── Achievements ────────────────────────────────
describe('Achievements API', () => {
  let achievementId = '';

  it('POST /api/achievements — 记录成就', async () => {
    const res = await request(app)
      .post('/api/achievements')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: '喝了水', emoji: '💧', category: 'nutrition' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('喝了水');
    achievementId = res.body.id;
  });

  it('GET /api/achievements/today — 获取今日成就', async () => {
    const res = await request(app)
      .get('/api/achievements/today')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/achievements — 分页列表', async () => {
    const res = await request(app)
      .get('/api/achievements?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('DELETE /api/achievements/:id — 删除成就', async () => {
    const res = await request(app)
      .delete(`/api/achievements/${achievementId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── Templates ────────────────────────────────────
describe('Templates API', () => {
  it('GET /api/templates — 获取用户模板（注册时自动创建）', async () => {
    const res = await request(app)
      .get('/api/templates')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(8);
  });

  it('POST /api/templates — 创建自定义模板', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: '冥想', emoji: '🧘', category: 'self-care' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('冥想');
  });
});

// ── Mood ────────────────────────────────────────
describe('Mood API', () => {
  it('POST /api/mood — 记录情绪', async () => {
    const res = await request(app)
      .post('/api/mood')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ mood_score: 3, mood_emoji: '😐', mood_label: '还行', note: '测试记录' });

    expect(res.status).toBe(201);
    expect(res.body.mood_score).toBe(3);
  });

  it('GET /api/mood/today — 今日情绪', async () => {
    const res = await request(app)
      .get('/api/mood/today')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/mood/trend — 情绪趋势', async () => {
    const res = await request(app)
      .get('/api/mood/trend?days=7')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── PHQ-9 ────────────────────────────────────────
describe('PHQ-9 API', () => {
  it('POST /api/phq9 — 提交评估', async () => {
    const answers = { q1: 1, q2: 2, q3: 1, q4: 0, q5: 1, q6: 2, q7: 1, q8: 0, q9: 0 };
    const res = await request(app)
      .post('/api/phq9')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ answers, functional_impact: 1 });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(8);
    expect(res.body.severity).toBe('轻度抑郁');
  });

  it('GET /api/phq9/latest — 最新结果', async () => {
    const res = await request(app)
      .get('/api/phq9/latest')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(8);
  });
});

// ── Exercises ────────────────────────────────────
describe('Exercises API', () => {
  it('POST /api/exercises — 记录呼吸练习', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'breathing', technique: '4-7-8 放松呼吸', data: { cycles: 4 } });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('breathing');
  });

  it('POST /api/exercises — 记录扎根练习', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'grounding', technique: '5-4-3-2-1' });

    expect(res.status).toBe(201);
  });

  it('GET /api/exercises/stats — 练习统计', async () => {
    const res = await request(app)
      .get('/api/exercises/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Cognitive Restructuring ────────────────────
describe('Cognitive API', () => {
  it('POST /api/cognitive — 保存认知重构', async () => {
    const res = await request(app)
      .post('/api/cognitive')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        thought: '我什么都做不好',
        emotions: [{ name: '无助', intensity: 7 }],
        distortions: ['全或无思维'],
        intensity_before: 8,
        supporting_evidence: '报告被批评了',
        counter_evidence: '上个月项目顺利完成',
        balanced_thought: '一次失误不代表全部',
        intensity_after: 4,
      });

    expect(res.status).toBe(201);
    expect(res.body.thought).toBe('我什么都做不好');
  });

  it('GET /api/cognitive — 获取历史记录', async () => {
    const res = await request(app)
      .get('/api/cognitive')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Analytics ────────────────────────────────────
describe('Analytics API', () => {
  it('GET /api/analytics/weekly — 周报', async () => {
    // 先记录一个成就以便有数据
    await request(app)
      .post('/api/achievements')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: '测试成就', category: 'custom' });

    const res = await request(app)
      .get('/api/analytics/weekly')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalAchievements).toBeGreaterThanOrEqual(1);
    expect(res.body.message).toBeDefined();
  });

  it('GET /api/analytics/patterns — 模式洞察', async () => {
    const res = await request(app)
      .get('/api/analytics/patterns')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── Encouragement ────────────────────────────────
describe('Encouragement API', () => {
  it('GET /api/encouragement/current — 鼓励语', async () => {
    const res = await request(app)
      .get('/api/encouragement/current')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].message).toBeDefined();
  });
});

// ── User ────────────────────────────────────────
describe('User API', () => {
  it('GET /api/user/profile — 获取个人信息', async () => {
    const res = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('test@test.com');
  });

  it('GET /api/user/export — 导出数据', async () => {
    const res = await request(app)
      .get('/api/user/export')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.achievements).toBeDefined();
  });
});

// ── Health ────────────────────────────────────────
describe('Health Check', () => {
  it('GET /api/health — 健康检查', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ── Auth Guard ────────────────────────────────────
describe('Auth Guard', () => {
  it('未认证请求返回 401', async () => {
    const res = await request(app).get('/api/achievements');
    expect(res.status).toBe(401);
  });

  it('无效 token 返回 401', async () => {
    const res = await request(app)
      .get('/api/achievements')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });
});
