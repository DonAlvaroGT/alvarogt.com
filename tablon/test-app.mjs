import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateRuntimeConfig, readRuntimeConfig, allowedBackendKeys } from './config.mjs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

assert.match(html, /type="module"/);
assert.match(html, /id="adult-view"/);
assert.match(html, /id="nacho-view"/);
assert.match(html, /id="luz-view"/);
assert.match(js, /no sincroniza dispositivos/);
assert.match(js, /credentials: 'include'/);
assert.match(js, /status === 401/);
assert.match(js, /status === 403/);
assert.doesNotMatch(js, /prompt\([^)]*contraseña|prompt\([^)]*PIN/i);
assert.doesNotMatch(js, /backendConfigured:\s*true/);
assert.match(js, /localStorage\.getItem/);
assert.match(js, /if \(!runtime\.localDevelopment\) return/);
assert.deepEqual(allowedBackendKeys, ['backendConfigured', 'apiBase', 'authProvider']);
assert.equal(validateRuntimeConfig({}, { protocol: 'file:', hostname: '' }).localDevelopment, true);
assert.equal(validateRuntimeConfig({}, { protocol: 'https:', hostname: 'alvarogt.com' }).valid, false);
assert.match(validateRuntimeConfig({ backendConfigured: true, apiBase: 'http://example.test', authProvider: 'supabase' }, { protocol: 'https:', hostname: 'alvarogt.com' }).errors.join(' '), /HTTPS/);
assert.equal(validateRuntimeConfig({ backendConfigured: true, apiBase: 'https://backend.example.test', authProvider: 'supabase' }, { protocol: 'https:', hostname: 'alvarogt.com' }).valid, true);
assert.match(read('README.md'), /Firebase/);
assert.match(read('README.md'), /Supabase/);
assert.match(read('backend.example.json'), /idempotency/);
console.log('tablon smoke and configuration tests: ok');
