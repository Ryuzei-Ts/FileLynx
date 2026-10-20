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
  const { token, branch = 'main' } = req.body;
  const projectRoot = process.cwd();

  try {
    let remoteUrl = 'https://github.com/Ryuzei-Ts/FileLynx.git';
    try {
      const configData = await fs.readFile(path.join(projectRoot, '.git', 'config'), 'utf-8');
      const match = configData.match(/url\s*=\s*(.+)/);
      if (match) remoteUrl = match[1].trim();
    } catch {}

    if (token && token.trim()) {
      let clean = remoteUrl.replace(/^https?:\/\//, '').replace(/^[^@]+@github\.com\//, 'github.com/').replace(/\.git$/, '');
      const authUrl = `https://${encodeURIComponent(token.trim())}@${clean}.git`;
      await execAsync(`git remote set-url origin "${authUrl}"`, { cwd: projectRoot });
    }

    const pullCommand = `git merge --abort 2>/dev/null || true && git fetch origin ${branch} && git reset --hard origin/${branch}`;
    const { stdout, stderr } = await execAsync(pullCommand, { cwd: projectRoot });

    res.json({
      success: true,
      message: 'Actualización descargada correctamente. Reiniciando servidor...',
      output: stdout || stderr,
    });

    setTimeout(() => {
      exec('pm2 restart filelynx --update-env', () => {});
    }, 1000);

  } catch (err: any) {
    if (err.message && (err.message.includes('could not read Username') || err.message.includes('Authentication failed'))) {
      res.status(401).json({
        success: false,
        needsAuth: true,
        error: 'El repositorio es privado o requiere un token válido.',
      });
      return;
    }

    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
