import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('const madridDateParts=');
const end = html.indexOf("const initial=", start);
assert.ok(start >= 0 && end > start, 'helpers semanales presentes');
const helperSource = html.slice(start, end);
const context = { Intl, Date, Object };
vm.runInNewContext(`${helperSource}\nthis.weeklyDueToday=weeklyDueToday;this.weeklyStatus=weeklyStatus;this.madridWeekday=madridWeekday;`, context);

const tuesdayMadrid = new Date('2026-09-08T10:00:00Z');
const due = { frequency: 'weekly', days: [2], status: 'open' };
const notDue = { frequency: 'weekly', days: [1], status: 'open' };
const formats = [2, '2', [2], '[2]', 'martes', ['martes'], '2, 3'];
for (const days of formats) assert.equal(context.weeklyDueToday({ frequency: 'weekly', days }, tuesdayMadrid), true, `formato ${JSON.stringify(days)} corresponde`);
assert.equal(context.weeklyDueToday({ frequency: 'weekly', days: [1] }, new Date('2026-09-07T21:30:00Z')), true, 'lunes Madrid aunque UTC ya sea lunes tarde');
assert.equal(context.weeklyDueToday({ frequency: 'weekly', days: [2] }, new Date('2026-09-08T20:30:00Z')), true, 'martes Madrid aunque UTC ya sea martes tarde');
for (const day of [0, 1, 2, 3, 4, 5, 6]) {
  const date = new Date(`2026-09-${String(6 + day).padStart(2, '0')}T12:00:00Z`);
  assert.equal(context.weeklyDueToday({ frequency: 'weekly', days: [context.madridWeekday(date)] }, date), true, `día ${day}`);
}
assert.equal(context.weeklyStatus(due, tuesdayMadrid), null, 'la semanal de hoy no muestra aviso');
assert.match(context.weeklyStatus(notDue, tuesdayMadrid), /no corresponde a hoy/, 'la semanal fuera de día muestra aviso');
for (const status of ['waiting', 'done', 'pending', 'child_done', 'validated']) assert.equal(context.weeklyStatus({ frequency: 'weekly', days: [1], status }, tuesdayMadrid), null, `estado ${status} conserva estado real`);

const renderLine = html.match(/(?:let )?outOfDay=weeklyStatus\(t\).*?const people=/)?.[0] || '';
assert.match(renderLine, /outOfDay\|\|/);
assert.match(renderLine, /data-action=.*mark/);
assert.match(html, /if\(action==='mark'&&item&&item\.status==='open'\)/, 'la acción normal sigue siendo marcar hecha');
console.log('weekly label regression: ok');
