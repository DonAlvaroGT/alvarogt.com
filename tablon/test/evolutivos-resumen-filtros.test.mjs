import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /id="today-summary"/);
assert.match(html, /id="task-search"/);
const main = html.slice(html.indexOf('<main'), html.indexOf('</main>') + 7);
const positions = Object.fromEntries(['<section id=\"tasks-view\"','<section id=\"rewards-view\"','id=\"management-view\"','id=\"today-summary\"','id=\"task-search\"'].map(marker => [marker, main.indexOf(marker)]));
assert.ok(positions['<section id=\"tasks-view\"'] >= 0, 'Tareas debe estar en el contenido principal');
assert.ok(positions['<section id=\"tasks-view\"'] < positions['<section id=\"rewards-view\"'], 'Tareas debe ir antes de Premios');
assert.ok(positions['<section id=\"rewards-view\"'] < positions['id=\"management-view\"'], 'Premios debe ir antes de Gestión');
assert.ok(positions['id=\"management-view\"'] < positions['id=\"today-summary\"'], 'Gestión debe ir antes del resumen');
assert.ok(positions['id=\"today-summary\"'] < positions['id=\"task-search\"'], 'Buscar tareas debe ir después del resumen');
for (const id of ['task-list','queue-list','reward-list','today-summary','task-search','task-form','delete-task-form','reward-form','delete-reward-form']) {
  assert.equal((html.match(new RegExp(`id=\"${id}\"`, 'g')) || []).length, 1, `${id} debe ser único`);
}
assert.ok(main.indexOf('id=\"task-list\"') < positions['<section id=\"rewards-view\"'], 'tarjetas de tareas deben preceder a Premios');
assert.ok(main.indexOf('id=\"reward-list\"') < positions['id=\"management-view\"'], 'tarjetas de premios deben preceder a Gestión');
assert.ok(main.indexOf('data-action=\"show-task-form\"') > positions['id=\"management-view\"'], 'acciones de gestión de tareas conectadas');
assert.ok(main.indexOf('data-action=\"show-reward-form\"') > positions['id=\"management-view\"'], 'acciones de gestión de premios conectadas');
assert.match(html, /data-frequency-filter=\"weekly\"/);
assert.match(html, /data-status-filter=\"waiting\"/);
assert.match(html, /sharedLabel='⚽ Nacho · 🌸 Luz'/);
assert.match(html, /frequencyFilter==='all'/);
assert.match(html, /statusFilter==='all'/);
assert.match(html, /normalizedSearch.*title/);
assert.match(html, /weeklyStatus\(t\).*outOfDay\|\|/);
assert.match(html, /status==='waiting'\?actionButtons/);

const start = html.indexOf('const madridDateParts=');
const end = html.indexOf('const toast=', start);
assert.ok(start > 0 && end > start);
class FixedDate extends Date { static now() { return super.parse('2026-09-08T10:00:00Z'); } constructor(value) { super(value === undefined ? '2026-09-08T10:00:00Z' : value); } }
const context = { Intl, Date: FixedDate, Object, Set, Number, String, Array, nowMadrid: () => '08/09/2026 12:00', localStorage: { getItem: () => null, setItem: () => {} }, structuredClone: value => JSON.parse(JSON.stringify(value)) };
vm.runInNewContext(`const key='test',oldKey='old',targetDemoDate='2026-09-08';const localAllowed=()=>false;${html.slice(start, end)}\nthis.todaySummary=todaySummary;`, context);
const tasks = [
  { id: 'daily-nacho', title: 'Mochila', child: 'Nacho', frequency: 'daily', status: 'open' },
  { id: 'shared-weekly', title: 'Bici', child: 'shared', scope: 'shared', frequency: 'weekly', days: [2], status: 'waiting' },
  { id: 'done-luz', title: 'Lectura', child: 'Luz', frequency: 'daily', status: 'done', validatedAt: '2026-09-08T08:00:00Z' },
  { id: 'out-day', title: 'Domingo', child: 'Luz', frequency: 'weekly', days: [0], status: 'open' },
];
const summary = context.todaySummary(tasks, [{ id: 'r', status: 'pending', child: 'Nacho' }], new FixedDate());
assert.equal(summary.available.length, 3, 'excluye semanal fuera de día');
assert.equal(summary.pending[0].child, 'shared');
assert.equal(summary.validated[0].title, 'Lectura');
assert.equal(summary.redemptionPending.length, 1);
console.log('evolutivos resumen y filtros: ok');
