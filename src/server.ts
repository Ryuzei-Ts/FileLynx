import http from 'node:http';
import readline from 'node:readline';
import crypto from 'node:crypto';
import { app } from '#app';
import { config } from '#config';
import { db } from '#db';
import { attach as attachTerminal } from '#routes/terminal';
import { nginxService } from '#services/nginx';
import { logger } from '#utils/logger';

async function ensureAdminUser(): Promise<void> {
  const rowCount = db.prepare('SELECT count(*) as total FROM users').get() as { total: number };
  if (rowCount.total === 0) {
    console.log('\n✰ ======================================================== ✰');
    console.log('   BIENVENIDO A FILELYNX - CONFIGURACIÓN INICIAL');
    console.log('   No se detectaron usuarios registrados.');
    console.log('✰ ======================================================== ✰\n');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string): Promise<string> => new Promise((res) => rl.question(q, res));

    const username = (await ask('Introduce nombre de usuario administrador: ')).trim() || 'admin';
    const password = (await ask('Introduce contraseña para el administrador: ')).trim() || 'admin';
    rl.close();

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(
      crypto.randomUUID(),
      username,
      hash
    );
    logger.info(`Usuario inicial "${username}" creado exitosamente.`);
  }
}

async function bootstrap(): Promise<void> {
  await ensureAdminUser();

   await nginxService.ensureDefaultIpProxy(config.PORT);

  const server = http.createServer(app);
  attachTerminal(server);

  server.listen(config.PORT, () => {
    logger.info(`FileLynx online en el puerto ${config.PORT}`);
    logger.info(`Directorio de trabajo: ${config.ROOT_DIR}`);
  });
}

bootstrap().catch((err) => {
  logger.error('Error al arrancar el servidor:', err);
});
