import assert from 'node:assert/strict';
import {
  sportKind, sportTagLabel, sportsOnDay, sportsCardLine, eventDay, SPORT_TAG_LABEL,
} from './sports.mjs';

assert.equal(sportKind({ deporte: 'hockey', competicion: 'NHL' }), 'hockey');
assert.equal(sportKind({ competicion: 'NHL' }), 'hockey');
assert.equal(sportKind({ evento: 'Detroit Red Wings vs Maple Leafs' }), 'hockey');
assert.equal(sportKind({ deporte: 'Hockey hielo', evento: 'Red Wings' }), 'hockey');
assert.equal(sportTagLabel('hockey'), 'Hockey');
assert.equal(SPORT_TAG_LABEL.hockey, 'Hockey');
assert.notEqual(sportKind({ competicion: 'NHL' }), 'otro');
assert.notEqual(sportTagLabel(sportKind({ competicion: 'NHL' })), 'Deporte');

assert.equal(sportKind({ deporte: 'fútbol', competicion: 'LALIGA' }), 'futbol');
assert.equal(sportKind({ competicion: 'MLB' }), 'beisbol');
assert.equal(sportKind({ competicion: 'NFL' }), 'americano');
assert.equal(sportKind({ competicion: 'NCAA' }), 'americano');
assert.equal(sportKind({ competicion: 'Fórmula 1' }), 'f1');
assert.equal(sportKind({ deporte: 'tenis' }), 'otro');

const payload = {
  date: '2026-09-18',
  events: [
    { evento: 'Detroit Red Wings vs Maple Leafs', hora_madrid: '19:00', competicion: 'NHL' },
    { evento: 'Brewers vs Cubs', hora_madrid: '21:10', date: '2026-09-19' },
  ],
};
assert.equal(eventDay(payload.events[0], payload.date), '2026-09-18');
assert.equal(sportsOnDay(payload, '2026-09-18').length, 1);
assert.equal(sportsOnDay(payload, '2026-09-19')[0].evento, 'Brewers vs Cubs');
assert.equal(sportsOnDay(payload, '2026-09-20').length, 0);
assert.equal(sportsOnDay(null, '2026-09-18').length, 0);
assert.match(sportsCardLine(sportsOnDay(payload, '2026-09-18')), /Red Wings/);
assert.doesNotMatch(sportsCardLine(sportsOnDay(payload, '2026-09-18')), /Brewers/);
assert.equal(sportsCardLine([]), '');

const two = {
  comprobado: '2026-09-21',
  eventos: [
    { evento: 'A vs B', hora_madrid: '21:00' },
    { evento: 'C vs D', hora_madrid: '18:30' },
  ],
};
assert.equal(sportsCardLine(sportsOnDay(two, '2026-09-21')), 'C–D a las 18:30 y A–B a las 21:00');

const night = {
  date: '2026-09-22',
  events: [
    { evento: 'Late A', hora_madrid: '01:05' },
    { evento: 'Dawn B', hora_madrid: '04:30' },
    { evento: 'Ok C', hora_madrid: '10:00' },
    { evento: 'Ok D', hora_madrid: '22:30' },
    { evento: 'Too late', hora_madrid: '22:31' },
    { evento: 'Too early', hora_madrid: '09:59' },
    { evento: 'No hora' },
  ],
};
assert.deepEqual(sportsOnDay(night, '2026-09-22').map((e) => e.evento), ['Ok C', 'Ok D']);
assert.doesNotMatch(sportsCardLine(sportsOnDay(night, '2026-09-22')), /01:05|04:30|22:31|09:59/);

console.log('ok sports');
