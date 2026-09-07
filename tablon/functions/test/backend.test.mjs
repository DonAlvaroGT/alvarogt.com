import assert from 'node:assert/strict';
import {
  executeCommand,
  createPeriodicInstances,
  resolveTrustedActor,
} from '../src/pure.mjs';

const adultAuth = { uid: 'adult-1', token: { email: 'agarciatimon@gmail.com', email_verified: true } };
const childAuth = { uid: 'child-shared', token: { childRole: 'supervised' } };
const task = { id: 'task-1', status: 'active', assignee: 'Nacho', frequency: 'daily', points: 5 };
const instance = { id: 'task-1:2026-09-07', taskId: 'task-1', period: '2026-09-07', status: 'pending', pointsAwarded: false };

assert.deepEqual(resolveTrustedActor(adultAuth), { uid: 'adult-1', role: 'adult', email: 'agarciatimon@gmail.com', emailVerified: true });
assert.deepEqual(resolveTrustedActor(childAuth), { uid: 'child-shared', role: 'child' });
assert.throws(() => resolveTrustedActor({ uid: 'x', token: { email: 'other@example.com', email_verified: true } }), /no autorizado/);
assert.throws(() => resolveTrustedActor({ uid: 'x', token: { childRole: 'child' } }), /autorizad/);

const store = new Map();
const child = executeCommand({ action: 'child_done', actor: resolveTrustedActor(childAuth), task, instance, eventId: 'evt-1', store });
assert.equal(child.instance.status, 'child_done');
assert.equal(child.award, null);
assert.deepEqual(executeCommand({ action: 'child_done', actor: resolveTrustedActor(childAuth), task, instance, eventId: 'evt-1', store }), child, 'replay devuelve el resultado original');
assert.throws(() => executeCommand({ action: 'child_done', actor: resolveTrustedActor(childAuth), task, instance, eventId: 'evt-1', store, payload: { instanceId: 'otro' } }), /payload distinto/);
assert.throws(() => executeCommand({ action: 'child_done', actor: resolveTrustedActor(childAuth), task: { ...task, status: 'archived' }, instance, eventId: 'evt-2', store }), /archivada/);
assert.throws(() => executeCommand({ action: 'validate_task', actor: resolveTrustedActor(adultAuth), task, instance, eventId: 'evt-3', store }), /Transición/);

const validated = executeCommand({ action: 'validate_task', actor: resolveTrustedActor(adultAuth), task, instance: { ...instance, status: 'child_done' }, eventId: 'evt-4', store });
assert.equal(validated.instance.status, 'validated');
assert.deepEqual(validated.award, { awardId: 'task-1:2026-09-07:Nacho', points: 5 });
const duplicateAward = executeCommand({ action: 'validate_task', actor: resolveTrustedActor(adultAuth), task, instance: { ...instance, status: 'child_done' }, eventId: 'evt-5', store: new Map(), awards: new Set([validated.award.awardId]) });
assert.equal(duplicateAward.award, null, 'el premio no se duplica');
assert.throws(() => executeCommand({ action: 'adult_done', actor: resolveTrustedActor(childAuth), task, instance, eventId: 'evt-6', store }), /no autorizado/);

assert.deepEqual(createPeriodicInstances([task], ['2026-09-07']), [{ id: 'task-1:2026-09-07', taskId: 'task-1', period: '2026-09-07', status: 'pending', pointsAwarded: false }]);
assert.deepEqual(createPeriodicInstances([{ ...task, status: 'archived' }], ['2026-09-07']), []);

console.log('functions backend tests: ok');
