import { Router, Request, Response } from 'express';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import { systemService } from '#services/system';

const execAsync = promisify(exec);
const router = Router();

router.get('/metrics', (_req: Request, res: Response): void => {
  res.json(systemService.getMetrics());
});

router.post('/update', async (req: Request, res: Response): Promise<void> => {
  const { token, repoUrl, branch = 'main' } = req.body;
  const projectRoot = process.cwd();

  try {
    let remoteUrl = repoUrl;

    if (!remoteUrl) {
      try {
        const configData = await fs.readFile(path.join(projectRoot, '.git', 'config'), 'utf-8');
        const match = configData.match(/url\s*=\s*(.+)/);
        if (match) remoteUrl = match[1].trim();
      } catch {}
    }

    if (!remoteUrl) {
      remoteUrl = 'https://github.com/Ryuzei-Ts/FileLynx.git';
    }

    let authUrl = remoteUrl;
    if (token && token.trim()) {
      let clean = remoteUrl.replace(/^https?:\/\//, '').replace(/^[^@]+@github\.com\//, 'github.com/');
      authUrl = `https://${encodeURIComponent(token.trim())}@${clean}`;
    }

    const pullCmd = `git pull origin ${branch}`;
    let stdout = '';
    let stderr = '';

    try {
      if (token && token.trim()) {
        await execAsync(`git remote set-url origin "${authUrl}"`, { cwd: projectRoot });
      }
      const result = await execAsync(pullCmd, { cwd: projectRoot });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (pullErr: any) {
      if (pullErr.message.includes('could not read Username') || pullErr.message.includes('Authentication failed')) {
        res.status(401).json({
          success: false,
          needsAuth: true,
          error: 'Este repositorio es privado o requiere un token de acceso.',
        });
        return;
      }
      throw pullErr;
    }

    const isUpToDate = stdout.includes('Already up to date.') || stdout.includes('Ya está actualizado.');

    res.json({
      success: true,
      isUpToDate,
      message: isUpToDate ? 'Todo está actualizado ✰' : 'Actualización completada exitosamente ꕤ',
      output: stdout || stderr,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar el repositorio';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
