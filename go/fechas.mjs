export const ZONE = 'Europe/Madrid';

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
