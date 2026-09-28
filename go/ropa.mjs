import { weekdayIso, isFestivo } from './fechas.mjs';

export function nachoRopa(ymd) {
  const wd = weekdayIso(ymd);
  if (wd == null || wd === 6 || wd === 7 || isFestivo(ymd)) return '';
  if (wd === 2 || wd === 3) return 'chándal';
  return 'uniforme';
}
