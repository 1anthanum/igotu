import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/database';
import { signAccessToken, signRefreshToken } from '../config/jwt';
import { AppError } from '../middleware/errorHandler';
import { DEFAULT_TEMPLATES } from '../utils/constants';

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Register a new user and seed default templates
   */
  async register(input: RegisterInput) {
    // Check if email or username already exists
    const existing = query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [input.email, input.username]
    );

    if (existing.rows.length > 0) {
      throw new AppError('该邮箱或用户名已被使用', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 12);

    const userId = uuidv4();

    transaction(() => {
      // Create user
      query(
        `INSERT INTO users (id, email, username, password_hash)
         VALUES (?, ?, ?, ?)`,
        [userId, input.email, input.username, passwordHash]
      );

      // Seed default achievement templates for this user
      for (let i = 0; i < DEFAULT_TEMPLATES.length; i++) {
        const template = DEFAULT_TEMPLATES[i];
        query(
          `INSERT INTO achievement_templates (id, user_id, title, emoji, category, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [uuidv4(), userId, template.title, template.emoji, template.category, i]
        );
      }

      // Create default preferences
      query(
        'INSERT INTO user_preferences (id, user_id) VALUES (?, ?)',
        [uuidv4(), userId]
      );
    });

    // Generate tokens
    const accessToken = signAccessToken(userId, input.email);
    const refreshToken = signRefreshToken(userId, input.email);

    return {
      user: {
        id: userId,
        email: input.email,
        username: input.username,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login with email and password
   */
  async login(input: LoginInput) {
    const result = query(
      'SELECT id, email, username, password_hash FROM users WHERE email = ?',
      [input.email]
    );

    if (result.rows.length === 0) {
      throw new AppError('邮箱或密码错误', 401);
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(input.password, user.password_hash);

    if (!isValid) {
      throw new AppError('邮箱或密码错误', 401);
    }

    // Update last login
    query(
      "UPDATE users SET last_login_at = datetime('now') WHERE id = ?",
      [user.id]
    );

    // Generate tokens
    const accessToken = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      accessToken,
      refreshToken,
    };
  }
}

export const authService = new AuthService();
