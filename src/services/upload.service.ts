import multer from 'multer';
import { resolveSafePath } from '#utils/paths';

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const targetFolder = (req.query.path as string) || '';
    try {
      const destination = resolveSafePath(targetFolder);
      cb(null, destination);
    } catch (err) {
      cb(err as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  },
});

export const uploadService = multer({ storage });
