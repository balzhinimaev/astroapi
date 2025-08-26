import { NextFunction, Request, Response } from 'express';

const HEADER_NAME = 'x-n8n-token';

export function requireN8nToken(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.N8N_TOKEN;
  if (!expected) {
    res.status(500).json({ error: 'N8N_TOKEN is not configured' });
    return;
  }

  const provided = req.header(HEADER_NAME);
  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}


