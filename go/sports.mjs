const YMD = /^\d{4}-\d{2}-\d{2}$/;
const AGENDA_TIME = /^(\d{1,2}):(\d{2})$/;

export const SPORT_TAG_LABEL = {
  futbol: 'Fútbol',
  beisbol: 'Béisbol',
  americano: 'Fútbol americano',
  f1: 'F1',
  hockey: 'Hockey',
  otro: 'Deporte',
};

export function sportKind(e) {
  const blob = `${e?.deporte || ''} ${e?.competicion || ''} ${e?.evento || ''}`.toLowerCase();
  if (/f[oó]rmula\s*1|\bf1\b/.test(blob)) return 'f1';
  if (/b[eé]isbol|baseball|\bmlb\b/.test(blob)) return 'beisbol';
  if (/\bnhl\b|hockey|red\s*wings/.test(blob)) return 'hockey';
  if (/f[uú]tbol americano|american football|\bnfl\b|\bncaa\b/.test(blob)) return 'americano';
  if (/f[uú]tbol|soccer|laliga|champions/.test(blob)) return 'futbol';
  return 'otro';
}

export function sportTagLabel(kind) {
  return SPORT_TAG_LABEL[kind] || SPORT_TAG_LABEL.otro;
}

export function agendaMinutes(e) {
  const m = String(e?.hora_madrid || '').match(AGENDA_TIME);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function eventDay(e, docDate) {
  const d = e?.fecha || e?.date;
  if (YMD.test(String(d || ''))) return d;
  return YMD.test(String(docDate || '')) ? docDate : '';
}

export function sportsOnDay(payload, ymd) {
  if (!payload || !ymd) return [];
  const docDate = payload.comprobado || payload.date || '';
  const list = payload.eventos || payload.events || [];
  if (!Array.isArray(list)) return [];
  return list.filter((e) => {
    if (eventDay(e, docDate) !== ymd) return false;
    const mins = agendaMinutes(e);
    return mins != null && mins >= 600 && mins <= 1350;
  }).sort((a, b) => {
    const ia = agendaMinutes(a);
    const ib = agendaMinutes(b);
    if (ia == null && ib == null) return 0;
    if (ia == null) return 1;
    if (ib == null) return -1;
    return ia - ib;
  });
}

export function sportsLine(e) {
  const name = String(e?.evento || '').replace(/\s+vs\.?\s+/i, '–');
  const hora = String(e?.hora_madrid || '');
  const canal = typeof e?.canal === 'string' && e.canal.trim() ? e.canal.trim() : '';
  if (!name) return '';
  if (!hora) return name;
  return canal ? `${name} a las ${hora} en ${canal}` : `${name} a las ${hora}`;
}

export function sportsCardLine(list) {
  const items = (Array.isArray(list) ? list : []).map(sportsLine).filter(Boolean);
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return items.join(' · ');
}
