import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/environment';
import { query } from '../config/database';
import { buildSystemPrompt } from '../utils/systemPrompt';
import { generateOfflineResponse } from './OfflineChat';

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

export class ChatService {
  // Create a new chat session
  static createSession(userId: string, title?: string) {
    const id = uuidv4();
    query(
      `INSERT INTO chat_sessions (id, user_id, title) VALUES (?, ?, ?)`,
      [id, userId, title || '新对话']
    );

    const result = query('SELECT * FROM chat_sessions WHERE id = ?', [id]);
    return result.rows[0];
  }

  // Get all sessions for a user
  static getSessions(userId: string) {
    const result = query(
      `SELECT cs.*,
              (SELECT COUNT(*) FROM chat_messages cm WHERE cm.session_id = cs.id) as message_count
       FROM chat_sessions cs
       WHERE cs.user_id = ?
       ORDER BY cs.updated_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // Get messages for a session
  static getMessages(sessionId: string, userId: string) {
    // Verify session belongs to user
    const session = query(
      'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );
    if (session.rows.length === 0) return null;

    const result = query(
      `SELECT * FROM chat_messages
       WHERE session_id = ?
       ORDER BY created_at ASC`,
      [sessionId]
    );
    return result.rows;
  }

  // Send a message and get AI response (Claude API or offline fallback)
  static async sendMessage(sessionId: string, userId: string, userMessage: string) {
    // Verify session belongs to user
    const session = query(
      'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );
    if (session.rows.length === 0) {
      throw new Error('Session not found');
    }

    // Save user message
    query(
      `INSERT INTO chat_messages (id, session_id, user_id, role, content)
       VALUES (?, ?, ?, 'user', ?)`,
      [uuidv4(), sessionId, userId, userMessage]
    );

    // Get conversation history
    const history = query(
      `SELECT role, content FROM chat_messages
       WHERE session_id = ?
       ORDER BY created_at ASC`,
      [sessionId]
    );

    const messages = history.rows.map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    let assistantText: string;
    let moodScore: number | null = null;

    const anthropic = getClient();
    if (anthropic) {
      // ── Online mode: Claude API ──
      const systemPrompt = buildSystemPrompt();

      const response = await anthropic.messages.create({
        model: env.ANTHROPIC_MODEL,
        max_tokens: env.ANTHROPIC_MAX_TOKENS,
        system: systemPrompt,
        messages,
      });

      assistantText = response.content[0].type === 'text'
        ? response.content[0].text
        : '';
    } else {
      // ── Offline mode: rule-based fallback ──
      const isFirstMessage = messages.length <= 1; // only the user's message just sent
      assistantText = generateOfflineResponse(userMessage, isFirstMessage);
    }

    // Extract mood score from the AI response (hidden JSON tag)
    const moodMatch = assistantText.match(/<!--mood:\s*(\{[^}]+\})\s*-->/);
    if (moodMatch) {
      try {
        const moodData = JSON.parse(moodMatch[1]);
        if (typeof moodData.score === 'number' && moodData.score >= 1 && moodData.score <= 5) {
          moodScore = moodData.score;
        }
      } catch { /* ignore parse errors */ }
      // Remove the mood tag from the displayed message
      assistantText = assistantText.replace(/\s*<!--mood:\s*\{[^}]+\}\s*-->\s*$/, '').trim();
    }

    // Save assistant response (with mood tag stripped)
    query(
      `INSERT INTO chat_messages (id, session_id, user_id, role, content)
       VALUES (?, ?, ?, 'assistant', ?)`,
      [uuidv4(), sessionId, userId, assistantText]
    );

    // Update session timestamp
    query(
      "UPDATE chat_sessions SET updated_at = datetime('now') WHERE id = ?",
      [sessionId]
    );

    return { text: assistantText, mood_score: moodScore };
  }

  // Delete a session
  static deleteSession(sessionId: string, userId: string) {
    const result = query(
      'DELETE FROM chat_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );
    return result.rowCount > 0;
  }
}
