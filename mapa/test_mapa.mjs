import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  esPrivado,
  mergeViajes,
  puntoPrincipal,
  paradasDe,
  estadoViaje,
  etiquetaEstado,
  daysUntil,
  filtrarViajes,
  popupHtml,
  fichaUrl,
  pinKind,
  yearsOf,
} from './logic.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(root, 'index.html'), 'utf8');
const app = readFileSync(join(root, 'app.js'), 'utf8');
const logic = readFileSync(join(root, 'logic.mjs'), 'utf8');
const blob = html + app + logic;

const pub = {
  schema_version: 1,
  viajes: [
    {
      id: 'publico-lisboa',
      titulo: 'Lisboa abierta',
      inicio: '2026-12-25',
      fin: '2026-12-28',
      quien: 'Familia',
      lugar_principal: { label: 'Lisboa', latitud: 38.72, longitud: -9.14 },
    },
  ],
};

const casa = {
  schema_version: 1,
  viajes: [
    {
      id: 'secreto-casa',
      titulo: 'Viaje solo casa',
      inicio: '2026-11-01',
      fin: '2026-11-03',
      quien: 'Casa',
      privado: true,
      lugar_principal: { label: 'Comillas', latitud: 43.38, longitud: -4.29 },
      paradas: [
        { nombre: 'Santander', lat: 43.46, lng: -3.80 },
        { nombre: 'Comillas', lat: 43.38, lng: -4.29 },
      ],
    },
  ],
};

test('pariente no ve privado ni en merge ni en popup', () => {
  const leaked = {
    schema_version: 1,
    viajes: [...pub.viajes, { ...casa.viajes[0] }],
  };
  const merged = mergeViajes(leaked, null);
  assert.equal(merged.viajes.length, 1);
  assert.equal(merged.viajes[0].id, 'publico-lisboa');
  assert.equal(merged.viajes.some((v) => v.id === 'secreto-casa'), false);
  const htmlPop = popupHtml(merged.viajes[0], '2026-10-16');
  assert.equal(htmlPop.includes('Viaje solo casa'), false);
  assert.equal(htmlPop.includes('secreto-casa'), false);
  assert.equal(htmlPop.includes('Comillas'), false);
  assert.equal(htmlPop.includes('Lisboa abierta'), true);
  assert.equal(htmlPop.includes('/viajes/?fecha=2026-12-25'), true);
});

test('sesión casa sí ve el privado', () => {
  const merged = mergeViajes(pub, casa);
  assert.equal(merged.viajes.length, 2);
  assert.equal(merged.viajes.some((v) => v.id === 'secreto-casa'), true);
  const priv = merged.viajes.find((v) => v.id === 'secreto-casa');
  assert.equal(esPrivado(priv), true);
  assert.equal(paradasDe(priv).length, 2);
});

test('estados por fecha Madrid', () => {
  const v = pub.viajes[0];
  assert.equal(estadoViaje(v, '2026-10-16'), 'proximo');
  assert.equal(pinKind(v, '2026-10-16'), 'azul');
  assert.equal(etiquetaEstado(v, '2026-10-16'), 'faltan 70 días');
  assert.equal(estadoViaje(v, '2026-12-26'), 'ahora');
  assert.equal(pinKind(v, '2026-12-26'), 'rojo');
  assert.equal(etiquetaEstado(v, '2026-12-26'), '¡Estamos aquí!');
  assert.equal(estadoViaje(v, '2026-12-29'), 'pasado');
  assert.equal(pinKind(v, '2026-12-29'), 'gris');
  assert.equal(daysUntil('2026-10-17', '2026-10-16'), 1);
  assert.equal(etiquetaEstado({ inicio: '2026-10-17', fin: '2026-10-17' }, '2026-10-16'), 'falta 1 día');
});

test('filtros y sin coords no se pinta', () => {
  const today = '2026-10-16';
  const extra = [
    ...pub.viajes.filter((v) => !esPrivado(v)),
    { id: 'sin-sitio', titulo: 'Nada', inicio: '2026-12-01', fin: '2026-12-02', quien: 'X' },
  ];
  assert.equal(puntoPrincipal(extra[1]), null);
  assert.equal(filtrarViajes(extra, 'todos', 'todos', today).length, 1);
  assert.equal(filtrarViajes(extra, 'pasados', 'todos', today).length, 0);
  assert.equal(filtrarViajes(extra, 'proximos', 'todos', today).length, 1);
  assert.equal(filtrarViajes(extra, 'todos', '2027', today).length, 0);
  assert.deepEqual(yearsOf(extra), ['2026']);
});

test('ficha usa fecha e id', () => {
  assert.equal(fichaUrl(pub.viajes[0]), '/viajes/?fecha=2026-12-25&id=publico-lisboa');
});

test('js público no trae viajes ni emails', () => {
  assert.equal(blob.includes('@gmail.com'), false);
  assert.equal(blob.includes('Mari Luz'), false);
  assert.equal(blob.includes('mariluz-vidal'), false);
  assert.equal(blob.includes('manageViajesCasa'), false);
  assert.equal(blob.includes('firestore.rules'), false);
  assert.equal(html.includes('Inicia sesión'), true);
  assert.equal(html.includes('tile.openstreetmap.org') || app.includes('tile.openstreetmap.org'), true);
  assert.equal(html.includes('leaflet'), true);
  assert.equal(app.includes('casaDoc(\'viajes\')') || app.includes('casaDoc("viajes")'), true);
  assert.equal(app.includes('viajes_casa'), true);
});
