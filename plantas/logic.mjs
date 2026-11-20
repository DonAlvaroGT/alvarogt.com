export const TZ = 'Europe/Madrid';
export const ZONAS = ['terraza', 'salon'];
export const ORDEN = { rojo: 0, amarillo: 1, verde: 2, gris: 3 };
export const UMBRAL_CALOR_C = 30;

export function ymdMadrid(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date || new Date());
}

export function mesMadrid(date) {
  return Number(ymdMadrid(date).slice(5, 7));
}

export function anioMadrid(date) {
  return Number(ymdMadrid(date).slice(0, 4));
}

export function addDaysYmd(ymd, n) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + Number(n)));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function daysBetweenYmd(fromYmd, toYmd) {
  const [y1, m1, d1] = String(fromYmd).split('-').map(Number);
  const [y2, m2, d2] = String(toYmd).split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

export function isVerano(date) {
  const ymd = ymdMadrid(date);
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  if (m > 5 && m < 9) return true;
  if (m === 5) return d >= 1;
  if (m === 9) return d <= 30;
  return false;
}

export function maxMadrid(tiempo, date) {
  if (!tiempo || typeof tiempo !== 'object') return null;
  const day = tiempo[ymdMadrid(date)];
  const max = day && day.max;
  return typeof max === 'number' && Number.isFinite(max) ? max : null;
}

export function usaRiegoVerano(date, tiempo) {
  const max = maxMadrid(tiempo, date);
  if (max != null && max >= UMBRAL_CALOR_C) return true;
  return isVerano(date);
}

export function diasRiego(planta, date, tiempo) {
  const n = Number(usaRiegoVerano(date, tiempo) ? planta.riego_verano_dias : planta.riego_invierno_dias);
  return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : null;
}

export function parseTs(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    try { return parseTs(value.toDate()); } catch { return null; }
  }
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function proximoRiego(planta, now, tiempo) {
  const last = parseTs(planta.ultimo_riego);
  const days = diasRiego(planta, now || new Date(), tiempo);
  if (!last || days == null) return null;
  return addDaysYmd(ymdMadrid(last), days);
}

export function estado(planta, now, tiempo) {
  const when = now || new Date();
  if (!parseTs(planta.ultimo_riego)) return 'gris';
  const next = proximoRiego(planta, when, tiempo);
  if (!next) return 'gris';
  const left = daysBetweenYmd(ymdMadrid(when), next);
  if (left < 0) return 'rojo';
  if (left <= 2) return 'amarillo';
  return 'verde';
}

export function etiquetaEstado(kind) {
  if (kind === 'rojo') return '¡tengo sed!';
  if (kind === 'gris') return 'sin registrar';
  return '';
}

export function alertaRiego(planta, now, tiempo) {
  if (planta && planta.archivada) return false;
  const k = estado(planta, now, tiempo);
  return k === 'amarillo' || k === 'rojo';
}

export function ordenarPlantas(list, now, tiempo) {
  const when = now || new Date();
  return [...list].sort((a, b) => {
    const ea = estado(a, when, tiempo);
    const eb = estado(b, when, tiempo);
    const d = (ORDEN[ea] ?? 9) - (ORDEN[eb] ?? 9);
    if (d) return d;
    const na = proximoRiego(a, when, tiempo);
    const nb = proximoRiego(b, when, tiempo);
    if (na && nb && na !== nb) return na < nb ? -1 : 1;
    if (na && !nb) return -1;
    if (!na && nb) return 1;
    return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es-ES');
  });
}

export function filtrarZona(list, zona) {
  if (zona === 'archivadas') return list.filter((p) => p.archivada);
  const vivas = list.filter((p) => !p.archivada);
  if (!zona || zona === 'todas') return vivas;
  return vivas.filter((p) => p.zona === zona);
}

export function slugId(nombre) {
  const s = String(nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || 'planta';
}

export function pushHistorial(hist, ts, limit = 20) {
  const list = Array.isArray(hist) ? hist.slice() : [];
  list.push(ts);
  return list.slice(-Math.max(1, limit));
}

export function zonaOk(zona) {
  return ZONAS.includes(zona);
}

function camposTareas(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => {
    if (!t || typeof t !== 'object') return null;
    const texto = String(t.texto || '').trim();
    const mes_desde = Number(t.mes_desde);
    const mes_hasta = Number(t.mes_hasta);
    if (!texto) return null;
    if (!Number.isInteger(mes_desde) || mes_desde < 1 || mes_desde > 12) return null;
    if (!Number.isInteger(mes_hasta) || mes_hasta < 1 || mes_hasta > 12) return null;
    return { texto, mes_desde, mes_hasta };
  }).filter(Boolean);
}

function camposHecha(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isInteger(n)) out[k] = n;
  }
  return out;
}

export function camposPlanta(raw, id) {
  const zona = raw.zona === 'terraza' ? 'terraza' : raw.zona === 'salon' ? 'salon' : '';
  const verano = Number(raw.riego_verano_dias);
  const invierno = Number(raw.riego_invierno_dias);
  const abono = Number(raw.abono_dias);
  return {
    id: String(id || raw.id || slugId(raw.nombre)),
    nombre: String(raw.nombre || '').trim(),
    latin: String(raw.latin || '').trim(),
    zona,
    foto: String(raw.foto || '').trim(),
    toxica: raw.toxica === true || raw.toxica === 'true',
    nota_toxica: String(raw.nota_toxica || '').trim(),
    riego_verano_dias: Number.isFinite(verano) ? Math.trunc(verano) : 0,
    riego_invierno_dias: Number.isFinite(invierno) ? Math.trunc(invierno) : 0,
    consejo: String(raw.consejo || '').trim(),
    ultimo_riego: raw.ultimo_riego ?? null,
    historial: Array.isArray(raw.historial) ? raw.historial.slice(-20) : [],
    tareas: camposTareas(raw.tareas),
    tarea_hecha: camposHecha(raw.tarea_hecha),
    abono_dias: Number.isFinite(abono) && abono >= 1 ? Math.trunc(abono) : null,
    historial_abono: Array.isArray(raw.historial_abono) ? raw.historial_abono.slice(-20) : [],
    ultimo_abono: raw.ultimo_abono ?? null,
    archivada: raw.archivada === true || raw.archivada === 'true',
    fecha_archivo: raw.fecha_archivo ?? null,
  };
}

export function plantaValida(p) {
  return !!(p.nombre && zonaOk(p.zona) && p.riego_verano_dias >= 1 && p.riego_invierno_dias >= 1);
}

export function textoRegada(planta, now) {
  const last = parseTs(planta.ultimo_riego);
  if (!last) return '';
  const n = daysBetweenYmd(ymdMadrid(last), ymdMadrid(now || new Date()));
  if (n <= 0) return 'Regada hace 0 días';
  return `Regada hace ${n} días`;
}

export function textoRelativoRiego(left) {
  if (left === 0) return 'Regar hoy';
  if (left === 1) return 'mañana';
  if (left > 1) return `en ${left} días`;
  return '';
}

export function textoProximo(planta, now, tiempo) {
  const when = now || new Date();
  const next = proximoRiego(planta, when, tiempo);
  if (!next) return '';
  const left = daysBetweenYmd(ymdMadrid(when), next);
  return textoRelativoRiego(left);
}

export function mesEnRango(mes, desde, hasta) {
  const m = Number(mes);
  const a = Number(desde);
  const b = Number(hasta);
  if (!Number.isInteger(m) || m < 1 || m > 12) return false;
  if (!Number.isInteger(a) || a < 1 || a > 12) return false;
  if (!Number.isInteger(b) || b < 1 || b > 12) return false;
  if (a <= b) return m >= a && m <= b;
  return m >= a || m <= b;
}

export function tareaPendiente(tarea, hecha, date) {
  if (!tarea || !String(tarea.texto || '').trim()) return false;
  const when = date || new Date();
  if (!mesEnRango(mesMadrid(when), tarea.mes_desde, tarea.mes_hasta)) return false;
  const yearDone = hecha && hecha[tarea.texto];
  return Number(yearDone) !== anioMadrid(when);
}

export function tareasPendientes(planta, date) {
  const tareas = Array.isArray(planta.tareas) ? planta.tareas : [];
  const hecha = planta.tarea_hecha && typeof planta.tarea_hecha === 'object' ? planta.tarea_hecha : {};
  return tareas.filter((t) => tareaPendiente(t, hecha, date));
}

export function temporadaAbono(date) {
  const m = mesMadrid(date);
  return m >= 3 && m <= 9;
}

export function abonaPlanta(planta) {
  const n = Number(planta && planta.abono_dias);
  return Number.isFinite(n) && n >= 1;
}

export function mostrarAbono(planta, date) {
  return abonaPlanta(planta) && temporadaAbono(date || new Date());
}

export function proximoAbono(planta, now) {
  if (!abonaPlanta(planta)) return null;
  const last = parseTs(planta.ultimo_abono);
  const days = Math.trunc(Number(planta.abono_dias));
  if (!last || days < 1) return null;
  return addDaysYmd(ymdMadrid(last), days);
}

export function textoUltimoAbono(planta, now) {
  const last = parseTs(planta.ultimo_abono);
  if (!last) return 'Sin abonar aún';
  const n = daysBetweenYmd(ymdMadrid(last), ymdMadrid(now || new Date()));
  if (n <= 0) return 'Abonada hace 0 días';
  return `Abonada hace ${n} días`;
}

export function textoProximoAbono(planta, now) {
  const next = proximoAbono(planta, now || new Date());
  if (!next) return '';
  const left = daysBetweenYmd(ymdMadrid(now || new Date()), next);
  if (left === 0) return 'Abonar hoy';
  if (left === 1) return 'Abonar mañana';
  if (left > 1) return `Abonar en ${left} días`;
  return 'Toca abonar';
}

export function abonoHtml(planta, now) {
  if (!mostrarAbono(planta, now)) return '';
  const last = textoUltimoAbono(planta, now);
  const next = textoProximoAbono(planta, now);
  return `<p class="meta abono">${last}${next ? ` · ${next}` : ''}</p>
    <button type="button" class="regar abonar" data-act="abonar">Abonada</button>`;
}
