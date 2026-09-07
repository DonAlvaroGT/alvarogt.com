export const ADULT_ALLOWLIST = ['agarciatimon@gmail.com', 'luzolivas@gmail.com'];
export const CHILD_ROLE = 'child';

const permissions = {
  adult: new Set(['task.read', 'task.create', 'task.edit', 'task.mark', 'task.validate', 'task.undo', 'points.manage']),
  child: new Set(['task.read', 'task.mark']),
};
export function can(role, permission) { return permissions[role]?.has(permission) === true; }

export function demoTasks() {
  return [
    { id: 'example-individual', title: 'EJEMPLO · Guardar juguetes', assignee: 'Nacho', frequency: 'daily', days: [], points: 5, requiresValidation: true, status: 'active', example: true, instance: { status: 'pending', pointsAwarded: false } },
    { id: 'example-shared', title: 'EJEMPLO · Poner la mesa', assignee: 'shared', frequency: 'daily', days: [], points: 8, requiresValidation: true, status: 'active', example: true, instance: { status: 'pending', pointsAwarded: false } },
    { id: 'example-weekly', title: 'EJEMPLO · Ordenar mochila', assignee: 'Luz', frequency: 'weekly', days: [0], points: 10, requiresValidation: true, status: 'active', example: true, instance: { status: 'pending', pointsAwarded: false } },
    { id: 'example-adult', title: 'EJEMPLO · Revisar el tablón', assignee: 'shared', frequency: 'weekly', days: [6], points: 3, requiresValidation: false, status: 'active', example: true, instance: { status: 'pending', pointsAwarded: false } },
  ];
}

function clone(task) { return { ...task, instance: { ...task.instance } }; }
export function childAction(task, role) {
  if (!can(role, 'task.mark')) throw new Error('No autorizado.');
  if (task.instance.status !== 'pending') return clone(task);
  const next = clone(task);
  next.instance.status = next.requiresValidation ? 'child_done' : 'validated';
  return next;
}
export function adultValidate(task) {
  const next = clone(task);
  if (next.instance.status !== 'child_done') throw new Error('Solo se puede validar una tarea marcada por niño.');
  next.instance.status = 'validated';
  return next;
}
export function awardPointsOnce(task) {
  const next = clone(task);
  if (next.instance.pointsAwarded) return { task: next, awarded: false };
  if (!['validated', 'adult_done'].includes(next.instance.status)) return { task: next, awarded: false };
  next.instance.pointsAwarded = true;
  return { task: next, awarded: true };
}
export function adultUndo(task) {
  const next = clone(task);
  next.instance.status = 'pending';
  return next;
}
