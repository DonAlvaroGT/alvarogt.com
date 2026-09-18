import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_FAVS, parseFavoritos, isHouseFav } from './favoritos.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const local = JSON.parse(readFileSync(join(root, 'favoritos.json'), 'utf8'));

assert.deepEqual(DEFAULT_FAVS, ['Real Madrid', 'Miami Dolphins', 'Milwaukee Brewers']);
assert.equal(local.schema_version, 1);
assert.equal(local.timezone, 'Europe/Madrid');
assert.deepEqual(parseFavoritos(local), [...DEFAULT_FAVS, 'Detroit Red Wings']);
assert.equal(isHouseFav('Detroit Red Wings vs Maple Leafs', parseFavoritos(local)), true);
assert.deepEqual(parseFavoritos(null), DEFAULT_FAVS);
assert.deepEqual(parseFavoritos({}), DEFAULT_FAVS);
assert.deepEqual(parseFavoritos({ favoritos: [] }), DEFAULT_FAVS);
assert.deepEqual(parseFavoritos({ favoritos: ['  ', ''] }), DEFAULT_FAVS);
assert.deepEqual(parseFavoritos({ favoritos: ['Cubs'] }), ['Cubs']);

assert.equal(isHouseFav('Elche CF vs Real Madrid', DEFAULT_FAVS), true);
assert.equal(isHouseFav('Miami Dolphins vs Bills', DEFAULT_FAVS), true);
assert.equal(isHouseFav('Milwaukee Brewers at Cubs', DEFAULT_FAVS), true);
assert.equal(isHouseFav('Barcelona vs Girona', DEFAULT_FAVS), false);
assert.equal(isHouseFav('Cubs at Cardinals', null), false);
assert.equal(isHouseFav('Cubs at Cardinals', ['Cubs']), true);
assert.equal(isHouseFav('real madrid', []), true);

console.log('ok favoritos');
