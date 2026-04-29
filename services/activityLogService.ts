import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDateSafe } from '@/lib/utils/date';

export enum ActivityAction {
  TASK_CREATED = 'Tarea creada',
  TASK_UPDATED = 'Tarea actualizada',
  TASK_DELETED = 'Tarea eliminada',
  TASK_MOVED = 'Cambio el estado de una tarea',
  TASK_ARCHIVED = 'Tarea archivada',
  TASK_UNARCHIVED = 'Tarea desarchivada',
  SUBTASK_CREATED = 'Subtarea añadida',
  SUBTASK_COMPLETED = 'Subtarea hecha',
  SUBTASK_UNCOMPLETED = 'Subtarea reabierta',
  SUBTASK_DELETED = 'Subtarea eliminada',
  SUBTASK_UPDATED = 'Subtarea actualizada',
  PROJECT_CREATED = 'Proyecto creado',
  PROJECT_UPDATED = 'Proyecto actualizado',
  PROJECT_ARCHIVED = 'Proyecto archivado',
  MEMBER_ADDED = 'Miembro añadido',
  MEMBER_REMOVED = 'Miembro eliminado',
  MEMBER_ROLE_CHANGED = 'Rol de miembro actualizado',
  COMMENT_ADDED = 'Comentario añadido',
  TAGS_UPDATED = 'Tags de tarea actualizados',
  BULK_ARCHIVE = 'Archivado masivo de tareas completadas',
  DEPENDENCY_CREATED = 'dependency_created',
  DEPENDENCY_REMOVED = 'dependency_removed',
  TASK_BLOCKED_BY_DEPENDENCY = 'task_blocked_by_dependency',
}

export interface ActivityLogInput {
  teamId: string;
  projectId?: string;
  taskId?: string;
  userId: string;
  action: string;
  details?: Record<string, unknown>;
}

export interface ActivityLog extends ActivityLogInput {
  id: string;
  createdAt: Date;
}

export async function logActivity(input: ActivityLogInput): Promise<void> {
  try {
    await addDoc(collection(db, 'activityLog'), {
      ...input,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Failed to log activity:', error, input);
  }
}

export async function logActivities(inputs: ActivityLogInput[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const input of inputs) {
      const ref = doc(collection(db, 'activityLog'));
      batch.set(ref, {
        ...input,
        createdAt: Timestamp.now(),
      });
    }
    await batch.commit();
  } catch (error) {
    console.error('Failed to batch log activities:', error);
  }
}

export async function getTeamActivityLogs(
  teamId: string,
  options?: { limit?: number; projectId?: string }
): Promise<ActivityLog[]> {
  const limitCount = options?.limit ?? 50;
  const projectId = options?.projectId;
  
  const constraints: any[] = [
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  ];
  
  if (projectId) {
    constraints.splice(2, 0, where('projectId', '==', projectId));
  }
  
  const q = query(collection(db, 'activityLog'), ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDateSafe(doc.data().createdAt) || new Date(),
  } as ActivityLog));
}

export const activityHelpers = {
  taskCreated: (teamId: string, taskId: string, userId: string, title: string, projectId?: string) =>
    logActivity({
      teamId,
      projectId,
      taskId,
      userId,
      action: ActivityAction.TASK_CREATED,
      details: { title },
    }),
    
  taskUpdated: (teamId: string, taskId: string, userId: string, updatedFields: string[], projectId?: string) =>
    logActivity({
      teamId,
      projectId,
      taskId,
      userId,
      action: ActivityAction.TASK_UPDATED,
      details: { updatedFields },
    }),
    
  taskDeleted: (teamId: string, taskId: string, userId: string, projectId?: string) =>
    logActivity({
      teamId,
      projectId,
      taskId,
      userId,
      action: ActivityAction.TASK_DELETED,
    }),
    
  taskMoved: (teamId: string, taskId: string, userId: string, newStatus: string, projectId?: string) =>
    logActivity({
      teamId,
      projectId,
      taskId,
      userId,
      action: ActivityAction.TASK_MOVED,
      details: { newStatus },
    }),
    
  taskArchived: (teamId: string, taskId: string, userId: string, projectId?: string) =>
    logActivity({
      teamId,
      projectId,
      taskId,
      userId,
      action: ActivityAction.TASK_ARCHIVED,
    }),
    
  taskUnarchived: (teamId: string, taskId: string, userId: string, projectId?: string) =>
    logActivity({
      teamId,
      projectId,
      taskId,
      userId,
      action: ActivityAction.TASK_UNARCHIVED,
    }),
    
  subtaskCreated: (teamId: string, taskId: string, userId: string, title: string, projectId?: string) =>
    logActivity({
      teamId,
      projectId,
      taskId,
      userId,
      action: ActivityAction.SUBTASK_CREATED,
      details: { title },
    }),
    
  subtaskCompleted: (teamId: string, taskId: string, userId: string, subtaskId: string, completed: boolean, projectId?: string) =>
    logActivity({
      teamId,
      projectId,
      taskId,
      userId,
      action: completed ? ActivityAction.SUBTASK_COMPLETED : ActivityAction.SUBTASK_UNCOMPLETED,
      details: { subtaskId },
    }),
    
  subtaskDeleted: (teamId: string, taskId: string, userId: string, subtaskId: string, projectId?: string) =>
    logActivity({
      teamId,
      projectId,
      taskId,
      userId,
      action: ActivityAction.SUBTASK_DELETED,
      details: { subtaskId },
    }),
    
  subtaskUpdated: (teamId: string, taskId: string, userId: string, subtaskId: string, newTitle: string, projectId?: string) =>
    logActivity({
      teamId,
      projectId,
      taskId,
      userId,
      action: ActivityAction.SUBTASK_UPDATED,
      details: { subtaskId, newTitle },
    }),
    
  taskTagsUpdated: (teamId: string, taskId: string, userId: string, newTagIds: string[], projectId?: string) =>
    logActivity({
      teamId,
      projectId,
      taskId,
      userId,
      action: ActivityAction.TAGS_UPDATED,
      details: { newTagIds },
    }),
    
  bulkArchive: (teamId: string, projectId: string, userId: string, count: number) =>
    logActivity({
      teamId,
      projectId,
      userId,
      action: ActivityAction.BULK_ARCHIVE,
      details: { count },
    }),
};