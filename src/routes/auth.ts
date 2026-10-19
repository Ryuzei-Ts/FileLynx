import { Router, Request, Response } from 'express';
import { authService } from '#services/auth';

const router = Router();

router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const sessionData = authService.login(username, password);
  if (!sessionData) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  req.session.user = sessionData;
  res.json({ success: true, user: sessionData });
});

router.post('/logout', (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get('/me', (req: Request, res: Response): void => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
    return;
  }
  res.json({ authenticated: false });
});

export default router;
