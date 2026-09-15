import { isAdult, srcFor, tabFromPath, VIEWS, ALLOWED, showGate, showShell, showView } from './app.js';
import assert from 'node:assert/strict';
import test from 'node:test';

test('solo adultos de casa', () => {
  assert.equal(isAdult('agarciatimon@gmail.com'), true);
  assert.equal(isAdult('LUZOLIVAS@gmail.com'), true);
  assert.equal(isAdult('alvarogt@alvarogt.com'), false);
  assert.equal(isAdult('isabelgarciatimon@gmail.com'), false);
  assert.equal(isAdult(''), false);
  assert.deepEqual(ALLOWED, ['agarciatimon@gmail.com', 'luzolivas@gmail.com']);
});

test('un iframe, tres destinos', () => {
  assert.equal(srcFor('go'), '/go/');
  assert.equal(srcFor('tablon'), '/tablon/');
  assert.equal(srcFor('viajes'), '/viajes/');
  assert.equal(srcFor('nope'), '/go/');
  assert.deepEqual(VIEWS, { go: '/go/', tablon: '/tablon/', viajes: '/viajes/' });
});

test('la barra sigue el path del iframe', () => {
  assert.equal(tabFromPath('/go/'), 'go');
  assert.equal(tabFromPath('/tablon/premiosganados/'), 'tablon');
  assert.equal(tabFromPath('/viajes/'), 'viajes');
});

function el(init = {}) {
  const attrs = { ...(init.attrs || {}) };
  const dataset = { ...(init.dataset || {}) };
  return {
    hidden: !!init.hidden,
    src: init.src || '',
    textContent: init.textContent || '',
    dataset,
    children: init.children || [],
    getAttribute(name) { return Object.hasOwn(attrs, name) ? attrs[name] : null; },
    setAttribute(name, value) {
      attrs[name] = String(value);
      if (name === 'src') this.src = String(value);
      if (name.startsWith('data-')) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        dataset[key] = String(value);
      }
    },
    removeAttribute(name) {
      delete attrs[name];
      if (name === 'src') this.src = '';
    },
    querySelector(sel) {
      if (sel === 'button[aria-selected="true"]') {
        return this.children.find((c) => c.getAttribute('aria-selected') === 'true') || null;
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel === 'button' || sel === '#tabs button') return this.children;
      return [];
    },
    addEventListener() {},
    closest() { return this; }
  };
}

function mockDom() {
  const gate = el();
  const shell = el({ hidden: true });
  const frame = el();
  const status = el({ textContent: '' });
  const go = el({ dataset: { view: 'go' }, attrs: { 'aria-selected': 'true', 'data-view': 'go' } });
  go.dataset.view = 'go';
  const tablon = el({ dataset: { view: 'tablon' }, attrs: { 'aria-selected': 'false', 'data-view': 'tablon' } });
  tablon.dataset.view = 'tablon';
  const viajes = el({ dataset: { view: 'viajes' }, attrs: { 'aria-selected': 'false', 'data-view': 'viajes' } });
  viajes.dataset.view = 'viajes';
  const tabs = el({ children: [go, tablon, viajes] });
  const nodes = {
    '#gate': gate,
    '#shell': shell,
    '#view': frame,
    '#google-status': status,
    '#tabs': tabs,
    '#tabs button[aria-selected="true"]': go
  };
  globalThis.document = {
    querySelector(sel) { return nodes[sel] || null; },
    querySelectorAll(sel) {
      if (sel === '#tabs button') return tabs.children;
      return [];
    }
  };
  return { gate, shell, frame, status, go, tablon, viajes };
}

test('sin login no hay iframe ni barra', () => {
  const d = mockDom();
  showGate('Sin sesión');
  assert.equal(d.gate.hidden, false);
  assert.equal(d.shell.hidden, true);
  assert.equal(d.frame.src, 'about:blank');
  assert.equal(d.status.textContent, 'Sin sesión');
});

test('tras adulto: shell, iframe en /go/, la barra cambia la vista', () => {
  const d = mockDom();
  showGate();
  assert.equal(d.shell.hidden, true);
  showShell();
  assert.equal(d.gate.hidden, true);
  assert.equal(d.shell.hidden, false);
  assert.equal(d.frame.src, '/go/');
  assert.equal(d.frame.getAttribute('data-casa-view'), 'go');
  assert.equal(d.go.getAttribute('aria-selected'), 'true');
  showView('tablon');
  assert.equal(d.frame.src, '/tablon/');
  assert.equal(d.tablon.getAttribute('aria-selected'), 'true');
  assert.equal(d.go.getAttribute('aria-selected'), 'false');
  showView('viajes');
  assert.equal(d.frame.src, '/viajes/');
  assert.equal(d.viajes.getAttribute('aria-selected'), 'true');
});
