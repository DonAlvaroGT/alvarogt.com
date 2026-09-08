import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /id="today-summary"/);
assert.match(html, /id="task-search"/);
const taskView = html.slice(html.indexOf('<section id="tasks-view"'), html.indexOf('<section id="rewards-view"'));
const taskListPosition = taskView.indexOf('id="task-list"');
const adultToolsPosition = taskView.indexOf('data-action="show-task-form"');
const summaryPosition = taskView.indexOf('id="today-summary"');
const searchPosition = taskView.indexOf('id="task-search"');
assert.ok(taskListPosition >= 0 && adultToolsPosition > taskListPosition, 'las tarjetas y acciones principales deben estar presentes');
assert.ok(summaryPosition > adultToolsPosition, 'Resumen de hoy debe quedar después del bloque principal de tareas');
assert.ok(searchPosition > summaryPosition, 'Buscar tareas debe quedar después de Resumen de hoy');
assert.equal((html.match(/id="today-summary"/g) || []).length, 1, 'Resumen de hoy no se duplica');
assert.equal((html.match(/id="task-search"/g) || []).length, 1, 'Buscar tareas no se duplica');
assert.match(html, /data-frequency-filter="weekly"/);
assert.match(html, /data-status-filter="waiting"/);
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
