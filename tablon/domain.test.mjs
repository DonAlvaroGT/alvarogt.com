import assert from 'node:assert/strict';
import {
  ADULT_ALLOWLIST,
  CHILD_ROLE,
  can,
  awardPointsOnce,
  demoTasks,
  childAction,
  adultValidate,
  adultUndo,
} from './domain.mjs';

assert.deepEqual(ADULT_ALLOWLIST, ['agarciatimon@gmail.com', 'luzolivas@gmail.com']);
assert.equal(CHILD_ROLE, 'child');
assert.equal(can('child', 'task.read'), true);
assert.equal(can('child', 'task.create'), false);
assert.equal(can('child', 'points.manage'), false);
assert.equal(can('adult', 'task.validate'), true);
assert.equal(can('adult', 'task.undo'), true);
assert.equal(can('adult', 'task.create'), true);

const examples = demoTasks();
assert.equal(examples.length, 4);
assert.ok(examples.every((task) => task.example === true));
assert.deepEqual(new Set(examples.map((task) => task.assignee)), new Set(['Nacho', 'Luz', 'shared']));
assert.ok(examples.some((task) => task.frequency === 'daily'));
assert.ok(examples.some((task) => task.frequency === 'weekly'));

const task = { ...examples[0], requiresValidation: true, instance: { status: 'pending', pointsAwarded: false } };
const childDone = childAction(task, 'child');
assert.equal(childDone.instance.status, 'child_done');
assert.equal(childDone.instance.pointsAwarded, false);
const validated = adultValidate(childDone);
assert.equal(validated.instance.status, 'validated');
const firstAward = awardPointsOnce(validated);
assert.equal(firstAward.awarded, true);
assert.equal(awardPointsOnce(firstAward.task).awarded, false);
const undone = adultUndo(firstAward.task);
assert.equal(undone.instance.status, 'pending');
assert.equal(undone.instance.pointsAwarded, true);
console.log('tablon domain tests: ok');
