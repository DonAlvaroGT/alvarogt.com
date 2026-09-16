import assert from 'node:assert/strict';
import { weekYmds, addDaysYmd, weekdayIso, nextWeekYmds, prettyDate } from './fechas.mjs';
import { lastVista, rememberVista, datesForVista, dayLabel, headingParts, VISTA_KEY, VISTAS } from './vista.mjs';

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
assert.deepEqual(nextWeekYmds('2026-09-16'), [
  '2026-09-21',
  '2026-09-22',
  '2026-09-23',
  '2026-09-24',
  '2026-09-25',
  '2026-09-26',
  '2026-09-27',
]);
assert.deepEqual(nextWeekYmds('2026-09-14'), nextWeekYmds('2026-09-20'));
assert.equal(weekdayIso(nextWeekYmds('2026-09-16')[0]), 1);
assert.equal(weekdayIso(nextWeekYmds('2026-09-16')[6]), 7);
assert.deepEqual(nextWeekYmds('nope'), []);

const store = {};
const storage = {
  getItem(k) { return Object.hasOwn(store, k) ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
};
assert.deepEqual(VISTAS, ['hoy', 'semana', 'proxima']);
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
assert.deepEqual(datesForVista('proxima', '2026-09-16'), nextWeekYmds('2026-09-16'));
assert.equal(datesForVista('proxima', '2026-09-16').length, 7);
assert.equal(datesForVista('proxima', '2026-09-16')[0], '2026-09-21');
assert.equal(dayLabel('hoy', '2026-09-16', '2026-09-16'), 'Hoy');
assert.equal(dayLabel('hoy', '2026-09-17', '2026-09-16'), 'Mañana');
assert.equal(dayLabel('semana', '2026-09-14', '2026-09-16'), 'Lunes');
assert.equal(dayLabel('semana', '2026-09-16', '2026-09-16'), 'Miércoles');
assert.equal(dayLabel('semana', '2026-09-20', '2026-09-16'), 'Domingo');
assert.equal(dayLabel('proxima', '2026-09-21', '2026-09-16'), 'Lunes');
assert.equal(dayLabel('proxima', '2026-09-27', '2026-09-16'), 'Domingo');
rememberVista('proxima', storage);
assert.equal(lastVista(storage), 'proxima');

assert.match(prettyDate('2026-09-14', true), /lunes/i);
assert.equal(prettyDate('2026-09-14', false), '14 de septiembre');
assert.doesNotMatch(prettyDate('2026-09-14', false), /lunes/i);
assert.equal(prettyDate('nope', false), '');

const hoyHead = headingParts('hoy', 'Hoy', '2026-09-16');
assert.match(hoyHead.dateLine, /^Hoy · /);
assert.match(hoyHead.dateLine, /miércoles/i);
assert.equal(hoyHead.title, 'Hoy');
assert.equal((hoyHead.dateLine + ' ' + hoyHead.title).match(/miércoles/gi).length, 1);

const weekHead = headingParts('semana', 'Lunes', '2026-09-14');
assert.equal(weekHead.dateLine, '14 de septiembre');
assert.equal(weekHead.title, 'Lunes');
assert.doesNotMatch(weekHead.dateLine, /lunes/i);
const weekBlob = `${weekHead.dateLine} ${weekHead.title}`;
assert.equal((weekBlob.match(/lunes/gi) || []).length, 1);

const nextHead = headingParts('proxima', 'Lunes', '2026-09-21');
assert.equal(nextHead.dateLine, '21 de septiembre');
assert.equal(nextHead.title, 'Lunes');
assert.doesNotMatch(nextHead.dateLine, /lunes/i);
assert.equal((`${nextHead.dateLine} ${nextHead.title}`.match(/lunes/gi) || []).length, 1);

console.log('ok vista');
