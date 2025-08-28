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


