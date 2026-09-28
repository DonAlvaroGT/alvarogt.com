import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { menuDelDia } from './comedor.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const payload = JSON.parse(readFileSync(join(root, 'comedor.json'), 'utf8'));

assert.equal(payload.schema_version, 1);
assert.equal(payload.timezone, 'Europe/Madrid');
assert.equal(payload.colegio, 'Santa María de Yermo / Basal');
assert.equal(payload.curso, '2026/2027');
assert.ok(payload.dias && typeof payload.dias === 'object');
assert.ok(!Object.hasOwn(payload.dias, '2026-10-12'));
assert.equal(menuDelDia(payload, '2026-10-12'), null);
assert.equal(menuDelDia(payload, '2026-09-13'), null);
assert.equal(menuDelDia(payload, '2026-09-12'), null);
assert.ok(Array.isArray(menuDelDia(payload, '2026-09-15')));
assert.ok(Array.isArray(menuDelDia(payload, '2026-10-01')));
assert.equal(menuDelDia({ ...payload, schema_version: 2 }, '2026-09-15'), null);
assert.equal(menuDelDia({ ...payload, timezone: 'UTC' }, '2026-09-15'), null);
assert.equal(menuDelDia(payload, '15/09/2026'), null);
assert.equal(menuDelDia(null, '2026-09-15'), null);
assert.equal(menuDelDia({ schema_version: 1, timezone: 'Europe/Madrid', dias: { '2026-09-15': { platos: [] } } }, '2026-09-15'), null);

console.log('ok comedor');
