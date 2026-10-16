export const CASA_TZ = 'Europe/Madrid';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function ymdMadrid(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CASA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function esPrivado(v) {
  return !!(v && (v.privado === true || v.visible === 'casa' || v.visible === 'privado'));
}

export function mergeViajes(pub, casa) {
  const pubTrips = ((pub && pub.viajes) || []).filter((v) => v && v.id);
  if (!casa || casa.schema_version !== 1 || !Array.isArray(casa.viajes)) {
    return Object.assign({}, pub || {}, { viajes: pubTrips.filter((v) => !esPrivado(v)) });
  }
  const seen = new Set();
  const viajes = [];
  for (const v of pubTrips.concat(casa.viajes)) {
    if (!v || !v.id || seen.has(v.id)) continue;
    seen.add(v.id);
    viajes.push(v);
  }
  return Object.assign({}, pub, { viajes });
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export function coordsOf(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const lat = num(obj.latitud ?? obj.lat);
  const lng = num(obj.longitud ?? obj.lng ?? obj.lon);
  if (lat == null || lng == null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function puntoPrincipal(v) {
  if (!v) return null;
  const lp = v.lugar_principal && typeof v.lugar_principal === 'object' ? v.lugar_principal : {};
  const c = coordsOf(lp);
  if (!c) return null;
  return {
    nombre: lp.label || v.ciudades || v.titulo || '',
    lat: c.lat,
    lng: c.lng,
    principal: true,
  };
}

export function paradasDe(v) {
  if (!v || !Array.isArray(v.paradas)) return [];
  const out = [];
  for (const p of v.paradas) {
    if (!p || typeof p !== 'object') continue;
    const c = coordsOf(p);
    if (!c) continue;
    out.push({ nombre: p.nombre || '', lat: c.lat, lng: c.lng, principal: false });
  }
  return out;
}

export function estadoViaje(v, today) {
  const day = today || ymdMadrid();
  if (!v || !v.inicio || !v.fin) return null;
  if (v.fin < day) return 'pasado';
  if (v.inicio <= day && day <= v.fin) return 'ahora';
  if (v.inicio > day) return 'proximo';
  return null;
}

export function daysUntil(inicio, today) {
  const day = today || ymdMadrid();
  if (!inicio) return null;
  const a = Date.parse(`${day}T12:00:00Z`);
  const b = Date.parse(`${inicio}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

export function etiquetaEstado(v, today) {
  const st = estadoViaje(v, today);
  if (st === 'ahora') return '¡Estamos aquí!';
  if (st === 'proximo') {
    const n = daysUntil(v.inicio, today);
    if (n == null) return '';
    if (n === 1) return 'falta 1 día';
    return `faltan ${n} días`;
  }
  return '';
}

export function prettyFechas(inicio, fin) {
  if (!inicio) return '';
  if (!fin || fin === inicio) return inicio;
  return `${inicio} – ${fin}`;
}

export function fichaUrl(v) {
  if (!v || !v.inicio) return '/viajes/';
  const q = new URLSearchParams();
  q.set('fecha', v.inicio);
  if (v.id) q.set('id', v.id);
  return `/viajes/?${q.toString()}`;
}

export function popupHtml(v, today) {
  if (!v) return '';
  const st = etiquetaEstado(v, today);
  const quien = v.quien ? `<p>${esc(v.quien)}</p>` : '';
  const extra = st ? `<p class="estado">${esc(st)}</p>` : '';
  return `<p class="pop-title">${esc(v.titulo || '')}</p>
<p>${esc(prettyFechas(v.inicio, v.fin))}</p>
${quien}${extra}
<p><a href="${esc(fichaUrl(v))}">Ver ficha</a></p>`;
}

export function yearsOf(viajes) {
  const ys = new Set();
  for (const v of viajes || []) {
    const y = String(v && v.inicio || '').slice(0, 4);
    if (/^\d{4}$/.test(y)) ys.add(y);
  }
  return [...ys].sort();
}

export function filtrarViajes(viajes, filtro, anio, today) {
  const day = today || ymdMadrid();
  const f = filtro || 'todos';
  const year = anio && anio !== 'todos' ? String(anio) : null;
  return (viajes || []).filter((v) => {
    if (!v || !puntoPrincipal(v) && paradasDe(v).length === 0) return false;
    const st = estadoViaje(v, day);
    if (f === 'pasados' && st !== 'pasado') return false;
    if (f === 'proximos' && st !== 'proximo' && st !== 'ahora') return false;
    if (year && String(v.inicio || '').slice(0, 4) !== year) return false;
    return true;
  });
}

export function pinKind(v, today) {
  const st = estadoViaje(v, today);
  if (st === 'pasado') return 'gris';
  if (st === 'ahora') return 'rojo';
  if (st === 'proximo') return 'azul';
  return null;
}
