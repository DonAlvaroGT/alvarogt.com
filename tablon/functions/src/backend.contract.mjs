export const ADULT_EMAILS = ['agarciatimon@gmail.com', 'luzolivas@gmail.com'];
export const CHILD_ROLE = 'child';
export const COMMANDS = ['child_done', 'validate_task', 'adult_done', 'undo_done'];
export const REDEMPTION_COMMANDS = ['request_redemption', 'reject_redemption', 'validate_redemption'];

const transitions = {
  child_done: ['pending', 'child_done'],
  validate_task: ['child_done', 'validated'],
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

export function commandFor(action, actor, task, instance, eventId) {
  if (!authorize(actor, action)) throw new Error('Actor no autorizado.');
  if (!task || task.status !== 'active') throw new Error('La tarea está archivada o no activa.');
  if (!instance || instance.taskId !== task.id) throw new Error('La instancia no corresponde a la tarea.');
  if (typeof eventId !== 'string' || !eventId.trim()) throw new Error('Falta eventId idempotente.');
  const [allowed, next] = transitionFor(action, instance.status);
  if (!allowed) throw new Error('Transición no permitida.');
  return { action, eventId, actorUid: actor.uid, actorRole: actor.role, transition: [instance.status, next] };
}

export function applyCommand(instance, command) {
  if (instance.lastEventId === command.eventId) return { ...instance };
  if (instance.status !== command.transition[0]) return { ...instance };
  return { ...instance, status: command.transition[1], lastEventId: command.eventId };
}

export function createInstanceId(taskId, period) {
  if (!taskId || !period) throw new Error('taskId y period son obligatorios.');
  return `${taskId}:${period}`;
}

export function awardPoints(instance, task, beneficiary) {
  if (!instance || instance.pointsAwarded || !['validated', 'adult_done'].includes(instance.status)) return null;
  if (!task || !beneficiary || !Number.isInteger(task.points) || task.points < 0) throw new Error('Premio inválido.');
  return { awardId: `${instance.id}:${beneficiary}`, points: task.points };
}

export function frequencyPeriods(task, dates) {
  if (!task || task.status !== 'active') return [];
  return dates.filter((period) => task.frequency === 'daily' || (task.frequency === 'weekly' && task.days.includes(period.getUTCDay())));
}

export function redemptionId(rewardId, childId, eventId) {
  if (!rewardId || !childId || !eventId) throw new Error('rewardId, childId y eventId son obligatorios.');
  return `${rewardId}:${childId}:${eventId}`;
}
