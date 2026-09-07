import { readRuntimeConfig } from './config.mjs';
import { demoTasks, childAction, adultValidate, adultMark, adultUndo } from './domain.mjs';

const runtime = readRuntimeConfig();
const CONFIG = runtime.config;
const FIREBASE_VERSION = '12.1.0';
let firebaseAuth = null;
let firebaseGoogleProvider = null;
const DEV_KEY = 'tablon-local-development-v1';
const CHILDREN = ['Nacho', 'Luz'];
const state = { user: null, tasks: [], history: [], points: { Nacho: 0, Luz: 0 } };
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now = () => new Date().toISOString();
const actorName = () => state.user?.name || 'desarrollo local';
const show = (el, yes = true) => el.classList.toggle('hidden', !yes);
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }
function loadLocal() { if (!runtime.localDevelopment) return; try { const saved = JSON.parse(localStorage.getItem(DEV_KEY)); if (saved) Object.assign(state, saved); else state.tasks = demoTasks(); } catch { toast('No se pudieron leer los datos locales.'); } }
function saveLocal() { if (runtime.localDevelopment) localStorage.setItem(DEV_KEY, JSON.stringify({ tasks: state.tasks, history: state.history, points: state.points })); }
function isAdult() { return state.user?.role === 'adult'; }
function frequencyLabel(task) { return task.frequency === 'weekly' ? `Semanal · ${(task.days || []).map(Number).sort().map((d) => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join(', ') || 'sin días'}` : 'Diaria'; }
function taskVisible(task, child) { return task.status === 'active' && (task.assignee === child || task.assignee === 'shared'); }
function currentDone(task) { return task.instance?.status || 'pending'; }
function renderTask(task, childView = false) {
  const status = currentDone(task);
  const statusText = { pending: 'Pendiente', child_done: 'Hecha por niño', validated: 'Validada', adult_done: 'Hecha por adulto', rejected: 'Rechazada' }[status] || 'Estado no reconocido';
  const people = task.assignee === 'shared' ? '⚽ 🌸' : task.assignee === 'Nacho' ? '⚽ Nacho' : '🌸 Luz';
  let actions = '';
  if (childView && status === 'pending') actions += `<button class="button mark" data-action="mark-task" data-kind="child" data-id="${esc(task.id)}">Marcar hecha</button>`;
  if (isAdult()) {
    if (status === 'child_done') actions += `<button class="button validate" data-action="validate" data-kind="validate-task" data-id="${esc(task.id)}">Validar</button><button class="button reject" data-action="reject" data-kind="reject-task" data-id="${esc(task.id)}">Rechazar</button>`;
    if (status === 'pending') actions += `<button class="button mark" data-action="mark-task" data-kind="adult" data-id="${esc(task.id)}">Marcar hecha</button>`;
    if (status !== 'pending') actions += `<button class="button secondary" data-action="undo" data-kind="undo-task" data-id="${esc(task.id)}">Deshacer</button>`;
    if (!childView) actions += `<button class="button secondary" data-action="edit" data-kind="edit-task" data-id="${esc(task.id)}">Editar</button>`;
  }
  return `<article class="task-card ${task.assignee.toLowerCase()} ${task.assignee === 'shared' ? 'shared' : ''}"><div class="task-icon">${esc(task.icon || '✅')}</div><div class="task-content"><h3>${esc(task.title)}</h3><p class="meta">${people} · ${frequencyLabel(task)} · ⭐ ${task.points} puntos${task.example ? ' · EJEMPLO' : ''}</p></div><div class="task-actions"><span class="status ${status !== 'pending' ? 'pending' : ''}">${statusText}</span>${actions}</div></article>`;
}
function render() {
  const adult = isAdult();
  show($('#adult-view'), adult);
  show($('#new-task'), adult);
  show(document.querySelector('[data-view="adult"]'), adult);
  document.querySelectorAll('.tabs [data-view="adult"]').forEach((tab) => show(tab, adult));
  show($('.history'), adult);
  $('#nacho-points').textContent = state.points.Nacho; $('#luz-points').textContent = state.points.Luz;
  $('#nacho-points-top').textContent = state.points.Nacho; $('#luz-points-top').textContent = state.points.Luz;
  $('#adult-task-list').innerHTML = state.tasks.length ? state.tasks.map((t) => renderTask(t)).join('') : '<p class="empty">No hay tareas. Crea la primera cuando quieras.</p>';
  for (const child of CHILDREN) $(`#${child.toLowerCase()}-task-list`).innerHTML = state.tasks.filter((t) => taskVisible(t, child)).map((t) => renderTask(t, true)).join('') || '<p class="empty">No hay tareas activas.</p>';
  $('#history-list').innerHTML = state.history.length ? state.history.slice().reverse().map((h) => `<div class="history-row"><strong>${esc(h.action)}</strong> · ${esc(h.taskTitle)}<br><span class="meta">${esc(h.actor)} · ${new Date(h.at).toLocaleString('es-ES')}</span></div>`).join('') : '<p class="empty">Aún no hay acciones.</p>';
}
function addHistory(action, task) { state.history.push({ action, taskTitle: task.title, actor: actorName(), at: now(), taskId: task.id }); }
function award(task) { if (task.instance?.pointsAwarded) return; const people = task.assignee === 'shared' ? CHILDREN : [task.assignee]; people.forEach((p) => { state.points[p] += Number(task.points); }); task.instance.pointsAwarded = true; }
function openForm(task = null) { if (!isAdult()) { toast('Solo un adulto puede gestionar tareas.'); return; } $('#task-form').reset(); $('#task-id').value = task?.id || ''; $('#form-title').textContent = task ? 'Editar tarea' : 'Nueva tarea'; if (task) { $('#title').value = task.title; $('#assignee').value = task.assignee; $('#frequency').value = task.frequency; $('#points').value = task.points; $('#requires-validation').checked = task.requiresValidation; $('#task-state').value = task.status; (task.days || []).forEach((d) => { const box = document.querySelector(`#days-field input[value="${d}"]`); if (box) box.checked = true; }); } show($('#task-form')); $('#title').focus(); }
function readForm() { const title = $('#title').value.trim(); const points = Number($('#points').value); const frequency = $('#frequency').value; const days = [...document.querySelectorAll('#days-field input:checked')].map((x) => Number(x.value)); if (!title) throw new Error('Escribe un título.'); if (!Number.isInteger(points) || points < 0 || points > 1000) throw new Error('Los puntos deben ser un entero entre 0 y 1000.'); if (frequency === 'weekly' && !days.length) throw new Error('Elige al menos un día semanal.'); return { title, assignee: $('#assignee').value, frequency, days: frequency === 'weekly' ? days : [], points, requiresValidation: $('#requires-validation').checked, status: $('#task-state').value }; }
async function api(path, options = {}) { if (!CONFIG.backendConfigured) throw new Error('Backend de producción no configurado; no hay sincronización remota.'); const response = await fetch(CONFIG.apiBase + path, { ...options, credentials: 'include', headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) } }); if (response.status === 401) throw new Error('Sesión no autenticada o caducada.'); if (response.status === 403) throw new Error('No tienes permiso para esta acción.'); if (!response.ok) throw new Error(`Error del backend (${response.status}).`); return response.status === 204 ? null : response.json(); }
async function initGoogleAuth() {
  if (!runtime.localDevelopment) return;
  try {
    const [{ initializeApp }, authModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
    ]);
    const app = initializeApp(CONFIG.firebaseConfig);
    firebaseAuth = authModule.getAuth(app);
    firebaseGoogleProvider = new authModule.GoogleAuthProvider();
    authModule.onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) return;
      const email = (user.email || '').toLowerCase();
      if (!['agarciatimon@gmail.com', 'luzolivas@gmail.com'].includes(email)) {
        authModule.signOut(firebaseAuth);
        toast('Esta cuenta no está autorizada para el tablón.');
        return;
      }
      state.user = { role: 'adult', name: user.displayName || user.email, email, uid: user.uid };
      $('#sign-in').classList.add('hidden'); $('#sign-out').classList.remove('hidden');
      $('#mode-badge').textContent = `Google · ${state.user.name}`;
      show($('#app')); render();
    });
    $('#access-message').innerHTML = '<strong>Google listo en local.</strong> Entra con una cuenta adulta autorizada. Los datos del tablón siguen guardándose solo en este navegador.';
  } catch (error) {
    $('#access-message').innerHTML = `<strong>Google no disponible en local.</strong> ${esc(error.message)} Puedes probar el modo demo local escribiendo «adulto».`;
  }
}
function initAccess() { if (runtime.localDevelopment) { $('#mode-badge').textContent = 'Desarrollo local · Google'; $('#access-message').innerHTML = '<strong>Acceso local.</strong> Google verifica la cuenta adulta; los datos se guardan solo en este navegador. El modo demo no verifica identidad y no sincroniza dispositivos.'; show($('#access-message')); $('#sign-in').classList.remove('hidden'); initGoogleAuth(); return; } if (!runtime.valid) { $('#mode-badge').textContent = 'Backend pendiente'; $('#access-message').innerHTML = `<strong>Integración pendiente.</strong> ${esc(runtime.errors.join(' '))} Esta versión no muestra datos ni ofrece un inicio de sesión falso.`; show($('#access-message')); return; } $('#mode-badge').textContent = 'Sin sesión'; $('#access-message').textContent = `Backend preparado (${esc(CONFIG.authProvider)}), pero falta implementar el adaptador de autenticación.`; show($('#access-message')); $('#sign-in').classList.remove('hidden'); }
function enterLocal(role) { state.user = role === 'adult' ? { role: 'adult', name: 'Adulto (demo)' } : { role: 'child', name: 'Cuenta infantil compartida' }; $('#sign-in').classList.add('hidden'); $('#sign-out').classList.remove('hidden'); $('#mode-badge').textContent = `Local · ${state.user.name} · no seguro`; show($('#app')); render(); }
document.addEventListener('click', async (event) => { const button = event.target.closest('[data-action]'); if (button) { const task = state.tasks.find((t) => t.id === button.dataset.id); if (!task) return; if (button.dataset.action === 'edit') { if (!isAdult()) return; openForm(task); } if (button.dataset.action === 'mark-task' && button.dataset.kind === 'child') { Object.assign(task, childAction(task, 'child')); task.instance.at = now(); addHistory('Marcada por cuenta infantil', task); toast('Pendiente de validación adulta.'); } if (button.dataset.action === 'validate') { if (!isAdult()) return; Object.assign(task, adultValidate(task)); const awarded = awardPointsOnce(task); Object.assign(task, awarded.task); addHistory('Validada por adulto', task); toast(awarded.awarded ? 'Validada y puntos sumados.' : 'Validada.'); } if (button.dataset.action === 'reject') { if (!isAdult()) return; task.instance = { status: 'rejected', at: now(), pointsAwarded: false }; addHistory('Rechazada por adulto', task); toast('Tarea rechazada.'); } if (button.dataset.action === 'mark-task' && button.dataset.kind === 'adult') { if (!isAdult()) return; Object.assign(task, adultMark(task)); task.instance.at = now(); award(task); addHistory('Marcada por adulto', task); } if (button.dataset.action === 'undo') { if (!isAdult()) return; task.instance = { status: 'pending', at: now(), pointsAwarded: false }; addHistory('Deshecha por adulto', task); toast('Hecho: vuelve a pendiente.'); } saveLocal(); render(); return; } const view = event.target.closest('[data-view]'); if (view) { document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === view)); document.querySelectorAll('.view').forEach((x) => x.classList.add('hidden')); show($(`#${view.dataset.view}-view`)); } if (event.target.id === 'new-task') openForm(); if (event.target.id === 'cancel-form') show($('#task-form'), false); if (event.target.id === 'refresh') { if (CONFIG.backendConfigured && runtime.valid) { try { const data = await api('/tasks'); state.tasks = data.tasks; render(); } catch (error) { toast(error.message); } } else toast('No hay backend remoto conectado.'); } });
$('#task-form').addEventListener('submit', (event) => { event.preventDefault(); if (!isAdult()) { $('#form-error').textContent = 'Solo un adulto puede gestionar tareas.'; return; } if (!runtime.localDevelopment) { $('#form-error').textContent = 'La escritura remota aún no está conectada. No se ha guardado nada.'; return; } try { const data = readForm(); const existing = state.tasks.find((t) => t.id === $('#task-id').value); if (existing) { Object.assign(existing, data); addHistory('Tarea editada', existing); } else { const task = { id: crypto.randomUUID(), ...data, instance: { status: 'pending', pointsAwarded: false } }; state.tasks.push(task); addHistory('Tarea creada', task); } saveLocal(); show($('#task-form'), false); render(); toast('Tarea guardada solo en este navegador.'); } catch (error) { $('#form-error').textContent = error.message; } });
$('#sign-in').addEventListener('click', async () => { if (runtime.localDevelopment && firebaseAuth && firebaseGoogleProvider) { try { const { signInWithPopup } = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`); await signInWithPopup(firebaseAuth, firebaseGoogleProvider); } catch (error) { toast(error.code === 'auth/popup-closed-by-user' ? 'Acceso cancelado.' : `No se pudo entrar con Google: ${error.message}`); } return; } if (runtime.localDevelopment) { const role = prompt('Solo demo local: escribe adulto o infantil. No verifica identidad.'); const map = { adulto: 'adult', infantil: 'child' }; if (map[role?.toLowerCase()]) enterLocal(map[role.toLowerCase()]); else toast('Acceso local cancelado.'); } else toast('Inicio de sesión pendiente: no hay autenticación conectada.'); });
$('#sign-out').addEventListener('click', async () => { if (firebaseAuth) { const { signOut } = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`); await signOut(firebaseAuth); } state.user = null; show($('#app'), false); $('#sign-out').classList.add('hidden'); $('#sign-in').classList.remove('hidden'); $('#mode-badge').textContent = runtime.localDevelopment ? 'Desarrollo local · Google' : 'Sin sesión'; });
loadLocal(); initAccess();
