import assert from 'node:assert/strict';
import test from 'node:test';
import { lastVista, rememberVista, VISTA_KEY, VISTAS } from './vista.mjs';

test('recuerda Hoy / Semana / Cal; si no hay, Hoy', () => {
  assert.deepEqual(VISTAS, ['hoy', 'semana', 'cal']);
  assert.equal(VISTA_KEY, 'deporte.vista');
  const store = {};
  const storage = {
    getItem(k) { return Object.hasOwn(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
  };
  assert.equal(lastVista(storage), 'hoy');
  rememberVista('semana', storage);
  assert.equal(storage.getItem(VISTA_KEY), 'semana');
  assert.equal(lastVista(storage), 'semana');
  rememberVista('cal', storage);
  assert.equal(lastVista(storage), 'cal');
  rememberVista('nope', storage);
  assert.equal(lastVista(storage), 'cal');
  rememberVista('hoy', storage);
  assert.equal(lastVista(storage), 'hoy');
  rememberVista('proxima', storage);
  assert.equal(lastVista(storage), 'hoy');
});
