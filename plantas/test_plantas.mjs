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
  mesEnRango,
  tareaPendiente,
  mostrarAbono,
  alertaRiego,
  textoProximo,
  abonoHtml,
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
  assert.deepEqual(p.tareas, []);
  assert.deepEqual(p.tarea_hecha, {});
  assert.equal(p.abono_dias, null);
  assert.deepEqual(p.historial_abono, []);
  assert.equal(p.ultimo_abono, null);
  assert.equal(p.archivada, false);
  assert.equal(p.fecha_archivo, null);
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

test('fotoHtml alt es el nombre de la planta', () => {
  const fn = app.slice(app.indexOf('function fotoHtml'), app.indexOf('function tareasHtml'));
  assert.match(fn, /alt="\$\{esc\(p\.nombre\)\}"/);
  assert.doesNotMatch(fn, /alt=""/);
});

test('html sin plantas ni semilla', () => {
  assert.match(html, /id="app"[^>]*hidden/);
  assert.match(html, /id="gate"/);
  assert.doesNotMatch(html, /Tronco del Brasil/);
  assert.doesNotMatch(html, /Dracaena/);
  assert.doesNotMatch(html, /tronco-brasil/);
  assert.doesNotMatch(app, /Tronco del Brasil/);
  assert.doesNotMatch(logic, /Tronco del Brasil/);
  for (const src of [html, app, logic]) {
    assert.doesNotMatch(src, /cocotero|enebro|Gold Coast|Juniperus|romero|Rosmarinus|lavanda|Lavandula|Cocos nucifera|flor-de-pascua|Flor de Pascua|Euphorbia/i);
  }
  assert.match(html, /Creado por Álvaro GT y sus minions/);
  assert.match(app, /💧 Regada/);
  assert.match(html, /Añadir planta/);
});

test('sin emails y login de casa', () => {
  for (const src of [html, app, logic]) {
    assert.doesNotMatch(src, /@gmail\.com/);
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
  assert.match(app, /\/plantas\/fotos\//);
  assert.match(app, /data:image/);
  assert.match(app, /data-plantas-alerta/);
  assert.match(app, /fetchTiempo/);
  assert.match(app, /go\/tiempo\.mjs/);
  assert.match(app, /void loadTiempo\(\)/);
  assert.doesNotMatch(app, /cloudfunctions/i);
  assert.doesNotMatch(app, /functions\.https/i);
  assert.doesNotMatch(logic, /precipitation|rain_probability|lluvia/);
  assert.doesNotMatch(app, /precipitation|rain_probability|saltar/);
  assert.match(html, /Archivadas/);
  assert.match(html, /id="ficha"/);
  assert.match(html, /ficha-x/);
  assert.match(html, /data-cerrar/);
  assert.match(app, /Hecho este año/);
  assert.match(app + logic, /Abonada/);
  assert.match(html, /name="abono_dias"/);
  assert.match(app, /form\.abono_dias/);
  assert.match(app, /Archivar/);
  assert.match(app, /Recuperar/);
  assert.match(app, /card compact/);
  assert.match(app, /function fichaHtml/);
  assert.match(app, /stopPropagation/);
  assert.match(app, /history\.pushState/);
  assert.match(app, /popstate/);
  assert.match(app, /openFicha/);
  const cardFn = app.slice(app.indexOf('function cardHtml'), app.indexOf('function fichaHtml'));
  assert.doesNotMatch(cardFn, /archivoHtml|Archivar|Recuperar/);
  assert.match(app, /function fichaHtml[\s\S]*archivoHtml/);
  assert.match(app, /Últimos riegos/);
  assert.match(logic, /Regar hoy/);
  assert.doesNotMatch(html + app + logic, /Trasplantar a maceta mayor/);
  assert.doesNotMatch(html + app + logic, /parte leñosa/);
  assert.doesNotMatch(html + app + logic, /14 h diarias/);
});

test('rango de mes inclusive y cruce de año', () => {
  assert.equal(mesEnRango(3, 3, 4), true);
  assert.equal(mesEnRango(4, 3, 4), true);
  assert.equal(mesEnRango(2, 3, 4), false);
  assert.equal(mesEnRango(5, 3, 4), false);
  assert.equal(mesEnRango(10, 10, 10), true);
  assert.equal(mesEnRango(11, 10, 10), false);
  assert.equal(mesEnRango(11, 11, 2), true);
  assert.equal(mesEnRango(1, 11, 2), true);
  assert.equal(mesEnRango(3, 11, 2), false);
});

test('hecho este año oculta la tarea y al siguiente vuelve', () => {
  const tarea = { texto: 'Limpiar hojas', mes_desde: 11, mes_hasta: 11 };
  const nov = madrid('2026-11-20T12:00:00+01:00');
  const nov27 = madrid('2027-11-05T12:00:00+01:00');
  const mar = madrid('2026-03-15T12:00:00+01:00');
  assert.equal(tareaPendiente(tarea, {}, nov), true);
  assert.equal(tareaPendiente(tarea, { 'Limpiar hojas': 2026 }, nov), false);
  assert.equal(tareaPendiente(tarea, { 'Limpiar hojas': 2026 }, nov27), true);
  assert.equal(tareaPendiente(tarea, {}, mar), false);
});

test('abono oculto en noviembre', () => {
  const now = madrid('2026-10-16T12:00:00+02:00');
  const nov = madrid('2026-11-20T12:00:00+01:00');
  const jun = madrid('2026-06-15T12:00:00+02:00');
  const p = {
    riego_verano_dias: 10,
    riego_invierno_dias: 20,
    ultimo_riego: '2026-10-06T10:00:00+02:00',
    abono_dias: 15,
    ultimo_abono: '2026-06-01T10:00:00+02:00',
  };
  assert.equal(mostrarAbono(p, nov), false);
  assert.equal(mostrarAbono(p, jun), true);
  assert.equal(mostrarAbono({ abono_dias: null }, jun), false);
  assert.equal(estado(p, now), 'verde');
  assert.equal(estado({ ...p, ultimo_abono: '2020-01-01T10:00:00+01:00' }, now), 'verde');
});

test('abono en marzo pinta Abonada', () => {
  const mar = madrid('2026-03-15T12:00:00+01:00');
  const p = {
    riego_verano_dias: 10,
    riego_invierno_dias: 20,
    abono_dias: 30,
  };
  assert.equal(mostrarAbono(p, mar), true);
  assert.match(abonoHtml(p, mar), /Abonada/);
});

test('archivada no alerta y sale de Todas', () => {
  const now = madrid('2026-10-16T12:00:00+02:00');
  const viva = {
    nombre: 'Viva', zona: 'salon',
    riego_verano_dias: 10, riego_invierno_dias: 20,
    ultimo_riego: '2026-09-23T10:00:00+02:00',
    archivada: false,
  };
  const arch = { ...viva, nombre: 'Guardada', archivada: true };
  assert.equal(alertaRiego(viva, now), true);
  assert.equal(alertaRiego(arch, now), false);
  assert.equal(filtrarZona([viva, arch], 'todas').map((p) => p.nombre).join(), 'Viva');
  assert.equal(filtrarZona([viva, arch], 'salon').map((p) => p.nombre).join(), 'Viva');
  assert.equal(filtrarZona([viva, arch], 'archivadas').map((p) => p.nombre).join(), 'Guardada');
});

test('orden por próximo riego; sin fecha al final; relativo', () => {
  const now = madrid('2026-10-16T12:00:00+02:00');
  const d = (nombre, ultimo) => ({
    nombre, riego_verano_dias: 10, riego_invierno_dias: 20, ultimo_riego: ultimo,
  });
  const sorted = ordenarPlantas([
    d('Zeta', '2026-10-05T10:00:00+02:00'),
    d('Alfa', '2026-10-01T10:00:00+02:00'),
    d('Sin fecha', null),
  ], now).map((p) => p.nombre);
  assert.deepEqual(sorted, ['Alfa', 'Zeta', 'Sin fecha']);
  assert.equal(textoProximo(d('Hoy', '2026-09-26T10:00:00+02:00'), now), 'Regar hoy');
  assert.equal(textoProximo(d('Man', '2026-09-27T10:00:00+02:00'), now), 'mañana');
  assert.equal(textoProximo(d('Luego', '2026-10-01T10:00:00+02:00'), now), 'en 5 días');
});
