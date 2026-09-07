import { executeCommand, resolveTrustedActor, createPeriodicInstances } from './pure.mjs';

const COMMANDS = ['child_done', 'validate_task', 'adult_done', 'undo_done'];

export function makeCommandHandler(action, dependencies) {
  if (!COMMANDS.includes(action)) throw new Error(`Comando desconocido: ${action}`);
  return async (request) => {
    const actor = resolveTrustedActor(await dependencies.authenticate(request));
    const { task, instance } = await dependencies.readTaskAndInstance(request.data.taskId, request.data.instanceId);
    return executeCommand({ action, actor, task, instance, eventId: request.data.eventId, store: dependencies.eventStore, awards: dependencies.awards });
  };
}

export const childDone = (dependencies) => makeCommandHandler('child_done', dependencies);
export const validateTask = (dependencies) => makeCommandHandler('validate_task', dependencies);
export const adultDone = (dependencies) => makeCommandHandler('adult_done', dependencies);
export const undoDone = (dependencies) => makeCommandHandler('undo_done', dependencies);

export function createPeriodicInstancesJob(dependencies) {
  return async ({ periods }) => {
    const tasks = await dependencies.readActiveTasks();
    return dependencies.createInstances(createPeriodicInstances(tasks, periods));
  };
}

// Adaptador de plataforma pendiente: estas Functions no se exportan a Firebase
// hasta configurar Admin SDK, Auth, Firestore y despliegue con autorización.
export const handlers = { child_done: childDone, validate_task: validateTask, adult_done: adultDone, undo_done: undoDone };
