export const VISTA_KEY = 'deporte.vista';
export const VISTAS = ['hoy', 'semana', 'cal'];

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
