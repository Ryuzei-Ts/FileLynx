import readline from 'node:readline';
import crypto from 'node:crypto';
import { db } from '#db';
import { logger } from '#utils/logger';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function run(): Promise<void> {
  console.log('\n=== FILELYNX: CREAR USUARIO ===\n');
  const username = (await ask('Nombre de usuario: ')).trim();
  const password = (await ask('Contraseña: ')).trim();

  if (!username || !password) {
    logger.error('El usuario y la contraseña no pueden estar vacíos.');
    rl.close();
    process.exit(1);
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    logger.error(`El usuario "${username}" ya existe.`);
    rl.close();
    process.exit(1);
  }

  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const userId = crypto.randomUUID();

  db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(userId, username, hash);
  logger.info(`Usuario "${username}" creado exitosamente con ID: ${userId}`);

  rl.close();
}

run().catch((err) => {
  logger.error(err.message);
  rl.close();
  process.exit(1);
});
