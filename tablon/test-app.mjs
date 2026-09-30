import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateRuntimeConfig, readRuntimeConfig, allowedBackendKeys, PUBLIC_FIREBASE_CONFIG } from './config.mjs';
import { ADULT_ALLOWLIST, CHILD_ROLE } from './domain.mjs';
import { gate, html, premios, board } from './test/source.mjs';

const js = fs.readFileSync(new URL('./frontend-alternative/app.js', import.meta.url), 'utf8');
const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
assert.match(gate, /id="child-sign-in"/);
assert.match(gate, /signInWithEmailAndPassword/);
assert.match(gate, /html\.embedded/);
assert.match(gate, /parentOk/);
assert.match(gate, /__casaAuth/);
assert.match(gate, /tablon-build:/);
assert.match(gate, /if \(embedded\) return/);
assert.match(gate, /id="board-root"/);
assert.match(gate, /<title>Tablón</);
assert.match(gate, />Adultos</);
assert.match(gate, />Niños</);
assert.match(gate, /loadBoardModule\(tokenResult\.token\)/);
assert.match(gate, /Authorization: 'Bearer ' \+ token/);
assert.match(gate, /europe-west1-tablongo\.cloudfunctions\.net\/board/);
assert.doesNotMatch(gate, /import\('\.\/board\.js/);
assert.doesNotMatch(gate, /Nacho/);
assert.doesNotMatch(gate, /Luz/);
assert.doesNotMatch(gate, /García Olivas/);
assert.doesNotMatch(gate, /initial\{/);
assert.doesNotMatch(gate, /id="task-form"/);
assert.doesNotMatch(gate, /id="reward-form"/);
assert.doesNotMatch(gate, /id="shell"/);
assert.doesNotMatch(gate, /🙊/);
assert.doesNotMatch(gate, /validate-egg/);
assert.doesNotMatch(gate, /@gmail\.com/);
assert.doesNotMatch(gate, /alvarogt@alvarogt\.com/);
assert.doesNotMatch(gate, /value="[^"]+@/);
assert.doesNotMatch(premios, /Nacho/);
assert.doesNotMatch(premios, /Luz/);
assert.match(premios, /Entra desde el tablón/);
assert.doesNotMatch(premios, /data-filter="Nacho"/);
assert.doesNotMatch(premios, /Historial de premios validados/);
assert.match(html, /id="shell"/);
assert.match(html, /houseName/);
assert.doesNotMatch(js, /@gmail\.com/);
assert.match(js, /no sincroniza dispositivos/);
assert.match(js, /credentials: 'include'/);
assert.doesNotMatch(js, /backendConfigured:\s*true/);
assert.doesNotMatch(read('config.mjs'), /globalThis\.TABLON_CONFIG/);
assert.deepEqual(allowedBackendKeys, ['backendConfigured', 'apiBase', 'authProvider', 'firebaseConfig']);
assert.deepEqual(PUBLIC_FIREBASE_CONFIG, {
  projectId: 'tablongo',
  authDomain: 'tablongo.firebaseapp.com',
  apiKey: JSON.parse(fs.readFileSync(new URL('./firebase.public.json', import.meta.url), 'utf8')).apiKey,
  storageBucket: 'tablongo.firebasestorage.app',
  messagingSenderId: '639440141487',
  appId: '1:639440141487:web:76132e8c01c030b4e1e85a',
});
assert.deepEqual(readRuntimeConfig({ protocol: 'file:', hostname: '' }).config.firebaseConfig, PUBLIC_FIREBASE_CONFIG);
assert.deepEqual(ADULT_ALLOWLIST, ['agarciatimon@gmail.com', 'luzolivas@gmail.com']);
assert.equal(CHILD_ROLE, 'child');
assert.equal(validateRuntimeConfig({}, { protocol: 'file:', hostname: '' }).localDevelopment, true);
assert.equal(validateRuntimeConfig({}, { protocol: 'https:', hostname: 'alvarogt.com' }).valid, false);
assert.match(read('README.md'), /frontend aún en modo local/);
assert.match(read('firebase.rules.example'), /pointAwards/);
assert.match(read('firebase.example.json'), /agarciatimon@gmail.com/);
assert.match(read('firebase.example.json'), /activaci[oó]n y prueba pendientes/);
const taskPanel = html.match(/<section id="tasks-view"[^>]*>([\s\S]*?)<\/section>/)?.[1] || '';
assert.ok(taskPanel.indexOf('aria-label="Filtrar por responsable"') < taskPanel.indexOf('id="task-list"'), 'responsable filter must precede task list');
assert.ok(taskPanel.indexOf('aria-label="Filtrar por estado"') < taskPanel.indexOf('id="task-list"'), 'status filter must precede task list');
assert.equal((html.match(/aria-label="Filtrar por responsable"/g) || []).length, 1);
assert.equal((html.match(/aria-label="Filtrar por estado"/g) || []).length, 1);
assert.equal((html.match(/id="task-search"/g) || []).length, 1);
assert.equal((html.match(/data-frequency-filter=/g) || []).length, 3);
assert.match(board, /startDataListeners/);
console.log('tablon smoke, configuration, and DOM order tests: ok');
