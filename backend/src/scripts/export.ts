/**
 * IGOTU — 数据导出脚本
 *
 * Usage:
 *   npx ts-node src/scripts/export.ts              # Export JSON (default)
 *   npx ts-node src/scripts/export.ts --csv         # Export CSV
 *   npx ts-node src/scripts/export.ts --user EMAIL  # Export specific user
 *   npx ts-node src/scripts/export.ts --out DIR     # Custom output directory
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { getDb, closeDb } from '../config/database';
import { runMigrations } from '../migrations/runner';

// ── Parse CLI args ──────────────────────────────────────

const args = process.argv.slice(2);
const csvMode = args.includes('--csv');
const userIdx = args.indexOf('--user');
const userEmail = userIdx !== -1 ? args[userIdx + 1] : null;
const outIdx = args.indexOf('--out');
const outDir = outIdx !== -1 ? args[outIdx + 1] : path.join(process.cwd(), 'exports');

// ── Helpers ─────────────────────────────────────────────

function toCsv(rows: any[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str}"`
        : str;
    });
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

function writeFile(filePath: string, content: string) {
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✅ ${filePath}`);
}

// ── Main ────────────────────────────────────────────────

function main() {
  runMigrations();

  const db = getDb();

  // Get users to export
  let users: any[];
  if (userEmail) {
    users = db.prepare('SELECT * FROM users WHERE email = ?').all(userEmail);
    if (users.length === 0) {
      console.error(`❌ 找不到用户: ${userEmail}`);
      process.exit(1);
    }
  } else {
    users = db.prepare('SELECT * FROM users').all();
  }

  if (users.length === 0) {
    console.log('⚠️ 数据库中没有用户。请先运行 npm run seed 创建测试数据。');
    process.exit(0);
  }

  // Ensure output directory
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().slice(0, 10);

  for (const user of users) {
    const uid = user.id;
    const safeEmail = user.email.replace(/[^a-zA-Z0-9]/g, '_');
    const prefix = `${outDir}/igotu_${safeEmail}_${timestamp}`;

    console.log(`\n📦 导出用户: ${user.email} (${uid})`);

    const achievements = db.prepare('SELECT * FROM achievements WHERE user_id = ? ORDER BY recorded_date').all(uid);
    const templates = db.prepare('SELECT * FROM achievement_templates WHERE user_id = ?').all(uid);
    const moodCheckins = db.prepare('SELECT * FROM mood_checkins WHERE user_id = ? ORDER BY recorded_date').all(uid);
    const moodEntries = db.prepare('SELECT * FROM mood_entries WHERE user_id = ? ORDER BY recorded_at').all(uid);
    const phq9 = db.prepare('SELECT * FROM phq9_results WHERE user_id = ? ORDER BY created_at').all(uid);
    const exercises = db.prepare('SELECT * FROM exercise_logs WHERE user_id = ? ORDER BY completed_at').all(uid);
    const cognitive = db.prepare('SELECT * FROM cognitive_records WHERE user_id = ? ORDER BY created_at').all(uid);
    const chatSessions = db.prepare('SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY created_at').all(uid) as any[];
    const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(uid);

    // Gather chat messages
    const chatMessages: Record<string, any[]> = {};
    for (const s of chatSessions) {
      chatMessages[s.id] = db.prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC').all(s.id);
    }

    if (csvMode) {
      // ── CSV mode: one file per table ──
      const csvDir = `${prefix}_csv`;
      if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true });

      if (achievements.length) writeFile(`${csvDir}/achievements.csv`, toCsv(achievements));
      if (templates.length) writeFile(`${csvDir}/templates.csv`, toCsv(templates));
      if (moodCheckins.length) writeFile(`${csvDir}/mood_checkins.csv`, toCsv(moodCheckins));
      if (moodEntries.length) writeFile(`${csvDir}/mood_entries.csv`, toCsv(moodEntries));
      if (phq9.length) writeFile(`${csvDir}/phq9_results.csv`, toCsv(phq9));
      if (exercises.length) writeFile(`${csvDir}/exercise_logs.csv`, toCsv(exercises));
      if (cognitive.length) writeFile(`${csvDir}/cognitive_records.csv`, toCsv(cognitive));
      if (chatSessions.length) writeFile(`${csvDir}/chat_sessions.csv`, toCsv(chatSessions));

      // Flatten all chat messages into one CSV
      const allMsgs = Object.values(chatMessages).flat();
      if (allMsgs.length) writeFile(`${csvDir}/chat_messages.csv`, toCsv(allMsgs));

      console.log(`  📁 CSV 文件已导出到: ${csvDir}/`);
    } else {
      // ── JSON mode: single file ──
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        user: { id: uid, email: user.email, username: user.username, created_at: user.created_at },
        preferences: prefs || null,
        achievements,
        templates,
        moodCheckins,
        moodEntries,
        phq9Results: phq9,
        exerciseLogs: exercises,
        cognitiveRecords: cognitive,
        chatSessions,
        chatMessages,
      };

      const jsonPath = `${prefix}.json`;
      writeFile(jsonPath, JSON.stringify(exportData, null, 2));
      console.log(`  📁 JSON 文件已导出到: ${jsonPath}`);
    }

    const totalMoods = moodCheckins.length + moodEntries.length;
    console.log(`  📊 统计: ${achievements.length} 成就 | ${totalMoods} 情绪 | ${phq9.length} PHQ-9 | ${exercises.length} 练习 | ${cognitive.length} 认知 | ${chatSessions.length} 对话`);
  }

  closeDb();
  console.log('\n✅ 导出完成');
}

main();
