import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

assert.doesNotMatch(html, /tareas validadas/i, 'no debe aparecer el contador de tareas validadas');
assert.doesNotMatch(html, /cosas por validar/i, 'no debe aparecer el contador de cosas por validar');
assert.match(html, /id="nacho-points"/, 'debe mantenerse el contador de puntos de Nacho');
assert.match(html, /id="luz-points"/, 'debe mantenerse el contador de puntos de Luz');
assert.match(html, /querySelector\('#nacho-points'\)/, 'debe seguir actualizándose Nacho');
assert.match(html, /querySelector\('#luz-points'\)/, 'debe seguir actualizándose Luz');
assert.doesNotMatch(html, /id="done"|id="waiting"/, 'no deben quedar selectores de los contadores retirados');

console.log('summary counters regression: ok');