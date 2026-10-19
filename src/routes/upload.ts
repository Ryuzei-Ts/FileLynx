import { Router } from 'express';
import { uploadService } from '#services/upload';

const router = Router();

router.post('/', uploadService.array('files'), (req, res) => {
  res.json({
    success: true,
    uploadedCount: (req.files as Express.Multer.File[])?.length || 0,
  });
});

export default router;
