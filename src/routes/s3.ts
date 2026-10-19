import { Router } from 'express';
import { s3Service } from '#services/s3';

const router = Router();

router.post('/list', async (req, res) => {
  try {
    const { region, endpoint, accessKeyId, secretAccessKey, bucket } = req.body;
    const contents = await s3Service.listBucket({ region, endpoint, accessKeyId, secretAccessKey, bucket });
    res.json({ contents });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
