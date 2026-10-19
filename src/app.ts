import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import path from 'node:path';
import { config } from '#config';
import { logger } from '#utils/logger';

import authRouter from '#routes/auth';
import filesRouter from '#routes/files';
import uploadRouter from '#routes/upload';
import searchRouter from '#routes/search';
import systemRouter from '#routes/system';
import notebooksRouter from '#routes/notebooks';
import ftpRouter from '#routes/ftp';
import s3Router from '#routes/s3';
import nginxRouter from '#routes/nginx';

process.on('uncaughtException', (err: Error) => {
  logger.error('CRASH PREVENIDO [uncaughtException]:', err.message);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('CRASH PREVENIDO [unhandledRejection]:', reason);
});

export const app = express();

app.disable('x-powered-by');

const ipRateLimits = new Map<string, { count: number; expiresAt: number }>();

app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 300;

  const current = ipRateLimits.get(clientIp);

  if (!current || now > current.expiresAt) {
    ipRateLimits.set(clientIp, { count: 1, expiresAt: now + windowMs });
  } else {
    current.count++;
    if (current.count > maxRequests) {
      res.status(429).json({ error: 'Demasiadas solicitudes. Intenta en un momento.' });
      return;
    }
  }

  if (ipRateLimits.size > 10000) {
    for (const [key, value] of ipRateLimits.entries()) {
      if (now > value.expiresAt) ipRateLimits.delete(key);
    }
  }

  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  const rawUrl = decodeURIComponent(req.originalUrl || req.url);
  if (rawUrl.includes('\0') || /(\.\.[\/\\])/.test(rawUrl)) {
    res.status(400).json({ error: 'Petición bloqueada por seguridad' });
    return;
  }

  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'JSON malformado recibido' });
    return;
  }
  next(err);
});

app.use(
  session({
    name: '__flx_sid',
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
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
app.use('/api/nginx', nginxRouter);

app.get(['/files/*', '/:section'], (req: Request, res: Response, next: NextFunction) => {
  const section = req.params.section || (req.path.startsWith('/files') ? 'files' : '');

  if (section === 'api' || section === 'public' || section.includes('.')) {
    return next();
  }

  const spaRoutes = ['files', 'terminal', 'notebooks', 'ftp', 's3', 'changelog', 'domains'];
  if (spaRoutes.includes(section.toLowerCase()) || req.path.startsWith('/files')) {
    return res.sendFile(path.join(process.cwd(), 'frontend', 'index.html'));
  }

  next();
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const msg = err instanceof Error ? err.message : 'Error interno del servidor';
  logger.error(`[Error en ${req.method} ${req.url}]:`, msg);
  res.status(500).json({ error: 'Ocurrió un error en el servidor.' });
});
