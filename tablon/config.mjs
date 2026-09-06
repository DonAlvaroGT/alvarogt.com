const ALLOWED_BACKEND_KEYS = ['backendConfigured', 'apiBase', 'authProvider'];

export function isLocalDevelopment(locationLike = globalThis.location) {
  if (!locationLike) return false;
  return locationLike.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(locationLike.hostname);
}

export function validateRuntimeConfig(raw = {}, locationLike = globalThis.location) {
  const config = { backendConfigured: false, apiBase: '', authProvider: '', ...raw };
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
  const raw = typeof globalThis.TABLON_CONFIG === 'object' ? globalThis.TABLON_CONFIG : {};
  return validateRuntimeConfig(raw, locationLike);
}

export const allowedBackendKeys = ALLOWED_BACKEND_KEYS;
