import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ymdMadrid, addDaysYmd, weekStartMonday, weekDays, weekFromToday, inWindow, keepPartido,
  hoyList, restoSemana, diaList, sortPartidos, sortSemana, isBrewers, isFavorito, emptyMsg, lineaToque, TAGS, WIN_START,
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
    { deporte: 'nfl', fecha_madrid: '2026-10-07', hora_madrid: '20:15', rival: 'Dolphins – Bills', tv: '', utc: '2026-10-07T18:15:00Z' },
    { deporte: 'mlb', fecha_madrid: '2026-10-07', hora_madrid: '02:10', rival: 'Dodgers – Padres', tv: '', utc: '2026-10-07T00:10:00Z' },
    { deporte: 'ncaa', fecha_madrid: '2026-10-07', hora_madrid: '18:00', rival: 'Texas – Oklahoma', tv: '', utc: '2026-10-07T16:00:00Z' },
    { deporte: 'f1', fecha_madrid: '2026-10-04', hora_madrid: '09:00', rival: 'Malasia · Carrera', tv: '', utc: '2026-10-04T07:00:00Z' },
  ],
};

test('Hoy filtra el día del navegador y Brewers primero', () => {
  const now = new Date('2026-10-06T12:00:00+02:00');
  assert.equal(ymdMadrid(now), '2026-10-06');
  const hoy = hoyList(payload, now);
  assert.deepEqual(hoy.map((p) => p.rival), ['Brewers – Mets', 'Cubs – Cardinals']);
  assert.equal(hoy.some((p) => p.deporte === 'nhl'), false);
});

test('semana son 7 días desde hoy; ★ primero y NCAA al fondo', () => {
  const now = new Date('2026-10-06T12:00:00+02:00'); // martes
  assert.deepEqual(weekFromToday('2026-10-03'), [
    '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09',
  ]);
  assert.equal(weekStartMonday('2026-10-06'), '2026-10-05');
  assert.deepEqual(weekDays('2026-10-06')[0], '2026-10-05');
  const semana = restoSemana(payload, now);
  assert.ok(semana.some((r) => r.fecha === '2026-10-06'));
  assert.equal(semana.some((r) => r.fecha === '2026-10-04'), false);
  const desdeSab = restoSemana(payload, new Date('2026-10-03T12:00:00+02:00'));
  assert.ok(desdeSab.some((r) => r.fecha === '2026-10-04'));
  assert.equal(desdeSab.find((r) => r.fecha === '2026-10-04').partidos[0].rival, 'Malasia · Carrera');
  const mie = semana.find((r) => r.fecha === '2026-10-07');
  assert.ok(mie);
  assert.deepEqual(mie.partidos.map((p) => p.rival), ['Dolphins – Bills', 'Dodgers – Padres', 'Texas – Oklahoma']);
  assert.equal(mie.partidos.at(-1).deporte, 'ncaa');
  assert.equal(sortSemana(mie.partidos).at(-1).deporte, 'ncaa');
  assert.equal(mie.ventana.some((p) => p.deporte === 'femenino'), false);
  const sab = diaList(payload, '2026-10-10');
  assert.equal(sab[0].rival, 'Villarreal – Real Madrid');
  assert.equal(addDaysYmd('2026-10-06', 4), '2026-10-10');
  const paintedNoche = paintList(mie.fuera, (p) => TAGS[p.deporte], (p) => p.tv || '');
  assert.equal(paintedNoche[0].noche, true);
  assert.match(cardHtml(paintedNoche[0], (s) => s), /<summary>noche<\/summary>/);
});

test('favoritos casa', () => {
  assert.equal(isFavorito({ deporte: 'futbol', rival: 'Villarreal – Real Madrid' }), true);
  assert.equal(isFavorito({ deporte: 'futbol', rival: 'Getafe – Barcelona' }), false);
  assert.equal(isFavorito({ deporte: 'femenino', rival: 'Real Madrid – Barça' }), false);
  assert.equal(isFavorito({ deporte: 'mlb', rival: 'Brewers – Mets' }), true);
  assert.equal(isFavorito({ deporte: 'nfl', rival: 'Dolphins – Bills' }), true);
  assert.equal(isFavorito({ deporte: 'nhl', rival: 'Red Wings – Rangers' }), true);
  assert.equal(isFavorito({ deporte: 'f1', rival: 'Bahrain GP' }), true);
  assert.equal(isFavorito({ deporte: 'mlb', rival: 'Cubs – Cardinals' }), false);
  assert.equal(keepPartido({ deporte: 'femenino', fecha_madrid: '2026-10-07', hora_madrid: '19:00', rival: 'Real Madrid – Barça' }), false);
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
  assert.equal(TAGS.femenino, undefined);
  assert.equal(TAGS.nhl.color, '#5dade2');
  const painted = paintList(sortPartidos(payload.partidos.filter((p) => p.fecha_madrid === '2026-10-06' && p.deporte === 'mlb')), (p) => TAGS[p.deporte], (p) => p.tv || '');
  assert.equal(painted[0].rival.includes('Brewers'), true);
  assert.equal(painted[0].favorito, true);
  assert.equal(painted[1].favorito, false);
  assert.equal(isBrewers(payload.partidos[1]), true);
  assert.match(cardHtml({ tag: TAGS.mlb, hora: '21:15', rival: 'Brewers', tv: '', favorito: true }, (s) => s), /casa-star.*★.*Brewers/s);
  assert.equal(cardHtml({ tag: TAGS.mlb, hora: '20:10', rival: 'Cubs', tv: '', favorito: false }, (s) => s).includes('★'), false);
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
  assert.match(html, /deporte-build: 20261003d/);
  assert.match(html, /casa-star/);
  assert.match(js, /★/);
  assert.match(html, />Semana</);
  assert.match(html, /h2 class="dia"/);
  assert.match(js, /details class="noche"/);
  assert.equal(html.includes('En ventana'), false);
  assert.equal(html.includes('Fuera de ventana'), false);
  assert.match(html, /Creado por Álvaro GT y sus minions/);
  assert.match(html, /Sin sesión no hay partidos/);
  assert.match(html, /id="app"[^>]*hidden/);
});
