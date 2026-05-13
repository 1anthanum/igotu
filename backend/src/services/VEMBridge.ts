/**
 * VEMBridge — iGotU -> VEM 事件桥接服务
 *
 * 职责：
 * 1. 接收来自各路由的写入事件，异步推送到 VEM Engine
 * 2. 推送失败时落盘到 vem_outbox 表，后台定时重试
 * 3. 所有 HTTP 请求附带 HMAC-SHA256 签名
 * 4. 不阻塞主请求（fire-and-forget via setImmediate）
 *
 * 隐私约束：
 * - CBT thought 原文不传，只传 intensity_delta + distortion 标签
 * - Chat content 原文不传，只传长度 + 情感倾向
 * - 所有 payload 在本文件中组装，确保隐私边界可审计
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/environment';
import { query } from '../config/database';

// ── 类型定义 ──

export interface VEMEvent {
  kind: string;
  payload: Record<string, unknown>;
  user_id: string;
  ts: string;
  source: 'igotu';
}

interface OutboxRow {
  id: string;
  kind: string;
  payload: string;
  user_id: string;
  created_at: string;
  attempts: number;
}

// ── 配置 ──

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_INTERVAL_MS = 60_000; // 1 分钟
const BATCH_SIZE = 20;
const REQUEST_TIMEOUT_MS = 10_000;

// ── HMAC 签名 ──

function sign(body: string): string {
  if (!env.VEM_HMAC_KEY) return '';
  return crypto
    .createHmac('sha256', env.VEM_HMAC_KEY)
    .update(body)
    .digest('hex');
}

// ── HTTP 发送（带签名） ──

async function postToVEM(path: string, body: Record<string, unknown>): Promise<boolean> {
  if (!env.VEM_BASE_URL) return false;

  const url = `${env.VEM_BASE_URL}${path}`;
  const bodyStr = JSON.stringify(body);
  const signature = sign(bodyStr);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VEM-Source': 'igotu',
        'X-VEM-Signature': signature,
      },
      body: bodyStr,
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Outbox 持久化 ──

function saveToOutbox(event: VEMEvent): void {
  try {
    query(
      `INSERT INTO vem_outbox (id, kind, payload, user_id)
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), event.kind, JSON.stringify(event.payload), event.user_id]
    );
  } catch (err) {
    console.error('[VEMBridge] Failed to save to outbox:', err);
  }
}

function markDelivered(id: string): void {
  query(
    `UPDATE vem_outbox SET delivered = 1 WHERE id = ?`,
    [id]
  );
}

function incrementAttempt(id: string): void {
  query(
    `UPDATE vem_outbox SET attempts = attempts + 1, last_attempt_at = datetime('now') WHERE id = ?`,
    [id]
  );
}

function getPendingEvents(): OutboxRow[] {
  const result = query(
    `SELECT id, kind, payload, user_id, created_at, attempts
     FROM vem_outbox
     WHERE delivered = 0 AND attempts < ?
     ORDER BY created_at ASC
     LIMIT ?`,
    [MAX_RETRY_ATTEMPTS, BATCH_SIZE]
  );
  return result.rows as OutboxRow[];
}

function cleanupDelivered(): void {
  query(
    `DELETE FROM vem_outbox
     WHERE delivered = 1 AND created_at < datetime('now', '-7 days')`,
    []
  );
}

// ── 核心发送逻辑 ──

async function sendEvent(event: VEMEvent): Promise<void> {
  const success = await postToVEM('/events', {
    kind: event.kind,
    payload: event.payload,
    user_id: event.user_id,
    ts: event.ts,
    source: event.source,
  } as Record<string, unknown>);

  if (!success) {
    saveToOutbox(event);
  }
}

async function sendBatch(events: VEMEvent[]): Promise<boolean> {
  return postToVEM('/events/batch', { events });
}

// ── 后台重试 ──

let retryTimer: ReturnType<typeof setInterval> | null = null;

async function retryPending(): Promise<void> {
  const pending = getPendingEvents();
  if (pending.length === 0) return;

  // 尝试批量发送
  const events: VEMEvent[] = pending.map(row => ({
    kind: row.kind,
    payload: JSON.parse(row.payload),
    user_id: row.user_id,
    ts: row.created_at,
    source: 'igotu' as const,
  }));

  const batchSuccess = await sendBatch(events);

  if (batchSuccess) {
    for (const row of pending) {
      markDelivered(row.id);
    }
    return;
  }

  // 批量失败，逐条重试
  for (const row of pending) {
    const event: VEMEvent = {
      kind: row.kind,
      payload: JSON.parse(row.payload),
      user_id: row.user_id,
      ts: row.created_at,
      source: 'igotu',
    };

    const success = await postToVEM('/events', event as unknown as Record<string, unknown>);
    if (success) {
      markDelivered(row.id);
    } else {
      incrementAttempt(row.id);
    }
  }
}

// ── 公开 API ──

/**
 * 启动后台重试定时器和定期清理
 * 在 server.ts 启动时调用
 */
export function startVEMBridge(): void {
  if (!env.VEM_BASE_URL) {
    console.log('[VEMBridge] VEM_BASE_URL not configured, bridge disabled');
    return;
  }

  console.log(`[VEMBridge] Bridge enabled -> ${env.VEM_BASE_URL}`);

  // 启动后立即尝试清空 outbox
  setImmediate(() => {
    retryPending().catch(err =>
      console.error('[VEMBridge] Initial retry failed:', err)
    );
  });

  // 定时重试
  retryTimer = setInterval(() => {
    retryPending().catch(err =>
      console.error('[VEMBridge] Retry cycle failed:', err)
    );
  }, RETRY_INTERVAL_MS);

  // 每小时清理已投递超过 7 天的记录
  setInterval(() => {
    try { cleanupDelivered(); } catch {}
  }, 3_600_000);
}

/**
 * 停止后台定时器（优雅关闭时调用）
 */
export function stopVEMBridge(): void {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

/**
 * Fire-and-forget 发送事件
 * 在路由处理完成后通过 setImmediate 调用，不阻塞响应
 */
export function emitVEMEvent(kind: string, userId: string, payload: Record<string, unknown>): void {
  if (!env.VEM_BASE_URL) return;

  const event: VEMEvent = {
    kind,
    payload,
    user_id: userId,
    ts: new Date().toISOString(),
    source: 'igotu',
  };

  setImmediate(() => {
    sendEvent(event).catch(err =>
      console.error(`[VEMBridge] emit ${kind} failed:`, err)
    );
  });
}

// ── 便捷方法：各模块专用的 emit 函数 ──
// 在这里集中管理 payload 组装，确保隐私边界可审计

/**
 * 情绪记录事件
 * 传递：score, emoji, label, 是否有备注
 * 不传：备注原文
 */
export function emitMoodLogged(userId: string, data: {
  mood_score: number;
  mood_emoji: string;
  mood_label: string;
  has_note: boolean;
}): void {
  emitVEMEvent('mood.logged', userId, {
    score: data.mood_score,
    emoji: data.mood_emoji,
    label: data.mood_label,
    has_note: data.has_note,
  });
}

/**
 * CBT 认知重构完成事件
 * 传递：前后强度差、扭曲类型标签、情绪标签
 * 不传：thought 原文、证据原文、平衡想法原文
 */
export function emitCBTCompleted(userId: string, data: {
  intensity_before: number | null;
  intensity_after: number | null;
  distortions: string[];
  emotions: string[];
}): void {
  emitVEMEvent('cbt.completed', userId, {
    intensity_before: data.intensity_before,
    intensity_after: data.intensity_after,
    intensity_delta: (data.intensity_before && data.intensity_after)
      ? data.intensity_before - data.intensity_after
      : null,
    distortions: data.distortions,
    emotions: data.emotions,
  });
}

/**
 * 练习完成事件（呼吸/接地）
 * 传递：类型、技术名称、时长
 * 不传：自定义数据详情
 */
export function emitExerciseCompleted(userId: string, data: {
  type: string;
  technique: string | null;
  duration_s?: number;
}): void {
  emitVEMEvent('recovery.exercise', userId, {
    type: data.type,
    technique: data.technique,
    duration_s: data.duration_s ?? null,
  });
}

/**
 * PHQ-9 评估完成事件
 * 传递：总分、功能影响分
 * 不传：各题具体答案
 */
export function emitPHQ9Scored(userId: string, data: {
  score: number;
  functional_impact: number | null;
}): void {
  emitVEMEvent('phq9.scored', userId, {
    score: data.score,
    functional_impact: data.functional_impact,
  });
}

/**
 * 用户聊天消息事件
 * 传递：消息长度、情感倾向提示
 * 不传：消息原文（隐私保护）
 */
export function emitChatUserMsg(userId: string, data: {
  length: number;
  sentiment_hint: -1 | 0 | 1;
}): void {
  emitVEMEvent('chat.user_msg', userId, {
    length: data.length,
    sentiment_hint: data.sentiment_hint,
  });
}

/**
 * 成就打卡事件
 * 传递：分类、emoji、是否来自模板
 * 不传：标题和备注原文
 */
export function emitAchievementLogged(userId: string, data: {
  category: string;
  emoji: string | null;
  from_template: boolean;
}): void {
  emitVEMEvent('achievement.logged', userId, {
    category: data.category,
    emoji: data.emoji,
    from_template: data.from_template,
  });
}

/**
 * Apple Health 数据快照事件
 * 直接转发全部生理数据到 VEM
 */
export function emitHealthSnapshot(userId: string, data: {
  hrv_ms: number | null;
  sleep_hours: number | null;
  sleep_deep_pct: number | null;
  resting_hr: number | null;
  steps: number | null;
  workout_min: number | null;
  cycle_day: number | null;
  recorded_date: string;
}): void {
  emitVEMEvent('health.snapshot', userId, data);
}
