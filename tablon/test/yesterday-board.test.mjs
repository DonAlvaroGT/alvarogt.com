import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import {
  awardPoints,
  applyCommand,
  commandFor,
  createInstanceId,
  resolveBoardPeriod,
  resolveCommandPeriod,
  madridCalendarDate,
  shiftCalendarDate,
  periodKeyForTask,
  ADULT_EMAILS,
} from '../functions/src/backend.contract.mjs';
import { createPeriodicInstances as createFromPure } from '../functions/src/pure.mjs';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const backend = await readFile(new URL('../functions/src/index.mjs', import.meta.url), 'utf8');

assert.match(html, /data-board-day="today"/);
assert.match(html, /data-board-day="yesterday"/);
assert.match(html, /id="mark-all-board"/);
assert.match(html, /id="board-day-banner"/);
assert.match(html, /data-adult-only aria-label="Ver hoy o ayer"/, 'el selector Hoy/Ayer es solo de adultos');
assert.match(html, /Estás viendo las tareas de ayer/);
assert.match(html, /period:'yesterday'/, 'la callable de ayer manda period y no instanceId');
assert.doesNotMatch(html, /instanceId:item\.instanceId/, 'el payload no depende de instanceId');
assert.match(html, /data-action="mark-all-board"/);
assert.match(html, /tablonRemoteCall\('adultDone',item\)/, 'marcar todas llama adultDone por tarea');
assert.match(html, /if\(role!=='adult'&&typeof window\.tablonSetBoardDay/, 'los niños vuelven a hoy');
assert.match(html, /window\.tablonAdult&&typeof window\.tablonBoardDate/, 'el listener de ayer exige adulto');
assert.match(backend, /requestedPeriod/, 'el backend lee period del payload');
assert.match(backend, /resolveCommandPeriod/);
assert.match(backend, /if \(!instanceSnap\.exists\) tx\.create\(instanceRef, \{ \.\.\.instance, \.\.\.instanceWrite \}\);/);

const now = new Date('2026-09-15T10:00:00Z'); // martes en Madrid
assert.equal(madridCalendarDate(now), '2026-09-15');
assert.equal(shiftCalendarDate('2026-09-15', -1), '2026-09-14');
assert.deepEqual(resolveBoardPeriod(undefined, now), { key: '2026-09-15', slot: 'today' });
assert.deepEqual(resolveBoardPeriod('yesterday', now), { key: '2026-09-14', slot: 'yesterday' });
assert.deepEqual(resolveBoardPeriod('2026-09-14', now), { key: '2026-09-14', slot: 'yesterday' });
assert.throws(() => resolveBoardPeriod('2026-09-13', now), /hoy o ayer/);

const adult = { uid: 'adult-1', role: 'adult', email: ADULT_EMAILS[0], emailVerified: true };
const child = { uid: 'child-shared', role: 'child' };
const daily = { id: 'task-1', status: 'active', assignee: 'Nacho', frequency: 'daily', points: 5 };
const weeklyMon = { id: 'task-w', status: 'active', assignee: 'Luz', frequency: 'weekly', days: [1], points: 8 };

const today = resolveCommandPeriod({ actor: adult, task: daily, now });
assert.equal(today.period, '2026-09-15');
assert.equal(today.expectedInstanceId, 'task-1:2026-09-15');
assert.equal(today.slot, 'today');

const yesterday = resolveCommandPeriod({ actor: adult, task: daily, requestedPeriod: 'yesterday', now });
assert.equal(yesterday.period, '2026-09-14');
assert.equal(yesterday.expectedInstanceId, 'task-1:2026-09-14');
assert.notEqual(yesterday.expectedInstanceId, today.expectedInstanceId);

assert.throws(() => resolveCommandPeriod({ actor: child, task: daily, requestedPeriod: 'yesterday', now }), /adulto/);
const childToday = resolveCommandPeriod({ actor: child, task: daily, requestedPeriod: '', now });
assert.equal(childToday.period, '2026-09-15');
assert.throws(() => resolveCommandPeriod({
  actor: adult, task: daily, requestedPeriod: 'yesterday', requestedInstanceId: 'task-1:2026-09-15', now,
}), /periodo actual/);

assert.equal(periodKeyForTask(weeklyMon, '2026-09-14'), '2026-09-14', 'lunes semanal sí tocaba ayer');
assert.throws(() => periodKeyForTask(weeklyMon, '2026-09-15'), /ese día/, 'martes no tocaba la semanal de lunes');
assert.throws(() => resolveCommandPeriod({ actor: adult, task: weeklyMon, requestedPeriod: 'today', now }), /ese día/);
assert.equal(resolveCommandPeriod({ actor: adult, task: weeklyMon, requestedPeriod: 'yesterday', now }).expectedInstanceId, 'task-w:2026-09-14');

const created = createFromPure([daily, weeklyMon], ['2026-09-14']);
assert.deepEqual(created.map((row) => row.id).sort(), ['task-1:2026-09-14', 'task-w:2026-09-14']);
assert.equal(createFromPure([weeklyMon], ['2026-09-15']).length, 0, 'el job no crea la semanal fuera de día');

const yInst = { id: 'task-1:2026-09-14', taskId: 'task-1', period: '2026-09-14', status: 'pending', pointsAwarded: false };
const tInst = { id: 'task-1:2026-09-15', taskId: 'task-1', period: '2026-09-15', status: 'pending', pointsAwarded: false };
const marked = applyCommand(yInst, commandFor('adult_done', adult, daily, yInst, 'y-mark'));
assert.equal(marked.status, 'adult_done');
assert.equal(awardPoints(marked, daily, 'Nacho'), null, 'marcar ayer no puntúa');
const validated = applyCommand(marked, commandFor('validate_task', adult, daily, marked, 'y-val'));
assert.equal(validated.status, 'validated');
assert.deepEqual(awardPoints(validated, daily, 'Nacho'), { awardId: 'task-1:2026-09-14:Nacho', points: 5 });
assert.equal(awardPoints({ ...validated, pointsAwarded: true }, daily, 'Nacho'), null, 'validar ayer no duplica');
assert.equal(awardPoints({ ...tInst, status: 'validated' }, daily, 'Nacho').awardId, 'task-1:2026-09-15:Nacho');
assert.notEqual(awardPoints(validated, daily, 'Nacho').awardId, 'task-1:2026-09-15:Nacho', 'los puntos de ayer no van a hoy');

const rejected = applyCommand(marked, commandFor('undo_done', adult, daily, marked, 'y-rej'));
assert.equal(rejected.status, 'pending', 'rechazar ayer vuelve a abierta');

const start = html.indexOf('const madridDateKey=');
const end = html.indexOf('const toast=', start);
assert.ok(start > 0 && end > start, 'helpers de día presentes');
const context = { Intl, Date, Object, Set, Number, String, Array, boardDay: 'today', taskIsAvailableToday: (task, date) => task.frequency !== 'weekly' };
vm.runInNewContext(`${html.slice(start, end)}\nthis.madridDateKey=madridDateKey;this.shiftMadridDate=shiftMadridDate;this.yesterdayMadridKey=yesterdayMadridKey;this.instanceIsForToday=instanceIsForToday;this.boardDate=boardDate;`, context);
assert.equal(context.yesterdayMadridKey(now), '2026-09-14');
assert.equal(context.instanceIsForToday(daily, 'task-1:2026-09-15', now), true);
assert.equal(context.instanceIsForToday(daily, 'task-1:2026-09-14', now), false, 'hoy no pinta la instancia de ayer');
assert.equal(context.instanceIsForToday(daily, 'task-1:2026-09-14', new Date('2026-09-14T12:00:00Z')), true);
assert.equal(createInstanceId(daily.id, '2026-09-14'), 'task-1:2026-09-14');

console.log('yesterday board tests: ok');
