export const ZONE = 'Europe/Madrid';
// Sync fallback: static array from go/festivos.json
// This Set is pre-populated at module load time for non-blocking behavior
// Browser will later be overwritten by loadFestivos() or applyFestivosFromDoc()
const _FESTIVOS_FALLBACK = new Set([
  '2026-10-12',
  '2026-11-02',
  '2026-11-09',
  '2026-12-07',
  '2026-12-08',
  '2026-12-23',
  '2026-12-24',
  '2026-12-25',
  '2026-12-26',
  '2026-12-27',
  '2026-12-28',
  '2026-12-29',
  '2026-12-30',
  '2026-12-31',
  '2027-01-01',
  '2027-01-02',
  '2027-01-03',
  '2027-01-04',
  '2027-01-05',
  '2027-01-06',
  '2027-01-07',
  '2027-01-08',
  '2027-02-12',
  '2027-02-15',
  '2027-03-19',
  '2027-03-20',
  '2027-03-21',
  '2027-03-22',
  '2027-03-23',
  '2027-03-24',
  '2027-03-25',
  '2027-03-26',
  '2027-03-27',
  '2027-03-28',
  '2027-03-29',
  '2027-05-01',
  '2027-05-15',
  '2027-08-16',
  '2027-10-12',
  '2027-11-01',
  '2027-11-09',
  '2027-12-06',
  '2027-12-08',
  '2027-12-25',
]);
const _HAS_BEEN_APPLIED = new Set(); // Track dates that have been applied from doc
export const FESTIVOS_FALLBACK = _FESTIVOS_FALLBACK;
export const FESTIVOS = _FESTIVOS_FALLBACK;
export async function loadFestivos() {
  try {
    const response = await fetch(new URL('festivos.json', import.meta.url));
    const doc = await response.json();
    if (doc && doc.schema_version === 1 && Array.isArray(doc.festivos)) {
      FESTIVOS.clear();
      for (const row of doc.festivos) {
        const fecha = row && row.fecha;
        if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
          FESTIVOS.add(fecha);
        }
      }
      return true;
    }
  } catch (err) {
    console.error('Failed to load festivos.json:', err);
  }
  return false;
}

export function applyFestivosFromDoc(doc) {
  if (!doc || doc.schema_version !== 1 || !Array.isArray(doc.festivos)) return false;
  const next = new Set();
  for (const row of doc.festivos) {
    const fecha = row && row.fecha;
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) next.add(fecha);
  }
  if (!next.size) return false;
  // Check if already applied - if FESTIVOS contains the same dates as next, skip
  if (_HAS_BEEN_APPLIED.size > 0 && next.size === _HAS_BEEN_APPLIED.size) {
    let allMatch = true;
    for (const d of next) {
      if (!_HAS_BEEN_APPLIED.has(d)) { allMatch = false; break; }
    }
    if (allMatch) return false; // Already applied
  }
  FESTIVOS.clear();
  for (const ymd of next) {
    FESTIVOS.add(ymd);
    _HAS_BEEN_APPLIED.add(ymd);
  }
  return true;
}

export function isFestivo(ymd) {
  return typeof ymd === 'string' && FESTIVOS.has(ymd);
}

export function isLaborable(ymd) {
  const wd = weekdayIso(ymd);
  return wd != null && wd <= 5 && !isFestivo(ymd);
}

export function weekdayIso(ymd) {
  if (typeof ymd !== 'string' || ! /^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function ymdInZone(date = new Date(), zone = ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function nextYmd(ymd) {
  return addDaysYmd(ymd, 1);
}

export function addDaysYmd(ymd, n) {
  if (typeof ymd !== 'string' || ! /^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  if (typeof n !== 'number' || !Number.isInteger(n)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function weekYmds(ymd) {
  const wd = weekdayIso(ymd);
  if (wd == null) return [];
  const monday = addDaysYmd(ymd, 1 - wd);
  if (!monday) return [];
  return [0, 1, 2, 3, 4, 5, 6].map((i) => addDaysYmd(monday, i));
}

export function nextWeekYmds(ymd) {
  const next = addDaysYmd(ymd, 7);
  return next ? weekYmds(next) : [];
}

export function prettyDate(ymd, withWeekday = true, zone = ZONE) {
  if (typeof ymd !== 'string' || ! /^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '';
  const opts = { timeZone: zone, day: 'numeric', month: 'long' };
  if (withWeekday) opts.weekday = 'long';
  return new Intl.DateTimeFormat('es-ES', opts).format(new Date(`${ymd}T12:00:00Z`));
}
