import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eventsFromReglas, mergeEvents, skipAviso, collapseSameTime } from './reglas.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const reglas = JSON.parse(readFileSync(join(root, 'reglas.json'), 'utf8'));

assert.deepEqual(eventsFromReglas(reglas, '2026-09-15'), []);
assert.deepEqual(eventsFromReglas(reglas, '2026-09-16'), [
  { time: '18:30–19:00', title: 'Natación Mollete', location: '' },
  { time: '16:30', title: 'Danza Molletito', location: '' },
]);
assert.deepEqual(eventsFromReglas(reglas, '2026-09-21'), [
  { time: '16:30', title: 'Fútbol Nacho', location: '' },
  { time: '16:30', title: 'Danza Molletito', location: '' },
]);
assert.deepEqual(eventsFromReglas(reglas, '2026-09-22'), [
  { time: '16:30', title: 'Inglés con Dom', location: '' },
]);

const mie23 = eventsFromReglas(reglas, '2026-09-23');
assert.equal(mie23.length, 3);
assert.equal(mie23[0].title, 'Fútbol Nacho');
assert.equal(mie23[0].time, '16:30');
assert.equal(mie23[2].title, 'Danza Molletito');
assert.equal(mie23[1].title, 'Natación Mollete');
assert.equal(mie23[1].time, '18:30–19:00');
const mie23Line = mergeEvents(mie23, []);
assert.equal(mie23Line[0].title, 'Fútbol Nacho · Danza Molletito');
assert.equal(mie23Line[0].time, '16:30');

assert.deepEqual(eventsFromReglas(reglas, '2026-09-24'), []);
assert.equal(eventsFromReglas(reglas, '2026-09-17').length, 0);

assert.deepEqual(eventsFromReglas(reglas, '2026-10-01'), [
  { time: '', title: 'Logopeda Nacho', location: '' },
]);
assert.deepEqual(eventsFromReglas(reglas, '2026-10-08'), []);
assert.deepEqual(eventsFromReglas(reglas, '2026-10-12'), []);

const merged = mergeEvents(
  eventsFromReglas(reglas, '2026-09-16'),
  [{ time: '18:30', title: 'Natación Mollete', location: '' }],
);
assert.equal(merged.length, 2);
assert.equal(merged[0].title, 'Danza Molletito');
assert.equal(merged[0].time, '16:30');
assert.equal(merged[1].title, 'Natación Mollete');

const onlyReglas = mergeEvents(eventsFromReglas(reglas, '2026-09-16'), []);
assert.equal(onlyReglas.length, 2);
assert.equal(onlyReglas[0].title, 'Danza Molletito');
assert.equal(onlyReglas[0].time, '16:30');
assert.equal(onlyReglas[1].time, '18:30–19:00');

assert.deepEqual(eventsFromReglas({ schema_version: 2, timezone: 'Europe/Madrid', extraescolares: [] }, '2026-09-16'), []);

assert.equal(skipAviso('Inglés con Dom'), 'hoy no hay inglés');
assert.equal(skipAviso('Fútbol Nacho'), 'hoy no hay fútbol');
assert.equal(skipAviso('Natación Mollete'), 'hoy no hay natación');

const conSkip = {
  schema_version: 1,
  timezone: 'Europe/Madrid',
  extraescolares: [
    {
      id: 'natacion-mollete',
      title: 'Natación Mollete',
      time: '18:30',
      end: '19:00',
      weekdays: [3],
      skip: ['2026-09-23'],
    },
  ],
};
assert.deepEqual(eventsFromReglas(conSkip, '2026-09-16'), [
  { time: '18:30–19:00', title: 'Natación Mollete', location: '' },
]);
assert.deepEqual(eventsFromReglas(conSkip, '2026-09-23'), [
  { time: '', title: 'hoy no hay natación', location: '', skipOf: 'Natación Mollete' },
]);
const skipMerged = mergeEvents(eventsFromReglas(conSkip, '2026-09-23'), [
  { time: '18:30', title: 'Natación Mollete', location: '' },
]);
assert.deepEqual(skipMerged, [{ time: '', title: 'hoy no hay natación', location: '' }]);
assert.deepEqual(
  collapseSameTime([
    { time: '16:30', title: 'Fútbol Nacho', location: '' },
    { time: '16:30', title: 'Danza Molletito', location: '' },
  ]),
  [{ time: '16:30', title: 'Fútbol Nacho · Danza Molletito', location: '' }],
);
console.log('ok reglas');
