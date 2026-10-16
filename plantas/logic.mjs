export const TZ = 'Europe/Madrid';
export const ZONAS = ['terraza', 'salon'];
export const ORDEN = { rojo: 0, amarillo: 1, verde: 2, gris: 3 };

export function ymdMadrid(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date || new Date());
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

export function diasRiego(planta, date) {
  const n = Number(isVerano(date) ? planta.riego_verano_dias : planta.riego_invierno_dias);
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

export function proximoRiego(planta, now) {
  const last = parseTs(planta.ultimo_riego);
  const days = diasRiego(planta, now || new Date());
  if (!last || days == null) return null;
  return addDaysYmd(ymdMadrid(last), days);
}

export function estado(planta, now) {
  const when = now || new Date();
  if (!parseTs(planta.ultimo_riego)) return 'gris';
  const next = proximoRiego(planta, when);
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

export function ordenarPlantas(list, now) {
  const when = now || new Date();
  return [...list].sort((a, b) => {
    const ea = estado(a, when);
    const eb = estado(b, when);
    const d = (ORDEN[ea] ?? 9) - (ORDEN[eb] ?? 9);
    if (d) return d;
    return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
  });
}

export function filtrarZona(list, zona) {
  if (!zona || zona === 'todas') return list;
  return list.filter((p) => p.zona === zona);
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

export function camposPlanta(raw, id) {
  const zona = raw.zona === 'terraza' ? 'terraza' : raw.zona === 'salon' ? 'salon' : '';
  const verano = Number(raw.riego_verano_dias);
  const invierno = Number(raw.riego_invierno_dias);
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

export function textoProximo(planta, now) {
  const next = proximoRiego(planta, now || new Date());
  if (!next) return '';
  const [y, m, d] = next.split('-').map(Number);
  const label = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
  return `Próximo riego: ${label}`;
}
