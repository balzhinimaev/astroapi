import { Router, Request, Response } from 'express';
import { requireN8nToken } from '../middleware/authHeader';
import { UserModel } from '../models/User';
import { geocodePlace } from '../services/yandexGeocoder';
import tzLookup from 'tz-lookup';

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
      { $setOnInsert: { telegramId: telegramIdStr, status: 'registered' } },
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
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }
    const timeZone = tzLookup(result.lat, result.lon);
    // вычисляем смещение в часах через Intl API (UTC offset, включая половинные зоны)
    const now = new Date();
    const tzDate = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
    }).formatToParts(now);
    const off = tzDate.find((p) => p.type === 'timeZoneName')?.value || 'UTC+0';
    const sign = off.includes('-') ? -1 : 1;
    const match = off.match(/(?:UTC|GMT)[+-](\d{1,2})(?::(\d{2}))?/);
    let tzone = 0;
    if (match) {
      const h = parseInt(match[1], 10) || 0;
      const m = parseInt(match[2] || '0', 10) || 0;
      tzone = sign * (h + m / 60);
    }

    await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: { lastGeocode: { ...result, timeZone, tzone } } },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, ...result, timeZone, tzone });
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
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }
    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: { name: name.trim() } },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/name', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/users/status', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, status } = req.body as {
      telegramId?: string | number;
      status?:
        | 'idle'
        | 'awaiting_name'
        | 'awaiting_birthdate'
        | 'awaiting_birthhour'
        | 'awaiting_birthminute'
        | 'awaiting_city';
    };
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }
    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const existing = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!existing) {
      res.status(404).json({ error: 'user not found' });
      return;
    }
    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: { status, statusUpdatedAt: new Date() } },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/status', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/users/:telegramId', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const telegramId = req.params.telegramId;
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }
    const user = await UserModel.findOne({ telegramId: String(telegramId) }).lean();
    if (!user) {
      res.status(404).json({ ok: false, exists: false });
      return;
    }
    res.status(200).json({ ok: true, exists: true, user });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in GET /n8n/users/:telegramId', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/users/birthdate', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, birthDate } = req.body as { telegramId?: string | number; birthDate?: string };
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }
    if (!birthDate || !birthDate.trim()) {
      res.status(400).json({ error: 'birthDate is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: { birthDate: birthDate.trim() } },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/birthdate', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/users/birthhour', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, birthHour } = req.body as { telegramId?: string | number; birthHour?: number | string };
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }
    if (birthHour === undefined || birthHour === null || String(birthHour).trim() === '') {
      res.status(400).json({ error: 'birthHour is required' });
      return;
    }

    const hour = Number(birthHour);
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
      res.status(400).json({ error: 'birthHour must be an integer between 0 and 23' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: { birthHour: hour } },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/birthhour', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/users/birthminute', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, birthMinute } = req.body as { telegramId?: string | number; birthMinute?: number | string };
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }
    if (birthMinute === undefined || birthMinute === null || String(birthMinute).trim() === '') {
      res.status(400).json({ error: 'birthMinute is required' });
      return;
    }

    const minute = Number(birthMinute);
    if (!Number.isFinite(minute) || minute < 0 || minute > 59) {
      res.status(400).json({ error: 'birthMinute must be an integer between 0 and 59' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: { birthMinute: minute } },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/birthminute', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/users/profile-complete', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, isProfileComplete } = req.body as { telegramId?: string | number; isProfileComplete?: boolean | string };
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }
    if (isProfileComplete === undefined || isProfileComplete === null) {
      res.status(400).json({ error: 'isProfileComplete is required' });
      return;
    }

    const value = typeof isProfileComplete === 'string'
      ? ['true', '1', 'yes', 'on'].includes(isProfileComplete.toLowerCase())
      : Boolean(isProfileComplete);

    const telegramIdStr = String(telegramId);
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: { isProfileComplete: value } },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/profile-complete', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/users/partner/birthdate', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, birthDate } = req.body as { telegramId?: string | number; birthDate?: string };
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }
    if (!birthDate || !birthDate.trim()) {
      res.status(400).json({ error: 'birthDate is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: { 'partner.birthDate': birthDate.trim() } },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/partner/birthdate', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/users/partner/birthhour', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, birthHour } = req.body as { telegramId?: string | number; birthHour?: number | string };
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }
    if (birthHour === undefined || birthHour === null || String(birthHour).trim() === '') {
      res.status(400).json({ error: 'birthHour is required' });
      return;
    }

    const hour = Number(birthHour);
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
      res.status(400).json({ error: 'birthHour must be an integer between 0 and 23' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: { 'partner.birthHour': hour } },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/partner/birthhour', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/users/partner/birthminute', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, birthMinute } = req.body as { telegramId?: string | number; birthMinute?: number | string };
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }
    if (birthMinute === undefined || birthMinute === null || String(birthMinute).trim() === '') {
      res.status(400).json({ error: 'birthMinute is required' });
      return;
    }

    const minute = Number(birthMinute);
    if (!Number.isFinite(minute) || minute < 0 || minute > 59) {
      res.status(400).json({ error: 'birthMinute must be an integer between 0 and 59' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: { 'partner.birthMinute': minute } },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/partner/birthminute', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/users/partner/geocode', requireN8nToken, async (req: Request, res: Response) => {
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
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }
    const timeZone = tzLookup(result.lat, result.lon);
    const now = new Date();
    const tzDate = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
    }).formatToParts(now);
    const off = tzDate.find((p) => p.type === 'timeZoneName')?.value || 'UTC+0';
    const sign = off.includes('-') ? -1 : 1;
    const match = off.match(/(?:UTC|GMT)[+-](\d{1,2})(?::(\d{2}))?/);
    let tzone = 0;
    if (match) {
      const h = parseInt(match[1], 10) || 0;
      const m = parseInt(match[2] || '0', 10) || 0;
      tzone = sign * (h + m / 60);
    }

    await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: { 'partner.geocode': { ...result, timeZone, tzone } } },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, ...result, timeZone, tzone });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/partner/geocode', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;



