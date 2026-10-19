import * as pty from 'node-pty';

export const terminalService = {
  createSession(cwd: string) {
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    return pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 100,
      rows: 30,
      cwd: cwd || process.env.HOME || process.cwd(),
      env: process.env as Record<string, string>,
    });
  },
};
