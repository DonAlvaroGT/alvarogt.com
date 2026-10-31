import { test } from 'node:test';
import { FESTIVOS_FALLBACK } from './fechas.mjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const festivosJsonPath = join(__dirname, 'festivos.json');
const festivosJson = JSON.parse(readFileSync(festivosJsonPath, 'utf-8'));

const expectedFestivos = new Set(
  festivosJson.festivos
    .map(row => row.fecha)
    .filter(f => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f))
);

const actualFestivos = FESTIVOS_FALLBACK;

const expectedSize = expectedFestivos.size;
const actualSize = actualFestivos.size;

// Compare Sets
const missingFromActual = new Set(
  [...expectedFestivos].filter(d => !actualFestivos.has(d))
);
const extraInActual = new Set(
  [...actualFestivos].filter(d => !expectedFestivos.has(d))
);

test('FESTIVOS_FALLBACK matches festivos.json', () => {
  if (actualSize !== expectedSize) {
    throw new Error(`Set size: expected ${expectedSize}, got ${actualSize}`);
  }
  
  if (missingFromActual.size > 0) {
    throw new Error(`Missing ${missingFromActual.size} dates: ${[...missingFromActual].join(', ')}`);
  }
  
  if (extraInActual.size > 0) {
    throw new Error(`Extra ${extraInActual.size} dates in FESTIVOS_FALLBACK: ${[...extraInActual].join(', ')}`);
  }
});
