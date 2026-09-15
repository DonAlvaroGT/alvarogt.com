import assert from 'node:assert/strict';
import { formatPublicado } from './stamp.mjs';

assert.equal(formatPublicado('2026-09-15'), 'Datos del 15 de septiembre de 2026');
assert.equal(formatPublicado('2026-09-16'), 'Datos del 16 de septiembre de 2026');
assert.doesNotMatch(formatPublicado('2026-09-15'), /2:00|02:00|2:00/);
assert.doesNotMatch(formatPublicado('2026-09-15'), /\d:\d{2}/);

const iso = formatPublicado('2026-09-15T06:30:34.107884+02:00');
assert.match(iso, /^Datos publicados:/);
assert.match(iso, /15 de septiembre de 2026/);
assert.match(iso, /6:30/);
assert.doesNotMatch(iso, /2:00|02:00/);

assert.equal(formatPublicado(''), '');
assert.equal(formatPublicado(null), '');
console.log('ok stamp');
