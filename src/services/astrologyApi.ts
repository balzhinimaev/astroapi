export interface YesNoTarotResponse {
  name: string;
  value: string; // Yes | No | Maybe (возможные значения по API)
  description: string;
}

function buildBasicAuthHeader(userId: string, apiKey: string): string {
  const token = Buffer.from(`${userId}:${apiKey}`).toString('base64');
  return `Basic ${token}`;
}

export async function yesNoTarot(tarotId: number, language = 'russian'): Promise<YesNoTarotResponse> {
  const userId = process.env.ASTROLOGY_API_USER_ID;
  const apiKey = process.env.ASTROLOGY_API_KEY;

  if (!userId || !apiKey) {
    throw new Error('Astrology API credentials are not configured');
  }

  const url = 'https://json.astrologyapi.com/v1/yes_no_tarot';
  const headers: Record<string, string> = {
    authorization: buildBasicAuthHeader(userId, apiKey),
    'Content-Type': 'application/json',
    'Accept-Language': language,
  };

  const body = JSON.stringify({ tarot_id: tarotId });
  const init: RequestInit = {
    method: 'POST',
    headers,
    body,
  };

  const resp = await fetch(url, init);
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Astrology API error: ${resp.status} ${resp.statusText} ${text}`);
  }
  return (await resp.json()) as YesNoTarotResponse;
}

export interface RomanticPersonalityPayload {
  day: number;
  month: number;
  year: number;
  hour: number;
  min: number;
  lat: number;
  lon: number;
  tzone: number; // смещение в часах
  house_type?: 'placidus' | 'koch' | 'porphyry' | 'equal_house' | string;
}

export interface RomanticPersonalityResponse {
  report: string[];
}

export async function romanticPersonalityReportTropical(payload: RomanticPersonalityPayload): Promise<RomanticPersonalityResponse> {
  const userId = process.env.ASTROLOGY_API_USER_ID;
  const apiKey = process.env.ASTROLOGY_API_KEY;

  if (!userId || !apiKey) {
    throw new Error('Astrology API credentials are not configured');
  }

  const url = 'https://json.astrologyapi.com/v1/romantic_personality_report/tropical';
  const headers: Record<string, string> = {
    authorization: buildBasicAuthHeader(userId, apiKey),
    'Content-Type': 'application/json',
  };

  const init: RequestInit = {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  };

  const resp = await fetch(url, init);
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Astrology API error: ${resp.status} ${resp.statusText} ${text}`);
  }
  return (await resp.json()) as RomanticPersonalityResponse;
}

export interface KarmaDestinyPayload {
  p_day: number;
  p_month: number;
  p_year: number;
  p_hour: number;
  p_min: number;
  p_lat: number;
  p_lon: number;
  p_tzone: number;
  s_day: number;
  s_month: number;
  s_year: number;
  s_hour: number;
  s_min: number;
  s_lat: number;
  s_lon: number;
  s_tzone: number;
}

export interface KarmaDestinyResponse {
  karma_destiny_report: string[];
}

export async function karmaDestinyReportTropical(payload: KarmaDestinyPayload, language?: string): Promise<KarmaDestinyResponse> {
  const userId = process.env.ASTROLOGY_API_USER_ID;
  const apiKey = process.env.ASTROLOGY_API_KEY;

  if (!userId || !apiKey) {
    throw new Error('Astrology API credentials are not configured');
  }

  const url = 'https://json.astrologyapi.com/v1/karma_destiny_report/tropical';
  const headers: Record<string, string> = {
    authorization: buildBasicAuthHeader(userId, apiKey),
    'Content-Type': 'application/json',
  };
  if (language) {
    headers['Accept-Language'] = language;
  }

  const init: RequestInit = {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  };

  const resp = await fetch(url, init);
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Astrology API error: ${resp.status} ${resp.statusText} ${text}`);
  }
  return (await resp.json()) as KarmaDestinyResponse;
}

export interface MoonPhaseReportPayload {
  day: number;
  month: number;
  year: number;
  hour: number;
  min: number;
  lat: number;
  lon: number;
  tzone: number; // смещение в часах
}

export interface MoonPhaseReportResponse {
  moon_phase_report: string[];
}

export async function getMoonPhaseReport(payload: MoonPhaseReportPayload, language = 'russian'): Promise<MoonPhaseReportResponse> {
  const userId = process.env.ASTROLOGY_API_USER_ID;
  const apiKey = process.env.ASTROLOGY_API_KEY;

  if (!userId || !apiKey) {
    throw new Error('Astrology API credentials are not configured');
  }

  const url = 'https://json.astrologyapi.com/v1/moon_phase_report';
  const headers: Record<string, string> = {
    authorization: buildBasicAuthHeader(userId, apiKey),
    'Content-Type': 'application/json',
    'Accept-Language': language,
  };

  const init: RequestInit = {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  };

  const resp = await fetch(url, init);
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Astrology API error: ${resp.status} ${resp.statusText} ${text}`);
  }
  return (await resp.json()) as MoonPhaseReportResponse;
}

// Функция для получения отчета о фазах луны по telegramId пользователя
export async function getMoonPhaseReportByTelegramId(telegramId: string, language = 'russian'): Promise<MoonPhaseReportResponse> {
  const { UserModel } = await import('../models/User');
  const { connectToDatabase } = await import('../config/db');
  
  // Подключаемся к базе данных
  await connectToDatabase();
  
  // Ищем пользователя по telegramId
  const user = await UserModel.findOne({ telegramId });
  if (!user) {
    throw new Error('User not found');
  }

  // Проверяем, что у пользователя есть необходимые данные
  if (!user.birthDate || user.birthHour === undefined || user.birthMinute === undefined || !user.lastGeocode?.lat || !user.lastGeocode?.lon || user.lastGeocode?.tzone === undefined) {
    throw new Error('User profile is incomplete. Missing birth date, time, or location data.');
  }

  // Парсим дату рождения
  const birthDateParts = user.birthDate.split('-');
  if (birthDateParts.length !== 3) {
    throw new Error('Invalid birth date format');
  }

  const year = parseInt(birthDateParts[0]);
  const month = parseInt(birthDateParts[1]);
  const day = parseInt(birthDateParts[2]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error('Invalid birth date values');
  }

  // Формируем payload для API
  const payload: MoonPhaseReportPayload = {
    day,
    month,
    year,
    hour: user.birthHour!,
    min: user.birthMinute!,
    lat: user.lastGeocode.lat!,
    lon: user.lastGeocode.lon!,
    tzone: user.lastGeocode.tzone!,
  };

  // Вызываем API
  return getMoonPhaseReport(payload, language);
}


