import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { terminalService } from '#services/terminal';
import { config } from '#config';
import { logger } from '#utils/logger';

export function attach(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    if (req.url === '/ws/terminal') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    const ptyProcess = terminalService.createSession(config.ROOT_DIR);

    ptyProcess.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    ws.on('message', (message: string) => {
      ptyProcess.write(message.toString());
    });

    ws.on('close', () => {
      ptyProcess.kill();
    });

    logger.info('Interactive terminal session established');
  });
}
