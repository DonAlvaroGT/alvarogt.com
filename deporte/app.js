export function parentEmail() {
  try {
    if (window.parent === window) return '';
    return String(window.parent.__casaAuth?.email?.() || '').toLowerCase();
  } catch {
    return '';
  }
}

export function parentOk() {
  try {
    if (window.parent === window) return false;
    return !!window.parent.__casaAuth?.ok?.();
  } catch {
    return false;
  }
}

export async function parentIdToken() {
  try {
    if (window.parent === window) return null;
    return await window.parent.__casaAuth?.idToken?.() || null;
  } catch {
    return null;
  }
}

export function markEmbedded() {
  try {
    if (window.parent !== window && window.parent.location.origin === location.origin) {
      document.documentElement.classList.add('embedded');
      return true;
    }
  } catch {}
  return false;
}

export const HOSTS = [
  'localhost',
  '127.0.0.1',
  'alvarogt.com',
  'www.alvarogt.com',
  'tablongo.web.app',
  'tablongo.firebaseapp.com',
];

export async function loadFirebaseConfig() {
  const res = await fetch('/tablon/firebase.public.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('cfg');
  return res.json();
}

export async function casaDoc(id, fsApi, db, project) {
  if (fsApi && db) {
    try {
      const snap = await fsApi.getDoc(fsApi.doc(db, 'casa_json', id));
      if (!snap.exists()) throw new Error('missing');
      const body = snap.data().body;
      if (typeof body !== 'string') throw new Error('body');
      return JSON.parse(body);
    } catch (err) {
      if (!parentOk()) throw err;
    }
  }
  const token = await parentIdToken();
  if (!token) throw new Error('missing');
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/casa_json/${encodeURIComponent(id)}`,
    { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' }
  );
  if (!res.ok) throw new Error('missing');
  const body = (await res.json())?.fields?.body?.stringValue;
  if (typeof body !== 'string') throw new Error('body');
  return JSON.parse(body);
}

export function cardHtml(p, esc) {
  const tag = p.tag || {};
  const tv = p.tv ? `<span class="tv">${esc(p.tv)}</span>` : '';
  return `<article class="match" style="--tag:${esc(tag.color || '#666')}">
    <span class="tag">${esc(tag.label || '')}</span>
    <span class="hora">${esc(p.hora || '')}</span>
    <span class="rival">${esc(p.rival || '')}</span>
    ${tv}
  </article>`;
}

export function paintList(partidos, tagOf, tvOf, lineaIgnored) {
  return (Array.isArray(partidos) ? partidos : []).map((p) => ({
    hora: String(p.hora_madrid || ''),
    rival: String(p.rival || ''),
    tv: tvOf(p),
    tag: tagOf(p),
  }));
}
