import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateRuntimeConfig, readRuntimeConfig, allowedBackendKeys, PUBLIC_FIREBASE_CONFIG } from './config.mjs';
import { ADULT_ALLOWLIST, CHILD_ROLE } from './domain.mjs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
assert.match(html, /type="module"/);
assert.match(js, /no sincroniza dispositivos/);
assert.match(js, /credentials: 'include'/);
assert.doesNotMatch(js, /backendConfigured:\s*true/);
assert.doesNotMatch(read('config.mjs'), /globalThis\.TABLON_CONFIG/);
assert.deepEqual(allowedBackendKeys, ['backendConfigured', 'apiBase', 'authProvider', 'firebaseConfig']);
assert.deepEqual(PUBLIC_FIREBASE_CONFIG, {
  projectId: 'tablongo',
  authDomain: 'tablongo.firebaseapp.com',
  apiKey: JSON.parse(read('firebase.local.json')).apiKey,
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
console.log('tablon smoke and configuration tests: ok');
