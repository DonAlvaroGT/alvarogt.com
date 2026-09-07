export const ADULT_ALLOWLIST = ['agarciatimon@gmail.com', 'luzolivas@gmail.com'];
export const CHILD_ROLE = 'child';

const permissions = {
  adult: new Set(['task.read', 'task.create', 'task.edit', 'task.mark', 'task.validate', 'task.undo', 'points.manage']),
  child: new Set(['task.read', 'task.mark']),
};
export function can(role, permission) { return permissions[role]?.has(permission) === true; }

export function demoTasks() {
  return [
    { id: 'example-breakfast', title: 'Desayuno', icon: '🥣', assignee: 'Luz', frequency: 'daily', days: [], points: 5, requiresValidation: true, status: 'active', example: true, instance: { status: 'pending', pointsAwarded: false } },
    { id: 'example-backpack', title: 'Preparar la mochila', icon: '🎒', assignee: 'Nacho', frequency: 'daily', days: [], points: 5, requiresValidation: true, status: 'active', example: true, instance: { status: 'pending', pointsAwarded: false } },
    { id: 'example-table', title: 'Poner la mesa', icon: '🍴', assignee: 'shared', frequency: 'daily', days: [], points: 8, requiresValidation: true, status: 'active', example: true, instance: { status: 'pending', pointsAwarded: false } },
    { id: 'example-reading', title: 'Lectura', icon: '📖', assignee: 'shared', frequency: 'weekly', days: [0], points: 5, requiresValidation: true, status: 'active', example: true, instance: { status: 'pending', pointsAwarded: false } },
  ];
}

function clone(task) { return { ...task, instance: { ...task.instance } }; }
export function childAction(task, role) {
  if (!can(role, 'task.mark')) throw new Error('No autorizado.');
  if (task.instance.status !== 'pending') return clone(task);
  const next = clone(task);
  next.instance.status = 'child_done';
  return next;
}
export function adultValidate(task) {
  const next = clone(task);
  if (next.instance.status !== 'child_done') throw new Error('Solo se puede validar una tarea marcada por niño.');
  next.instance.status = 'validated';
  return next;
}
export function adultMark(task) {
  const next = clone(task);
  if (next.instance.status !== 'pending') return next;
  next.instance.status = 'adult_done';
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
