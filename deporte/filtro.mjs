export const TZ = 'Europe/Madrid';
export const WIN_START = 9 * 60;
export const WIN_END = 22 * 60 + 30;
export const YMD = /^\d{4}-\d{2}-\d{2}$/;
export const HHMM = /^(\d{1,2}):(\d{2})$/;

export const TAGS = {
  futbol: { label: 'Fútbol', color: '#1b7a4a' },
  mlb: { label: 'MLB', color: '#0b3d91' },
  ncaa: { label: 'NCAA', color: '#8c1d18' },
  nfl: { label: 'NFL', color: '#013369' },
  f1: { label: 'F1', color: '#e10600' },
  wec: { label: 'WEC', color: '#b8860b' },
  nhl: { label: 'NHL', color: '#5dade2' },
};

export function ymdMadrid(date = new Date(), tz = TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function addDaysYmd(ymd, days) {
  if (!YMD.test(String(ymd || ''))) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function weekStartMonday(ymd) {
  if (!YMD.test(String(ymd || ''))) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const dow = new Date(utc).getUTCDay(); // 0 sun
  const delta = dow === 0 ? -6 : 1 - dow;
  return addDaysYmd(ymd, delta);
}

export function minutesHora(hhmm) {
  const match = String(hhmm || '').match(HHMM);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function inWindow(p) {
  const mins = minutesHora(p && p.hora_madrid);
  return mins != null && mins >= WIN_START && mins <= WIN_END;
}

export function isNhl(p) {
  return String((p && p.deporte) || '') === 'nhl';
}

export function isBrewers(p) {
  return /brewers/i.test(String((p && p.rival) || ''));
}

export function isFavorito(p) {
  const deporte = String((p && p.deporte) || '');
  const rival = String((p && p.rival) || '');
  const t = rival.toLowerCase();
  if (deporte === 'futbol' && t.includes('real madrid')) return true;
  if (deporte === 'f1') return true;
  if (deporte === 'mlb' && t.includes('brewers')) return true;
  if (deporte === 'nfl' && t.includes('dolphins')) return true;
  if (deporte === 'nhl' && t.includes('red wings')) return true;
  return false;
}

export function keepPartido(p) {
  if (!p || typeof p !== 'object') return false;
  if (!YMD.test(String(p.fecha_madrid || ''))) return false;
  if (String((p && p.deporte) || '') === 'femenino') return false;
  if (isNhl(p) && !inWindow(p)) return false;
  return true;
}

export function partidosOf(payload) {
  const list = payload && payload.partidos;
  if (!Array.isArray(list)) return [];
  return list.filter(keepPartido);
}

function byTime(a, b) {
  const ia = minutesHora(a.hora_madrid);
  const ib = minutesHora(b.hora_madrid);
  if (ia == null && ib == null) return 0;
  if (ia == null) return 1;
  if (ib == null) return -1;
  if (ia !== ib) return ia - ib;
  return String(a.rival || '').localeCompare(String(b.rival || ''), 'es');
}

function byTimeThenBrewers(a, b) {
  const ba = isBrewers(a) ? 0 : 1;
  const bb = isBrewers(b) ? 0 : 1;
  if (ba !== bb) return ba - bb;
  return byTime(a, b);
}

export function sortPartidos(list) {
  return [...(Array.isArray(list) ? list : [])].sort(byTimeThenBrewers);
}

export function sortSemana(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const na = String(a.deporte || '') === 'ncaa' ? 1 : 0;
    const nb = String(b.deporte || '') === 'ncaa' ? 1 : 0;
    if (na !== nb) return na - nb;
    const fa = isFavorito(a) ? 0 : 1;
    const fb = isFavorito(b) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return byTime(a, b);
  });
}

export function hoyList(payload, now = new Date()) {
  const today = ymdMadrid(now);
  return sortSemana(partidosOf(payload).filter((p) => p.fecha_madrid === today && inWindow(p)));
}

export function hoyHasFavorito(payload, now = new Date()) {
  return hoyList(payload, now).some(isFavorito);
}

export function weekDays(ymd) {
  const start = weekStartMonday(ymd);
  if (!start) return [];
  return Array.from({ length: 7 }, (_, i) => addDaysYmd(start, i));
}

export function weekFromToday(ymd) {
  if (!YMD.test(String(ymd || ''))) return [];
  return Array.from({ length: 7 }, (_, i) => addDaysYmd(ymd, i));
}

export function restoSemana(payload, now = new Date()) {
  const today = ymdMadrid(now);
  const days = weekFromToday(today);
  const all = partidosOf(payload);
  return days.map((fecha) => {
    const list = sortSemana(all.filter((p) => p.fecha_madrid === fecha));
    return {
      fecha,
      ventana: list.filter(inWindow),
      fuera: list.filter((p) => !inWindow(p)),
      partidos: list,
    };
  }).filter((row) => row.partidos.length);
}

export function diaList(payload, ymd) {
  if (!YMD.test(String(ymd || ''))) return [];
  return sortPartidos(partidosOf(payload).filter((p) => p.fecha_madrid === ymd));
}

export function tagOf(p) {
  const key = String((p && p.deporte) || '');
  return TAGS[key] || { label: key || 'Deporte', color: '#666' };
}

export function tvOf(p) {
  const t = String((p && p.tv) || '').trim();
  if (!t || t === 'undefined' || t === 'null') return '';
  return t;
}

export function lineaToque(p) {
  const hora = String((p && p.hora_madrid) || '').trim();
  const rival = String((p && p.rival) || '').trim();
  const tv = tvOf(p);
  if (!rival) return '';
  const head = hora ? `${hora} · ${rival}` : rival;
  return tv ? `${head} · ${tv}` : head;
}

export function emptyMsg(payload) {
  const fuentes = payload && payload.fuentes;
  if (!fuentes || typeof fuentes !== 'object') return 'sin datos';
  const vals = Object.values(fuentes).map((v) => String(v));
  if (vals.some((v) => v === 'ok' || v === 'omitido')) {
    return partidosOf(payload).length ? '' : 'sin partidos';
  }
  return 'sin datos';
}
