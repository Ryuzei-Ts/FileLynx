import { Router } from 'express';
import { authService } from '#services/auth';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const sessionData = authService.login(username, password);
  if (!sessionData) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.user = sessionData;
  return res.json({ success: true, user: sessionData });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get('/me', (req, res) => {
  if (req.session.user) {
    return res.json({ authenticated: true, user: req.session.user });
  }
  return res.json({ authenticated: false });
});

export default router;
