import {
  ADULT_EMAILS,
  commandFor,
  applyCommand,
  awardPoints,
  createInstanceId,
  frequencyPeriods,
} from '../../backend.contract.mjs';

export function resolveTrustedActor(auth) {
  const token = auth?.token;
  if (typeof auth?.uid !== 'string' || !token) throw new Error('Actor no autorizado.');
  if (token.email && ADULT_EMAILS.includes(token.email) && token.email_verified === true) {
    return { uid: auth.uid, role: 'adult', email: token.email, emailVerified: true };
  }
  if (token.childRole === 'supervised') return { uid: auth.uid, role: 'child' };
  if (token.email || token.childRole) throw new Error('Actor no autorizado.');
  throw new Error('Actor no autorizado.');
}

function canonicalPayload({ action, task, instance, eventId }) {
  return JSON.stringify({ action, taskId: task?.id, instanceId: instance?.id, eventId });
}

export function executeCommand({ action, actor, task, instance, eventId, store, awards = new Set(), payload }) {
  const key = `${action}:${eventId}`;
  const fingerprint = canonicalPayload({ action, task, instance, eventId });
  const previous = store.get(key);
  if (previous) {
    if (previous.fingerprint !== (payload ?? fingerprint)) throw new Error('eventId reutilizado con payload distinto.');
    return previous.result;
  }
  const command = commandFor(action, actor, task, instance, eventId);
  const next = applyCommand(instance, command);
  const beneficiary = task.assignee || 'shared';
  const award = awardPoints(next, task, beneficiary);
  const result = { ok: true, instance: next, actionId: key, award: award && !awards.has(award.awardId) ? award : null };
  store.set(key, { fingerprint, result });
  return result;
}

export function createPeriodicInstances(tasks, periods) {
  return tasks.flatMap((task) => frequencyPeriods(task, periods.map((period) => new Date(`${period}T00:00:00Z`))).map((date) => ({
    id: createInstanceId(task.id, date.toISOString().slice(0, 10)),
    taskId: task.id,
    period: date.toISOString().slice(0, 10),
    status: 'pending',
    pointsAwarded: false,
  })));
}
