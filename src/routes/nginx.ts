import { Router, Request, Response } from 'express';
import { nginxService } from '#services/nginx';

const router = Router();

router.get('/list', async (_req: Request, res: Response): Promise<void> => {
  try {
    const isInstalled = await nginxService.isNginxInstalled();
    if (!isInstalled) {
      res.json({ installed: false, domains: [] });
      return;
    }
    const domains = await nginxService.listDomains();
    res.json({ installed: true, domains });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const { domain, targetPort = 3000, email, autoSsl } = req.body;
    if (!domain) {
      res.status(400).json({ error: 'Debes indicar un dominio válido.' });
      return;
    }

    await nginxService.createDomainProxy(domain, Number(targetPort) || 3000);

    let sslOutput = '';
    if (autoSsl) {
      try {
        sslOutput = await nginxService.issueSsl(domain, email);
      } catch (sslErr: any) {
        res.json({
          success: true,
          warning: 'Proxy Nginx creado pero falló Certbot SSL: ' + sslErr.message,
        });
        return;
      }
    }

    res.json({ success: true, sslOutput });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/issue-ssl', async (req: Request, res: Response): Promise<void> => {
  try {
    const { domain, email } = req.body;
    if (!domain) {
      res.status(400).json({ error: 'Dominio requerido' });
      return;
    }
    const output = await nginxService.issueSsl(domain, email);
    res.json({ success: true, output });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/delete', async (req: Request, res: Response): Promise<void> => {
  try {
    const domain = req.query.domain as string;
    if (!domain) {
      res.status(400).json({ error: 'Dominio requerido' });
      return;
    }
    await nginxService.deleteDomain(domain);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
