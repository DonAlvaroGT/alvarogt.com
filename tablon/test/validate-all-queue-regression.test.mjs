import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /tablon-build: 20260923b-validate-all/, 'marcador de cache-bust del cambio');
assert.match(html, /id="validate-all-queue"/, 'el botón Validar todo está en el HTML');
assert.match(html, />✅ Validar todo</, 'el texto del botón es Validar todo');
assert.match(html, /data-action="validate-all-queue"/, 'un toque dispara validate-all-queue');
assert.match(html, /id="validate-all-queue"[^>]*data-adult-only/, 'solo adultos ven el botón');
assert.match(html, /Cola por validar[\s\S]{0,280}id="validate-all-queue"/, 'el botón vive en la cola por validar');
assert.match(html, /if\(b\.dataset\.action==='validate-all-queue'\)\{if\(!window\.tablonAdult\)/, 'el clic exige adulto');
assert.match(html, /const queues=validationQueue\(state\.tasks,state\.rewards\)/, 'valida la cola visible, no otra lista');
assert.match(html, /window\.tablonVisibleQueue=validationQueue/, 'queda escrito que la cola visible es validationQueue');
assert.match(html, /q\.kind==='task'\?'validateTask':'validateRedemption'/, 'si hay canjes en esa cola, también se validan');
assert.match(html, /function applyLocalValidateAll\(queues\)/, 'el modo local recorre la misma cola');
assert.match(html, /validateAllQueue\.hidden=!window\.tablonAdult\|\|!queues\.length/, 'niños no ven el botón; vacío se oculta');
assert.match(html, /tablonRemoteCall\('validateTask',item\)/, 'Validar suelto sigue yendo al servidor');
assert.match(html, /tablonRemoteCall\('rejectTask',item\)/, 'Rechazar sigue igual');
assert.match(html, /\.task\.pending-validate\{[^}]*background:#6c4dff/, 'ficha gorda/violeta se conserva');
assert.match(html, /data-board-day="today"/, 'Hoy se conserva');
assert.match(html, /data-board-day="yesterday"/, 'Ayer se conserva');
assert.doesNotMatch(html, /Molletito/, 'Molletito no entra');
assert.match(html, /data-filter="Nacho"/, 'Nacho se conserva');
assert.match(html, /data-filter="Luz"/, 'Luz se conserva');
assert.equal((html.match(/data-view="/g) || []).length, 2, 'no hay pestaña nueva');

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
  `${html.slice(start, end)}\nthis.taskUiStatus=taskUiStatus;this.applyInstanceSnapshot=applyInstanceSnapshot;this.validationQueue=validationQueue;this.instanceUiStatus=instanceUiStatus;`,
  context,
);

const now = new Date('2026-09-15T10:00:00Z');
const nacho = { id: 'mochila-nacho', title: 'Mochila', icon: '🎒', child: 'Nacho', points: 10, frequency: 'daily', catalogStatus: 'active', instanceStatus: null, status: 'open' };
const luz = { id: 'desayuno-luz', title: 'Desayuno', icon: '🥣', child: 'Luz', points: 5, frequency: 'daily', catalogStatus: 'active', instanceStatus: null, status: 'open' };
const docs = [
  { id: `${nacho.id}:2026-09-15`, data: () => ({ taskId: nacho.id, period: '2026-09-15', status: 'child_done' }) },
  { id: `${luz.id}:2026-09-15`, data: () => ({ taskId: luz.id, period: '2026-09-15', status: 'pending' }) },
];
const tasks = context.applyInstanceSnapshot([{ ...nacho }, { ...luz }], docs, now, now);
const rewards = [{ id: 'cine', title: 'Cine', icon: '🎬', child: 'Luz', status: 'pending', cost: 60, requestedAt: 'hoy' }];
const queue = context.validationQueue(tasks, rewards);
assert.equal(queue.length, 2, 'la cola visible mezcla la tarea pendiente y el canje');
assert.ok(queue.some((q) => q.kind === 'task' && q.id === nacho.id));
assert.ok(queue.some((q) => q.kind === 'reward' && q.id === 'cine'));

const local = {
  children: { Nacho: { points: 95 }, Luz: { points: 120 } },
  tasks: [
    { id: 'mochila-nacho', child: 'Nacho', points: 10, status: 'waiting' },
    { id: 'desayuno-luz', child: 'Luz', points: 5, status: 'open' },
  ],
  rewards: [{ id: 'cine', child: 'Luz', cost: 60, status: 'pending', repeatable: true, title: 'Cine' }],
  history: [],
};
const helperStart = html.indexOf('function applyLocalValidateAll');
const helperEnd = html.indexOf('function find(', helperStart);
const localCtx = {
  state: local,
  find: (kind, id) => (kind === 'task' ? local.tasks.find((x) => x.id === id) : local.rewards.find((x) => x.id === id)),
  todayMadrid: () => '15/09/2026',
};
vm.runInNewContext(`${html.slice(helperStart, helperEnd)}\nthis.applyLocalValidateAll=applyLocalValidateAll;`, localCtx);
localCtx.applyLocalValidateAll(queue);
assert.equal(local.tasks[0].status, 'done', 'la tarea de la cola queda validada');
assert.equal(local.tasks[1].status, 'open', 'la que no está en la cola no se toca');
assert.equal(local.children.Nacho.points, 105, 'puntos de tarea solo al validar');
assert.equal(local.children.Luz.points, 60, 'el canje de la misma cola gasta puntos al validar');
assert.equal(local.rewards[0].status, 'available', 'canje repetible vuelve a disponible');

console.log('validate all queue regression: ok');
