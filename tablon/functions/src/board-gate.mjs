const ADULTS = new Set(['agarciatimon@gmail.com', 'luzolivas@gmail.com']);
const BOARD_ORIGINS = new Set(['https://alvarogt.com', 'https://www.alvarogt.com', 'http://localhost', 'http://127.0.0.1']);

export function allowBoardToken(token) {
  if (!token) return false;
  const email = String(token.email || '').toLowerCase();
  if (ADULTS.has(email) && token.email_verified === true) return true;
  return token.childRole === 'supervised';
}

export function boardCorsOrigin(origin) {
  if (!origin) return '';
  try {
    const url = new URL(origin);
    if (BOARD_ORIGINS.has(`${url.protocol}//${url.hostname}`)) return origin;
  } catch {
    return '';
  }
  return '';
}
