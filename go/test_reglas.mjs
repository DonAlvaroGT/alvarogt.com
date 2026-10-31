import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eventsFromReglas, mergeEvents, skipAviso, collapseSameTime } from './reglas.mjs';
import { FESTIVOS, applyFestivosFromDoc } from './fechas.mjs';

const root = dirname(fileURLToPath(import.meta.url));

// Load festivos fixture using applyFestivosFromDoc
const festivosPath = join(root, 'testdata/festivos.json');
const festivosData = JSON.parse(readFileSync(festivosPath, 'utf8'));
applyFestivosFromDoc(festivosData);

const reglas = JSON.parse(readFileSync(join(root, 'testdata/reglas.json'), 'utf8'));

assert.deepEqual(eventsFromReglas(reglas, '2026-09-15'), []);
assert.deepEqual(eventsFromReglas(reglas, '2026-09-16'), [
  { time: '18:30–19:00', title: 'Natación Bollo', location: '' },
  { time: '16:30', title: 'Danza Bollito', location: '' },
]);
assert.deepEqual(eventsFromReglas(reglas, '2026-09-21'), [
  { time: '16:30', title: 'Fútbol Nico', location: '' },
  { time: '16:30', title: 'Danza Bollito', location: '' },
]);
assert.deepEqual(eventsFromReglas(reglas, '2026-09-22'), [
  { time: '16:30', title: 'Inglés con Dom', location: '' },
]);

const mie23 = eventsFromReglas(reglas, '2026-09-23');
assert.equal(mie23.length, 3);
assert.equal(mie23[0].title, 'Fútbol Nico');
assert.equal(mie23[0].time, '16:30');
assert.equal(mie23[2].title, 'Danza Bollito');
assert.equal(mie23[1].title, 'Natación Bollo');
assert.equal(mie23[1].time, '18:30–19:00');
const mie23Line = mergeEvents(mie23, []);
assert.equal(mie23Line[0].title, 'Fútbol Nico · Danza Bollito');
assert.equal(mie23Line[0].time, '16:30');

assert.deepEqual(eventsFromReglas(reglas, '2026-09-24'), []);
assert.equal(eventsFromReglas(reglas, '2026-09-17').length, 0);

assert.deepEqual(eventsFromReglas(reglas, '2026-10-01'), [
  { time: '', title: 'Logopeda Nico', location: '' },
]);
assert.deepEqual(eventsFromReglas(reglas, '2026-10-08'), []);
assert.deepEqual(eventsFromReglas(reglas, '2026-10-12'), []);
assert.deepEqual(eventsFromReglas(reglas, '2026-10-22'), [
  { time: '', title: 'Zoo Madrid Nico', location: '' },
]);
assert.deepEqual(eventsFromReglas(reglas, '2026-10-23'), [
  { time: '', title: 'Cumple Cecilia Luz', location: '' },
]);

const merged = mergeEvents(eventsFromReglas(reglas, '2026-09-16'), [
  { time: '18:30', title: 'Natación Bollo', location: '' },
]);
assert.equal(merged.length, 2);
assert.equal(merged[0].title, 'Danza Bollito');
assert.equal(merged[0].time, '16:30');
assert.equal(merged[1].title, 'Natación Bollo');

const onlyReglas = mergeEvents(eventsFromReglas(reglas, '2026-09-16'), []);
assert.equal(onlyReglas.length, 2);
assert.equal(onlyReglas[0].title, 'Danza Bollito');
assert.equal(onlyReglas[0].time, '16:30');
assert.equal(onlyReglas[1].time, '18:30–19:00');

assert.deepEqual(eventsFromReglas({ schema_version: 2, timezone: 'Europe/Madrid', extraescolares: [] }, '2026-09-16'), []);

assert.equal(skipAviso('Inglés con Dom'), 'hoy no hay inglés');
assert.equal(skipAviso('Fútbol Nico'), 'hoy no hay fútbol');
assert.equal(skipAviso('Natación Bollo'), 'hoy no hay natación');

const conSkip = {
  schema_version: 1,
  timezone: 'Europe/Madrid',
  extraescolares: [
    {
      id: 'natacion-bollo',
      title: 'Natación Bollo',
      time: '18:30',
      end: '19:00',
      weekdays: [3],
      skip: ['2026-09-23'],
    },
  ],
};
assert.deepEqual(eventsFromReglas(conSkip, '2026-09-16'), [
  { time: '18:30–19:00', title: 'Natación Bollo', location: '' },
]);
assert.deepEqual(eventsFromReglas(conSkip, '2026-09-23'), [
  { time: '', title: 'hoy no hay natación', location: '', skipOf: 'Natación Bollo' },
]);
const skipMerged = mergeEvents(eventsFromReglas(conSkip, '2026-09-23'), [
  { time: '18:30', title: 'Natación Bollo', location: '' },
]);
assert.deepEqual(skipMerged, [{ time: '', title: 'hoy no hay natación', location: '' }]);
assert.deepEqual(
  collapseSameTime([
    { time: '16:30', title: 'Fútbol Nico', location: '' },
    { time: '16:30', title: 'Danza Bollito', location: '' },
  ]),
  [{ time: '16:30', title: 'Fútbol Nico · Danza Bollito', location: '' }],
);
console.log('ok reglas');
