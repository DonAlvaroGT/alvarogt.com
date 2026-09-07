const ALLOWED_BACKEND_KEYS = ['backendConfigured', 'apiBase', 'authProvider', 'firebaseConfig'];

// Configuración pública documentada por Álvaro. Leerla no activa Auth, Firestore
// ni sincronización: el backend confiable todavía no existe.
export const PUBLIC_FIREBASE_CONFIG = Object.freeze({
  projectId: 'tablongo',
  authDomain: 'tablongo.firebaseapp.com',
  apiKey: 'AIzaSyBdbo1iSi9OjNzEzqvCQF9cyXnlCcXt_MQ',
  storageBucket: 'tablongo.firebasestorage.app',
  messagingSenderId: '639440141487',
  appId: '1:639440141487:web:76132e8c01c030b4e1e85a',
});

export function isLocalDevelopment(locationLike = globalThis.location) {
  if (!locationLike) return false;
  return locationLike.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(locationLike.hostname);
}

export function validateRuntimeConfig(raw = {}, locationLike = globalThis.location) {
  const config = { backendConfigured: false, apiBase: '', authProvider: '', firebaseConfig: PUBLIC_FIREBASE_CONFIG, ...raw };
  const localDevelopment = isLocalDevelopment(locationLike);
  const errors = [];
  if (typeof config.backendConfigured !== 'boolean') errors.push('backendConfigured debe ser booleano.');
  if (config.backendConfigured) {
    try {
      const url = new URL(config.apiBase);
      if (url.protocol !== 'https:') errors.push('apiBase debe usar HTTPS.');
      if (url.username || url.password) errors.push('apiBase no puede contener credenciales.');
    } catch { errors.push('apiBase debe ser una URL HTTPS válida.'); }
    if (!config.authProvider) errors.push('Falta declarar authProvider.');
  }
  if (!localDevelopment && !config.backendConfigured) errors.push('No hay backend de producción configurado.');
  return { config, localDevelopment, valid: errors.length === 0, errors };
}

export function readRuntimeConfig(locationLike = globalThis.location) {
  // La configuración pública queda conectada como metadato de arranque, pero
  // no habilita producción: no hay adaptador remoto ni autenticación conectados.
  return validateRuntimeConfig({ firebaseConfig: PUBLIC_FIREBASE_CONFIG }, locationLike);
}

export const allowedBackendKeys = ALLOWED_BACKEND_KEYS;
