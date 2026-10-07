import { weekdayIso, isFestivo } from './fechas.mjs';

function fold(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function normTitle(value) {
  return fold(value).replace(/\s+/g, ' ').trim();
}

function inRange(ymd, from, until) {
  if (from && ymd < from) return false;
  if (until && ymd > until) return false;
  return true;
}

function timeSinHora(time) {
  return fold(time).trim() === '' || fold(time).trim() === 'sin hora';
}

export function skipAviso(title) {
  const folded = fold(title);
  let name = '';
  if (folded.includes('ingles')) name = 'inglés';
  else if (folded.includes('futbol')) name = 'fútbol';
  else if (folded.includes('natacion')) name = 'natación';
  else {
    const word = String(title || '').trim().split(/\s+/)[0];
    name = word ? word.toLowerCase() : '';
  }
  return name ? `hoy no hay ${name}` : '';
}

export function eventsFromReglas(payload, ymd) {
  if (!payload || payload.schema_version !== 1 || payload.timezone !== 'Europe/Madrid') return [];
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return [];
  const wd = weekdayIso(ymd);
  const list = payload.extraescolares;
  if (!Array.isArray(list) || wd == null) return [];
  if (isFestivo(ymd)) return [];
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    if (typeof item.title !== 'string' || !item.title.trim()) continue;
    if (item.time != null && typeof item.time !== 'string') continue;
    if (!Array.isArray(item.weekdays) || !item.weekdays.includes(wd)) continue;
    if (!inRange(ymd, item.from, item.until)) continue;
    const title = item.title.trim();
    const timeRaw = typeof item.time === 'string' ? item.time.trim() : '';
    const skip = item.skip;
    if (Array.isArray(skip) && skip.includes(ymd)) {
      const aviso = skipAviso(title);
      if (aviso) {
        out.push({ time: '', title: aviso, location: '', skipOf: title });
      }
      continue;
    }
    const noClock = timeSinHora(timeRaw);
    const event = {
      time: noClock ? '' : (item.end ? `${timeRaw}–${item.end}` : timeRaw),
      title,
      location: typeof item.location === 'string' ? item.location : '',
    };
    out.push(event);
  }
  return out;
}

function clockKey(time) {
  const match = String(time || '').match(/^(\d{1,2}:\d{2})/);
  return match ? match[1] : '';
}

export function collapseSameTime(events) {
  const grouped = [];
  for (const event of events || []) {
    if (!event || typeof event !== 'object') continue;
    if (event.skipOf) {
      grouped.push(event);
      continue;
    }
    const key = clockKey(event.time);
    if (!key) {
      grouped.push({
        time: event.time || '',
        title: event.title,
        location: event.location || '',
        ...(event.skipOf ? { skipOf: event.skipOf } : {}),
      });
      continue;
    }
    const prev = grouped.at(-1);
    if (prev && !prev.skipOf && clockKey(prev.time) === key) {
      prev.title = `${prev.title} · ${event.title}`;
      continue;
    }
    grouped.push({
      time: event.time || '',
      title: event.title,
      location: event.location || '',
    });
  }
  return grouped;
}

export function mergeEvents(fixed, calendar) {
  const skipOf = new Set();
  for (const event of fixed || []) {
    if (event && event.skipOf) skipOf.add(normTitle(event.skipOf));
  }
  const out = [];
  const seen = new Set();
  for (const event of [...(calendar || []), ...(fixed || [])]) {
    if (!event || typeof event.title !== 'string') continue;
    const key = normTitle(event.title);
    if (!key || seen.has(key)) continue;
    if (skipOf.has(key) && !event.skipOf) continue;
    seen.add(key);
    out.push({
      time: event.time || '',
      title: event.title,
      location: event.location || '',
    });
  }
  return collapseSameTime(out.sort((a, b) => String(a.time).localeCompare(String(b.time), 'es')));
}
