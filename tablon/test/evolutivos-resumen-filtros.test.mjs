import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.doesNotMatch(html, /id="today-summary"/, 'el resumen de hoy ya no está en la página');
assert.match(html, /id="task-search"/);
const main = html.slice(html.indexOf('<main'), html.indexOf('</main>') + 7);
const markers = ['<section id="tasks-view"', '<section id="rewards-view"', 'id="management-view"', 'id="task-search"'];
const positions = Object.fromEntries(markers.map((marker) => [marker, main.indexOf(marker)]));
assert.ok(positions['<section id="tasks-view"'] >= 0, 'Tareas debe estar en el contenido principal');
assert.ok(positions['<section id="tasks-view"'] < positions['<section id="rewards-view"'], 'Tareas debe ir antes de Premios');
assert.ok(positions['<section id="rewards-view"'] < positions['id="management-view"'], 'Premios debe ir antes de Gestión');
assert.ok(positions['id="management-view"'] < positions['id="task-search"'], 'Buscar tareas debe ir después de Gestión');
for (const id of ['task-list', 'queue-list', 'reward-list', 'task-search', 'task-form', 'delete-task-form', 'reward-form', 'delete-reward-form']) {
  assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${id} debe ser único`);
}
assert.ok(main.indexOf('id="task-list"') < positions['<section id="rewards-view"'], 'tarjetas de tareas deben preceder a Premios');
assert.ok(main.indexOf('id="reward-list"') < positions['id="management-view"'], 'tarjetas de premios deben preceder a Gestión');
assert.ok(main.indexOf('data-action="show-task-form"') > positions['id="management-view"'], 'acciones de gestión de tareas conectadas');
assert.ok(main.indexOf('data-action="show-reward-form"') > positions['id="management-view"'], 'acciones de gestión de premios conectadas');
assert.match(html, /data-frequency-filter="weekly"/);
assert.match(html, /data-status-filter="waiting"/);
assert.match(html, /sharedLabel='⚽ Nacho · 🌸 Luz'/);
assert.match(html, /frequencyFilter==='all'/);
assert.match(html, /statusFilter==='all'/);
assert.match(html, /normalizedSearch.*title/);
assert.match(html, /weeklyStatus\(t/);
assert.match(html, /outOfDay\|\|/);
assert.match(html, /status==='waiting'\?actionButtons/);
assert.match(html, /id="queue-list"/, 'la cola por validar se conserva');

console.log('evolutivos resumen y filtros: ok');
