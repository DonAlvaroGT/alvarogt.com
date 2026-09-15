const ZONE = 'Europe/Madrid';
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function calendarDateLabel(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const label = new Intl.DateTimeFormat('es-ES', {
    timeZone: ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d, 12, 0, 0)));
  return `Datos del ${label}`;
}

export function formatPublicado(value) {
  if (value == null) return '';
  const s = String(value).trim();
  if (!s) return '';
  if (DATE_ONLY.test(s)) return calendarDateLabel(s);
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return '';
  const withTime = new Intl.DateTimeFormat('es-ES', {
    timeZone: ZONE,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(dt);
  return `Datos publicados: ${withTime}`;
}
