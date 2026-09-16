export const DEFAULT_FAVS = ['Real Madrid', 'Miami Dolphins', 'Milwaukee Brewers'];

export function parseFavoritos(payload) {
  if (!payload || typeof payload !== 'object') return DEFAULT_FAVS.slice();
  const raw = payload.favoritos;
  if (!Array.isArray(raw)) return DEFAULT_FAVS.slice();
  const names = raw.map((item) => String(item || '').trim()).filter(Boolean);
  return names.length ? names : DEFAULT_FAVS.slice();
}

export function isHouseFav(evento, favoritos) {
  const name = String(evento || '').toLowerCase();
  const list = Array.isArray(favoritos) && favoritos.length ? favoritos : DEFAULT_FAVS;
  return list.some((fav) => name.includes(String(fav).toLowerCase()));
}
