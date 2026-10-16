import {
  estado,
  etiquetaEstado,
  ordenarPlantas,
  filtrarZona,
  slugId,
  pushHistorial,
  textoRegada,
  textoProximo,
  plantaValida,
  camposPlanta,
} from './logic.mjs?v=20261016b';

export const HOSTS = [
  'localhost',
  '127.0.0.1',
  'alvarogt.com',
  'www.alvarogt.com',
  'tablongo.web.app',
  'tablongo.firebaseapp.com',
];

const UNDO_MS = 10000;
const embedded = (() => {
  try { return window.parent !== window && window.parent.location.origin === location.origin; }
  catch { return false; }
})();
if (typeof document !== 'undefined' && embedded) document.documentElement.classList.add('embedded');
let fsApi = null;
let db = null;
let colRef = null;
let unsub = null;
let plantas = [];
let filtro = 'todas';
let undos = new Map();

const $ = (sel) => document.querySelector(sel);

function parentEmail() {
  if (!embedded) return '';
  try { return String(window.parent.__casaAuth?.email?.() || '').toLowerCase(); } catch { return ''; }
}

function parentOk() {
  if (!embedded) return false;
  try { return !!window.parent.__casaAuth?.ok?.(); } catch { return false; }
}

function hideEmbeddedChrome() {
  if (!embedded) return;
  const signIn = $('#google-sign-in');
  const signOut = $('#google-sign-out');
  const gateBtn = $('#gate-sign-in');
  if (signIn) signIn.hidden = true;
  if (signOut) signOut.hidden = true;
  if (gateBtn) gateBtn.hidden = true;
}

export async function loadFirebaseConfig() {
  const res = await fetch('/tablon/firebase.public.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('cfg');
  return res.json();
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fromSnap(doc) {
  const data = doc.data() || {};
  return camposPlanta({ ...data, id: data.id || doc.id }, doc.id);
}

function fotoHtml(p) {
  if (p.foto && /^(https:|data:image\/)/i.test(p.foto)) {
    return `<img class="foto" src="${esc(p.foto)}" alt="">`;
  }
  return `<div class="foto pixel" aria-hidden="true"></div>`;
}

function cardHtml(p) {
  const kind = estado(p);
  const tag = etiquetaEstado(kind);
  const tox = p.toxica ? `<span class="tox">⚠️ tóxica</span>` : '';
  const nota = p.toxica && p.nota_toxica ? `<p class="nota">${esc(p.nota_toxica)}</p>` : '';
  const latin = p.latin ? `<p class="latin">${esc(p.latin)}</p>` : '';
  const regada = textoRegada(p);
  const next = textoProximo(p);
  const pending = undos.has(p.id);
  return `<article class="card ${kind}" data-id="${esc(p.id)}">
    ${fotoHtml(p)}
    <div class="body">
      <h2>${esc(p.nombre)} ${tox}</h2>
      ${latin}
      ${tag ? `<p class="estado">${esc(tag)}</p>` : ''}
      ${p.consejo ? `<p class="consejo">${esc(p.consejo)}</p>` : ''}
      ${nota}
      ${regada ? `<p class="meta">${esc(regada)}</p>` : ''}
      ${next ? `<p class="meta">${esc(next)}</p>` : ''}
      <button type="button" class="regar" data-act="regar">💧 Regada</button>
      <button type="button" class="undo" data-act="undo" ${pending ? '' : 'hidden'}>deshacer</button>
    </div>
  </article>`;
}

export function renderList(list, zona, now) {
  const rows = ordenarPlantas(filtrarZona(list, zona), now);
  return rows.map(cardHtml).join('') || '<p class="empty">No hay plantas en este filtro.</p>';
}

function paint() {
  const box = $('#list');
  if (!box) return;
  box.innerHTML = renderList(plantas, filtro);
}

function listenPlantas() {
  if (!fsApi || !db) return;
  if (unsub) unsub();
  colRef = fsApi.collection(db, 'plantas_casa');
  unsub = fsApi.onSnapshot(colRef, (snap) => {
    plantas = snap.docs.map(fromSnap);
    paint();
  }, (err) => {
    console.error('plantas', err);
    const box = $('#list');
    if (box) box.innerHTML = '<p class="empty">Sin permiso de plantas. Falta el bloque plantas_casa en rules.</p>';
  });
}

async function houseAllowed() {
  try {
    await fsApi.getDoc(fsApi.doc(db, 'casa_json', 'go_data'));
    return true;
  } catch {
    return false;
  }
}

async function regar(id) {
  const p = plantas.find((x) => x.id === id);
  if (!p || !fsApi || !db) return;
  const prev = { ultimo_riego: p.ultimo_riego, historial: (p.historial || []).slice() };
  const now = fsApi.Timestamp.now();
  const hist = pushHistorial(prev.historial, now, 20);
  await fsApi.setDoc(fsApi.doc(db, 'plantas_casa', id), {
    ...p,
    ultimo_riego: now,
    historial: hist,
  }, { merge: true });
  const t = setTimeout(() => {
    undos.delete(id);
    paint();
  }, UNDO_MS);
  undos.set(id, { prev, t });
  paint();
}

async function deshacer(id) {
  const u = undos.get(id);
  if (!u || !fsApi || !db) return;
  clearTimeout(u.t);
  undos.delete(id);
  const p = plantas.find((x) => x.id === id) || { id };
  await fsApi.setDoc(fsApi.doc(db, 'plantas_casa', id), {
    ...p,
    ultimo_riego: u.prev.ultimo_riego || null,
    historial: u.prev.historial || [],
  }, { merge: true });
  paint();
}

function uniqueId(nombre) {
  let id = slugId(nombre);
  const ids = new Set(plantas.map((p) => p.id));
  if (!ids.has(id)) return id;
  let n = 2;
  while (ids.has(`${id}-${n}`)) n += 1;
  return `${id}-${n}`;
}

function compressFoto(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 640;
      let w = img.width;
      let h = img.height;
      if (w > max || h > max) {
        const s = Math.min(max / w, max / h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('foto')); };
    img.src = url;
  });
}

async function alta(ev) {
  ev.preventDefault();
  const form = ev.target;
  const file = form.querySelector('#foto-file').files[0];
  let foto = String(form.foto.value || '').trim();
  if (file) foto = await compressFoto(file);
  const raw = {
    nombre: form.nombre.value,
    latin: form.latin.value,
    zona: form.zona.value,
    foto,
    toxica: form.toxica.checked,
    nota_toxica: form.nota_toxica.value,
    riego_verano_dias: form.riego_verano_dias.value,
    riego_invierno_dias: form.riego_invierno_dias.value,
    consejo: form.consejo.value,
    ultimo_riego: null,
    historial: [],
  };
  const id = uniqueId(raw.nombre);
  const p = camposPlanta(raw, id);
  if (!plantaValida(p)) {
    $('#alta-status').textContent = 'Faltan nombre, zona o días de riego.';
    return;
  }
  await fsApi.setDoc(fsApi.doc(db, 'plantas_casa', id), p);
  form.reset();
  $('#alta').hidden = true;
  $('#alta-status').textContent = '';
}

function showApp(label) {
  $('#gate').hidden = true;
  $('#app').hidden = false;
  $('#google-sign-in').hidden = true;
  $('#google-sign-out').hidden = embedded ? true : false;
  hideEmbeddedChrome();
  $('#google-status').textContent = label || 'sesión';
  listenPlantas();
}

function showGate(msg) {
  if (unsub) { unsub(); unsub = null; }
  plantas = [];
  $('#app').hidden = true;
  $('#gate').hidden = false;
  $('#google-sign-in').hidden = false;
  $('#google-sign-out').hidden = true;
  $('#google-status').textContent = msg || 'Sin sesión';
  const box = $('#list');
  if (box) box.innerHTML = '';
}

async function boot() {
  const status = $('#google-status');
  const setStatus = (t) => { status.textContent = t; };
  if (!HOSTS.includes(location.hostname)) {
    setStatus('Acceso · dominio no autorizado');
    showGate('Acceso · dominio no autorizado');
    return;
  }
  try {
    const config = await loadFirebaseConfig();
    const [{ initializeApp }, auth, firestore] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js'),
    ]);
    const app = initializeApp(config);
    const service = auth.getAuth(app);
    await auth.setPersistence(service, auth.browserLocalPersistence);
    fsApi = firestore;
    db = firestore.getFirestore(app);
    const provider = new auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const enter = async (user) => {
      if (!(await houseAllowed())) {
        if (parentOk()) {
          showApp(parentEmail() || 'sesión');
          return;
        }
        auth.signOut(service);
        setStatus('Cuenta no autorizada');
        showGate('Cuenta no autorizada');
        return;
      }
      showApp(user.displayName || 'sesión');
    };
    const enterFromParent = () => {
      if (!parentOk()) return false;
      hideEmbeddedChrome();
      showApp(parentEmail() || 'sesión');
      return true;
    };
    auth.onAuthStateChanged(service, (user) => {
      if (!user) {
        if (enterFromParent()) return;
        showGate('Sin sesión');
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
  } catch (e) {
    console.error(e);
    if (parentOk()) {
      showApp(parentEmail() || 'sesión');
      return;
    }
    setStatus('Acceso · configuración no disponible');
    showGate('Acceso · configuración no disponible');
  }
}

function wireUi() {
  document.querySelectorAll('[data-filtro]').forEach((btn) => {
    btn.addEventListener('click', () => {
      filtro = btn.dataset.filtro;
      document.querySelectorAll('[data-filtro]').forEach((b) => {
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      paint();
    });
  });
  $('#list').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('[data-id]');
    if (!card) return;
    if (btn.dataset.act === 'regar') void regar(card.dataset.id);
    if (btn.dataset.act === 'undo') void deshacer(card.dataset.id);
  });
  $('#btn-alta').addEventListener('click', () => {
    const box = $('#alta');
    box.hidden = !box.hidden;
  });
  $('#alta').addEventListener('submit', (ev) => { void alta(ev); });
}

showGate('Acceso · comprobando');
wireUi();
boot();
