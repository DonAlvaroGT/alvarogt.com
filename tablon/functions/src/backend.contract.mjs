export const ADULT_EMAILS = ['agarciatimon@gmail.com', 'luzolivas@gmail.com'];
export const CHILD_ROLE = 'child';
export const COMMANDS = ['child_done', 'validate_task', 'adult_done', 'undo_done'];

const transitions = {
  child_done: ['pending', 'child_done'],
  validate_task: [['child_done', 'adult_done'], 'validated'],
  adult_done: ['pending', 'adult_done'],
  undo_done: [['child_done', 'validated', 'adult_done'], 'pending'],
};

export function authorize(actor, action) {
  if (!actor || !COMMANDS.includes(action)) return false;
  if (action === 'child_done') return actor.role === CHILD_ROLE;
  return actor.role === 'adult' && actor.emailVerified === true && ADULT_EMAILS.includes(actor.email);
}

function transitionFor(action, status) {
  const [from, to] = transitions[action];
  return [Array.isArray(from) ? from.includes(status) : from === status, to];
}

export function canonicalInstanceStatus(status) {
  // Compatibilidad con instancias antiguas que la primera UI guardó como open/waiting.
  return status === 'open' ? 'pending' : status === 'waiting' ? 'child_done' : status;
}

export function commandFor(action, actor, task, instance, eventId) {
  if (!authorize(actor, action)) throw new Error('Actor no autorizado.');
  if (!task || task.status !== 'active') throw new Error('La tarea está archivada o no activa.');
  if (!instance || instance.taskId !== task.id) throw new Error('La instancia no corresponde a la tarea.');
  if (typeof eventId !== 'string' || !eventId.trim()) throw new Error('Falta eventId idempotente.');
  const [allowed, next] = transitionFor(action, canonicalInstanceStatus(instance.status));
  if (!allowed) throw new Error('Transición no permitida.');
  return { action, eventId, actorUid: actor.uid, actorRole: actor.role, transition: [canonicalInstanceStatus(instance.status), next] };
}

export function applyCommand(instance, command) {
  const current = canonicalInstanceStatus(instance.status);
  if (instance.lastEventId === command.eventId) return { ...instance, status: current };
  if (current !== command.transition[0]) return { ...instance, status: current };
  return { ...instance, status: command.transition[1], lastEventId: command.eventId };
}

export function createInstanceId(taskId, period) {
  if (!taskId || !period) throw new Error('taskId y period son obligatorios.');
  return `${taskId}:${period}`;
}

const WEEKDAY_NAMES = new Map([
  ['domingo', 0], ['lunes', 1], ['martes', 2], ['miércoles', 3], ['miercoles', 3],
  ['jueves', 4], ['viernes', 5], ['sábado', 6], ['sabado', 6],
  ['sunday', 0], ['monday', 1], ['tuesday', 2], ['wednesday', 3],
  ['thursday', 4], ['friday', 5], ['saturday', 6],
]);

export function normalizeWeeklyDays(value) {
  let values = value;
  if (typeof values === 'string') {
    const text = values.trim();
    if (!text) return [];
    try { values = JSON.parse(text); } catch { values = text.split(','); }
  }
  if (!Array.isArray(values)) values = [values];
  return [...new Set(values.flatMap((item) => {
    if (typeof item === 'number' && Number.isInteger(item)) return [item];
    const text = String(item).trim().toLowerCase();
    if (/^[0-6]$/.test(text)) return [Number(text)];
    return WEEKDAY_NAMES.has(text) ? [WEEKDAY_NAMES.get(text)] : [];
  }).filter((day) => day >= 0 && day <= 6))];
}

export function madridWeekday(date = new Date()) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', weekday: 'short' }).format(date);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday];
}

export function madridWeekdayForCalendarDate(value) {
  const calendarDate = value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
  return madridWeekday(new Date(`${calendarDate}T12:00:00Z`));
}

export function awardPoints(instance, task, beneficiary) {
  if (!instance || instance.pointsAwarded || instance.status !== 'validated') return null;
  if (!task || !beneficiary || !Number.isInteger(task.points) || task.points < 0) throw new Error('Premio inválido.');
  return { awardId: `${instance.id}:${beneficiary}`, points: task.points };
}

export function frequencyPeriods(task, dates) {
  if (!task || task.status !== 'active') return [];
  const days = normalizeWeeklyDays(task.days);
  return dates.filter((period) => task.frequency === 'daily' || (task.frequency === 'weekly' && days.includes(madridWeekdayForCalendarDate(period))));
}
