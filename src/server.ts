import http from 'node:http';
import { app } from '#app';
import { config } from '#config';
import { attach as attachTerminal } from '#routes/terminal';
import { logger } from '#utils/logger';

const server = http.createServer(app);

attachTerminal(server);

server.listen(config.PORT, () => {
  logger.info(`FileLynx online at http://localhost:${config.PORT}`);
});
