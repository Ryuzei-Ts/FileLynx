import { Router } from 'express';
import { searchService } from '#services/search';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const query = req.query.q as string;
    const subPath = (req.query.path as string) || '';
    if (!query) return res.json({ results: [] });
    const results = await searchService.search(query, subPath);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
