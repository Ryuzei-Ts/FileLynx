import { Router, Request, Response } from 'express';
import fs from 'node:fs';
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

router.get('/git-info', async (req: Request, res: Response): Promise<void> => {
  try {
    const folderPath = (req.query.path as string) || '';
    const info = await filesService.getGitConfigInfo(folderPath);
    res.json(info);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al leer git config';
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

router.post('/compress', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sourcePath, format } = req.body;
    if (!sourcePath) {
      res.status(400).json({ error: 'Ruta a comprimir requerida' });
      return;
    }
    const archiveName = await filesService.compress(sourcePath, format || 'zip');
    res.json({ success: true, archiveName });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al comprimir';
    res.status(500).json({ error: message });
  }
});

router.post('/extract', async (req: Request, res: Response): Promise<void> => {
  try {
    const { archivePath, destinationDir } = req.body;
    if (!archivePath) {
      res.status(400).json({ error: 'Archivo a descomprimir requerido' });
      return;
    }
    await filesService.extract(archivePath, destinationDir);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al descomprimir';
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

router.get('/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const filePath = (req.query.path as string) || '';
    const safePath = resolveSafePath(filePath);

    if (!fs.existsSync(safePath)) {
      res.status(404).send('Archivo no encontrado');
      return;
    }

    const stat = fs.statSync(safePath);
    if (stat.isDirectory()) {
      const archiveName = await filesService.compress(filePath, 'zip');
      const safeArchivePath = path.join(path.dirname(safePath), archiveName);
      res.download(safeArchivePath, archiveName, (err) => {
        if (!err) {
          fs.unlink(safeArchivePath, () => {});
        }
      });
      return;
    }

    res.download(safePath, path.basename(safePath));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al descargar';
    res.status(500).send(message);
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
    const output = await filesService.gitPush(folderPath || '', repoUrl, token, commitMsg, branch);
    res.json({ success: true, output });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error en Git Push';
    res.status(500).json({ error: message });
  }
});

export default router;
