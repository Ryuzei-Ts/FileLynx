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
  console.log('\n=== FILELYNX: RESTABLECER CONTRASEÑA ===\n');
  const username = (await ask('Nombre de usuario a restablecer: ')).trim();

  if (!username) {
    logger.error('Debes proporcionar un nombre de usuario.');
    rl.close();
    process.exit(1);
  }

  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: string } | undefined;
  if (!user) {
    logger.error(`No se encontró el usuario "${username}".`);
    rl.close();
    process.exit(1);
  }

  const newPassword = (await ask('Nueva contraseña: ')).trim();
  if (!newPassword) {
    logger.error('La contraseña no puede quedar vacía.');
    rl.close();
    process.exit(1);
  }

  const hash = crypto.createHash('sha256').update(newPassword).digest('hex');
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);

  logger.info(`Contraseña actualizada exitosamente para el usuario "${username}".`);
  rl.close();
}

run().catch((err) => {
  logger.error(err.message);
  rl.close();
  process.exit(1);
});
