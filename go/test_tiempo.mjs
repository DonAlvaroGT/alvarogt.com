import assert from 'node:assert/strict';
import { parseTiempo, weatherCopy, fetchTiempo, TIEMPO_URL } from './tiempo.mjs';

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
assert.equal(parsed['2026-09-15'].clothes, undefined);
assert.equal(weatherCopy(parsed['2026-09-15']), '17.7–35.2 °C · lluvia 0%.');
assert.ok(!weatherCopy(parsed['2026-09-15']).includes('ropa'));
assert.equal(weatherCopy({}), 'Previsión no disponible.');
assert.equal(parseTiempo({ timezone: 'UTC', daily: { time: ['2026-09-15'] } }), null);

const live = await fetchTiempo();
assert.ok(TIEMPO_URL.includes('timezone=Europe%2FMadrid'));
assert.ok(TIEMPO_URL.includes('forecast_days=14'));
assert.ok(TIEMPO_URL.includes('past_days=6'));
if (live) {
  const days = Object.keys(live);
  assert.ok(days.length >= 14);
  const first = live[days[0]];
  if (first.min == null) assert.equal(weatherCopy(first), 'Previsión no disponible.');
  assert.equal(first.clothes, undefined);
  assert.ok(!JSON.stringify(first).includes('ropa fresca'));
}
console.log('ok tiempo');
