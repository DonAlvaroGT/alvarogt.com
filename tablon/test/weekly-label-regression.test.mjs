import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('const madridDateParts=');
const end = html.indexOf("const initial=", start);
assert.ok(start >= 0 && end > start, 'helpers semanales presentes');
const helperSource = html.slice(start, end);
const context = { Intl, Date, Object };
vm.runInNewContext(`${helperSource}\nthis.weeklyDueToday=weeklyDueToday;this.weeklyStatus=weeklyStatus;`, context);

const tuesdayMadrid = new Date('2026-09-08T10:00:00Z');
const due = { frequency: 'weekly', days: [2] };
const notDue = { frequency: 'weekly', days: [1] };
assert.equal(context.weeklyDueToday(due, tuesdayMadrid), true, 'semanal del martes corresponde');
assert.equal(context.weeklyStatus(due, tuesdayMadrid), null, 'la semanal de hoy no muestra aviso');
assert.match(context.weeklyStatus(notDue, tuesdayMadrid), /no corresponde a hoy/, 'la semanal fuera de día muestra aviso');

const renderLine = html.match(/let outOfDay=weeklyStatus\(t\);let body=.*?;const people=/)?.[0] || '';
assert.match(renderLine, /outOfDay\|\|/);
assert.match(renderLine, /data-action=.*mark/);
assert.match(html, /if\(action==='mark'&&item&&item\.status==='open'\)/, 'la acción normal sigue siendo marcar hecha');
console.log('weekly label regression: ok');
