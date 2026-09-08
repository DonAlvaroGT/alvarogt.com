import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { awardPoints, commandFor, ADULT_EMAILS } from '../functions/src/backend.contract.mjs';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const adult = { uid: 'adult-1', role: 'adult', email: ADULT_EMAILS[0], emailVerified: true };
const task = { id: 'task-1', status: 'active', assignee: 'Nacho', points: 10 };
const pending = { id: 'task-1:2026-09-07', taskId: 'task-1', status: 'pending', pointsAwarded: false };

assert.match(html, /const doneFunction=window\.tablonAdult\?'adultDone':'childDone'/, 'el botón debe seleccionar adultDone solo con rol adulto');
assert.match(html, /tablonRemoteCall\(doneFunction,item\)/, 'la llamada debe enviar la tarea al servidor');
assert.doesNotMatch(html, /La tarea todavía no tiene instancia diaria/, 'el navegador no debe bloquear si falta instanceId');
assert.doesNotMatch(html, /instanceId:item\.instanceId/, 'el payload no debe depender de instanceId');
const source = await readFile(new URL('../functions/src/index.mjs', import.meta.url), 'utf8');
assert.match(source, /periodForTask\(task\)/, 'el backend resuelve el periodo en Madrid');
assert.match(source, /if \(!instanceSnap\.exists\) tx\.create\(instanceRef, \{ \.\.\.instance, \.\.\.instanceWrite \}\);/, 'el backend crea la instancia nueva una sola vez');
assert.doesNotMatch(source, /if \(!instanceSnap\.exists\) tx\.create\(instanceRef, instance\)[\s\S]{0,500}tx\.update\(instanceRef,/, 'no se actualiza una instancia recién creada en la misma transacción');
assert.match(source, /tx\.getAll\(instanceRef\)/, 'la instancia se lee con getAll');
assert.match(source, /tx\.getAll\(balanceRef, rewardRef\)/, 'las lecturas de transacción no usan Promise\.all');
assert.doesNotMatch(source, /Promise\.all\(\[tx\.get/, 'no hay Promise\.all de lecturas tx');
assert.doesNotMatch(source, /instanceId, action, actorUid/, 'el evento no debe usar una variable inexistente');
assert.match(source, /instanceId: expectedInstanceId, action, actorUid/, 'el evento debe guardar la instancia resuelta');
assert.deepEqual(commandFor('adult_done', adult, task, pending, 'adult-event').transition, ['pending', 'adult_done']);
assert.equal(awardPoints({ ...pending, status: 'adult_done' }, task, 'Nacho'), null, 'adultDone no puede puntuar antes de validar');
assert.deepEqual(commandFor('validate_task', adult, task, { ...pending, status: 'adult_done' }, 'validate-event').transition, ['adult_done', 'validated']);
console.log('adult done regression: ok');
