export const MADRID = { latitude: 40.4168, longitude: -3.7038 };
export const TIEMPO_URL = 'https://api.open-meteo.com/v1/forecast?latitude=40.4168&longitude=-3.7038&daily=temperature_2m_min,temperature_2m_max,precipitation_probability_max&timezone=Europe%2FMadrid&forecast_days=2';

export function parseTiempo(payload) {
  const daily = payload && payload.daily;
  if (!daily || !Array.isArray(daily.time)) return null;
  if (payload.timezone && payload.timezone !== 'Europe/Madrid') return null;
  const out = {};
  for (let i = 0; i < daily.time.length; i += 1) {
    const date = daily.time[i];
    if (typeof date !== 'string') continue;
    const minRaw = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[i] : null;
    const maxRaw = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[i] : null;
    const rainRaw = Array.isArray(daily.precipitation_probability_max) ? daily.precipitation_probability_max[i] : null;
    const min = typeof minRaw === 'number' ? minRaw : null;
    const max = typeof maxRaw === 'number' ? maxRaw : null;
    out[date] = {
      min,
      max,
      rain_probability: typeof rainRaw === 'number' ? rainRaw : null,
    };
  }
  return Object.keys(out).length ? out : null;
}

export async function fetchTiempo(fetchImpl = fetch) {
  try {
    const res = await fetchImpl(TIEMPO_URL, { cache: 'no-store' });
    if (!res || !res.ok) return null;
    return parseTiempo(await res.json());
  } catch {
    return null;
  }
}

export function weatherCopy(day) {
  if (!day || day.min == null || day.max == null) return 'Previsión no disponible.';
  const rain = day.rain_probability == null ? '' : ` · lluvia ${day.rain_probability}%`;
  return `${day.min}–${day.max} °C${rain}.`;
}
