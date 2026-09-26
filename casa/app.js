export const ALLOWED = ['agarciatimon@gmail.com', 'luzolivas@gmail.com'];
export const VIEWS = { go: '/go/', tablon: '/tablon/', viajes: '/viajes/' };
export const HOSTS = [
  'localhost',
  '127.0.0.1',
  'alvarogt.com',
  'www.alvarogt.com',
  'tablongo.web.app',
  'tablongo.firebaseapp.com'
];
export const HINT_KEY = 'casa.lastAdult';
export const TAB_KEY = 'casa.lastTab';
export const TAB_NAMES = ['go', 'tablon', 'viajes'];
const TITLES = { go: 'Go', tablon: 'Tablón', viajes: 'Viajes' };

export function isAdult(email) {
  return ALLOWED.includes(String(email || '').toLowerCase());
}

export function srcFor(name) {
  return VIEWS[name] || VIEWS.go;
}

export function tabFromPath(pathname) {
  const path = String(pathname || '');
  if (path.startsWith('/tablon/')) return 'tablon';
  if (path.startsWith('/viajes/')) return 'viajes';
  if (path.startsWith('/go/')) return 'go';
  return 'go';
}

export async function loadFirebaseConfig() {
  const tryUrl = async (url) => {
    const cfg = await fetch(url, { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error('cfg');
      return r.json();
    });
    if (typeof cfg.apiKey === 'string' && cfg.apiKey.startsWith('AIza')) return cfg;
    throw new Error('redacted');
  };
  try {
    return await tryUrl('/tablon/firebase.public.json');
  } catch {
    return await tryUrl('/go/firebase.public.json');
  }
}

export function lastAdultHint() {
  try {
    const v = String((globalThis.localStorage && localStorage.getItem(HINT_KEY)) || '').toLowerCase();
    return isAdult(v) ? v : '';
  } catch {
    return '';
  }
}

export function rememberAdult(email) {
  const v = String(email || '').toLowerCase();
  if (!isAdult(v)) return;
  try { localStorage.setItem(HINT_KEY, v); } catch {}
}

export function lastTab() {
  try {
    const v = String((globalThis.localStorage && localStorage.getItem(TAB_KEY)) || '');
    return TAB_NAMES.includes(v) ? v : 'go';
  } catch {
    return 'go';
  }
}

export function rememberTab(name) {
  if (!TAB_NAMES.includes(name)) return;
  try { localStorage.setItem(TAB_KEY, name); } catch {}
}

export function queueHasPending(doc) {
  try {
    const list = doc && doc.querySelector('#queue-list');
    if (!list) return false;
    return list.querySelectorAll('.queue-item').length > 0;
  } catch {
    return false;
  }
}

export function setTablonQueueDot(on) {
  const btn = document.querySelector('#tabs button[data-view="tablon"]');
  if (!btn) return false;
  btn.classList.toggle('has-queue', !!on);
  const dot = btn.querySelector('.tab-dot');
  if (dot) dot.hidden = !on;
  return !!on;
}

export function readTablonQueueFromFrame(frame) {
  try {
    if (!frame || isFrameDead(frame)) return null;
    const doc = frame.contentDocument;
    if (!doc || !doc.querySelector('#queue-list')) return null;
    return queueHasPending(doc);
  } catch {
    return null;
  }
}

export function refreshTablonQueueDot() {
  const scroller = document.querySelector('#scroller');
  const frame = scroller && scroller.querySelector('iframe[data-casa-view="tablon"]');
  const pending = readTablonQueueFromFrame(frame);
  if (pending === null) {
    setTablonQueueDot(false);
    return false;
  }
  return setTablonQueueDot(pending);
}

export function setViajesTripDot(on) {
  const btn = document.querySelector('#tabs button[data-view="viajes"]');
  if (!btn) return false;
  btn.classList.toggle('has-trip', !!on);
  const dot = btn.querySelector('.tab-dot');
  if (dot) dot.hidden = !on;
  return !!on;
}

export function readTripSoonFromGoFrame(frame) {
  try {
    if (!frame || isFrameDead(frame)) return null;
    const html = frame.contentDocument && frame.contentDocument.documentElement;
    if (!html || typeof html.getAttribute !== 'function') return null;
    return html.getAttribute('data-trip-soon') === '1';
  } catch {
    return null;
  }
}

export function refreshViajesTripDot() {
  const scroller = document.querySelector('#scroller');
  const frame = scroller && scroller.querySelector('iframe[data-casa-view="go"]');
  const soon = readTripSoonFromGoFrame(frame);
  if (soon === null) {
    setViajesTripDot(false);
    return false;
  }
  return setViajesTripDot(soon);
}

export function applyViajesHoy(frame) {
  if (!refreshViajesTripDot()) return false;
  try {
    const html = frame && frame.contentDocument && frame.contentDocument.documentElement;
    if (!html || typeof html.setAttribute !== 'function') return false;
    html.setAttribute('data-viajes-vista', 'hoy');
    return true;
  } catch {
    return false;
  }
}

export function goHasInteres5(doc) {
  try {
    return !!(doc && doc.querySelector('.sports-star-5'));
  } catch {
    return false;
  }
}

export function setGoHotDot(on) {
  const btn = document.querySelector('#tabs button[data-view="go"]');
  if (!btn) return false;
  btn.classList.toggle('has-hot', !!on);
  const dot = btn.querySelector('.tab-dot');
  if (dot) dot.hidden = !on;
  return !!on;
}

export function readGoHotFromFrame(frame) {
  try {
    if (!frame || isFrameDead(frame)) return null;
    const doc = frame.contentDocument;
    if (!doc) return null;
    if (!doc.querySelector('#sports-agenda') && !doc.querySelector('#agenda-deportiva')) return null;
    return goHasInteres5(doc);
  } catch {
    return null;
  }
}

export function refreshGoHotDot() {
  const scroller = document.querySelector('#scroller');
  const frame = scroller && scroller.querySelector('iframe[data-casa-view="go"]');
  const hot = readGoHotFromFrame(frame);
  if (hot === null) {
    setGoHotDot(false);
    return false;
  }
  return setGoHotDot(hot);
}

export function googleParams() {
  const hint = lastAdultHint();
  return hint ? { login_hint: hint } : {};
}

export function isStandaloneDisplay() {
  try {
    const w = typeof window !== 'undefined' ? window : globalThis;
    if (w.navigator && w.navigator.standalone === true) return true;
    if (typeof w.matchMedia === 'function' && w.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {}
  return false;
}

function scrollerFrames() {
  const scroller = document.querySelector('#scroller');
  return scroller ? [...scroller.querySelectorAll('iframe')] : [];
}

export function hideExpiredOverlay() {
  const overlay = document.querySelector('#session-overlay');
  if (overlay) overlay.hidden = true;
}

export function showExpiredOverlay() {
  const overlay = document.querySelector('#session-overlay');
  if (overlay) overlay.hidden = false;
}

export function showGate(statusText) {
  const gate = document.querySelector('#gate');
  const shell = document.querySelector('#shell');
  const status = document.querySelector('#google-status');
  hideExpiredOverlay();
  if (gate) gate.hidden = false;
  if (shell) shell.hidden = true;
  if (status && statusText) status.textContent = statusText;
}

export function markTab(name) {
  document.querySelectorAll('#tabs button').forEach((btn) => {
    btn.setAttribute('aria-selected', btn.dataset.view === name ? 'true' : 'false');
  });
}

function bindFrame(frame) {
  frame.addEventListener('load', () => {
    try {
      const path = frame.contentWindow?.location?.pathname;
      if (path && path !== 'blank') markTab(tabFromPath(path));
    } catch {}
    if (frame.getAttribute('data-casa-view') === 'tablon') watchTablonQueue(frame);
    if (frame.getAttribute('data-casa-view') === 'go') {
      watchGoTripSoon(frame);
      watchGoHot(frame);
    }
    if (frame.getAttribute('data-casa-view') === 'viajes') applyViajesHoy(frame);
  });
}

function watchTablonQueue(frame) {
  refreshTablonQueueDot();
  try {
    const doc = frame && frame.contentDocument;
    const list = doc && doc.querySelector('#queue-list');
    if (!list || typeof MutationObserver === 'undefined') return;
    if (frame.__casaQueueObs) {
      try { frame.__casaQueueObs.disconnect(); } catch {}
    }
    const obs = new MutationObserver(() => { refreshTablonQueueDot(); });
    obs.observe(list, { childList: true, subtree: true });
    frame.__casaQueueObs = obs;
  } catch {}
}

function watchGoTripSoon(frame) {
  refreshViajesTripDot();
  try {
    const html = frame && frame.contentDocument && frame.contentDocument.documentElement;
    if (!html || typeof MutationObserver === 'undefined') return;
    if (frame.__casaTripObs) {
      try { frame.__casaTripObs.disconnect(); } catch {}
    }
    const obs = new MutationObserver(() => { refreshViajesTripDot(); });
    obs.observe(html, { attributes: true, attributeFilter: ['data-trip-soon'] });
    frame.__casaTripObs = obs;
  } catch {}
}

function watchGoHot(frame) {
  refreshGoHotDot();
  try {
    const doc = frame && frame.contentDocument;
    const box = doc && (doc.querySelector('#sports-agenda') || doc.querySelector('#agenda-deportiva'));
    if (!box || typeof MutationObserver === 'undefined') return;
    if (frame.__casaHotObs) {
      try { frame.__casaHotObs.disconnect(); } catch {}
    }
    const obs = new MutationObserver(() => { refreshGoHotDot(); });
    obs.observe(box, { childList: true, subtree: true });
    frame.__casaHotObs = obs;
  } catch {}
}

function paintFrame(frame, on) {
  const go = frame.getAttribute('data-casa-view') === 'go';
  frame.classList.toggle('is-active', on);
  if (!frame.style) return;
  if (go) {
    frame.style.display = 'block';
    frame.style.visibility = on ? 'visible' : 'hidden';
    frame.style.pointerEvents = on ? 'auto' : 'none';
    frame.style.zIndex = on ? '1' : '0';
  } else {
    frame.style.display = on ? 'block' : 'none';
  }
}

function ensureGoFrame() {
  const scroller = document.querySelector('#scroller');
  if (!scroller) return null;
  const existing = scroller.querySelector('iframe[data-casa-view="go"]');
  if (existing) {
    refreshViajesTripDot();
    refreshGoHotDot();
    return existing;
  }
  const frame = document.createElement('iframe');
  frame.setAttribute('data-casa-view', 'go');
  frame.setAttribute('title', TITLES.go);
  frame.src = srcFor('go');
  if (frame.style) {
    frame.style.position = 'absolute';
    frame.style.inset = '0';
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.border = '0';
  }
  scroller.appendChild(frame);
  bindFrame(frame);
  paintFrame(frame, lastTab() === 'go');
  return frame;
}

export function showView(name) {
  const view = TAB_NAMES.includes(name) ? name : 'go';
  rememberTab(view);
  const src = srcFor(view);
  const scroller = document.querySelector('#scroller');
  if (!scroller) {
    markTab(view);
    return src;
  }
  let frame = scroller.querySelector(`iframe[data-casa-view="${view}"]`);
  if (!frame) {
    frame = document.createElement('iframe');
    frame.setAttribute('data-casa-view', view);
    frame.setAttribute('title', TITLES[view] || view);
    frame.src = src;
    if (frame.style) {
      frame.style.position = 'absolute';
      frame.style.inset = '0';
      frame.style.width = '100%';
      frame.style.height = '100%';
      frame.style.border = '0';
    }
    scroller.appendChild(frame);
    bindFrame(frame);
  }
  scroller.querySelectorAll('iframe').forEach((f) => {
    paintFrame(f, f.getAttribute('data-casa-view') === view);
  });
  markTab(view);
  if (view === 'tablon') refreshTablonQueueDot();
  refreshViajesTripDot();
  refreshGoHotDot();
  if (view === 'viajes') applyViajesHoy(frame);
  return src;
}

export function showShell() {
  const gate = document.querySelector('#gate');
  const shell = document.querySelector('#shell');
  if (gate) gate.hidden = true;
  if (shell) shell.hidden = false;
  hideExpiredOverlay();
  showView(lastTab());
  ensureGoFrame();
}

export function isFrameDead(frame) {
  if (!frame) return true;
  try {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) return true;
    const href = String((win.location && win.location.href) || '');
    if (!href || href === 'about:blank') return true;
    if (!doc.body) return true;
    return false;
  } catch {
    return true;
  }
}

export function reloadView(name) {
  const scroller = document.querySelector('#scroller');
  const frame = scroller && scroller.querySelector(`iframe[data-casa-view="${name}"]`);
  if (!frame) return false;
  try {
    if (frame.contentWindow && !isFrameDead(frame)) {
      frame.contentWindow.location.reload();
      return true;
    }
  } catch {}
  frame.src = srcFor(name);
  return true;
}

export function resumeActiveIfDead() {
  const frame = scrollerFrames().find((f) => f.classList.contains('is-active') || f.style.display !== 'none');
  if (!frame) return false;
  if (!isFrameDead(frame)) return false;
  return reloadView(frame.getAttribute('data-casa-view') || 'go');
}

function liveShell() {
  const shell = document.querySelector('#shell');
  return !!(shell && !shell.hidden && scrollerFrames().length);
}

function shouldRedirect(code) {
  if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') return true;
  if (!isStandaloneDisplay() || !code) return false;
  const text = String(code);
  if (text === 'auth/popup-closed-by-user') return false;
  return text.startsWith('auth/popup-');
}

export function boot() {
  const status = document.querySelector('#google-status');
  const setStatus = (text) => { if (status) status.textContent = text; };
  let loginAttempt = false;

  document.querySelector('#tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    showView(btn.dataset.view);
  });

  window.addEventListener('message', (ev) => {
    if (ev.origin !== location.origin) return;
    if (!ev.data || ev.data.casa !== 'frame-size') return;
    /* Altura la da el hueco del scroller, no el postMessage (banda negra). */
  });

  window.addEventListener('pageshow', (ev) => {
    if (ev.persisted) resumeActiveIfDead();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resumeActiveIfDead();
  });

  showGate('Acceso · comprobando');

  if (!HOSTS.includes(location.hostname)) {
    setStatus('Acceso · dominio no autorizado');
    return;
  }

  setupGoogle(setStatus, () => { loginAttempt = true; }, () => loginAttempt, () => { loginAttempt = false; });
}

async function setupGoogle(setStatus, markLogin, wasLogin, clearLogin) {
  try {
    const config = await loadFirebaseConfig();
    const [{ initializeApp }, auth] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js')
    ]);
    const app = initializeApp(config);
    const service = auth.getAuth(app);
    await auth.setPersistence(service, auth.browserLocalPersistence);
    window.__casaAuth = {
      email: () => String((service.currentUser && service.currentUser.email) || '').toLowerCase(),
      idToken: async () => (service.currentUser ? service.currentUser.getIdToken() : null)
    };
    const provider = new auth.GoogleAuthProvider();

    const enter = (user) => {
      if (isAdult(user.email)) {
        clearLogin();
        rememberAdult(user.email);
        setStatus(user.displayName || user.email);
        showShell();
        return;
      }
      setStatus('Cuenta no autorizada');
      showGate();
      if (wasLogin()) {
        clearLogin();
        auth.signOut(service);
      }
    };

    let expireTimer = 0;
    auth.onAuthStateChanged(service, (user) => {
      if (expireTimer) {
        clearTimeout(expireTimer);
        expireTimer = 0;
      }
      if (!user) {
        if (liveShell()) {
          expireTimer = setTimeout(() => {
            expireTimer = 0;
            if (service.currentUser) return;
            setStatus('Sin sesión');
            showExpiredOverlay();
          }, 400);
          return;
        }
        setStatus('Sin sesión');
        showGate('Sin sesión');
        return;
      }
      hideExpiredOverlay();
      enter(user);
    });

    try { await auth.getRedirectResult(service); } catch (e) {
      setStatus('Google · ' + ((e && e.code) || 'error'));
    }

    const login = async () => {
      try {
        markLogin();
        setStatus('Google · entrando…');
        provider.setCustomParameters(googleParams());
        await auth.signInWithPopup(service, provider);
      } catch (e) {
        const code = e && e.code;
        if (shouldRedirect(code)) {
          try {
            provider.setCustomParameters(googleParams());
            await auth.signInWithRedirect(service, provider);
            return;
          } catch (redirectErr) {
            setStatus('Google · ' + (redirectErr.code || 'error'));
            return;
          }
        }
        setStatus('Google · ' + (code || 'error'));
      }
    };

    document.querySelector('#gate-sign-in')?.addEventListener('click', login);
    document.querySelector('#session-overlay')?.addEventListener('click', login);
  } catch {
    setStatus('Acceso · configuración no disponible');
    showGate();
  }
}

if (typeof document !== 'undefined' && document.querySelector('#gate-sign-in')) {
  boot();
}
