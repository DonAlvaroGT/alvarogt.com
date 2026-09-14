export function coversDay(viaje, day) {
  if (!viaje || typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  if (typeof viaje.inicio === 'string' && typeof viaje.fin === 'string' && day >= viaje.inicio && day <= viaje.fin) return true;
  if ((viaje.estancias || []).some((e) => typeof e?.desde === 'string' && typeof e?.hasta === 'string' && day >= e.desde && day <= e.hasta)) return true;
  if ((viaje.dias || []).some((d) => d?.fecha === day)) return true;
  return false;
}

export function tripOn(viajes, day) {
  if (!Array.isArray(viajes)) return null;
  return viajes.find((v) => coversDay(v, day)) || null;
}

function daysBetween(from, to) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

function tripPlace(viaje, day) {
  const dia = (viaje.dias || []).find((d) => d && d.fecha === day);
  if (typeof dia?.donde === 'string' && dia.donde.trim()) return dia.donde.trim();
  const est = (viaje.estancias || []).find((e) => e && typeof e.desde === 'string' && typeof e.hasta === 'string' && day >= e.desde && day <= e.hasta);
  if (typeof est?.donde === 'string' && est.donde.trim()) return est.donde.trim();
  const label = viaje.lugar_principal && viaje.lugar_principal.label;
  if (typeof label === 'string' && label.trim()) return label.trim();
  return '';
}

function tripProgress(viaje, day) {
  if (typeof viaje.inicio !== 'string' || typeof viaje.fin !== 'string') return '';
  if (day === viaje.fin) return 'último día';
  const n = daysBetween(viaje.inicio, day) + 1;
  const m = daysBetween(viaje.inicio, viaje.fin) + 1;
  if (!(n >= 1 && m >= 1 && n <= m)) return '';
  return `día ${n} de ${m}`;
}

export function tripLineText(viaje, day) {
  if (!coversDay(viaje, day)) return '';
  const bits = [];
  if (typeof viaje.titulo === 'string' && viaje.titulo.trim()) bits.push(viaje.titulo.trim());
  const lugar = tripPlace(viaje, day);
  if (lugar) bits.push(lugar);
  const prog = tripProgress(viaje, day);
  if (prog) bits.push(prog);
  if (!bits.length) return '';
  return `✈️ Viaje: ${bits.join(' · ')}`;
}
