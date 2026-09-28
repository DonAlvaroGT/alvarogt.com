import assert from 'node:assert/strict';
import { nachoRopa } from './ropa.mjs';
import { weekdayIso, nextYmd, ymdInZone, isFestivo, isLaborable } from './fechas.mjs';

assert.equal(weekdayIso('2026-09-21'), 1);
assert.equal(weekdayIso('2026-09-23'), 3);
assert.equal(weekdayIso('2026-09-24'), 4);
assert.equal(weekdayIso('2026-09-20'), 7);
assert.equal(nextYmd('2026-09-15'), '2026-09-16');
assert.equal(ymdInZone(new Date('2026-09-15T23:30:00+02:00')), '2026-09-15');
assert.equal(ymdInZone(new Date('2026-09-15T23:30:00Z')), '2026-09-16');
assert.equal(isFestivo('2026-10-12'), true);
assert.equal(isLaborable('2026-10-12'), false);
assert.equal(isFestivo('2026-10-13'), false);
assert.equal(isLaborable('2026-10-13'), true);

assert.equal(nachoRopa('2026-09-21'), 'uniforme');
assert.equal(nachoRopa('2026-09-22'), 'chándal');
assert.equal(nachoRopa('2026-09-23'), 'chándal');
assert.equal(nachoRopa('2026-09-24'), 'uniforme');
assert.equal(nachoRopa('2026-09-25'), 'uniforme');
assert.equal(nachoRopa('2026-09-19'), '');
assert.equal(nachoRopa('2026-09-20'), '');
assert.equal(nachoRopa('2026-10-12'), '');
assert.equal(nachoRopa('2026-10-13'), 'chándal');
assert.equal(nachoRopa('2026-10-16'), 'uniforme');
console.log('ok ropa');
