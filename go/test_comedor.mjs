import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { menuDelDia } from './comedor.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const payload = JSON.parse(readFileSync(join(root, 'comedor.json'), 'utf8'));

assert.equal(payload.schema_version, 1);
assert.equal(payload.timezone, 'Europe/Madrid');
assert.equal(payload.mes, '2026-09');
assert.equal(payload.colegio, 'Santa María de Yermo / Basal');
assert.equal(payload.curso, '2026/2027');
assert.equal(Object.keys(payload.dias).length, 18);

assert.deepEqual(menuDelDia(payload, '2026-09-15'), [
  'judías verdes rehogada',
  'tortilla de chorizo',
  'ensalada de lechuga y aceitunas',
  'fruta fresca',
  'pan integral',
]);
assert.deepEqual(menuDelDia(payload, '2026-09-16'), [
  'alubias blancas con verduras',
  'pollo asado con calabacín',
  'yogur',
  'pan',
]);
assert.equal(menuDelDia(payload, '2026-09-13'), null);
assert.equal(menuDelDia(payload, '2026-10-01'), null);
assert.equal(menuDelDia(payload, '2026-09-12'), null);
assert.equal(menuDelDia({ ...payload, schema_version: 2 }, '2026-09-15'), null);
assert.equal(menuDelDia({ ...payload, timezone: 'UTC' }, '2026-09-15'), null);
assert.equal(menuDelDia(payload, '15/09/2026'), null);
assert.equal(menuDelDia(null, '2026-09-15'), null);
assert.equal(menuDelDia({ schema_version: 1, timezone: 'Europe/Madrid', dias: { '2026-09-15': { platos: [] } } }, '2026-09-15'), null);

console.log('ok comedor');
