import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';

import n8nRouter from './routes/n8n';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/n8n', n8nRouter);

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found', path: req.path });
  });

  return app;
}


