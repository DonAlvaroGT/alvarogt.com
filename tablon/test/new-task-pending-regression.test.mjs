import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { awardPoints, applyCommand, commandFor, ADULT_EMAILS } from '../functions/src/backend.contract.mjs';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const source = html;
const backend = await readFile(new URL('../functions/src/index.mjs', import.meta.url), 'utf8');
assert.match(source, /catalogStatus:'active',instanceStatus:null/, 'crear tarea local separa catálogo e instancia');
assert.match(source, /const taskUiStatus=task=>task\.instanceStatus\|\|\(task\.catalogStatus\?'open':task\.status\)/, 'render usa instancia, no status de catálogo');
assert.match(source, /if\(t&&instanceIsForToday\(t,doc\.id\)\)/, 'listener ignora instancias que no son de hoy');
assert.match(source, /catalogStatus:d\.status==='archived'\?'archived':'active',instanceStatus:null/, 'listener deja active en catálogo y pending implícito');
assert.match(backend, /if \(next\.status === 'validated' && !instance\.pointsAwarded\)/, 'solo validar concede puntos');
assert.doesNotMatch(source, /localCatalog[\s\S]{0,500}pointsAwarded/, 'crear catálogo no crea award ni historial');

const task = { id: 'new-task', status: 'active', assignee: 'Nacho', points: 7 };
const pending = { id: 'new-task:2026-09-08', taskId: task.id, status: 'pending', pointsAwarded: false };
const child = { uid: 'child', role: 'child' };
const adult = { uid: 'adult', role: 'adult', email: ADULT_EMAILS[0], emailVerified: true };
const childDone = applyCommand(pending, commandFor('child_done', child, task, pending, 'mark-1'));
assert.equal(childDone.status, 'child_done', 'marcar niño deja child_done pendiente');
const validated = applyCommand(childDone, commandFor('validate_task', adult, task, childDone, 'validate-1'));
assert.equal(validated.status, 'validated', 'validar pasa a validated');
assert.equal(awardPoints(pending, task, 'Nacho'), null, 'crear/pendiente no puntúa');
assert.deepEqual(awardPoints({ ...validated, id: pending.id }, task, 'Nacho'), { awardId: 'new-task:2026-09-08:Nacho', points: 7 });
assert.equal(awardPoints({ ...validated, pointsAwarded: true }, task, 'Nacho'), null, 'validar idempotente no duplica puntos');
console.log('new task pending regression: ok');
