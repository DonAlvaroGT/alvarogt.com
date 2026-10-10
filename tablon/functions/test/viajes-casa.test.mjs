import assert from 'node:assert/strict';
import {
  casaActorFrom,
  assertTarget,
  applyViajesCasa,
  fingerprint,
  slugId,
} from '../src/viajes-casa.mjs';

const casaAuth = { uid: 'casa-1', token: { casa: true, email: 'adult-1@example.com', email_verified: true } };
const parienteAuth = { uid: 'p-1', token: { email: 'adult-3@example.com', email_verified: true } };
const childAuth = { uid: 'c-1', token: { childRole: 'supervised', casa: true } };
const noAuth = {};

const base = {
  schema_version: 1,
  actualizado: '2026-10-07',
  zona_casa: 'Europe/Madrid',
  quien: { order: ['SoloCasa'], color: { SoloCasa: '#b7ddd8' }, dot: { SoloCasa: '#1f6f68' } },
  viajes: [
    { id: 'rioja', privado: true, titulo: 'Rioja', inicio: '2026-09-30', fin: '2026-10-01', quien: 'SoloCasa', vuelos: [{ ruta: 'MAD-RDZ' }] },
    { id: 'malaga', privado: true, titulo: 'Málaga', inicio: '2026-11-07', fin: '2026-11-09', quien: 'SoloCasa' },
  ],
};

assert.deepEqual(casaActorFrom(casaAuth), { uid: 'casa-1', casa: true });
assert.throws(() => casaActorFrom(noAuth), /Inicia sesión/);
assert.throws(() => casaActorFrom(parienteAuth), /no autorizada/);
assert.throws(() => casaActorFrom(childAuth), /no autorizada/);
assert.throws(() => casaActorFrom({ uid: 'x', token: { casa: true, email: 'adult-1@example.com', email_verified: false } }), /verificado/);

assert.equal(assertTarget(), 'viajes_casa');
assert.equal(assertTarget('viajes_casa'), 'viajes_casa');
assert.throws(() => assertTarget('viajes'), /público/);
assert.throws(() => assertTarget('casa_json/viajes'), /público/);

const created = applyViajesCasa({
  actor: casaAuth,
  operation: 'create',
  payload: { titulo: 'Prueba', inicio: '2026-12-01', fin: '2026-12-02', quien: 'SoloCasa', sitio: 'Casa', notas: 'n', vuelos: [{ ruta: 'XXX' }], pnr: 'ABC', precio: 9 },
  doc: base,
  target: 'viajes_casa',
  publicIds: ['lisboa'],
  hoy: '2026-10-10',
});
assert.equal(created.trip.privado, true);
assert.equal(created.trip.titulo, 'Prueba');
assert.equal(created.doc.viajes.length, 3);
assert.equal(created.doc.viajes[0].titulo, 'Rioja');
assert.equal(created.doc.viajes[0].inicio, '2026-09-30');
assert.equal(created.doc.viajes[1].id, 'malaga');
assert.equal(created.trip.vuelos, undefined);
assert.equal(created.trip.pnr, undefined);
assert.deepEqual(fingerprint(created.doc.viajes).slice(0, 2), fingerprint(base.viajes));

assert.throws(() => applyViajesCasa({
  actor: parienteAuth, operation: 'create', payload: { titulo: 'X', inicio: '2026-12-01', fin: '2026-12-02', quien: 'A' }, doc: base,
}), /no autorizada/);

assert.throws(() => applyViajesCasa({
  actor: casaAuth, operation: 'create', payload: { titulo: 'Lisboa casa', inicio: '2026-12-25', fin: '2026-12-28', quien: 'SoloCasa' }, doc: base, target: 'viajes',
}), /público/);

assert.throws(() => applyViajesCasa({
  actor: casaAuth, operation: 'create', id: 'lisboa', payload: { titulo: 'Lisboa casa', inicio: '2026-12-25', fin: '2026-12-28', quien: 'SoloCasa' }, doc: base, publicIds: ['lisboa'],
}), /público/);

const updated = applyViajesCasa({
  actor: casaAuth,
  operation: 'update',
  id: 'malaga',
  payload: { titulo: 'Málaga mar', inicio: '2026-11-07', fin: '2026-11-09', quien: 'SoloCasa', sitio: 'Málaga' },
  doc: base,
  hoy: '2026-10-10',
});
assert.equal(updated.trip.privado, true);
assert.equal(updated.trip.titulo, 'Málaga mar');
assert.equal(updated.doc.viajes[0].titulo, 'Rioja');
assert.equal(updated.doc.viajes[0].vuelos[0].ruta, 'MAD-RDZ');
assert.equal(updated.doc.viajes[1].lugar_principal.label, 'Málaga');

const deleted = applyViajesCasa({
  actor: casaAuth, operation: 'delete', id: 'malaga', doc: base, hoy: '2026-10-10',
});
assert.equal(deleted.doc.viajes.length, 1);
assert.equal(deleted.doc.viajes[0].id, 'rioja');
assert.equal(deleted.doc.viajes[0].titulo, 'Rioja');

assert.equal(slugId('Ávila Norte', '2026-11-07'), 'avila-norte-2026-11-07');

console.log('viajes-casa tests: ok');
