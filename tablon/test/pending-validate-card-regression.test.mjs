import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /tablon-build: 20260923a-pending-validate/, 'marcador de cache-bust del cambio');
assert.match(html, /\.task\.pending-validate\{[^}]*grid-column:1\/-1/, 'la ficha pendiente ocupa toda la fila');
assert.match(html, /\.task\.pending-validate\{[^}]*background:#6c4dff/, 'el estado pendiente usa otro color, no naranja/rosa');
assert.match(html, /status==='waiting'\?' pending-validate':'/, 'solo el estado pendiente de validar agranda la ficha');
assert.match(html, /data-pending-validate="\$\{status==='waiting'\?'1':'0'\}"/, 'el atributo de estado pendiente queda en la ficha');
assert.match(html, /status==='waiting'\?actionButtons/, 'Validar/Rechazar siguen en la ficha pendiente');
assert.match(html, /\.task\.pending-validate \.child-nacho\{color:var\(--nacho\)\}/, 'Nacho naranja se conserva en el nombre/icono');
assert.match(html, /\.task\.pending-validate \.child-luz\{color:var\(--luz\)\}/, 'Luz rosa se conserva en el nombre/icono');
assert.match(html, /--nacho:#f47b20/, 'el naranja de Nacho no se toca');
assert.match(html, /--luz:#d85c9b/, 'el rosa de Luz no se toca');
assert.doesNotMatch(html, /Marcada el/, 'no se pinta «Marcada el»');
assert.doesNotMatch(html, /Molletito/, 'Molletito no entra en el tablón');
assert.doesNotMatch(html, /data-filter="Molletito"/, 'no hay filtro de Molletito');
assert.match(html, /assignee','in',\[\'Nacho','Luz','shared'\]/, 'el listener no pide a Molletito');
assert.equal((html.match(/data-view="/g) || []).length, 2, 'no hay pestaña nueva');
assert.match(html, /data-view="tasks"/);
assert.match(html, /data-view="rewards"/);
assert.match(html, /data-board-day="today"/, 'Hoy se conserva');
assert.match(html, /data-board-day="yesterday"/, 'Ayer se conserva');
assert.match(html, /id="reward-list"/, 'premios se conservan');
assert.match(html, /id="queue-list"/, 'la cola de adultos se conserva');
assert.match(html, /validationQueue\(state\.tasks,state\.rewards\)/, 'la cola sigue mezclando tareas y canjes');
assert.match(html, /tablonRemoteCall\('validateTask',item\)/, 'validar sigue yendo al servidor');
assert.match(html, /if \(next\.status === 'validated' && !instance\.pointsAwarded\)|owners\.forEach\(n=>state\.children\[n\]\.points\+=item\.points\)/, 'puntos solo al validar en local');

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
  `${html.slice(start, end)}\nthis.taskUiStatus=taskUiStatus;this.madridDateKey=madridDateKey;this.instanceIsForToday=instanceIsForToday;this.applyInstanceSnapshot=applyInstanceSnapshot;this.validationQueue=validationQueue;this.taskIsAvailableToday=taskIsAvailableToday;this.instanceUiStatus=instanceUiStatus;`,
  context,
);

assert.equal(context.instanceUiStatus('child_done'), 'waiting');
assert.equal(context.instanceUiStatus('adult_done'), 'waiting');
assert.equal(context.instanceUiStatus('pending'), 'open');
assert.equal(context.instanceUiStatus('validated'), 'done');

const now = new Date('2026-09-15T10:00:00Z');
const nacho = { id: 'mochila-nacho', title: 'Mochila', icon: '🎒', child: 'Nacho', points: 10, frequency: 'daily', catalogStatus: 'active', instanceStatus: null, status: 'open' };
const luz = { id: 'desayuno-luz', title: 'Desayuno', icon: '🥣', child: 'Luz', points: 5, frequency: 'daily', catalogStatus: 'active', instanceStatus: null, status: 'open' };
const docs = [
  { id: `${nacho.id}:2026-09-15`, data: () => ({ taskId: nacho.id, period: '2026-09-15', status: 'child_done' }) },
  { id: `${luz.id}:2026-09-15`, data: () => ({ taskId: luz.id, period: '2026-09-15', status: 'pending' }) },
];
const tasks = context.applyInstanceSnapshot([{ ...nacho }, { ...luz }], docs, now, now);
assert.equal(context.taskUiStatus(tasks[0]), 'waiting', 'la marcada por el niño queda pendiente de validar');
assert.equal(context.taskUiStatus(tasks[1]), 'open', 'el resto de fichas sigue disponible');
const queue = context.validationQueue(tasks, []);
assert.equal(queue.length, 1, 'la cola de adultos no se rompe');
assert.equal(queue[0].id, nacho.id);
assert.equal(queue[0].kind, 'task');

const main = html.slice(html.indexOf('<main'), html.indexOf('</main>') + 7);
assert.ok(main.indexOf('data-board-day="today"') < main.indexOf('id="task-list"'), 'Hoy/Ayer van antes del tablero');
assert.ok(main.indexOf('id="task-list"') < main.indexOf('id="queue-list"'), 'el tablero va antes de la cola');
assert.ok(main.indexOf('id="queue-list"') < main.indexOf('<section id="rewards-view"'), 'la cola queda en Tareas, no en Premios');

console.log('pending validate card regression: ok');
