import crypto from 'node:crypto';
import { db } from '#db';
import type { UserSession } from '#types';

interface AuthRow {
  id: string;
  username: string;
}

export const authService = {
  login(username: string, passwordPlain: string): UserSession | null {
    const hash = crypto.createHash('sha256').update(passwordPlain).digest('hex');
    const row = db
      .prepare('SELECT id, username FROM users WHERE username = ? AND password_hash = ?')
      .get(username, hash) as AuthRow | undefined;

    if (!row) return null;

    db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(
      row.id,
      'LOGIN',
      'User logged in successfully'
    );

    return {
      userId: row.id,
      username: row.username,
      authenticated: true,
    };
  },
};
