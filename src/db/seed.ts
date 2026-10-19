import { db } from '#db';
import crypto from 'node:crypto';
import { logger } from '#utils/logger';

const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

if (!adminExists) {
  const defaultPassword = 'admin';
  const hash = crypto.createHash('sha256').update(defaultPassword).digest('hex');
  const insert = db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)');
  insert.run(crypto.randomUUID(), 'admin', hash);
  logger.info('Created default admin user (admin:admin)');
}
