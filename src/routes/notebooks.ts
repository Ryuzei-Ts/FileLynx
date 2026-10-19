import { Router } from 'express';
import { notebooksService } from '#services/notebooks';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ notebooks: notebooksService.list() });
});

router.get('/:id', (req, res) => {
  const nb = notebooksService.get(req.params.id);
  if (!nb) return res.status(404).json({ error: 'Notebook not found' });
  res.json(nb);
});

router.post('/save', (req, res) => {
  const saved = notebooksService.save(req.body);
  res.json(saved);
});

router.delete('/:id', (req, res) => {
  notebooksService.delete(req.params.id);
  res.json({ success: true });
});

export default router;
