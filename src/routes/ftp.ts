import { Router } from 'express';
import { ftpService } from '#services/ftp';

const router = Router();

router.post('/list', async (req, res) => {
  try {
    const { host, user, password, port, remotePath } = req.body;
    const list = await ftpService.listRemote(
      { host, user, password, port: port ? Number(port) : 21 },
      remotePath || '/'
    );
    res.json({ list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
