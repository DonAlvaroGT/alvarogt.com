export function menuDelDia(payload, day) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.schema_version !== 1 || payload.timezone !== 'Europe/Madrid') return null;
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const dias = payload.dias;
  if (!dias || typeof dias !== 'object' || Array.isArray(dias)) return null;
  const entry = dias[day];
  if (!entry || typeof entry !== 'object') return null;
  const raw = entry.platos;
  if (!Array.isArray(raw) || !raw.length) return null;
  const platos = raw.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim());
  return platos.length ? platos : null;
}
