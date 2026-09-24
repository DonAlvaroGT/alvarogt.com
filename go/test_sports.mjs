import assert from 'node:assert/strict';
import {
  sportKind, sportTagLabel, sportsOnDay, sportsCardLine, eventDay, SPORT_TAG_LABEL,
  sportText, sportTitle, sportFuente, sportsLine, sportsPaint,
} from './sports.mjs';
import { DEFAULT_FAVS, isHouseFav } from './favoritos.mjs';

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

assert.equal(sportText(undefined), '');
assert.equal(sportText(null), '');
assert.equal(sportText(''), '');
assert.equal(sportText('  '), '');
assert.equal(sportText('undefined'), '');
assert.equal(sportText('null'), '');
assert.equal(sportText('LALIGA'), 'LALIGA');
assert.equal(sportTitle({ partido: 'Brewers vs Cubs' }), 'Brewers vs Cubs');
assert.equal(sportTitle({ evento: 'GP Bakú' }), 'GP Bakú');
assert.equal(sportTitle({ partido: 'A vs B', evento: 'otro' }), 'A vs B');
assert.equal(sportTitle({ evento: undefined, partido: 'Miami Dolphins vs Bills' }), 'Miami Dolphins vs Bills');
assert.equal(sportTitle({}), '');
assert.equal(sportTitle({ evento: undefined, competicion: undefined, fuente: undefined }), '');
assert.equal(sportFuente({ fuente: undefined }), '');
assert.equal(sportFuente({ fuente: 'undefined' }), '');
assert.equal(sportFuente({ fuente: 'https://www.mlb.com' }), 'https://www.mlb.com');
assert.equal(sportFuente({ fuente: 'dazn://live' }), '');
assert.equal(sportsLine({ partido: 'Brewers vs Cubs', hora_madrid: '21:10' }), 'Brewers–Cubs a las 21:10');
assert.equal(sportsLine({ evento: undefined, hora_madrid: '21:10' }), '');
assert.equal(sportKind({ partido: 'Detroit Red Wings vs Maple Leafs' }), 'hockey');
assert.equal(sportKind({ partido: 'Milwaukee Brewers vs Cubs' }), 'otro');
assert.equal(sportKind({ deporte: 'MLB', partido: 'Brewers vs Cubs' }), 'beisbol');

const paint = sportsPaint({ partido: 'Elche CF vs Real Madrid', hora_madrid: '21:30' });
assert.equal(paint.title, 'Elche CF vs Real Madrid');
assert.equal(paint.fuente, '');
assert.equal(paint.competicion, '');
assert.doesNotMatch(JSON.stringify(paint), /undefined/);
const paintOld = sportsPaint({
  evento: 'Elche CF vs Real Madrid',
  competicion: 'LALIGA EA SPORTS',
  fuente: 'https://www.laliga.com/',
});
assert.equal(paintOld.title, 'Elche CF vs Real Madrid');
assert.equal(paintOld.competicion, 'LALIGA EA SPORTS');
assert.equal(paintOld.fuente, 'https://www.laliga.com/');

const weekPartido = {
  date: '2026-09-24',
  events: [{ partido: 'Brewers vs Cubs', hora_madrid: '21:10', date: '2026-09-24' }],
};
assert.match(sportsCardLine(sportsOnDay(weekPartido, '2026-09-24')), /Brewers–Cubs/);
assert.doesNotMatch(sportsCardLine(sportsOnDay(weekPartido, '2026-09-24')), /undefined/);
assert.equal(isHouseFav(sportTitle({ partido: 'Elche CF vs Real Madrid' }), DEFAULT_FAVS), true);
assert.equal(isHouseFav(sportTitle({ evento: undefined, partido: 'Milwaukee Brewers at Cubs' }), DEFAULT_FAVS), true);
assert.equal(isHouseFav(sportTitle({ evento: undefined }), DEFAULT_FAVS), false);

console.log('ok sports');
