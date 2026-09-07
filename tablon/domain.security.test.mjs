import assert from 'node:assert/strict';
import { can, childAction, adultValidate, adultUndo, adultMark, awardPointsOnce } from './domain.mjs';

const base = {
  id: 'task-1',
  title: 'Tarea',
  assignee: 'Nacho',
  points: 5,
  requiresValidation: false,
  instance: { status: 'pending', pointsAwarded: false },
};

for (const permission of ['task.create', 'task.edit', 'task.validate', 'task.undo', 'points.manage']) {
  assert.equal(can('child', permission), false, `el niño no debe tener ${permission}`);
}
assert.equal(can('child', 'task.mark'), true);
assert.equal(can('adult', 'task.mark'), true);

const childMarked = childAction(base, 'child');
assert.equal(childMarked.instance.status, 'child_done', 'toda marca infantil queda pendiente');
assert.equal(childMarked.instance.pointsAwarded, false);
assert.equal(childAction(childMarked, 'child').instance.status, 'child_done', 'repetir la marca no cambia el estado');
assert.throws(() => adultValidate(base), /Solo se puede validar/);

const validated = adultValidate(childMarked);
assert.equal(validated.instance.status, 'validated');
const awarded = awardPointsOnce(validated);
assert.equal(awarded.awarded, true);
assert.equal(awardPointsOnce(awarded.task).awarded, false, 'el premio es idempotente');
const undone = adultUndo(awarded.task);
assert.equal(undone.instance.status, 'pending');
assert.equal(undone.instance.pointsAwarded, true, 'deshacer no resta puntos acumulativos');
assert.equal(adultMark(base).instance.status, 'adult_done');

console.log('tablon domain security tests: ok');
