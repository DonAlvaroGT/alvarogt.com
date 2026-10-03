import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ymdMadrid, addDaysYmd, weekStartMonday, weekDays, inWindow, keepPartido,
  hoyList, restoSemana, diaList, sortPartidos, isBrewers, emptyMsg, lineaToque, TAGS, WIN_START,
} from './filtro.mjs';
import { paintList, HOSTS, cardHtml } from './app.js';

test('ventana 09:00–22:30', () => {
  assert.equal(WIN_START, 540);
  assert.equal(inWindow({ hora_madrid: '09:00' }), true);
  assert.equal(inWindow({ hora_madrid: '08:59' }), false);
  assert.equal(inWindow({ hora_madrid: '22:30' }), true);
  assert.equal(inWindow({ hora_madrid: '22:31' }), false);
  assert.equal(inWindow({ hora_madrid: '' }), false);
});

test('NHL fuera de ventana no se ve', () => {
  assert.equal(keepPartido({ deporte: 'nhl', fecha_madrid: '2026-10-06', hora_madrid: '01:30', rival: 'Wings' }), false);
  assert.equal(keepPartido({ deporte: 'nhl', fecha_madrid: '2026-10-06', hora_madrid: '20:00', rival: 'Wings' }), true);
  assert.equal(keepPartido({ deporte: 'mlb', fecha_madrid: '2026-10-06', hora_madrid: '01:30', rival: 'Brewers' }), true);
});

const payload = {
  schema_version: 1,
  fuentes: { mlb: 'ok', wec: 'omitido' },
  partidos: [
    { deporte: 'mlb', fecha_madrid: '2026-10-06', hora_madrid: '20:10', rival: 'Cubs – Cardinals', tv: '', utc: '2026-10-06T18:10:00Z' },
    { deporte: 'mlb', fecha_madrid: '2026-10-06', hora_madrid: '21:15', rival: 'Brewers – Mets', tv: 'TBS', utc: '2026-10-06T19:15:00Z' },
    { deporte: 'nhl', fecha_madrid: '2026-10-06', hora_madrid: '02:00', rival: 'Rangers – Wings', tv: 'TNT', utc: '2026-10-06T00:00:00Z' },
    { deporte: 'futbol', fecha_madrid: '2026-10-10', hora_madrid: '21:00', rival: 'Villarreal – Real Madrid', tv: '', utc: '2026-10-10T19:00:00Z' },
    { deporte: 'femenino', fecha_madrid: '2026-10-07', hora_madrid: '19:00', rival: 'Real Madrid – Barça', tv: '', utc: '2026-10-07T17:00:00Z' },
    { deporte: 'mlb', fecha_madrid: '2026-10-07', hora_madrid: '02:10', rival: 'Dodgers – Padres', tv: '', utc: '2026-10-07T00:10:00Z' },
  ],
};

test('Hoy filtra el día del navegador y Brewers primero', () => {
  const now = new Date('2026-10-06T12:00:00+02:00');
  assert.equal(ymdMadrid(now), '2026-10-06');
  const hoy = hoyList(payload, now);
  assert.deepEqual(hoy.map((p) => p.rival), ['Brewers – Mets', 'Cubs – Cardinals']);
  assert.equal(hoy.some((p) => p.deporte === 'nhl'), false);
});

test('resto de la semana no incluye hoy; martes ve el sábado por calendario', () => {
  const now = new Date('2026-10-06T12:00:00+02:00'); // martes
  assert.equal(weekStartMonday('2026-10-06'), '2026-10-05');
  assert.deepEqual(weekDays('2026-10-06')[0], '2026-10-05');
  const resto = restoSemana(payload, now);
  assert.equal(resto.some((r) => r.fecha === '2026-10-06'), false);
  const mie = resto.find((r) => r.fecha === '2026-10-07');
  assert.ok(mie);
  assert.deepEqual(mie.ventana.map((p) => p.rival), ['Real Madrid – Barça']);
  assert.deepEqual(mie.fuera.map((p) => p.rival), ['Dodgers – Padres']);
  const sab = diaList(payload, '2026-10-10');
  assert.equal(sab[0].rival, 'Villarreal – Real Madrid');
  assert.equal(addDaysYmd('2026-10-06', 4), '2026-10-10');
});

test('toque no inventa TV', () => {
  assert.equal(lineaToque({ hora_madrid: '21:15', rival: 'Brewers – Mets', tv: 'TBS' }), '21:15 · Brewers – Mets · TBS');
  assert.equal(lineaToque({ hora_madrid: '21:00', rival: 'Villarreal – Real Madrid', tv: '' }), '21:00 · Villarreal – Real Madrid');
  assert.equal(lineaToque({ hora_madrid: '21:00', rival: 'X', tv: 'undefined' }), '21:00 · X');
});

test('sin datos si las fuentes fallan', () => {
  assert.equal(emptyMsg({ fuentes: { mlb: '403', 'esp.1': '403' }, partidos: [] }), 'sin datos');
  assert.equal(emptyMsg({ fuentes: { mlb: 'ok', wec: 'omitido' }, partidos: [] }), 'sin partidos');
  assert.equal(emptyMsg(null), 'sin datos');
});

test('tags y pie de lista', () => {
  assert.equal(TAGS.femenino.label, 'Femenino');
  assert.equal(TAGS.nhl.color, '#5dade2');
  const painted = paintList(sortPartidos(payload.partidos.filter((p) => p.fecha_madrid === '2026-10-06' && p.deporte === 'mlb')), (p) => TAGS[p.deporte], (p) => p.tv || '');
  assert.equal(painted[0].rival.includes('Brewers'), true);
  assert.equal(isBrewers(payload.partidos[1]), true);
  assert.match(cardHtml({ tag: TAGS.mlb, hora: '21:15', rival: 'Brewers', tv: '' }, (s) => s), /Brewers/);
  assert.ok(HOSTS.includes('alvarogt.com'));
});

test('app.js no trae correos', async () => {
  const fs = await import('node:fs');
  const js = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const filtro = fs.readFileSync(new URL('./filtro.mjs', import.meta.url), 'utf8');
  for (const blob of [js, html, filtro]) {
    assert.equal(blob.includes('@gmail.com'), false);
    assert.equal(blob.includes('agarcia'), false);
  }
  assert.match(html, /deporte-build: 20261003b/);
  assert.match(html, /En ventana/);
  assert.match(html, /Fuera de ventana/);
  assert.match(html, /Creado por Álvaro GT y sus minions/);
  assert.match(html, /Sin sesión no hay partidos/);
  assert.match(html, /id="app"[^>]*hidden/);
});
