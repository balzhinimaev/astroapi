type YandexGeoResponse = {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{
        GeoObject?: {
          name?: string;
          Point?: { pos?: string };
          metaDataProperty?: {
            GeocoderMetaData?: {
              precision?: string;
              text?: string;
            };
          };
        };
      }>;
    };
  };
};

export interface GeocodeResult {
  provider: 'yandex';
  query: string;
  lat: number;
  lon: number;
  name?: string;
  precision?: string;
  address?: string;
}

export async function geocodePlace(query: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.YANDEX_GEOCODER_API_KEY;
  if (!apiKey) {
    throw new Error('YANDEX_GEOCODER_API_KEY is not set');
  }

  const url = new URL('https://geocode-maps.yandex.ru/1.x/');
  url.searchParams.set('apikey', String(apiKey));
  url.searchParams.set('format', 'json');
  url.searchParams.set('results', '1');
  url.searchParams.set('lang', 'ru_RU');
  url.searchParams.set('geocode', query);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Yandex geocoder HTTP ${response.status}`);
    }
    const data: YandexGeoResponse = await response.json();
    const member = data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    const pos = member?.Point?.pos;
    if (!pos) return null;
    const [lonStr, latStr] = pos.split(' ');
    const lat = Number.parseFloat(latStr);
    const lon = Number.parseFloat(lonStr);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return {
      provider: 'yandex',
      query,
      lat,
      lon,
      name: member?.name,
      precision: member?.metaDataProperty?.GeocoderMetaData?.precision,
      address: member?.metaDataProperty?.GeocoderMetaData?.text,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}


