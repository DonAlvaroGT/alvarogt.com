import assert from 'node:assert/strict';
import { clothesFromTemps, parseTiempo, weatherCopy, fetchTiempo, TIEMPO_URL } from './tiempo.mjs';

assert.equal(clothesFromTemps(18, 35.2), 'ropa fresca y gorra');
assert.equal(clothesFromTemps(18.4, 26.4), 'ropa corta y una capa fina');
assert.equal(clothesFromTemps(null, 20), null);

const parsed = parseTiempo({
  timezone: 'Europe/Madrid',
  daily: {
    time: ['2026-09-15', '2026-09-16'],
    temperature_2m_min: [17.7, 18.4],
    temperature_2m_max: [35.2, 26.4],
    precipitation_probability_max: [0, 5],
  },
});
assert.equal(parsed['2026-09-15'].min, 17.7);
assert.equal(parsed['2026-09-16'].rain_probability, 5);
assert.equal(weatherCopy(parsed['2026-09-15']), '17.7–35.2 °C · ropa fresca y gorra · lluvia 0%.');
assert.equal(weatherCopy({}), 'Previsión no disponible.');
assert.equal(parseTiempo({ timezone: 'UTC', daily: { time: ['2026-09-15'] } }), null);

const live = await fetchTiempo();
assert.ok(TIEMPO_URL.includes('timezone=Europe%2FMadrid'));
if (live) {
  const days = Object.keys(live);
  assert.ok(days.length >= 1);
  const first = live[days[0]];
  if (first.min == null) assert.equal(weatherCopy(first), 'Previsión no disponible.');
}
console.log('ok tiempo');
