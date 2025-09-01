import { Router, Request, Response } from 'express';
import { requireN8nToken } from '../middleware/authHeader';
import { UserModel } from '../models/User';
import { geocodePlace } from '../services/yandexGeocoder';
import { yesNoTarot, romanticPersonalityReportTropical, personalityReportTropical, karmaDestinyReportTropical, getMoonPhaseReportByTelegramId, checkAndUpdateFreeRequest, tarotPredictions } from '../services/astrologyApi';
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

router.post('/users/subscription', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const {
      telegramId,
      type,
      paymentMethod,
      paymentId,
    } = req.body as {
      telegramId?: string | number;
      type?: 'monthly' | 'yearly' | 'trial' | 'lifetime';
      paymentMethod?: string;
      paymentId?: string;
    };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    const updateData: any = {};

    // Принудительные значения подписки: активная, месяц с текущего момента, без автопродления
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    updateData['subscription.status'] = 'active';
    updateData['subscription.startDate'] = start;
    updateData['subscription.endDate'] = end;
    updateData['subscription.autoRenew'] = false;

    if (type) {
      updateData['subscription.type'] = type;
    }

    if (paymentMethod !== undefined) {
      updateData['subscription.paymentMethod'] = paymentMethod;
    }

    if (paymentId !== undefined) {
      updateData['subscription.paymentId'] = paymentId;
    }

    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: updateData },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/subscription', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/users/:telegramId/subscription', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const telegramId = req.params.telegramId;
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const user = await UserModel.findOne(
      { telegramId: String(telegramId) },
      { subscription: 1, telegramId: 1, status: 1 }
    ).lean();

    if (!user) {
      res.status(404).json({ ok: false, exists: false });
      return;
    }

    const now = new Date();
    const subscription = user.subscription || {};

    // Check if subscription is expired
    if (subscription.status === 'active' && subscription.endDate && subscription.endDate < now) {
      await UserModel.findOneAndUpdate(
        { telegramId: String(telegramId) },
        { $set: { 'subscription.status': 'expired' } }
      );
      subscription.status = 'expired';
    }

    res.status(200).json({
      ok: true,
      exists: true,
      user: { status: user.status },
      subscription: {
        status: subscription.status || 'inactive',
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        type: subscription.type,
        paymentMethod: subscription.paymentMethod,
        autoRenew: subscription.autoRenew !== false,
        cancelledAt: subscription.cancelledAt,
        paymentId: subscription.paymentId,
        isActive: subscription.status === 'active' && (!subscription.endDate || subscription.endDate >= now),
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in GET /n8n/users/:telegramId/subscription', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/users/subscription/cancel', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.body as { telegramId?: string | number };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    const now = new Date();
    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      {
        $set: {
          'subscription.status': 'cancelled',
          'subscription.cancelledAt': now,
          'subscription.autoRenew': false,
        }
      },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/subscription/cancel', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/astro/yes-no-tarot', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, language } = req.body as { telegramId?: string | number; language?: string };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const telegramIdStr = String(telegramId);

    // Проверяем и обновляем бесплатный запрос
    const { canUse, isFree } = await checkAndUpdateFreeRequest(telegramIdStr, 'yesNoTarot');
    
    if (!canUse) {
      res.status(403).json({ 
        error: 'Free request limit exceeded. Please subscribe to continue using this feature.',
        limitExceeded: true 
      });
      return;
    }

    const randomTarotId = Math.floor(Math.random() * 22) + 1; // 1..22
    const lang = (language && String(language).trim()) || 'russian';
    const response = await yesNoTarot(randomTarotId, lang);
    
    res.status(200).json({ 
      ok: true, 
      tarotId: randomTarotId, 
      result: response,
      isFreeRequest: isFree 
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/astro/yes-no-tarot', error);
    res.status(500).json({ error: 'External API error' });
  }
});

router.post('/astro/romantic-personality', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, house_type } = req.body as {
      telegramId?: string | number;
      house_type?: 'placidus' | 'koch' | 'porphyry' | 'equal_house' | string;
    };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const user = await UserModel.findOne(
      { telegramId: telegramIdStr },
      {
        birthDate: 1,
        birthHour: 1,
        birthMinute: 1,
        lastGeocode: 1,
        _id: 0,
      }
    ).lean();

    if (!user) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    if (!user.birthDate) {
      res.status(400).json({ error: 'birthDate is missing' });
      return;
    }
    if (user.birthHour === undefined || user.birthHour === null) {
      res.status(400).json({ error: 'birthHour is missing' });
      return;
    }
    if (user.birthMinute === undefined || user.birthMinute === null) {
      res.status(400).json({ error: 'birthMinute is missing' });
      return;
    }
    if (!user.lastGeocode || user.lastGeocode.lat === undefined || user.lastGeocode.lon === undefined) {
      res.status(400).json({ error: 'geocode is missing (lat/lon)' });
      return;
    }
    if (user.lastGeocode.tzone === undefined || user.lastGeocode.tzone === null) {
      res.status(400).json({ error: 'tzone is missing' });
      return;
    }

    const normalizeBirthDate = (input: string) => {
      const s = String(input).trim();
      let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        return { year: y, month: mo, day: d };
      }
      m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
      if (m) {
        const d = Number(m[1]);
        const mo = Number(m[2]);
        const y = Number(m[3]);
        return { year: y, month: mo, day: d };
      }
      return null;
    };

    const parsed = normalizeBirthDate(String(user.birthDate));
    if (!parsed || !Number.isFinite(parsed.year) || !Number.isFinite(parsed.month) || !Number.isFinite(parsed.day)) {
      res.status(400).json({ error: 'birthDate must be in YYYY-MM-DD or DD-MM-YYYY (also / or .) format' });
      return;
    }
    const { year, month, day } = parsed;

    // Простая проверка диапазонов
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      res.status(400).json({ error: 'birthDate values are out of valid range' });
      return;
    }

    const payload = {
      day,
      month,
      year,
      hour: Number(user.birthHour),
      min: Number(user.birthMinute),
      lat: Number(user.lastGeocode.lat),
      lon: Number(user.lastGeocode.lon),
      tzone: Number(user.lastGeocode.tzone),
      house_type: house_type || 'placidus',
    } as const;

    const result = await romanticPersonalityReportTropical(payload);
    res.status(200).json({ ok: true, payload, result });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/astro/romantic-personality', error);
    res.status(500).json({ error: 'External API error' });
  }
});

router.post('/astro/personality', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, language, house_type } = req.body as {
      telegramId?: string | number;
      language?: string;
      house_type?: string;
    };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const telegramIdStr = String(telegramId);

    // Проверяем и обновляем бесплатный запрос
    const { canUse, isFree } = await checkAndUpdateFreeRequest(telegramIdStr, 'personality');
    
    if (!canUse) {
      res.status(403).json({ 
        error: 'Free request limit exceeded. Please subscribe to continue using this feature.',
        limitExceeded: true 
      });
      return;
    }

    const user = await UserModel.findOne(
      { telegramId: telegramIdStr },
      {
        birthDate: 1,
        birthHour: 1,
        birthMinute: 1,
        lastGeocode: 1,
        _id: 0,
      }
    ).lean();

    if (!user) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    // Validate required fields
    if (!user.birthDate) { res.status(400).json({ error: 'birthDate is missing' }); return; }
    if (user.birthHour === undefined || user.birthHour === null) { res.status(400).json({ error: 'birthHour is missing' }); return; }
    if (user.birthMinute === undefined || user.birthMinute === null) { res.status(400).json({ error: 'birthMinute is missing' }); return; }
    if (!user.lastGeocode || user.lastGeocode.lat === undefined || user.lastGeocode.lon === undefined) { res.status(400).json({ error: 'geocode is missing (lat/lon)' }); return; }
    if (user.lastGeocode.tzone === undefined || user.lastGeocode.tzone === null) { res.status(400).json({ error: 'tzone is missing' }); return; }

    const normalizeDate = (input: string) => {
      const s = String(input).trim();
      let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
      if (m) return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
      m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
      if (m) return { year: Number(m[3]), month: Number(m[2]), day: Number(m[1]) };
      return null;
    };

    const parsed = normalizeDate(String(user.birthDate));
    if (!parsed) { res.status(400).json({ error: 'birthDate must be in YYYY-MM-DD or DD-MM-YYYY (also / or .) format' }); return; }

    const { year, month, day } = parsed;

    // Простая проверка диапазонов
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      res.status(400).json({ error: 'birthDate values are out of valid range' });
      return;
    }

    const payload = {
      day,
      month,
      year,
      hour: Number(user.birthHour),
      min: Number(user.birthMinute),
      lat: Number(user.lastGeocode.lat),
      lon: Number(user.lastGeocode.lon),
      tzone: Number(user.lastGeocode.tzone),
      house_type: house_type || 'placidus',
    } as const;

    const result = await personalityReportTropical(payload, language);
    res.status(200).json({ 
      ok: true, 
      payload, 
      result,
      isFreeRequest: isFree 
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/astro/personality', error);
    res.status(500).json({ error: 'External API error' });
  }
});

router.post('/astro/karma-destiny', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, language } = req.body as {
      telegramId?: string | number;
      language?: string;
    };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const user = await UserModel.findOne(
      { telegramId: telegramIdStr },
      {
        birthDate: 1,
        birthHour: 1,
        birthMinute: 1,
        lastGeocode: 1,
        partner: 1,
        _id: 0,
      }
    ).lean();

    if (!user) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    // Validate primary person
    if (!user.birthDate) { res.status(400).json({ error: 'birthDate is missing' }); return; }
    if (user.birthHour === undefined || user.birthHour === null) { res.status(400).json({ error: 'birthHour is missing' }); return; }
    if (user.birthMinute === undefined || user.birthMinute === null) { res.status(400).json({ error: 'birthMinute is missing' }); return; }
    if (!user.lastGeocode || user.lastGeocode.lat === undefined || user.lastGeocode.lon === undefined) { res.status(400).json({ error: 'geocode is missing (lat/lon)' }); return; }
    if (user.lastGeocode.tzone === undefined || user.lastGeocode.tzone === null) { res.status(400).json({ error: 'tzone is missing' }); return; }

    // Validate secondary (partner)
    const partner = user.partner || {};
    if (!partner.birthDate) { res.status(400).json({ error: 'partner.birthDate is missing' }); return; }
    if (partner.birthHour === undefined || partner.birthHour === null) { res.status(400).json({ error: 'partner.birthHour is missing' }); return; }
    if (partner.birthMinute === undefined || partner.birthMinute === null) { res.status(400).json({ error: 'partner.birthMinute is missing' }); return; }
    if (!partner.geocode || partner.geocode.lat === undefined || partner.geocode.lon === undefined) { res.status(400).json({ error: 'partner.geocode is missing (lat/lon)' }); return; }
    if (partner.geocode.tzone === undefined || partner.geocode.tzone === null) { res.status(400).json({ error: 'partner.tzone is missing' }); return; }

    const normalizeDate = (input: string) => {
      const s = String(input).trim();
      let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
      if (m) return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
      m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
      if (m) return { year: Number(m[3]), month: Number(m[2]), day: Number(m[1]) };
      return null;
    };

    const p = normalizeDate(String(user.birthDate));
    const s = normalizeDate(String(partner.birthDate));
    if (!p || !s) { res.status(400).json({ error: 'birthDate must be in YYYY-MM-DD or DD-MM-YYYY (also / or .) format' }); return; }

    const payload = {
      p_day: p.day,
      p_month: p.month,
      p_year: p.year,
      p_hour: Number(user.birthHour),
      p_min: Number(user.birthMinute),
      p_lat: Number(user.lastGeocode.lat),
      p_lon: Number(user.lastGeocode.lon),
      p_tzone: Number(user.lastGeocode.tzone),
      s_day: s.day,
      s_month: s.month,
      s_year: s.year,
      s_hour: Number(partner.birthHour),
      s_min: Number(partner.birthMinute),
      s_lat: Number(partner.geocode.lat),
      s_lon: Number(partner.geocode.lon),
      s_tzone: Number(partner.geocode.tzone),
    } as const;

    const result = await karmaDestinyReportTropical(payload, language);
    res.status(200).json({ ok: true, payload, result });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/astro/karma-destiny', error);
    res.status(500).json({ error: 'External API error' });
  }
});

// Роут для установки активного расклада
router.post('/users/active-spread', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { 
      telegramId, 
      spreadType, 
      spreadData 
    } = req.body as { 
      telegramId?: string | number; 
      spreadType?: string;
      spreadData?: any;
    };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    if (!spreadType) {
      res.status(400).json({ error: 'spreadType is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    const updateData: any = {
      activeSpread: spreadType,
      activeSpreadStartedAt: new Date()
    };

    if (spreadData !== undefined) {
      updateData.activeSpreadData = spreadData;
    }

    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: updateData },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/active-spread', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Роут для получения активного расклада пользователя
router.get('/users/:telegramId/active-spread', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const telegramId = req.params.telegramId;
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const user = await UserModel.findOne(
      { telegramId: String(telegramId) },
      { activeSpread: 1, activeSpreadData: 1, activeSpreadStartedAt: 1, telegramId: 1 }
    ).lean();

    if (!user) {
      res.status(404).json({ ok: false, exists: false });
      return;
    }

    res.status(200).json({
      ok: true,
      exists: true,
      activeSpread: user.activeSpread || null,
      activeSpreadData: user.activeSpreadData || null,
      activeSpreadStartedAt: user.activeSpreadStartedAt || null
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in GET /n8n/users/:telegramId/active-spread', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Роут для завершения активного расклада
router.post('/users/active-spread/complete', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { 
      telegramId, 
      resultData 
    } = req.body as { 
      telegramId?: string | number; 
      resultData?: any;
    };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    // Сохраняем результат расклада в activeSpreadData перед очисткой
    const updateData: any = {};
    
    if (resultData !== undefined && exists.activeSpreadData) {
      updateData.activeSpreadData = {
        ...exists.activeSpreadData,
        result: resultData,
        completedAt: new Date()
      };
    }

    // Очищаем активный расклад
    updateData.activeSpread = 'none';
    updateData.activeSpreadStartedAt = null;

    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: updateData },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/active-spread/complete', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Роут для очистки активного расклада (без сохранения результата)
router.post('/users/active-spread/clear', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.body as { telegramId?: string | number };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
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
      { 
        $set: {
          activeSpread: 'none',
          activeSpreadStartedAt: null,
          activeSpreadData: null
        }
      },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/active-spread/clear', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Роут для обновления данных активного расклада
router.post('/users/active-spread/update-data', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { 
      telegramId, 
      spreadData 
    } = req.body as { 
      telegramId?: string | number; 
      spreadData?: any;
    };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    if (spreadData === undefined) {
      res.status(400).json({ error: 'spreadData is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const exists = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!exists) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    if (!exists.activeSpread || exists.activeSpread === 'none') {
      res.status(400).json({ error: 'user has no active spread' });
      return;
    }

    const updated = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $set: { activeSpreadData: spreadData } },
      { new: true }
    ).lean();

    res.status(200).json({ ok: true, user: updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/active-spread/update-data', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Роут для получения отчета о фазах луны
router.post('/moon-phase-report', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, language } = req.body as { telegramId?: string | number; language?: string };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const lang = language || 'russian';

    console.log(`[Moon Phase Report] Request for telegramId: ${telegramIdStr}, language: ${lang}`);

    try {
      const report = await getMoonPhaseReportByTelegramId(telegramIdStr, lang);
      console.log(`[Moon Phase Report] Success for telegramId: ${telegramIdStr}`);
      res.status(200).json({ ok: true, report });
    } catch (error) {
      console.error(`[Moon Phase Report] Error for telegramId ${telegramIdStr}:`, error);
      
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          res.status(404).json({ error: 'User not found' });
          return;
        }
        if (error.message.includes('User profile is incomplete')) {
          res.status(400).json({ error: 'User profile is incomplete. Missing birth date, time, or location data.' });
          return;
        }
        if (error.message.includes('Invalid birth date format')) {
          res.status(400).json({ error: error.message });
          return;
        }
        if (error.message.includes('Invalid birth date values') || error.message.includes('Birth date values are out of valid range')) {
          res.status(400).json({ error: 'Invalid birth date values. Please check the date format and values.' });
          return;
        }
        if (error.message.includes('Astrology API credentials are not configured')) {
          res.status(500).json({ error: 'Astrology API is not configured properly' });
          return;
        }
        if (error.message.includes('Astrology API error')) {
          res.status(500).json({ error: 'External astrology API error' });
          return;
        }
      }
      throw error;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/moon-phase-report', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Роут для проверки доступности бесплатного запроса на да-нет
router.get('/astro/yes-no-status', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.query as { telegramId?: string | number };
    
    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required as query parameter' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const user = await UserModel.findOne(
      { telegramId: telegramIdStr },
      { 
        'freeRequests.yesNoTarot': 1, 
        'subscription.status': 1,
        telegramId: 1,
        _id: 0 
      }
    ).lean();

    if (!user) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    const hasFreeRequest = user.freeRequests?.yesNoTarot === true;
    const hasActiveSubscription = user.subscription?.status === 'active';
    const canUse = hasFreeRequest || hasActiveSubscription;

    res.status(200).json({
      ok: true,
      telegramId: telegramIdStr,
      hasFreeRequest,
      hasActiveSubscription,
      canUse,
      message: canUse 
        ? 'Yes-No Tarot is available' 
        : 'Yes-No Tarot requires subscription or free request'
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in GET /n8n/astro/yes-no-status', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Роут для миграции бесплатных запросов (временно)
router.post('/migrate/free-requests', requireN8nToken, async (req: Request, res: Response) => {
  try {
    // Обновляем всех пользователей, у которых freeRequests.yesNoTarot не установлено
    const result = await UserModel.updateMany(
      { 
        $or: [
          { 'freeRequests.yesNoTarot': { $exists: false } },
          { 'freeRequests.yesNoTarot': false }
        ]
      },
      { 
        $set: { 
          'freeRequests.yesNoTarot': true,
          'freeRequests.personality': true
        } 
      }
    );

    res.status(200).json({
      ok: true,
      message: 'Migration completed',
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/migrate/free-requests', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Роут для получения предсказаний таро (любовь, карьера, финансы)
router.post('/astro/tarot-predictions', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, language } = req.body as { telegramId?: string | number; language?: string };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const lang = (language && String(language).trim()) || 'russian';

    // Получаем предсказания таро с случайными значениями
    const predictions = await tarotPredictions(lang);
    
    res.status(200).json({ 
      ok: true, 
      predictions,
      language: lang
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/astro/tarot-predictions', error);
    res.status(500).json({ error: 'External API error' });
  }
});

// Роут для сброса заполненных данных пользователя
router.post('/users/reset-data', requireN8nToken, async (req: Request, res: Response) => {
  try {
    const { telegramId, resetType } = req.body as { 
      telegramId?: string | number; 
      resetType?: 'profile' | 'partner' | 'location' | 'all' 
    };

    if (!telegramId) {
      res.status(400).json({ error: 'telegramId is required' });
      return;
    }

    const telegramIdStr = String(telegramId);
    const resetTypeValue = resetType || 'all';

    // Проверяем существование пользователя
    const existingUser = await UserModel.findOne({ telegramId: telegramIdStr }).lean();
    if (!existingUser) {
      res.status(404).json({ error: 'user not found' });
      return;
    }

    let updateFields: any = {};

    switch (resetTypeValue) {
      case 'profile':
        // Сброс только профиля пользователя
        updateFields = {
          name: undefined,
          birthDate: undefined,
          birthHour: undefined,
          birthMinute: undefined,
          isProfileComplete: false,
          status: 'awaiting_name',
          statusUpdatedAt: new Date()
        };
        break;

      case 'partner':
        // Сброс только данных партнера
        updateFields = {
          'partner.birthDate': undefined,
          'partner.birthHour': undefined,
          'partner.birthMinute': undefined,
          'partner.geocode': undefined,
          status: 'awaiting_partner_name',
          statusUpdatedAt: new Date()
        };
        break;

      case 'location':
        // Сброс только геолокации
        updateFields = {
          lastGeocode: undefined,
          status: 'awaiting_city',
          statusUpdatedAt: new Date()
        };
        break;

      case 'all':
      default:
        // Полный сброс всех данных (кроме telegramId, subscription и freeRequests)
        updateFields = {
          name: undefined,
          birthDate: undefined,
          birthHour: undefined,
          birthMinute: undefined,
          isProfileComplete: false,
          'partner.birthDate': undefined,
          'partner.birthHour': undefined,
          'partner.birthMinute': undefined,
          'partner.geocode': undefined,
          lastGeocode: undefined,
          activeSpread: 'none',
          activeSpreadData: undefined,
          activeSpreadStartedAt: undefined,
          status: 'awaiting_name',
          statusUpdatedAt: new Date()
        };
        break;
    }

    // Удаляем undefined поля из объекта
    const cleanUpdateFields = Object.fromEntries(
      Object.entries(updateFields).filter(([_, value]) => value !== undefined)
    );

    // Обновляем пользователя
    const updatedUser = await UserModel.findOneAndUpdate(
      { telegramId: telegramIdStr },
      { $unset: cleanUpdateFields },
      { new: true }
    ).lean();

    res.status(200).json({
      ok: true,
      message: `Data reset successful for type: ${resetTypeValue}`,
      resetType: resetTypeValue,
      user: updatedUser
    });

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /n8n/users/reset-data', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;



