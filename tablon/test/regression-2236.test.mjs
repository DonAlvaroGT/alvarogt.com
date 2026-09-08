import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../functions/src/index.mjs', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

// Firestore transactions cannot create and then update the same document in one attempt.
assert.match(source, /if\s*\(!instanceSnap\.exists\)\s*tx\.create\(instanceRef, \{ \.\.\.instance, \.\.\.instanceWrite \}\);\s*else\s*tx\.update\(instanceRef, instanceWrite\);/,
  'la instancia nueva debe escribirse una sola vez');

// Production data uses the canonical assignee value shared, not the demo label Compartida.
assert.match(html, /const childIcon=.*sharedLabel='⚽ Nacho · 🌸 Luz'/,
  'el renderer debe tener etiqueta canónica para shared');
assert.match(html, /d.status==='child_done'\|\|d.status==='adult_done'/,
  'la UI muestra ambos estados pendientes como pendientes de validación');
assert.match(html, /n==='Compartida'\|\|n==='shared'\?sharedLabel/,
  'label debe reconocer el contrato shared');
console.log('2236 regression: ok');
