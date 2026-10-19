import { Router } from 'express';
import { filesService } from '#services/files';

const router = Router();

router.get('/list', async (req, res) => {
  try {
    const targetPath = (req.query.path as string) || '';
    const files = await filesService.list(targetPath);
    res.json({ files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/read', async (req, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });
    const content = await filesService.read(filePath);
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/save', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });
    await filesService.write(filePath, content ?? '');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/delete', async (req, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });
    await filesService.remove(filePath);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/folder', async (req, res) => {
  try {
    const { path: folderPath } = req.body;
    if (!folderPath) return res.status(400).json({ error: 'Folder path is required' });
    await filesService.createDirectory(folderPath);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
