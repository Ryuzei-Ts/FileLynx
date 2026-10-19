import { Router } from 'express';
import { systemService } from '#services/system';

const router = Router();

router.get('/metrics', (_req, res) => {
  res.json(systemService.getMetrics());
});

export default router;
