import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { commandFor, applyCommand, awardPoints, createInstanceId, frequencyPeriods } from './backend.contract.mjs';

if (!getApps().length) initializeApp();
const auth = getAuth();
const db = getFirestore();
const ADULTS = new Set(['agarciatimon@gmail.com', 'luzolivas@gmail.com']);


function isAdult(actor) { return actor.role === 'adult'; }

function actorFrom(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const token = request.auth.token || {};
  const email = String(token.email || '').toLowerCase();
  if (ADULTS.has(email)) {
    if (token.email_verified !== true) throw new HttpsError('permission-denied', 'El correo adulto no está verificado.');
    return { uid: request.auth.uid, role: 'adult', email, emailVerified: true };
  }
  if (token.childRole === 'supervised') return { uid: request.auth.uid, role: 'child', childId: token.childId || 'shared' };
  throw new HttpsError('permission-denied', 'Cuenta no autorizada.');
}

function input(data) {
  const taskId = String(data?.taskId || ''), instanceId = String(data?.instanceId || ''), eventId = String(data?.eventId || '');
  if (!taskId || !instanceId || !eventId) throw new HttpsError('invalid-argument', 'Faltan taskId, instanceId o eventId.');
  return { taskId, instanceId, eventId };
}

async function command(action, request) {
  const actor = actorFrom(request), { taskId, instanceId, eventId } = input(request.data);
  const taskRef = db.doc(`tasks/${taskId}`), instanceRef = db.doc(`taskInstances/${instanceId}`), eventRef = db.doc(`actions/${action}:${eventId}`);
  return db.runTransaction(async tx => {
    const previous = await tx.get(eventRef);
    if (previous.exists) return previous.data().result;
    const [taskSnap, instanceSnap] = await Promise.all([tx.get(taskRef), tx.get(instanceRef)]);
    if (!taskSnap.exists || !instanceSnap.exists) throw new HttpsError('not-found', 'Tarea o instancia no encontrada.');
    const task = { id: taskSnap.id, ...taskSnap.data() }, instance = { id: instanceSnap.id, ...instanceSnap.data() };
    let next;
    try { next = applyCommand(instance, commandFor(action, actor, task, instance, eventId)); }
    catch (error) { throw new HttpsError('failed-precondition', error.message); }
    const result = { ok: true, instance: next, actionId: `${action}:${eventId}` };
    tx.update(instanceRef, { status: next.status, lastEventId: eventId, updatedAt: FieldValue.serverTimestamp() });
    tx.create(eventRef, { taskId, instanceId, action, actorUid: actor.uid, actorRole: actor.role, createdAt: FieldValue.serverTimestamp(), idempotencyKey: eventId, result });
    if (['validated', 'adult_done'].includes(next.status) && !instance.pointsAwarded) {
      const beneficiaries = task.assignee === 'shared' ? ['Nacho', 'Luz'] : [task.assignee];
      const awards = [];
      for (const beneficiary of beneficiaries) {
        const award = awardPoints(next, task, beneficiary);
        const awardRef = db.doc(`pointAwards/${award.awardId}`);
        tx.create(awardRef, { ...award, instanceId, beneficiary, createdAt: FieldValue.serverTimestamp() });
        tx.set(db.doc(`balances/${beneficiary}`), { points: FieldValue.increment(award.points), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        awards.push(award);
      }
      tx.update(instanceRef, { pointsAwarded: true });
      result.awards = awards;
    }
    return result;
  });
}

export const childDone = onCall({ region: 'europe-west1' }, request => command('child_done', request));
export const validateTask = onCall({ region: 'europe-west1' }, request => command('validate_task', request));
export const adultDone = onCall({ region: 'europe-west1' }, request => command('adult_done', request));
export const undoDone = onCall({ region: 'europe-west1' }, request => command('undo_done', request));

function redemptionInput(data) {
  const rewardId = String(data?.rewardId || ''), redemptionId = String(data?.redemptionId || ''), eventId = String(data?.eventId || '');
  if (!eventId || (!rewardId && !redemptionId)) throw new HttpsError('invalid-argument', 'Faltan identificador y eventId.');
  return { rewardId, redemptionId, eventId };
}

async function redemptionCommand(action, request) {
  const actor = actorFrom(request), { rewardId, redemptionId, eventId } = redemptionInput(request.data);
  if (action === 'request_redemption' && actor.role !== 'child') throw new HttpsError('permission-denied', 'Solo la cuenta infantil puede solicitar un canje.');
  if (action !== 'request_redemption' && actor.role !== 'adult') throw new HttpsError('permission-denied', 'Solo un adulto puede validar o rechazar.');
  const eventRef = db.doc(`events/redemption:${action}:${eventId}`);
  return db.runTransaction(async tx => {
    const prior = await tx.get(eventRef);
    if (prior.exists) return prior.data().result;
    if (action === 'request_redemption') {
      const rewardRef = db.doc(`rewards/${rewardId}`), rewardSnap = await tx.get(rewardRef);
      if (!rewardSnap.exists) throw new HttpsError('not-found', 'Premio no encontrado.');
      const reward = { id: rewardSnap.id, ...rewardSnap.data() }, childId = reward.assignee || reward.child;
      if (!['Nacho', 'Luz'].includes(childId) || (actor.childId !== 'shared' && actor.childId !== childId)) throw new HttpsError('permission-denied', 'Premio no asignado a esta cuenta.');
      const balanceSnap = await tx.get(db.doc(`balances/${childId}`));
      const balance = Number(balanceSnap.data()?.points || 0), cost = Number(reward.cost);
      if (!Number.isInteger(cost) || cost < 1 || balance < cost) throw new HttpsError('failed-precondition', 'No hay puntos suficientes.');
      const redemptionRef = db.doc(`redemptions/${eventId}`);
      const redemption = { rewardId, childId, cost, status: 'pending', eventId, requestedBy: actor.uid, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
      tx.create(redemptionRef, redemption);
      const result = { ok: true, redemptionId: redemptionRef.id, status: 'pending', childId, cost };
      tx.create(eventRef, { result, createdAt: FieldValue.serverTimestamp(), actorUid: actor.uid });
      return result;
    }
    const redemptionRef = db.doc(`redemptions/${redemptionId}`), snap = await tx.get(redemptionRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Canje no encontrado.');
    const redemption = snap.data();
    if (redemption.status !== 'pending') throw new HttpsError('failed-precondition', 'El canje ya está cerrado.');
    if (action === 'reject_redemption') {
      tx.update(redemptionRef, { status: 'rejected', rejectedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() });
      const result = { ok: true, redemptionId, status: 'rejected' }; tx.create(eventRef, { result, createdAt: FieldValue.serverTimestamp(), actorUid: actor.uid }); return result;
    }
    const balanceRef = db.doc(`balances/${redemption.childId}`), rewardRef = db.doc(`rewards/${redemption.rewardId}`);
    const [balanceSnap, rewardSnap] = await Promise.all([tx.get(balanceRef), tx.get(rewardRef)]), current = Number(balanceSnap.data()?.points || 0);
    if (!rewardSnap.exists || current < redemption.cost) throw new HttpsError('failed-precondition', 'Saldo o premio no disponible.');
    tx.update(redemptionRef, { status: 'validated', validatedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() });
    tx.update(balanceRef, { points: FieldValue.increment(-redemption.cost), updatedAt: FieldValue.serverTimestamp() });
    tx.create(db.doc(`awards/${redemptionId}`), { type: 'redemption', redemptionId, rewardId: redemption.rewardId, childId: redemption.childId, cost: redemption.cost, createdAt: FieldValue.serverTimestamp() });
    if (rewardSnap.data().repeatable !== true) tx.update(rewardRef, { status: 'spent', updatedAt: FieldValue.serverTimestamp() });
    const result = { ok: true, redemptionId, status: 'validated', childId: redemption.childId, cost: redemption.cost };
    tx.create(eventRef, { result, createdAt: FieldValue.serverTimestamp(), actorUid: actor.uid }); return result;
  });
}

export const requestRedemption = onCall({ region: 'europe-west1' }, request => redemptionCommand('request_redemption', request));
export const rejectRedemption = onCall({ region: 'europe-west1' }, request => redemptionCommand('reject_redemption', request));
export const validateRedemption = onCall({ region: 'europe-west1' }, request => redemptionCommand('validate_redemption', request));

export const createDailyInstances = onSchedule({ schedule: 'every day 00:10', timeZone: 'Europe/Madrid', region: 'europe-west1', retryCount: 1 }, async () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
  const snap = await db.collection('tasks').where('status', '==', 'active').get();
  const periods = [today];
  const batch = db.batch();
  for (const doc of snap.docs) {
    const task = { id: doc.id, ...doc.data() };
    for (const period of frequencyPeriods(task, periods.map(p => new Date(`${p}T00:00:00Z`)))) {
      const id = createInstanceId(task.id, period.toISOString().slice(0, 10));
      batch.set(db.doc(`taskInstances/${id}`), { taskId: task.id, period: id.split(':').pop(), status: 'pending', pointsAwarded: false }, { merge: false });
    }
  }
  await batch.commit();
});

export async function setChildClaim(uid) {
  const user = await auth.getUser(uid);
  if ((user.email || '').toLowerCase() !== 'alvarogt@alvarogt.com') throw new Error('No es la cuenta infantil autorizada.');
  const existing = user.customClaims || {};
  await auth.setCustomUserClaims(uid, { ...existing, childRole: 'supervised', childId: existing.childId || 'shared' });
  return { uid, childRole: 'supervised', childId: existing.childId || 'shared' };
}
