import { nextYmd, weekYmds, nextWeekYmds, weekdayIso } from './fechas.mjs';

export const VISTA_KEY = 'go.vista';
export const VISTAS = ['hoy', 'semana', 'proxima'];
const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function lastVista(storage) {
  try {
    const store = storage || (typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : null);
    const v = String((store && store.getItem(VISTA_KEY)) || '');
    return VISTAS.includes(v) ? v : 'hoy';
  } catch {
    return 'hoy';
  }
}

export function rememberVista(name, storage) {
  if (!VISTAS.includes(name)) return;
  try {
    const store = storage || (typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : null);
    if (store) store.setItem(VISTA_KEY, name);
  } catch {}
}

export function datesForVista(vista, todayYmd) {
  if (vista === 'semana') return weekYmds(todayYmd);
  if (vista === 'proxima') return nextWeekYmds(todayYmd);
  const tom = nextYmd(todayYmd);
  return tom ? [todayYmd, tom] : [todayYmd];
}

export function dayLabel(vista, date, todayYmd) {
  if (vista === 'hoy') return date === todayYmd ? 'Hoy' : 'Mañana';
  const wd = weekdayIso(date);
  return wd ? WEEKDAYS[wd - 1] : date;
}
