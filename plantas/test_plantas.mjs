import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isVerano,
  estado,
  ordenarPlantas,
  filtrarZona,
  slugId,
  pushHistorial,
  proximoRiego,
  textoRegada,
  plantaValida,
  camposPlanta,
  diasRiego,
  usaRiegoVerano,
  UMBRAL_CALOR_C,
} from './logic.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(root, 'index.html'), 'utf8');
const app = readFileSync(join(root, 'app.js'), 'utf8');
const logic = readFileSync(join(root, 'logic.mjs'), 'utf8');

const madrid = (iso) => new Date(iso);

test('verano 1 may–30 sep Madrid', () => {
  assert.equal(isVerano(madrid('2026-05-01T00:30:00+02:00')), true);
  assert.equal(isVerano(madrid('2026-09-30T22:00:00+02:00')), true);
  assert.equal(isVerano(madrid('2026-04-30T12:00:00+02:00')), false);
  assert.equal(isVerano(madrid('2026-10-01T00:30:00+02:00')), false);
  assert.equal(isVerano(madrid('2026-10-16T19:00:00+02:00')), false);
});

test('estados riego', () => {
  const now = madrid('2026-10-16T12:00:00+02:00');
  const base = { riego_verano_dias: 10, riego_invierno_dias: 20 };
  assert.equal(base.riego_verano_dias, 10);
  assert.equal(base.riego_invierno_dias, 20);
  assert.equal(estado({ ...base }, now), 'gris');
  assert.equal(estado({ ...base, ultimo_riego: '2026-10-06T10:00:00+02:00' }, now), 'verde');
  assert.equal(estado({ ...base, ultimo_riego: '2026-09-26T10:00:00+02:00' }, now), 'amarillo');
  assert.equal(estado({ ...base, ultimo_riego: '2026-09-28T10:00:00+02:00' }, now), 'amarillo');
  assert.equal(estado({ ...base, ultimo_riego: '2026-09-23T10:00:00+02:00' }, now), 'rojo');
  assert.equal(proximoRiego({ ...base, ultimo_riego: '2026-09-26T10:00:00+02:00' }, now), '2026-10-16');
});

test('orden rojo amarillo verde gris', () => {
  const now = madrid('2026-10-16T12:00:00+02:00');
  const d = (nombre, ultimo) => ({
    nombre, riego_verano_dias: 10, riego_invierno_dias: 20, ultimo_riego: ultimo,
  });
  const sorted = ordenarPlantas([
    d('Verde', '2026-10-01T10:00:00+02:00'),
    d('Gris', null),
    d('Roja', '2026-09-01T10:00:00+02:00'),
    d('Amarilla', '2026-09-26T10:00:00+02:00'),
  ], now).map((p) => p.nombre);
  assert.deepEqual(sorted, ['Roja', 'Amarilla', 'Verde', 'Gris']);
});

test('filtro zona y slug', () => {
  const list = [{ zona: 'salon', nombre: 'A' }, { zona: 'terraza', nombre: 'B' }];
  assert.equal(filtrarZona(list, 'salon').length, 1);
  assert.equal(filtrarZona(list, 'todas').length, 2);
  assert.equal(slugId('Tronco del Brasil'), 'tronco-del-brasil');
  assert.equal(pushHistorial([1, 2], 3, 2).length, 2);
});

test('alta valida sin ultimo riego', () => {
  const p = camposPlanta({
    nombre: 'Poto', latin: 'Epipremnum', zona: 'terraza', toxica: true,
    riego_verano_dias: 7, riego_invierno_dias: 14, consejo: 'poca agua',
  });
  assert.equal(p.ultimo_riego, null);
  assert.equal(plantaValida(p), true);
  assert.equal(textoRegada(p, new Date()), '');
});

test('calor ≥30 usa verano aunque sea invierno; Open-Meteo falla → calendario; lluvia no salta', () => {
  const now = madrid('2026-10-16T12:00:00+02:00');
  const p = {
    zona: 'salon',
    riego_verano_dias: 10,
    riego_invierno_dias: 20,
    ultimo_riego: '2026-10-06T10:00:00+02:00',
  };
  assert.equal(UMBRAL_CALOR_C, 30);
  assert.equal(isVerano(now), false);
  assert.equal(diasRiego(p, now, null), 20);
  assert.equal(estado(p, now, null), 'verde');
  assert.equal(usaRiegoVerano(now, { '2026-10-16': { max: 31, rain_probability: 100 } }), true);
  assert.equal(diasRiego(p, now, { '2026-10-16': { max: 31, rain_probability: 100 } }), 10);
  assert.equal(estado(p, now, { '2026-10-16': { max: 31, rain_probability: 100 } }), 'amarillo');
  assert.equal(diasRiego(p, now, { '2026-10-16': { max: 29.9, rain_probability: 100 } }), 20);
  assert.equal(estado(p, now, { '2026-10-16': { max: 22, rain_probability: 100 } }), 'verde');
  assert.equal(diasRiego(p, now, { '2026-10-16': { max: 30 } }), 10);
  const julio = madrid('2026-07-01T12:00:00+02:00');
  assert.equal(diasRiego(p, julio, { '2026-07-01': { max: 18, rain_probability: 90 } }), 10);
  assert.equal(p.riego_verano_dias, 10);
  assert.equal(p.riego_invierno_dias, 20);
});

test('html sin plantas ni semilla', () => {
  assert.match(html, /id="app"[^>]*hidden/);
  assert.match(html, /id="gate"/);
  assert.doesNotMatch(html, /Tronco del Brasil/);
  assert.doesNotMatch(html, /Dracaena/);
  assert.doesNotMatch(html, /tronco-brasil/);
  assert.doesNotMatch(app, /Tronco del Brasil/);
  assert.doesNotMatch(logic, /Tronco del Brasil/);
  assert.match(html, /Creado por Álvaro GT y sus minions/);
  assert.match(app, /💧 Regada/);
  assert.match(html, /Añadir planta/);
});

test('sin emails y login de casa', () => {
  for (const src of [html, app, logic]) {
    assert.doesNotMatch(src, /@gmail\.com/);
    assert.doesNotMatch(src, /agarciatimon/);
    assert.doesNotMatch(src, /luzolivas/);
  }
  assert.match(app, /plantas_casa/);
  assert.match(app, /casa_json/);
  assert.match(app, /signInWithPopup/);
  assert.match(app, /houseAllowed/);
  assert.match(app, /__casaAuth/);
  assert.match(app, /parentIdToken/);
  assert.match(app, /classList\.add\('embedded'\)/);
  assert.match(html, /html\.embedded/);
  assert.match(html, /html\.embedded \.access/);
  assert.match(html, /#f4f0e8/);
  assert.match(html, /object-position:\s*50%\s*20%/);
  assert.match(app, /data-plantas-alerta/);
  assert.match(app, /fetchTiempo/);
  assert.match(app, /go\/tiempo\.mjs/);
  assert.match(app, /void loadTiempo\(\)/);
  assert.doesNotMatch(app, /cloudfunctions/i);
  assert.doesNotMatch(app, /functions\.https/i);
  assert.doesNotMatch(logic, /precipitation|rain_probability|lluvia/);
  assert.doesNotMatch(app, /precipitation|rain_probability|saltar/);
});
