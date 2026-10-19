import { Router, Request, Response } from 'express';
import path from 'node:path';
import { filesService } from '#services/files';
import { resolveSafePath } from '#utils/paths';

const router = Router();

router.get('/list', async (req: Request, res: Response): Promise<void> => {
  try {
    const targetPath = (req.query.path as string) || '';
    const files = await filesService.list(targetPath);
    res.json({ files });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ error: message });
  }
});

router.get('/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      res.status(400).json({ error: 'Ruta requerida' });
      return;
    }
    const content = await filesService.read(filePath);
    res.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ error: message });
  }
});

router.post('/save', async (req: Request, res: Response): Promise<void> => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) {
      res.status(400).json({ error: 'Ruta requerida' });
      return;
    }
    await filesService.write(filePath, content ?? '');
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ error: message });
  }
});

router.post('/create-file', async (req: Request, res: Response): Promise<void> => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) {
      res.status(400).json({ error: 'Nombre de archivo requerido' });
      return;
    }
    await filesService.createFile(filePath, content ?? '');
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ error: message });
  }
});

router.post('/rename', async (req: Request, res: Response): Promise<void> => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      res.status(400).json({ error: 'Rutas antigua y nueva requeridas' });
      return;
    }
    await filesService.rename(oldPath, newPath);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ error: message });
  }
});

router.post('/move', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sourcePath, destinationDir } = req.body;
    if (!sourcePath || destinationDir === undefined) {
      res.status(400).json({ error: 'Ruta origen y directorio destino requeridos' });
      return;
    }
    await filesService.move(sourcePath, destinationDir);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al mover elemento';
    res.status(500).json({ error: message });
  }
});

router.delete('/delete', async (req: Request, res: Response): Promise<void> => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      res.status(400).json({ error: 'Ruta requerida' });
      return;
    }
    await filesService.remove(filePath);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ error: message });
  }
});

router.post('/folder', async (req: Request, res: Response): Promise<void> => {
  try {
    const { path: folderPath } = req.body;
    if (!folderPath) {
      res.status(400).json({ error: 'Ruta de carpeta requerida' });
      return;
    }
    await filesService.createDirectory(folderPath);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ error: message });
  }
});

router.get('/download', (req: Request, res: Response): void => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      res.status(400).json({ error: 'Ruta requerida' });
      return;
    }
    const safePath = resolveSafePath(filePath);
    const fileName = path.basename(safePath);
    res.download(safePath, fileName);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al descargar';
    res.status(500).json({ error: message });
  }
});

router.post('/github-import', async (req: Request, res: Response): Promise<void> => {
  try {
    const { repoUrl, targetPath, token, branch } = req.body;
    if (!repoUrl) {
      res.status(400).json({ error: 'URL del repositorio requerida' });
      return;
    }
    await filesService.importFromGitHub(repoUrl, targetPath || '', token, branch);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al importar desde GitHub';
    res.status(500).json({ error: message });
  }
});

router.post('/git-push', async (req: Request, res: Response): Promise<void> => {
  try {
    const { folderPath, repoUrl, token, commitMsg, branch } = req.body;
    if (!repoUrl || !token) {
      res.status(400).json({ error: 'Se requiere la URL del repositorio y el Token de GitHub' });
      return;
    }
    const output = await filesService.gitPush(folderPath || '', repoUrl, token, commitMsg, branch);
    res.json({ success: true, output });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error en Git Push';
    res.status(500).json({ error: message });
  }
});

export default router;
