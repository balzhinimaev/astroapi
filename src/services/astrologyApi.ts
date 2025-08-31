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

export interface PersonalityPayload {
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

export interface PersonalityResponse {
  report: string[];
  spiritual_lesson: string;
  key_quality: string;
}

export async function personalityReportTropical(payload: PersonalityPayload, language = 'russian'): Promise<PersonalityResponse> {
  const userId = process.env.ASTROLOGY_API_USER_ID;
  const apiKey = process.env.ASTROLOGY_API_KEY;

  if (!userId || !apiKey) {
    throw new Error('Astrology API credentials are not configured');
  }

  const url = 'https://json.astrologyapi.com/v1/personality_report/tropical';
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
  return (await resp.json()) as PersonalityResponse;
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

export interface TarotPredictionsPayload {
  love: number;
  career: number;
  finance: number;
}

export interface TarotPredictionsResponse {
  love: string;
  career: string;
  finance: string;
}

export async function tarotPredictions(language = 'russian'): Promise<TarotPredictionsResponse> {
  const userId = process.env.ASTROLOGY_API_USER_ID;
  const apiKey = process.env.ASTROLOGY_API_KEY;

  if (!userId || !apiKey) {
    throw new Error('Astrology API credentials are not configured');
  }

  // Генерируем случайные значения для love, career, finance (1-78)
  const love = Math.floor(Math.random() * 78) + 1;
  const career = Math.floor(Math.random() * 78) + 1;
  const finance = Math.floor(Math.random() * 78) + 1;

  const url = 'https://json.astrologyapi.com/v1/tarot_predictions';
  const headers: Record<string, string> = {
    authorization: buildBasicAuthHeader(userId, apiKey),
    'Content-Type': 'application/json',
    'Accept-Language': language,
  };

  const body = JSON.stringify({ love, career, finance });
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
  return (await resp.json()) as TarotPredictionsResponse;
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

  try {
    console.log(`[Moon Phase API] Calling external API with payload:`, payload);
    const resp = await fetch(url, init);
    
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error(`[Moon Phase API] External API error: ${resp.status} ${resp.statusText}`, text);
      throw new Error(`Astrology API error: ${resp.status} ${resp.statusText} ${text}`);
    }
    
    const result = await resp.json();
    console.log(`[Moon Phase API] Success response:`, result);
    return result as MoonPhaseReportResponse;
  } catch (error) {
    console.error(`[Moon Phase API] Fetch error:`, error);
    throw error;
  }
}

// Функция для получения отчета о фазах луны по telegramId пользователя
export async function getMoonPhaseReportByTelegramId(telegramId: string, language = 'russian'): Promise<MoonPhaseReportResponse> {
  // Проверяем переменные окружения
  const userId = process.env.ASTROLOGY_API_USER_ID;
  const apiKey = process.env.ASTROLOGY_API_KEY;

  if (!userId || !apiKey) {
    throw new Error('Astrology API credentials are not configured');
  }

  // Используем статические импорты вместо динамических
  const { UserModel } = require('../models/User');
  const { connectToDatabase } = require('../config/db');
  
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

  // Функция для нормализации даты рождения
  const normalizeBirthDate = (input: string) => {
    const s = String(input).trim();
    
    // Формат YYYY-MM-DD
    let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      return { year: y, month: mo, day: d };
    }
    
    // Формат DD-MM-YYYY или DD/MM/YYYY
    m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
    if (m) {
      const d = Number(m[1]);
      const mo = Number(m[2]);
      const y = Number(m[3]);
      return { year: y, month: mo, day: d };
    }
    
    // Формат MM-DD-YYYY или MM/DD/YYYY
    m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
    if (m) {
      const mo = Number(m[1]);
      const d = Number(m[2]);
      const y = Number(m[3]);
      return { year: y, month: mo, day: d };
    }
    
    // Формат DD.MM.YYYY
    m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
      const d = Number(m[1]);
      const mo = Number(m[2]);
      const y = Number(m[3]);
      return { year: y, month: mo, day: d };
    }
    
    // Формат YYYY.MM.DD
    m = s.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      return { year: y, month: mo, day: d };
    }
    
    return null;
  };

  // Парсим дату рождения
  const parsed = normalizeBirthDate(user.birthDate);
  if (!parsed) {
    console.error(`[Moon Phase Report] Invalid birth date format for user ${telegramId}: ${user.birthDate}`);
    throw new Error(`Invalid birth date format: ${user.birthDate}. Expected formats: YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY, etc.`);
  }

  const { year, month, day } = parsed;

  // Проверяем валидность значений
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error('Invalid birth date values');
  }

  // Проверяем диапазоны
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error('Birth date values are out of valid range');
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

// Функция для проверки и обновления бесплатных запросов
export async function checkAndUpdateFreeRequest(telegramId: string, requestType: 'yesNoTarot' | 'personality'): Promise<{ canUse: boolean; isFree: boolean }> {
  const { UserModel } = require('../models/User');
  const { connectToDatabase } = require('../config/db');
  
  await connectToDatabase();
  
  const user = await UserModel.findOne({ telegramId });
  if (!user) {
    throw new Error('User not found');
  }

  // Проверяем подписку
  const now = new Date();
  const subscription = user.subscription || {};
  const isSubscriptionActive = subscription.status === 'active' && 
    (!subscription.endDate || subscription.endDate >= now);

  if (isSubscriptionActive) {
    return { canUse: true, isFree: false };
  }

  // Проверяем бесплатный запрос
  const freeRequests = user.freeRequests || {};
  const hasFreeRequest = freeRequests[requestType] === true;

  if (!hasFreeRequest) {
    return { canUse: false, isFree: false };
  }

  // Помечаем бесплатный запрос как использованный (устанавливаем в false)
  await UserModel.findOneAndUpdate(
    { telegramId },
    { $set: { [`freeRequests.${requestType}`]: false } }
  );

  return { canUse: true, isFree: true };
}


