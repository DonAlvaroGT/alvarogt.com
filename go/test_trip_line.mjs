import assert from 'node:assert/strict';
import { coversDay, tripOn, tripLineText } from './trip_line.mjs';

const disney = {
  id: 'disney-paris',
  titulo: 'Disney París',
  inicio: '2026-09-11',
  fin: '2026-09-14',
  quien: 'Olivas Holgado',
  lugar_principal: { label: 'Disneyland Paris' },
  estancias: [{ desde: '2026-09-11', hasta: '2026-09-14', donde: 'Disneyland Paris' }],
  dias: [
    { fecha: '2026-09-11', donde: 'Disneyland Paris' },
    { fecha: '2026-09-12', donde: 'Disneyland Paris' },
    { fecha: '2026-09-13', donde: 'Adventure World' },
    { fecha: '2026-09-14', donde: 'Disneyland Paris' },
  ],
};
const grecia = {
  id: 'abuelos-grecia',
  titulo: 'Abuelos Grecia',
  inicio: '2026-09-21',
  fin: '2026-09-28',
  lugar_principal: { label: 'Atenas' },
  estancias: [
    { desde: '2026-09-21', hasta: '2026-09-24', donde: 'Atenas' },
    { desde: '2026-09-25', hasta: '2026-09-28', donde: 'Crucero Egeo · Celestyal Olympia (Lavrio)' },
  ],
  dias: [{ fecha: '2026-09-21', donde: 'Atenas' }],
};
const viajes = [disney, grecia];

assert.equal(coversDay(disney, '2026-09-14'), true);
assert.equal(coversDay(disney, '2026-09-15'), false);
assert.equal(tripOn(viajes, '2026-09-14')?.id, 'disney-paris');
assert.equal(tripOn(viajes, '2026-09-15'), null);
assert.equal(tripOn(viajes, '2026-09-21')?.id, 'abuelos-grecia');
assert.equal(tripLineText(disney, '2026-09-14'), '✈️ Viaje: Disney París · Disneyland Paris · último día');
assert.equal(tripLineText(disney, '2026-09-11'), '✈️ Viaje: Disney París · Disneyland Paris · día 1 de 4');
assert.equal(tripLineText(disney, '2026-09-13'), '✈️ Viaje: Disney París · Adventure World · día 3 de 4');
assert.equal(tripLineText(disney, '2026-09-15'), '');
assert.equal(tripLineText(grecia, '2026-09-25'), '✈️ Viaje: Abuelos Grecia · Crucero Egeo · Celestyal Olympia (Lavrio) · día 5 de 8');
assert.equal(tripLineText({ estancias: [{ desde: '2026-01-01', hasta: '2026-01-02', donde: 'X' }] }, '2026-01-01'), '✈️ Viaje: X');
assert.equal(tripLineText({ dias: [{ fecha: '2026-02-02' }] }, '2026-02-02'), '');
assert.equal(tripLineText({ titulo: 'Solo título', dias: [{ fecha: '2026-02-02' }] }, '2026-02-02'), '✈️ Viaje: Solo título');
console.log('ok trip_line');
