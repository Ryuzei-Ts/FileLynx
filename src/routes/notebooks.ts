import { Router, Request, Response } from 'express';
import { notebooksService } from '#services/notebooks';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  res.json({ notebooks: notebooksService.list() });
});

router.get('/:id', (req: Request, res: Response): void => {
  const nb = notebooksService.get(req.params.id);
  if (!nb) {
    res.status(404).json({ error: 'Notebook no encontrado' });
    return;
  }
  res.json(nb);
});

router.post('/save', (req: Request, res: Response): void => {
  const saved = notebooksService.save(req.body);
  res.json(saved);
});

router.delete('/:id', (req: Request, res: Response): void => {
  notebooksService.delete(req.params.id);
  res.json({ success: true });
});

router.post('/execute-cell', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    const output = await notebooksService.runCodeCell(code || '');
    res.json({ output });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fallo de ejecución';
    res.status(500).json({ error: message });
  }
});

export default router;
