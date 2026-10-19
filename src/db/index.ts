import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '#config';
import { schemaSQL } from '#db/schema';
import { logger } from '#utils/logger';

const dir = path.dirname(config.DATABASE_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(config.DATABASE_PATH);
db.pragma('journal_mode = WAL');
db.exec(schemaSQL);
logger.info(`SQLite connection initialized at ${config.DATABASE_PATH}`);
