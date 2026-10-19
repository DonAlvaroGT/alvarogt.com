import { weekdayIso, isFestivo } from './fechas.mjs';

function etiquetaRopa(v) {
  const s = String(v || '').toLowerCase();
  if (s === 'uniforme') return 'uniforme';
  if (s === 'chandal' || s === 'chándal') return 'chándal';
  return '';
}

export function nachoRopa(ymd, reglas) {
  const wd = weekdayIso(ymd);
  if (wd == null || wd === 6 || wd === 7 || isFestivo(ymd)) return '';
  const ropa = reglas && reglas.ropa && typeof reglas.ropa === 'object' ? reglas.ropa : null;
  if (!ropa) return '';
  const ex = ropa.excepciones && typeof ropa.excepciones === 'object' ? ropa.excepciones[ymd] : null;
  if (ex) return etiquetaRopa(ex);
  const days = Array.isArray(ropa.chandal_weekdays) ? ropa.chandal_weekdays : [];
  if (days.includes(wd)) return 'chándal';
  return 'uniforme';
}
