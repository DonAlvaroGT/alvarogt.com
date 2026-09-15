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

export function showGate(statusText) {
  const gate = document.querySelector('#gate');
  const shell = document.querySelector('#shell');
  const frame = document.querySelector('#view');
  const status = document.querySelector('#google-status');
  if (gate) gate.hidden = false;
  if (shell) shell.hidden = true;
  if (frame) {
    frame.removeAttribute('data-casa-view');
    frame.removeAttribute('src');
    try { frame.src = 'about:blank'; } catch {}
  }
  if (status && statusText) status.textContent = statusText;
}

export function markTab(name) {
  document.querySelectorAll('#tabs button').forEach((btn) => {
    btn.setAttribute('aria-selected', btn.dataset.view === name ? 'true' : 'false');
  });
}

export function showView(name) {
  const src = srcFor(name);
  const frame = document.querySelector('#view');
  if (!frame) return src;
  const current = frame.getAttribute('data-casa-view') || '';
  if (current !== name) {
    frame.setAttribute('data-casa-view', name);
    frame.src = src;
  }
  markTab(name);
  return src;
}

export function showShell() {
  const gate = document.querySelector('#gate');
  const shell = document.querySelector('#shell');
  if (gate) gate.hidden = true;
  if (shell) shell.hidden = false;
  const selected = document.querySelector('#tabs button[aria-selected="true"]');
  showView((selected && selected.dataset.view) || 'go');
}

export function boot() {
  const status = document.querySelector('#google-status');
  const setStatus = (text) => { if (status) status.textContent = text; };
  const frame = document.querySelector('#view');
  let loginAttempt = false;

  document.querySelector('#tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    showView(btn.dataset.view);
  });

  frame?.addEventListener('load', () => {
    try {
      const path = frame.contentWindow?.location?.pathname;
      if (path && path !== 'blank') markTab(tabFromPath(path));
    } catch {}
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
    const provider = new auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const enter = (user) => {
      if (isAdult(user.email)) {
        clearLogin();
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

    auth.onAuthStateChanged(service, (user) => {
      if (!user) {
        setStatus('Sin sesión');
        showGate();
        return;
      }
      enter(user);
    });

    const login = async () => {
      try {
        markLogin();
        setStatus('Google · entrando…');
        await auth.signInWithPopup(service, provider);
      } catch (e) {
        const code = e && e.code;
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          try {
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
  } catch {
    setStatus('Acceso · configuración no disponible');
    showGate();
  }
}

if (typeof document !== 'undefined' && document.querySelector('#gate-sign-in')) {
  boot();
}
