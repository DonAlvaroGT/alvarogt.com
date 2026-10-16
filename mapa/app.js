import {
  ymdMadrid,
  mergeViajes,
  puntoPrincipal,
  paradasDe,
  popupHtml,
  yearsOf,
  filtrarViajes,
  pinKind,
} from './logic.mjs?v=20261016a';

export const HOSTS = [
  'localhost',
  '127.0.0.1',
  'alvarogt.com',
  'www.alvarogt.com',
  'tablongo.web.app',
  'tablongo.firebaseapp.com',
];

const embedded = (() => {
  try { return window.parent !== window && window.parent.location.origin === location.origin; }
  catch { return false; }
})();
if (typeof document !== 'undefined' && embedded) document.documentElement.classList.add('embedded');

let fsApi = null;
let db = null;
let fsProject = 'tablongo';
let authService = null;
let data = null;
let map = null;
let layerGroup = null;
let filtro = 'todos';
let anio = 'todos';
let started = false;

const $ = (sel) => document.querySelector(sel);

function parentEmail() {
  if (!embedded) return '';
  try { return String(window.parent.__casaAuth?.email?.() || '').toLowerCase(); } catch { return ''; }
}

async function parentIdToken() {
  if (!embedded) return null;
  try { return await window.parent.__casaAuth?.idToken?.() || null; } catch { return null; }
}

function parentOk() {
  if (!embedded) return false;
  try { return !!window.parent.__casaAuth?.ok?.(); } catch { return false; }
}

export async function loadFirebaseConfig() {
  const res = await fetch('/tablon/firebase.public.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('cfg');
  return res.json();
}

async function casaDoc(id) {
  if (fsApi && db) {
    try {
      const snap = await fsApi.getDoc(fsApi.doc(db, 'casa_json', id));
      if (!snap.exists()) throw new Error('missing');
      const body = snap.data().body;
      if (typeof body !== 'string') throw new Error('body');
      return JSON.parse(body);
    } catch (err) {
      if (!embedded) throw err;
    }
  }
  const token = await parentIdToken();
  if (!token) throw new Error('missing');
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${fsProject}/databases/(default)/documents/casa_json/${encodeURIComponent(id)}`,
    { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' },
  );
  if (!res.ok) throw new Error('missing');
  const body = (await res.json())?.fields?.body?.stringValue;
  if (typeof body !== 'string') throw new Error('body');
  return JSON.parse(body);
}

async function loadViajesCasa() {
  try {
    const doc = await casaDoc('viajes_casa');
    if (doc && doc.schema_version === 1) return doc;
    return null;
  } catch {
    return null;
  }
}

function pinIcon(kind) {
  const Lref = window.L;
  return Lref.divIcon({
    className: '',
    html: `<div class="pin ${kind}"><span></span></div>`,
    iconSize: [18, 24],
    iconAnchor: [9, 24],
    popupAnchor: [0, -20],
  });
}

function ensureMap() {
  const Lref = window.L;
  const el = $('#map');
  if (!Lref || !el) return null;
  if (map) return map;
  map = Lref.map(el, { scrollWheelZoom: true, attributionControl: true });
  Lref.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);
  layerGroup = Lref.layerGroup().addTo(map);
  map.setView([40.2, -3.7], 5);
  return map;
}

function clearMap() {
  if (layerGroup) layerGroup.clearLayers();
}

function paint() {
  const Lref = window.L;
  if (!ensureMap() || !Lref || !layerGroup) return;
  clearMap();
  if (!data || !Array.isArray(data.viajes)) return;
  const today = ymdMadrid();
  const trips = filtrarViajes(data.viajes, filtro, anio, today);
  const bounds = [];
  for (const v of trips) {
    const kind = pinKind(v, today);
    if (!kind) continue;
    const html = popupHtml(v, today);
    const principal = puntoPrincipal(v);
    const paradas = paradasDe(v);
    if (paradas.length >= 2) {
      const line = Lref.polyline(paradas.map((p) => [p.lat, p.lng]), {
        color: kind === 'gris' ? '#8a9098' : kind === 'rojo' ? '#e23d3d' : '#3a7bd5',
        weight: 3,
        dashArray: '6 8',
        opacity: 0.85,
      });
      line.bindPopup(html);
      layerGroup.addLayer(line);
      paradas.forEach((p) => bounds.push([p.lat, p.lng]));
    }
    const pts = [];
    if (principal) pts.push(principal);
    for (const p of paradas) {
      if (principal && p.lat === principal.lat && p.lng === principal.lng) continue;
      pts.push(p);
    }
    for (const p of pts) {
      const m = Lref.marker([p.lat, p.lng], { icon: pinIcon(kind), keyboard: true, title: v.titulo || '' });
      m.bindPopup(html);
      layerGroup.addLayer(m);
      bounds.push([p.lat, p.lng]);
    }
  }
  if (bounds.length === 1) map.setView(bounds[0], 6);
  else if (bounds.length > 1) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 8 });
}

function renderYears() {
  const box = $('#filtro-anio');
  if (!box) return;
  const years = yearsOf((data && data.viajes) || []);
  const chips = [`<button type="button" data-anio="todos" aria-selected="${anio === 'todos'}">Años</button>`]
    .concat(years.map((y) => `<button type="button" data-anio="${y}" aria-selected="${anio === y}">${y}</button>`));
  box.innerHTML = chips.join('');
}

async function startApp() {
  if (started) return;
  started = true;
  let payload = null;
  try {
    payload = await casaDoc('viajes');
  } catch {
    payload = null;
  }
  if (!payload || payload.schema_version !== 1 || !Array.isArray(payload.viajes)) {
    data = { viajes: [] };
  } else {
    data = mergeViajes(payload, await loadViajesCasa());
  }
  $('#gate').hidden = true;
  $('#app').hidden = false;
  renderYears();
  paint();
  setTimeout(() => { if (map) map.invalidateSize(); }, 80);
}

function showGate(msg) {
  started = false;
  data = null;
  clearMap();
  $('#app').hidden = true;
  $('#gate').hidden = false;
  $('#google-sign-in').hidden = false;
  $('#google-sign-out').hidden = true;
  $('#google-status').textContent = msg || 'Inicia sesión';
}

function showApp(label) {
  $('#google-sign-in').hidden = true;
  $('#google-sign-out').hidden = embedded ? true : false;
  $('#google-status').textContent = label || 'sesión';
  startApp().catch(() => {
    data = { viajes: [] };
    $('#gate').hidden = true;
    $('#app').hidden = false;
    renderYears();
    paint();
  });
}

async function viajesAllowed() {
  try {
    await casaDoc('viajes');
    return true;
  } catch {
    return false;
  }
}

async function boot() {
  const status = $('#google-status');
  const setStatus = (t) => { if (status) status.textContent = t; };
  if (!HOSTS.includes(location.hostname)) {
    setStatus('Acceso · dominio no autorizado');
    showGate('Acceso · dominio no autorizado');
    return;
  }
  try {
    const config = await loadFirebaseConfig();
    if (typeof config.projectId === 'string' && config.projectId) fsProject = config.projectId;
    const [{ initializeApp }, auth, firestore] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js'),
    ]);
    const app = initializeApp(config);
    const service = auth.getAuth(app);
    authService = service;
    await auth.setPersistence(service, auth.browserLocalPersistence);
    fsApi = firestore;
    db = firestore.getFirestore(app);
    const provider = new auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const enter = async (user) => {
      if (!(await viajesAllowed())) {
        auth.signOut(service);
        setStatus('Cuenta no autorizada');
        showGate('Cuenta no autorizada');
        return;
      }
      showApp(user.displayName || user.email || 'sesión');
    };
    const enterFromParent = () => {
      if (!parentOk()) return false;
      showApp(parentEmail() || 'sesión');
      return true;
    };
    auth.onAuthStateChanged(service, (user) => {
      if (!user) {
        if (enterFromParent()) return;
        showGate('Inicia sesión');
        return;
      }
      void enter(user);
    });
    if (auth.authStateReady) await auth.authStateReady(service);
    if (!service.currentUser) enterFromParent();
    const login = async () => {
      if (embedded && parentOk()) return;
      try {
        setStatus('Google · entrando…');
        await auth.signInWithPopup(service, provider);
      } catch (e) {
        const code = e && e.code;
        if (enterFromParent()) return;
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          try {
            await auth.signInWithRedirect(service, provider);
            return;
          } catch (err) {
            setStatus('Google · ' + (err.code || 'error'));
            return;
          }
        }
        setStatus('Google · ' + (code || 'error'));
      }
    };
    $('#google-sign-in').addEventListener('click', login);
    $('#gate-sign-in').addEventListener('click', login);
    $('#google-sign-out').addEventListener('click', () => { if (embedded) return; auth.signOut(service); });
  } catch {
    if (parentOk()) { showApp(parentEmail() || 'sesión'); return; }
    setStatus('Acceso · configuración no disponible');
    showGate('Acceso · configuración no disponible');
  }
}

function wireUi() {
  $('#filtro-estado')?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-filtro]');
    if (!btn) return;
    filtro = btn.dataset.filtro;
    document.querySelectorAll('#filtro-estado [data-filtro]').forEach((b) => {
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });
    paint();
  });
  $('#filtro-anio')?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-anio]');
    if (!btn) return;
    anio = btn.dataset.anio;
    document.querySelectorAll('#filtro-anio [data-anio]').forEach((b) => {
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });
    paint();
  });
}

showGate('Inicia sesión');
wireUi();
void boot();
