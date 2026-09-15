import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

assert.doesNotMatch(html, /id="today-summary"/, 'el resumen de hoy no debe estar en el HTML');
assert.doesNotMatch(html, /Resumen de hoy/, 'no debe mostrarse el bloque Resumen de hoy');
assert.doesNotMatch(html, /id="today-summary-grid"/, 'no debe quedar la rejilla del resumen');
assert.match(html, /id="queue-list"/, 'la cola por validar se conserva');
assert.match(html, /id="nacho-points"/, 'los saldos se conservan');
assert.match(html, /id="reward-list"/, 'los premios se conservan');
assert.match(html, /data-board-day="today"/, 'Hoy/Ayer se conserva');

const start = html.indexOf('const taskIsAvailableToday=');
const end = html.indexOf('const toast=', start);
assert.ok(start > 0 && end > start, 'helpers de cola presentes');
const context = {
  Intl, Date, Object, Set, Number, String, Array,
  boardDay: 'today',
  label: (n) => n,
  weeklyDueToday: (task) => task.frequency !== 'weekly',
};
vm.runInNewContext(
  `${html.slice(start, end)}\nthis.taskUiStatus=taskUiStatus;this.madridDateKey=madridDateKey;this.instanceIsForToday=instanceIsForToday;this.applyInstanceSnapshot=applyInstanceSnapshot;this.validationQueue=validationQueue;this.taskIsAvailableToday=taskIsAvailableToday;`,
  context,
);

const today = '2026-09-15';
const yesterday = '2026-09-14';
const now = new Date('2026-09-15T10:00:00Z');
const yesterdayDate = new Date('2026-09-14T12:00:00Z');
assert.equal(context.madridDateKey(now), today);

const remoteTask = {
  id: 'mochila-nacho',
  title: 'Mochila y ropa preparada',
  icon: '🎒',
  child: 'Nacho',
  points: 10,
  frequency: 'daily',
  catalogStatus: 'active',
  instanceStatus: null,
  status: 'open',
};
const otherTask = {
  id: 'cena-luz',
  title: 'Cenar bien',
  icon: '🍽️',
  child: 'Luz',
  points: 5,
  frequency: 'daily',
  catalogStatus: 'active',
  instanceStatus: null,
  status: 'open',
};

const docs = [
  { id: `${remoteTask.id}:${today}`, data: () => ({ taskId: remoteTask.id, period: today, status: 'child_done' }) },
  { id: `${otherTask.id}:${today}`, data: () => ({ taskId: otherTask.id, period: today, status: 'pending' }) },
  { id: `${remoteTask.id}:${yesterday}`, data: () => ({ taskId: remoteTask.id, period: yesterday, status: 'validated' }) },
];

const todayTasks = context.applyInstanceSnapshot(
  [{ ...remoteTask }, { ...otherTask }],
  docs,
  now,
  now,
);
const todayQueue = context.validationQueue(todayTasks, []);
assert.equal(todayQueue.length, 1, 'hoy: una ficha child_done entra en la cola');
assert.equal(todayQueue[0].id, remoteTask.id);
assert.equal(todayQueue[0].kind, 'task');
assert.equal(context.taskUiStatus(todayTasks[0]), 'waiting', 'el tablero de hoy pinta child_done como pendiente');

const yesterdayTasks = context.applyInstanceSnapshot(
  [{ ...remoteTask }, { ...otherTask }],
  docs,
  yesterdayDate,
  now,
);
const yesterdayQueue = context.validationQueue(yesterdayTasks, []);
assert.ok(
  yesterdayQueue.some((item) => item.id === remoteTask.id && item.kind === 'task'),
  'una ficha de hoy en child_done sigue en la cola aunque el tablero muestre ayer',
);

const rewards = [{ id: 'cine', title: 'Cine', icon: '🎬', child: 'Luz', status: 'pending', cost: 60, requestedAt: 'hoy' }];
assert.equal(context.validationQueue(todayTasks, rewards).length, 2, 'los canjes pendientes siguen en la cola');

console.log('queue child_done regression: ok');
