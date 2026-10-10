const YMD = /^\d{4}-\d{2}-\d{2}$/;
export const VIAJES_CASA_DOC = 'viajes_casa';
export const VIAJES_PUBLIC_DOC = 'viajes';

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

export function casaActorFrom(auth) {
  if (!auth?.uid) fail('unauthenticated', 'Inicia sesión.');
  const token = auth.token || {};
  if (token.childRole === 'supervised') fail('permission-denied', 'Cuenta no autorizada.');
  if (token.casa !== true) fail('permission-denied', 'Cuenta no autorizada.');
  if (token.email && token.email_verified !== true) fail('permission-denied', 'El correo no está verificado.');
  return { uid: auth.uid, casa: true };
}

export function assertTarget(target) {
  const value = String(target || VIAJES_CASA_DOC);
  if (value === VIAJES_PUBLIC_DOC || value === 'casa_json/viajes') {
    fail('permission-denied', 'No se toca el tablón público de viajes.');
  }
  if (value !== VIAJES_CASA_DOC && value !== 'casa_json/viajes_casa') {
    fail('invalid-argument', 'Solo viajes de casa.');
  }
  return VIAJES_CASA_DOC;
}

export function slugId(titulo, inicio) {
  const base = String(titulo || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'viaje';
  return YMD.test(String(inicio || '')) ? `${base}-${inicio}` : base;
}

function cleanFields(payload) {
  const titulo = String(payload?.titulo || '').trim();
  const inicio = String(payload?.inicio || '').trim();
  const fin = String(payload?.fin || '').trim();
  const quien = String(payload?.quien || '').trim();
  const sitio = String(payload?.sitio || payload?.lugar || '').trim();
  let notas = payload?.notas;
  if (typeof notas === 'string') notas = notas.trim() ? [notas.trim()] : [];
  else if (Array.isArray(notas)) notas = notas.map(n => String(n).trim()).filter(Boolean);
  else notas = [];
  if (!titulo || !quien || !YMD.test(inicio) || !YMD.test(fin) || fin < inicio) {
    fail('invalid-argument', 'Ficha no válida.');
  }
  return { titulo, inicio, fin, quien, sitio, notas };
}

function cloneDoc(doc) {
  const src = doc && typeof doc === 'object' ? doc : {};
  const parsed = JSON.parse(JSON.stringify(src));
  if (!parsed.quien || typeof parsed.quien !== 'object') parsed.quien = { order: [], color: {}, dot: {} };
  if (!Array.isArray(parsed.quien.order)) parsed.quien.order = [];
  if (!parsed.quien.color || typeof parsed.quien.color !== 'object') parsed.quien.color = {};
  if (!parsed.quien.dot || typeof parsed.quien.dot !== 'object') parsed.quien.dot = {};
  if (!Array.isArray(parsed.viajes)) parsed.viajes = [];
  parsed.schema_version = 1;
  parsed.zona_casa = parsed.zona_casa || 'Europe/Madrid';
  return parsed;
}

function ensureQuien(doc, name) {
  if (!doc.quien.order.includes(name)) doc.quien.order.push(name);
  if (!doc.quien.color[name]) doc.quien.color[name] = '#e8c4d4';
  if (!doc.quien.dot[name]) doc.quien.dot[name] = '#9a3d5c';
}

function applyFields(trip, fields) {
  trip.privado = true;
  if (trip.visible === 'casa' || trip.visible === 'privado') delete trip.visible;
  trip.titulo = fields.titulo;
  trip.inicio = fields.inicio;
  trip.fin = fields.fin;
  trip.quien = fields.quien;
  if (fields.sitio) {
    trip.ciudades = fields.sitio;
    const lp = trip.lugar_principal && typeof trip.lugar_principal === 'object' ? { ...trip.lugar_principal } : {};
    lp.label = fields.sitio;
    lp.timezone = lp.timezone || 'Europe/Madrid';
    trip.lugar_principal = lp;
  }
  if (fields.notas.length) trip.notas = fields.notas;
  return trip;
}

export function fingerprint(viajes) {
  return (Array.isArray(viajes) ? viajes : []).map(v => ({
    id: v && v.id != null ? String(v.id) : '',
    inicio: v && v.inicio != null ? String(v.inicio) : '',
    fin: v && v.fin != null ? String(v.fin) : '',
    titulo: v && v.titulo != null ? String(v.titulo) : '',
  }));
}

export function applyViajesCasa({ actor, operation, id, payload, doc, target, publicIds = [], hoy }) {
  casaActorFrom(actor);
  assertTarget(target);
  if (!['create', 'update', 'delete'].includes(String(operation || ''))) {
    fail('invalid-argument', 'Operación no válida.');
  }
  const next = cloneDoc(doc);
  const trips = next.viajes;
  if (operation === 'create') {
    const fields = cleanFields(payload);
    let newId = String(id || '').trim() || slugId(fields.titulo, fields.inicio);
    if (!newId) fail('invalid-argument', 'Falta el identificador.');
    if (publicIds.includes(newId)) fail('permission-denied', 'No se toca el tablón público de viajes.');
    if (trips.some(v => v && v.id === newId)) fail('already-exists', 'Ese viaje ya está.');
    const trip = applyFields({ id: newId }, fields);
    trips.push(trip);
    ensureQuien(next, fields.quien);
    if (hoy) next.actualizado = hoy;
    return { doc: next, id: newId, trip };
  }
  const tripId = String(id || '').trim();
  if (!tripId) fail('invalid-argument', 'Falta el identificador.');
  const idx = trips.findIndex(v => v && v.id === tripId);
  if (idx < 0) fail('not-found', 'Viaje no encontrado.');
  if (operation === 'delete') {
    const removed = trips.splice(idx, 1)[0];
    if (hoy) next.actualizado = hoy;
    return { doc: next, id: tripId, trip: removed };
  }
  const fields = cleanFields(payload);
  applyFields(trips[idx], fields);
  ensureQuien(next, fields.quien);
  if (hoy) next.actualizado = hoy;
  return { doc: next, id: tripId, trip: trips[idx] };
}
