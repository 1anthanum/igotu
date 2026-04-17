/**
 * IGOTU 种子数据脚本
 * 创建测试账号 + 30 天模拟数据，包括成就、情绪、PHQ-9、练习、认知重构记录
 *
 * 使用: npx ts-node src/scripts/seed.ts
 * 测试账号: test@igotu.com / 123456
 */
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { testConnection, getDb, query, transaction } from '../config/database';
import { runMigrations } from '../migrations/runner';

// ── 配置 ────────────────────────────────────────
const TEST_USER = {
  email: 'test@igotu.com',
  username: '测试用户',
  password: '123456',
};

const MOODS = [
  { score: 1, emoji: '😞', label: '很低落' },
  { score: 2, emoji: '😔', label: '不太好' },
  { score: 3, emoji: '😐', label: '还行' },
  { score: 4, emoji: '🙂', label: '不错' },
  { score: 5, emoji: '😊', label: '很好' },
];

const ACHIEVEMENTS = [
  { title: '刷牙', emoji: '🪥', category: 'hygiene' },
  { title: '喝水', emoji: '💧', category: 'nutrition' },
  { title: '出门', emoji: '🚶', category: 'movement' },
  { title: '吃饭', emoji: '🍚', category: 'nutrition' },
  { title: '洗澡', emoji: '🛁', category: 'hygiene' },
  { title: '运动', emoji: '💪', category: 'movement' },
  { title: '看书', emoji: '📖', category: 'self-care' },
  { title: '联系朋友', emoji: '🤝', category: 'social' },
  { title: '晒太阳', emoji: '☀️', category: 'movement' },
  { title: '深呼吸', emoji: '🌬️', category: 'self-care' },
  { title: '做家务', emoji: '🧹', category: 'productivity' },
  { title: '睡觉', emoji: '😴', category: 'rest' },
];

const DISTORTIONS = [
  '全或无思维', '过度概括', '心理过滤', '否定正面',
  '灾难化', '情绪推理', '"应该"式思维', '贴标签',
];

const EMOTIONS = [
  { name: '焦虑', intensity: 7 },
  { name: '悲伤', intensity: 6 },
  { name: '无助', intensity: 5 },
  { name: '孤独', intensity: 4 },
];

// ── 工具函数 ────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function datetimeAgo(n: number, hour: number = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

function randomPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// ── 主逻辑 ────────────────────────────────────
async function seed() {
  console.log('🌱 IGOTU 种子数据');
  console.log('================\n');

  // 初始化数据库
  testConnection();
  runMigrations();

  const db = getDb();

  // 检查是否已存在
  const existing = query('SELECT id FROM users WHERE email = ?', [TEST_USER.email]);
  if (existing.rows.length > 0) {
    console.log('⚠️  测试账号已存在，跳过种子数据');
    console.log(`   📧 ${TEST_USER.email}`);
    console.log(`   🔑 ${TEST_USER.password}\n`);
    return;
  }

  const passwordHash = await bcrypt.hash(TEST_USER.password, 12);
  const userId = uuidv4();

  transaction(() => {
    // ── 1. 创建用户 ──
    query(
      'INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)',
      [userId, TEST_USER.email, TEST_USER.username, passwordHash]
    );
    query('INSERT INTO user_preferences (id, user_id) VALUES (?, ?)', [uuidv4(), userId]);

    // ── 2. 创建模板 ──
    for (let i = 0; i < ACHIEVEMENTS.length; i++) {
      const a = ACHIEVEMENTS[i];
      query(
        'INSERT INTO achievement_templates (id, user_id, title, emoji, category, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), userId, a.title, a.emoji, a.category, i]
      );
    }

    // ── 3. 30 天成就记录（模拟渐进恢复曲线）──
    let totalAchievements = 0;
    for (let day = 30; day >= 0; day--) {
      // 越近的日子越活跃（模拟恢复）
      const recoveryFactor = 1 - (day / 40); // 0.25 → 1.0
      const baseCount = Math.max(0, Math.floor(recoveryFactor * 5 + (Math.random() * 3 - 1)));

      // 偶尔有"低谷日"（0 记录）
      const isLowDay = Math.random() < 0.15;
      const count = isLowDay ? 0 : Math.min(baseCount, 8);

      const picked = randomPick(ACHIEVEMENTS, count);
      for (const a of picked) {
        query(
          'INSERT INTO achievements (id, user_id, title, emoji, category, recorded_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), userId, a.title, a.emoji, a.category, daysAgo(day), datetimeAgo(day)]
        );
        totalAchievements++;
      }
    }
    console.log(`   ✅ 成就记录: ${totalAchievements} 条 (30天)`);

    // ── 4. 情绪记录（1-2 条/天，总体从低到中偏上）──
    let totalMoods = 0;
    for (let day = 30; day >= 0; day--) {
      const entriesPerDay = Math.random() < 0.6 ? 1 : 2;
      for (let i = 0; i < entriesPerDay; i++) {
        // 渐进向好的情绪曲线
        const baseMood = Math.min(5, Math.max(1, Math.round(1.5 + (30 - day) / 10 + (Math.random() * 2 - 0.5))));
        const mood = MOODS[baseMood - 1];
        const notes = [null, '今天还行', '有点累', '和朋友聊了天，心情好了一些', '做了运动', null, '失眠了', null, '出门晒了太阳'];
        query(
          'INSERT INTO mood_entries (id, user_id, mood_score, mood_emoji, mood_label, note, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), userId, mood.score, mood.emoji, mood.label, notes[Math.floor(Math.random() * notes.length)], datetimeAgo(day, 8 + i * 6)]
        );
        totalMoods++;
      }
    }
    console.log(`   ✅ 情绪记录: ${totalMoods} 条`);

    // ── 5. PHQ-9 记录（每周一次，共 5 次，分数逐渐降低）──
    const phq9Scores = [18, 15, 12, 9, 7]; // 中重度 → 轻度
    const phq9Severities = ['中重度抑郁', '中重度抑郁', '中度抑郁', '轻度抑郁', '轻度抑郁'];
    for (let i = 0; i < 5; i++) {
      const day = 28 - i * 7;
      const answers: Record<string, number> = {};
      let remaining = phq9Scores[i];
      for (let q = 1; q <= 9; q++) {
        const maxForThis = Math.min(3, remaining);
        const val = q === 9 ? Math.min(1, remaining) : Math.min(maxForThis, Math.floor(Math.random() * (maxForThis + 1)));
        answers[`q${q}`] = val;
        remaining -= val;
      }
      // Distribute any remaining
      if (remaining > 0) {
        answers['q1'] = Math.min(3, (answers['q1'] || 0) + remaining);
      }

      query(
        'INSERT INTO phq9_results (id, user_id, score, severity, answers, functional_impact, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), userId, phq9Scores[i], phq9Severities[i], JSON.stringify(answers), Math.max(0, Math.floor(phq9Scores[i] / 7)), datetimeAgo(day)]
      );
    }
    console.log(`   ✅ PHQ-9 评估: 5 条（模拟恢复趋势）`);

    // ── 6. 呼吸/扎根练习记录 ──
    const techniques = ['4-4-4-4 方块呼吸', '4-7-8 放松呼吸', '4-6 简易呼吸'];
    for (let i = 0; i < 12; i++) {
      const day = Math.floor(Math.random() * 25);
      query(
        'INSERT INTO exercise_logs (id, user_id, type, technique, data, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), userId, 'breathing', techniques[i % 3], JSON.stringify({ cycles: 4 + Math.floor(Math.random() * 4) }), datetimeAgo(day, 14)]
      );
    }
    for (let i = 0; i < 6; i++) {
      const day = Math.floor(Math.random() * 25);
      query(
        'INSERT INTO exercise_logs (id, user_id, type, technique, data, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), userId, 'grounding', '5-4-3-2-1 感官觉知', JSON.stringify({ steps_completed: 5 }), datetimeAgo(day, 16)]
      );
    }
    console.log(`   ✅ 练习记录: 12 次呼吸 + 6 次扎根`);

    // ── 7. 认知重构记录 ──
    const cognitiveExamples = [
      {
        thought: '我什么都做不好，同事一定觉得我很没用',
        emotions: [{ name: '无助', intensity: 8 }, { name: '焦虑', intensity: 7 }],
        distortions: ['全或无思维', '心理过滤'],
        supporting: '上周的报告被领导批评了',
        counter: '同事昨天还夸了我的设计方案；上个月的项目顺利完成了',
        balanced: '虽然报告被批评了，但我在其他方面也有做得好的地方。一次失误不能否定全部。',
        intensityBefore: 8,
        intensityAfter: 4,
      },
      {
        thought: '如果我去参加聚会，大家一定会觉得我很无聊',
        emotions: [{ name: '焦虑', intensity: 7 }, { name: '孤独', intensity: 6 }],
        distortions: ['灾难化', '情绪推理'],
        supporting: '上次聚会我不太说话',
        counter: '朋友主动邀请我说明他们想让我参加；不说话也不代表无聊',
        balanced: '我不需要成为焦点。去了就是勇敢的一步，即使安静地待着也没关系。',
        intensityBefore: 7,
        intensityAfter: 3,
      },
      {
        thought: '我应该每天都高效工作，今天又浪费了',
        emotions: [{ name: '内疚', intensity: 6 }],
        distortions: ['"应该"式思维', '否定正面'],
        supporting: '今天确实没完成计划的任务',
        counter: '我今天还是做了一些事情的；人的状态本来就有起伏',
        balanced: '今天效率低不代表浪费了，休息也是恢复的一部分。明天可以重新开始。',
        intensityBefore: 6,
        intensityAfter: 3,
      },
    ];

    for (let i = 0; i < cognitiveExamples.length; i++) {
      const c = cognitiveExamples[i];
      query(
        `INSERT INTO cognitive_records
          (id, user_id, thought, emotions, distortions, intensity_before, supporting_evidence, counter_evidence, balanced_thought, intensity_after, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), userId, c.thought,
          JSON.stringify(c.emotions), JSON.stringify(c.distortions),
          c.intensityBefore, c.supporting, c.counter, c.balanced, c.intensityAfter,
          datetimeAgo(20 - i * 7),
        ]
      );
    }
    console.log(`   ✅ 认知重构: 3 条示例`);
  });

  console.log('\n🎉 种子数据填充完成！');
  console.log('');
  console.log('   📧 测试账号: test@igotu.com');
  console.log('   🔑 密码:     123456');
  console.log('');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
