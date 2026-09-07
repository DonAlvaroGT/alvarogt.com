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
const CHILD_EMAIL = 'alvarogt@alvarogt.com';

function isAdult(actor) { return actor.role === 'adult'; }

function actorFrom(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const token = request.auth.token || {};
  const email = String(token.email || '').toLowerCase();
  if (ADULTS.has(email)) return { uid: request.auth.uid, role: 'adult', email, emailVerified: token.email_verified === true };
  if (email === CHILD_EMAIL) return { uid: request.auth.uid, role: 'child', email, emailVerified: token.email_verified === true };
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
  await auth.setCustomUserClaims(uid, { childRole: 'supervised' });
  return { uid, childRole: 'supervised' };
}
