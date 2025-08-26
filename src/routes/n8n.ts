import { Router, Request, Response } from 'express';
import { requireN8nToken } from '../middleware/authHeader';
import { UserModel } from '../models/User';
import { geocodePlace } from '../services/yandexGeocoder';

const router = Router();

router.post('/users', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.body as { telegramId?: string | number };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const telegramIdStr = String(telegramId);

    const user = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $setOnInsert: { telegramId: telegramIdStr } },
      { new: true, upsert: true }
    ).lean();

    res.status(200).json({ ok: true, user });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/geocode', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { query, telegramId } = req.body as { query?: string; telegramId?: string | number };
    if (!query || !query.trim()) {
      res.status(400).json({ error: 'query is required (город или населенный пункт)' });
      return;
    }
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const result = await geocodePlace(query.trim());
    if (!result) {
      res.status(404).json({ error: 'not found' });
      return;
    }

    const telegramIdStr = String(telegramId);
    await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      {
        $set: { lastGeocode: result },
        $setOnInsert: { telegramId: telegramIdStr },
      },
      { new: true, upsert: true }
    ).lean();

    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/geocode', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/users/name', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, name } = req.body as { telegramId?: string | number; name?: string };
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      {
        $set: { name: name.trim() },
        $setOnInsert: { telegramId: telegramIdStr },
      },
      { new: true, upsert: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/name', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;



