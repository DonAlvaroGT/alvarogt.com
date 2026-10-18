export const ZONE = 'Europe/Madrid';
export const FESTIVOS = new Set(['2026-10-12', '2026-11-02', '2026-11-09', '2026-12-07', '2026-12-08', '2026-12-23', '2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08', '2027-02-12', '2027-02-15', '2027-03-19', '2027-03-20', '2027-03-21', '2027-03-22', '2027-03-23', '2027-03-24', '2027-03-25', '2027-03-26', '2027-03-27', '2027-03-28', '2027-03-29']);

export function isFestivo(ymd) {
  return typeof ymd === 'string' && FESTIVOS.has(ymd);
}

export function isLaborable(ymd) {
  const wd = weekdayIso(ymd);
  return wd != null && wd <= 5 && !isFestivo(ymd);
}

export function weekdayIso(ymd) {
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
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
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
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
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '';
  const opts = { timeZone: zone, day: 'numeric', month: 'long' };
  if (withWeekday) opts.weekday = 'long';
  return new Intl.DateTimeFormat('es-ES', opts).format(new Date(`${ymd}T12:00:00Z`));
}
