import { weekdayIso } from './fechas.mjs';

function normTitle(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inRange(ymd, from, until) {
  if (from && ymd < from) return false;
  if (until && ymd > until) return false;
  return true;
}

export function eventsFromReglas(payload, ymd) {
  if (!payload || payload.schema_version !== 1 || payload.timezone !== 'Europe/Madrid') return [];
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return [];
  const wd = weekdayIso(ymd);
  const list = payload.extraescolares;
  if (!Array.isArray(list) || wd == null) return [];
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    if (typeof item.title !== 'string' || !item.title.trim()) continue;
    if (typeof item.time !== 'string' || !item.time.trim()) continue;
    if (!Array.isArray(item.weekdays) || !item.weekdays.includes(wd)) continue;
    if (!inRange(ymd, item.from, item.until)) continue;
    const event = {
      time: item.end ? `${item.time}–${item.end}` : item.time,
      title: item.title.trim(),
      location: typeof item.location === 'string' ? item.location : '',
    };
    out.push(event);
  }
  return out;
}

export function mergeEvents(fixed, calendar) {
  const out = [];
  const seen = new Set();
  for (const event of [...(calendar || []), ...(fixed || [])]) {
    if (!event || typeof event.title !== 'string') continue;
    const key = normTitle(event.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      time: event.time || '',
      title: event.title,
      location: event.location || '',
    });
  }
  return out.sort((a, b) => String(a.time).localeCompare(String(b.time), 'es'));
}
