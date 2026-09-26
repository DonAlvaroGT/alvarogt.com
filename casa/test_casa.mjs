import {
  isAdult, srcFor, tabFromPath, VIEWS, ALLOWED,
  showGate, showShell, showView,
  showExpiredOverlay, hideExpiredOverlay,
  isFrameDead, resumeActiveIfDead, reloadView,
  lastAdultHint, rememberAdult, HINT_KEY, googleParams, isStandaloneDisplay,
  lastTab, rememberTab, TAB_KEY, TAB_NAMES,
  queueHasPending, setTablonQueueDot, readTablonQueueFromFrame, refreshTablonQueueDot,
  setViajesTripDot, readTripSoonFromGoFrame, refreshViajesTripDot, applyViajesHoy,
  goHasInteres5, setGoHotDot, readGoHotFromFrame, refreshGoHotDot
} from './app.js';
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

test('tres destinos, sin precarga', () => {
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
  const classSet = new Set(String(init.className || '').split(/\s+/).filter(Boolean));
  const node = {
    hidden: !!init.hidden,
    src: init.src || '',
    textContent: init.textContent || '',
    className: init.className || '',
    dataset,
    children: init.children || [],
    style: init.style || { display: '', height: '' },
    contentWindow: init.contentWindow || null,
    contentDocument: init.contentDocument || null,
    classList: {
      toggle(name, force) {
        if (force === true) classSet.add(name);
        else if (force === false) classSet.delete(name);
        else if (classSet.has(name)) classSet.delete(name);
        else classSet.add(name);
        return classSet.has(name);
      },
      contains(name) { return classSet.has(name); }
    },
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
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    querySelector(sel) {
      if (sel === 'button[aria-selected="true"]') {
        return this.children.find((c) => c.getAttribute('aria-selected') === 'true') || null;
      }
      if (sel === '.tab-dot') {
        return this.children.find((c) => c.className === 'tab-dot') || null;
      }
      const view = sel.match(/^iframe\[data-casa-view="([^"]+)"\]$/);
      if (view) {
        return this.children.find((c) => c.getAttribute('data-casa-view') === view[1]) || null;
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel === 'button' || sel === '#tabs button') return this.children;
      if (sel === 'iframe') return this.children;
      if (sel === '.queue-item') return this.children.filter((c) => c.className === 'queue-item');
      return [];
    },
    addEventListener() {},
    closest() { return this; }
  };
  return node;
}

function mockDom(opts = {}) {
  if (!opts.keepTab) {
    const store = {};
    globalThis.localStorage = {
      getItem(k) { return Object.hasOwn(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); }
    };
  }
  const gate = el();
  const shell = el({ hidden: true });
  const scroller = el({ children: [] });
  const overlay = el({ hidden: true });
  const status = el({ textContent: '' });
  const goDot = el({ hidden: true, className: 'tab-dot' });
  const go = el({ dataset: { view: 'go' }, attrs: { 'aria-selected': 'true', 'data-view': 'go' }, children: [goDot] });
  go.dataset.view = 'go';
  const tabDot = el({ hidden: true, className: 'tab-dot' });
  const tablon = el({ dataset: { view: 'tablon' }, attrs: { 'aria-selected': 'false', 'data-view': 'tablon' }, children: [tabDot] });
  tablon.dataset.view = 'tablon';
  const viajesDot = el({ hidden: true, className: 'tab-dot' });
  const viajes = el({ dataset: { view: 'viajes' }, attrs: { 'aria-selected': 'false', 'data-view': 'viajes' }, children: [viajesDot] });
  viajes.dataset.view = 'viajes';
  const tabs = el({ children: [go, tablon, viajes] });
  const nodes = {
    '#gate': gate,
    '#shell': shell,
    '#scroller': scroller,
    '#session-overlay': overlay,
    '#google-status': status,
    '#tabs': tabs,
    '#tabs button[aria-selected="true"]': go,
    '#tabs button[data-view="go"]': go,
    '#tabs button[data-view="tablon"]': tablon,
    '#tabs button[data-view="viajes"]': viajes
  };
  globalThis.document = {
    createElement(tag) {
      const node = el({ style: { display: 'none', height: '' } });
      node.tagName = String(tag || '').toUpperCase();
      return node;
    },
    querySelector(sel) { return nodes[sel] || null; },
    querySelectorAll(sel) {
      if (sel === '#tabs button') return tabs.children;
      if (sel === '#scroller iframe') return scroller.children;
      return [];
    },
    visibilityState: 'visible'
  };
  return { gate, shell, scroller, overlay, status, go, tablon, viajes };
}

test('sin login no hay iframe ni barra', () => {
  const d = mockDom();
  showGate('Sin sesión');
  assert.equal(d.gate.hidden, false);
  assert.equal(d.shell.hidden, true);
  assert.equal(d.scroller.children.length, 0);
  assert.equal(d.status.textContent, 'Sin sesión');
});

test('lazy: al entrar solo Go; Tablón y Viajes al toque; volver no recarga src', () => {
  const d = mockDom();
  showGate();
  showShell();
  assert.equal(d.gate.hidden, true);
  assert.equal(d.shell.hidden, false);
  assert.equal(d.scroller.children.length, 1);
  const goFrame = d.scroller.children[0];
  assert.equal(goFrame.getAttribute('data-casa-view'), 'go');
  assert.equal(goFrame.src, '/go/');
  assert.equal(goFrame.style.display, 'block');
  assert.equal(goFrame.style.visibility, 'visible');
  assert.equal(d.go.getAttribute('aria-selected'), 'true');

  showView('tablon');
  assert.equal(d.scroller.children.length, 2);
  const tablonFrame = d.scroller.children[1];
  assert.equal(tablonFrame.src, '/tablon/');
  assert.equal(tablonFrame.style.display, 'block');
  assert.equal(goFrame.style.display, 'block');
  assert.equal(goFrame.style.visibility, 'hidden');
  assert.equal(d.tablon.getAttribute('aria-selected'), 'true');
  assert.equal(d.go.getAttribute('aria-selected'), 'false');
  assert.equal(d.scroller.children.some((f) => f.getAttribute('data-casa-view') === 'viajes'), false);

  goFrame.src = '/go/?kept=1';
  showView('go');
  assert.equal(d.scroller.children.length, 2);
  assert.equal(goFrame.src, '/go/?kept=1');
  assert.equal(goFrame.style.display, 'block');
  assert.equal(goFrame.style.visibility, 'visible');
  assert.equal(tablonFrame.style.display, 'none');

  showView('viajes');
  assert.equal(d.scroller.children.length, 3);
  const viajesFrame = d.scroller.children[2];
  assert.equal(viajesFrame.src, '/viajes/');
  assert.equal(viajesFrame.style.display, 'block');
  assert.equal(goFrame.style.display, 'block');
  assert.equal(goFrame.style.visibility, 'hidden');
  assert.equal(tablonFrame.style.display, 'none');
});

test('sesión caducada: overlay, sin vaciar iframes ni el gate', () => {
  const d = mockDom();
  showShell();
  showView('tablon');
  const goSrc = d.scroller.children[0].src;
  const tablonSrc = d.scroller.children[1].src;
  showExpiredOverlay();
  assert.equal(d.overlay.hidden, false);
  assert.equal(d.shell.hidden, false);
  assert.equal(d.gate.hidden, true);
  assert.equal(d.scroller.children.length, 2);
  assert.equal(d.scroller.children[0].src, goSrc);
  assert.equal(d.scroller.children[1].src, tablonSrc);
  assert.notEqual(goSrc, 'about:blank');
  assert.notEqual(tablonSrc, 'about:blank');
  showGate('Sin sesión');
  assert.equal(d.scroller.children[0].src, goSrc);
  assert.equal(d.scroller.children[1].src, tablonSrc);
  assert.notEqual(d.scroller.children[0].src, 'about:blank');
  hideExpiredOverlay();
  assert.equal(d.overlay.hidden, true);
});

test('resume recarga solo la pestaña visible si está muerta', () => {
  const d = mockDom();
  showShell();
  showView('tablon');
  const goFrame = d.scroller.children[0];
  const tablonFrame = d.scroller.children[1];
  goFrame.contentWindow = null;
  goFrame.contentDocument = null;
  goFrame.src = '/go/';
  tablonFrame.contentWindow = null;
  tablonFrame.contentDocument = null;
  tablonFrame.src = '/tablon/';
  assert.equal(isFrameDead(tablonFrame), true);
  const did = resumeActiveIfDead();
  assert.equal(did, true);
  assert.equal(tablonFrame.src, '/tablon/');
  assert.equal(goFrame.src, '/go/');
  reloadView('go');
  assert.equal(goFrame.src, '/go/');
});

test('resume no recarga si la visible sigue viva', () => {
  const d = mockDom();
  showShell();
  const goFrame = d.scroller.children[0];
  const doc = { body: { childElementCount: 4 }, documentElement: {} };
  goFrame.contentDocument = doc;
  goFrame.contentWindow = { location: { href: 'https://alvarogt.com/go/' } };
  goFrame.src = '/go/?kept=1';
  assert.equal(isFrameDead(goFrame), false);
  assert.equal(resumeActiveIfDead(), false);
  assert.equal(goFrame.src, '/go/?kept=1');
});

test('restaura la última pestaña; si no hay valor, Go', () => {
  assert.equal(TAB_KEY, 'casa.lastTab');
  assert.deepEqual(TAB_NAMES, ['go', 'tablon', 'viajes']);
  const d = mockDom();
  assert.equal(lastTab(), 'go');
  showShell();
  assert.equal(d.scroller.children[0].getAttribute('data-casa-view'), 'go');
  showView('viajes');
  assert.equal(localStorage.getItem(TAB_KEY), 'viajes');
  assert.equal(lastTab(), 'viajes');
  const d2 = mockDom({ keepTab: true });
  showShell();
  assert.equal(d2.scroller.children.length, 2);
  assert.equal(d2.scroller.children[0].getAttribute('data-casa-view'), 'viajes');
  assert.equal(d2.scroller.children[0].src, '/viajes/');
  assert.equal(d2.scroller.children[1].getAttribute('data-casa-view'), 'go');
  assert.equal(d2.scroller.children[1].style.display, 'block');
  assert.equal(d2.scroller.children[1].style.visibility, 'hidden');
  assert.equal(d2.viajes.getAttribute('aria-selected'), 'true');
  rememberTab('disney');
  assert.equal(lastTab(), 'viajes');
  localStorage.setItem(TAB_KEY, 'nope');
  assert.equal(lastTab(), 'go');
});

test('punto de Tablón solo si #queue-list ya tiene cola', () => {
  mockDom();
  const emptyList = el({ children: [el({ className: 'empty' })] });
  const emptyDoc = {
    body: {},
    querySelector(sel) { return sel === '#queue-list' ? emptyList : null; }
  };
  assert.equal(queueHasPending(emptyDoc), false);
  const item = el({ className: 'queue-item' });
  const fullList = el({ children: [item] });
  const fullDoc = {
    body: {},
    querySelector(sel) { return sel === '#queue-list' ? fullList : null; }
  };
  assert.equal(queueHasPending(fullDoc), true);
  assert.equal(queueHasPending({ querySelector() { return null; } }), false);
  setTablonQueueDot(true);
  const btn = document.querySelector('#tabs button[data-view="tablon"]');
  assert.equal(btn.classList.contains('has-queue'), true);
  assert.equal(btn.querySelector('.tab-dot').hidden, false);
  setTablonQueueDot(false);
  assert.equal(btn.classList.contains('has-queue'), false);
  assert.equal(btn.querySelector('.tab-dot').hidden, true);

  const liveFrame = el({
    attrs: { 'data-casa-view': 'tablon' },
    contentDocument: fullDoc,
    contentWindow: { location: { href: 'https://alvarogt.com/tablon/' } }
  });
  assert.equal(readTablonQueueFromFrame(liveFrame), true);
  const deadFrame = el({ attrs: { 'data-casa-view': 'tablon' }, contentWindow: null, contentDocument: null });
  assert.equal(readTablonQueueFromFrame(deadFrame), null);
  const d = mockDom();
  showShell();
  assert.equal(refreshTablonQueueDot(), false);
  assert.equal(d.tablon.querySelector('.tab-dot').hidden, true);
});

test('punto de Viajes si Go marca viaje hoy o mañana (Gugus Madrid)', () => {
  const d = mockDom();
  showShell();
  assert.equal(d.viajes.querySelector('.tab-dot').hidden, true);
  const goFrame = d.scroller.children[0];
  const htmlOff = {
    getAttribute(name) { return name === 'data-trip-soon' ? '0' : null; }
  };
  const htmlOn = {
    getAttribute(name) { return name === 'data-trip-soon' ? '1' : null; }
  };
  goFrame.contentDocument = { body: {}, documentElement: htmlOff };
  goFrame.contentWindow = { location: { href: 'https://alvarogt.com/go/' } };
  assert.equal(readTripSoonFromGoFrame(goFrame), false);
  assert.equal(refreshViajesTripDot(), false);
  assert.equal(d.viajes.querySelector('.tab-dot').hidden, true);
  goFrame.contentDocument = { body: {}, documentElement: htmlOn };
  assert.equal(readTripSoonFromGoFrame(goFrame), true);
  assert.equal(refreshViajesTripDot(), true);
  assert.equal(d.viajes.classList.contains('has-trip'), true);
  assert.equal(d.viajes.querySelector('.tab-dot').hidden, false);
  setViajesTripDot(false);
  assert.equal(d.viajes.classList.contains('has-trip'), false);
  assert.equal(d.viajes.querySelector('.tab-dot').hidden, true);
  const dead = el({ attrs: { 'data-casa-view': 'go' }, contentWindow: null, contentDocument: null });
  assert.equal(readTripSoonFromGoFrame(dead), null);
});

test('Viajes con punto abre Hoy; sin punto no fuerza Hoy', () => {
  const d = mockDom();
  showShell();
  const goFrame = d.scroller.children[0];
  const htmlOn = {
    getAttribute(name) { return name === 'data-trip-soon' ? '1' : null; }
  };
  const htmlOff = {
    getAttribute(name) { return name === 'data-trip-soon' ? '0' : null; }
  };
  goFrame.contentDocument = { body: {}, documentElement: htmlOn };
  goFrame.contentWindow = { location: { href: 'https://alvarogt.com/go/' } };
  const viajesHtml = { attrs: {}, setAttribute(name, value) { this.attrs[name] = String(value); }, getAttribute(name) { return this.attrs[name] || null; } };
  showView('viajes');
  const viajesFrame = d.scroller.children.find((f) => f.getAttribute('data-casa-view') === 'viajes');
  viajesFrame.contentDocument = { body: {}, documentElement: viajesHtml };
  viajesFrame.contentWindow = { location: { href: 'https://alvarogt.com/viajes/' } };
  assert.equal(applyViajesHoy(viajesFrame), true);
  assert.equal(viajesHtml.getAttribute('data-viajes-vista'), 'hoy');
  goFrame.contentDocument = { body: {}, documentElement: htmlOff };
  const other = { attrs: {}, setAttribute(name, value) { this.attrs[name] = String(value); }, getAttribute(name) { return this.attrs[name] || null; } };
  viajesFrame.contentDocument = { body: {}, documentElement: other };
  assert.equal(applyViajesHoy(viajesFrame), false);
  assert.equal(other.getAttribute('data-viajes-vista'), null);
});

test('punto de Go si hay interés 5 hoy en el iframe', () => {
  const d = mockDom();
  showShell();
  assert.equal(d.go.querySelector('.tab-dot').hidden, true);
  const goFrame = d.scroller.children[0];
  const star = el({ className: 'sports-star-5' });
  const agenda = el({ children: [star] });
  const fullDoc = {
    body: {},
    querySelector(sel) {
      if (sel === '#sports-agenda' || sel === '#agenda-deportiva') return agenda;
      if (sel === '.sports-star-5') return star;
      return null;
    }
  };
  const emptyAgenda = el({ children: [] });
  const emptyDoc = {
    body: {},
    querySelector(sel) {
      if (sel === '#sports-agenda' || sel === '#agenda-deportiva') return emptyAgenda;
      if (sel === '.sports-star-5') return null;
      return null;
    }
  };
  goFrame.contentDocument = emptyDoc;
  goFrame.contentWindow = { location: { href: 'https://alvarogt.com/go/' } };
  assert.equal(goHasInteres5(emptyDoc), false);
  assert.equal(readGoHotFromFrame(goFrame), false);
  assert.equal(refreshGoHotDot(), false);
  assert.equal(d.go.querySelector('.tab-dot').hidden, true);
  goFrame.contentDocument = fullDoc;
  assert.equal(goHasInteres5(fullDoc), true);
  assert.equal(readGoHotFromFrame(goFrame), true);
  assert.equal(refreshGoHotDot(), true);
  assert.equal(d.go.classList.contains('has-hot'), true);
  assert.equal(d.go.querySelector('.tab-dot').hidden, false);
  setGoHotDot(false);
  assert.equal(d.go.classList.contains('has-hot'), false);
  assert.equal(d.go.querySelector('.tab-dot').hidden, true);
  const dead = el({ attrs: { 'data-casa-view': 'go' }, contentWindow: null, contentDocument: null });
  assert.equal(readGoHotFromFrame(dead), null);
});

test('login_hint del último adulto, sin select_account', () => {
  const store = {};
  globalThis.localStorage = {
    getItem(k) { return Object.hasOwn(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); }
  };
  globalThis.window = { navigator: {}, matchMedia: () => ({ matches: false }) };
  assert.equal(HINT_KEY, 'casa.lastAdult');
  assert.equal(lastAdultHint(), '');
  assert.deepEqual(googleParams(), {});
  rememberAdult('agarciatimon@gmail.com');
  assert.equal(lastAdultHint(), 'agarciatimon@gmail.com');
  assert.deepEqual(googleParams(), { login_hint: 'agarciatimon@gmail.com' });
  rememberAdult('luzolivas@gmail.com');
  assert.equal(lastAdultHint(), 'luzolivas@gmail.com');
  rememberAdult('isabelgarciatimon@gmail.com');
  assert.equal(lastAdultHint(), 'luzolivas@gmail.com');
  assert.equal(Object.prototype.hasOwnProperty.call(googleParams(), 'prompt'), false);
  globalThis.window.navigator.standalone = true;
  assert.equal(isStandaloneDisplay(), true);
});
