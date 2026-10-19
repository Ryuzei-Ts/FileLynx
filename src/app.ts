import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '#config';

import authRouter from '#routes/auth';
import filesRouter from '#routes/files';
import uploadRouter from '#routes/upload';
import searchRouter from '#routes/search';
import systemRouter from '#routes/system';
import notebooksRouter from '#routes/notebooks';
import ftpRouter from '#routes/ftp';
import s3Router from '#routes/s3';

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use('/public', express.static(path.resolve('public')));
app.use(express.static(path.resolve('frontend')));

app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/search', searchRouter);
app.use('/api/system', systemRouter);
app.use('/api/notebooks', notebooksRouter);
app.use('/api/ftp', ftpRouter);
app.use('/api/s3', s3Router);

app.get('/:category', (req: Request, res: Response, next: NextFunction) => {
  const { category } = req.params;

  if (category === 'api' || category === 'admin' || category === 'favicon.ico' || category.includes('.')) {
    return next();
  }

  const categoryPath = path.join(process.cwd(), 'servicios', category);

  if (fs.existsSync(categoryPath) && fs.statSync(categoryPath).isDirectory()) {
    const customHtml = path.join(process.cwd(), 'public', 'category.html');
    if (fs.existsSync(customHtml)) {
      return res.sendFile(customHtml);
    }
  }

  const spaRoutes = ['files', 'terminal', 'notebooks', 'ftp', 's3'];
  if (spaRoutes.includes(category.toLowerCase())) {
    return res.sendFile(path.join(process.cwd(), 'frontend', 'index.html'));
  }

  next();
});
