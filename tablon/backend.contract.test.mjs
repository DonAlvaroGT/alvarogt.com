import assert from 'node:assert/strict';
import {
  ADULT_EMAILS,
  authorize,
  commandFor,
  applyCommand,
  createInstanceId,
  awardPoints,
} from './backend.contract.mjs';

const task = { id: 'task-1', status: 'active', assignee: 'Nacho', points: 5, requiresValidation: true };
const instance = { id: 'task-1:2026-09-07', taskId: 'task-1', period: '2026-09-07', status: 'pending', pointsAwarded: false };
const adult = { uid: 'adult-1', role: 'adult', email: ADULT_EMAILS[0], emailVerified: true };
const child = { uid: 'child-shared', role: 'child' };

assert.deepEqual(ADULT_EMAILS, ['agarciatimon@gmail.com', 'luzolivas@gmail.com']);
assert.equal(authorize(adult, 'validate_task'), true);
assert.equal(authorize({ ...adult, emailVerified: false }, 'validate_task'), false);
assert.equal(authorize(child, 'child_done'), true);
assert.equal(authorize(child, 'validate_task'), false);
assert.equal(authorize(child, 'adult_done'), false);

const childCommand = commandFor('child_done', child, task, instance, 'event-child-1');
assert.deepEqual(childCommand.transition, ['pending', 'child_done']);
const childApplied = applyCommand(instance, childCommand);
assert.equal(childApplied.status, 'child_done');
assert.equal(applyCommand(childApplied, childCommand).status, 'child_done', 'replay idempotente');
assert.equal(applyCommand(childApplied, { ...childCommand, eventId: 'event-other' }).status, 'child_done', 'estado repetido no se vuelve a ejecutar');
assert.throws(() => commandFor('child_done', child, { ...task, status: 'archived' }, instance, 'event-archived'), /archivada/);
assert.throws(() => commandFor('child_done', child, task, { ...instance, status: 'child_done' }, 'event-repeat'), /Transición/);

const validated = commandFor('validate_task', adult, task, { ...instance, status: 'child_done' }, 'event-validate-1');
assert.equal(applyCommand({ ...instance, status: 'child_done' }, validated).status, 'validated');
assert.throws(() => commandFor('validate_task', adult, task, instance, 'event-bad'), /Transición/);
assert.equal(commandFor('adult_done', adult, task, instance, 'event-adult-1').transition[1], 'adult_done');
assert.equal(commandFor('undo_done', adult, task, { ...instance, status: 'validated' }, 'event-undo-1').transition[1], 'pending');

assert.equal(createInstanceId(task.id, '2026-09-07'), 'task-1:2026-09-07');
assert.deepEqual(awardPoints({ ...instance, status: 'validated' }, task, 'Nacho'), { awardId: 'task-1:2026-09-07:Nacho', points: 5 });
assert.equal(awardPoints({ ...instance, status: 'validated', pointsAwarded: true }, task, 'Nacho'), null);
assert.equal(awardPoints({ ...instance, status: 'pending' }, task, 'Nacho'), null);

console.log('tablon backend contract tests: ok');
