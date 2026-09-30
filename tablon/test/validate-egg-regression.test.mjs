import assert from 'node:assert/strict';
import { board, gate, html } from './source.mjs';

assert.match(board, /tablon-build: 20260930b-priv/, 'marcador de cache-bust del huevo');
assert.match(board, /function flashValidateEgg/, 'el 🙊 se pinta en JS, no en HTML público');
assert.match(board, /window\.tablonFlashValidateEgg/, 'queda colgado para el clic de Validar');
assert.match(board, /if \(!window\.tablonAdult\) return/, 'niños no ven el 🙊');
assert.match(board, /textContent = '🙊'/, 'el huevo es 🙊');
assert.match(board, /setTimeout\(function \(\) \{ el\.hidden = true; \}, 1000\)/, 'un segundo');
assert.match(board, /id = 'validate-egg'/, 'nodo creado al validar');
assert.match(board, /createElement\('div'\)/, 'no va en el HTML de la puerta');
assert.doesNotMatch(board, /<audio/, 'sin sonido');
assert.doesNotMatch(board, /speechSynthesis/, 'sin voz');
assert.doesNotMatch(board, /new Audio/, 'sin audio');
assert.match(board, /if\(b\.dataset\.action==='validate-all-queue'\)\{if\(!window\.tablonAdult\)\{toast\('Solo Álvaro o Lucita pueden validar\.'\);return\}window\.tablonFlashValidateEgg\(\);/, 'Validar todo (adulto) dispara el huevo');
assert.match(board, /if\(action==='validate'&&item\)\{window\.tablonFlashValidateEgg\(\);/, 'Validar suelto (adulto) dispara el huevo');

assert.doesNotMatch(gate, /🙊/, 'la puerta pública no lleva 🙊');
assert.doesNotMatch(gate, /validate-egg/, 'la puerta pública no lleva el huevo');
assert.doesNotMatch(gate, /flashValidateEgg/, 'la puerta pública no lleva el JS del huevo');
assert.doesNotMatch(gate, /primo listo/, 'primo listo no es del tablón');

assert.match(html, /function flashValidateEgg/, 'el board autenticado sí lleva el huevo');
assert.doesNotMatch(html, /sus monos/, 'el pie no cambia a monos');

console.log('validate egg regression: ok');
