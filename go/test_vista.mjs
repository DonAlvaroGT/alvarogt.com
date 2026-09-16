import assert from 'node:assert/strict';
import { weekYmds, addDaysYmd, weekdayIso } from './fechas.mjs';
import { lastVista, rememberVista, datesForVista, dayLabel, VISTA_KEY, VISTAS } from './vista.mjs';

assert.deepEqual(weekYmds('2026-09-16'), [
  '2026-09-14',
  '2026-09-15',
  '2026-09-16',
  '2026-09-17',
  '2026-09-18',
  '2026-09-19',
  '2026-09-20',
]);
assert.equal(weekdayIso(weekYmds('2026-09-16')[0]), 1);
assert.equal(weekdayIso(weekYmds('2026-09-16')[6]), 7);
assert.deepEqual(weekYmds('2026-09-14'), weekYmds('2026-09-20'));
assert.equal(addDaysYmd('2026-09-16', 0), '2026-09-16');
assert.equal(addDaysYmd('2026-09-16', 1.5), null);
assert.deepEqual(weekYmds('nope'), []);

const store = {};
const storage = {
  getItem(k) { return Object.hasOwn(store, k) ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
};
assert.deepEqual(VISTAS, ['hoy', 'semana']);
assert.equal(VISTA_KEY, 'go.vista');
assert.equal(lastVista(storage), 'hoy');
rememberVista('semana', storage);
assert.equal(storage.getItem(VISTA_KEY), 'semana');
assert.equal(lastVista(storage), 'semana');
rememberVista('nope', storage);
assert.equal(lastVista(storage), 'semana');
rememberVista('hoy', storage);
assert.equal(lastVista(storage), 'hoy');

assert.deepEqual(datesForVista('hoy', '2026-09-16'), ['2026-09-16', '2026-09-17']);
assert.deepEqual(datesForVista('semana', '2026-09-16'), weekYmds('2026-09-16'));
assert.equal(datesForVista('semana', '2026-09-16').length, 7);
assert.equal(dayLabel('hoy', '2026-09-16', '2026-09-16'), 'Hoy');
assert.equal(dayLabel('hoy', '2026-09-17', '2026-09-16'), 'Mañana');
assert.equal(dayLabel('semana', '2026-09-14', '2026-09-16'), 'Lunes');
assert.equal(dayLabel('semana', '2026-09-16', '2026-09-16'), 'Miércoles');
assert.equal(dayLabel('semana', '2026-09-20', '2026-09-16'), 'Domingo');
console.log('ok vista');
