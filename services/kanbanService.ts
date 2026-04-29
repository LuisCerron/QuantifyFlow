import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  writeBatch,
  getDoc,
  deleteDoc,
  orderBy,
  deleteField,
} from 'firebase/firestore';
import type { Task, Subtask, Tag, User, TaskWithDetails } from '@/types';
import { chunkArray } from '@/lib/utils/helpers';
import { logActivity, ActivityAction } from './activityLogService';
import { getBlockedByTasks, hasDependents } from './dependencyService';
import { serializeForClient } from '@/lib/utils/serializer';

const FIREBASE_IN_LIMIT = 10;

async function batchFetchSubtasks(taskIds: string[]): Promise<Map<string, Subtask[]>> {
  const subtasksByTaskId = new Map<string, Subtask[]>();
  if (taskIds.length === 0) return subtasksByTaskId;

  const chunks = chunkArray(taskIds, FIREBASE_IN_LIMIT);
  await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(collection(db, 'subtasks'), where('taskId', 'in', chunk));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach((d) => {
        const taskId = d.data().taskId;
        if (!subtasksByTaskId.has(taskId)) subtasksByTaskId.set(taskId, []);
        subtasksByTaskId.get(taskId)!.push({ id: d.id, ...d.data() } as Subtask);
      });
    })
  );
  return subtasksByTaskId;
}

async function batchFetchTags(taskIds: string[]): Promise<Map<string, Tag[]>> {
  const tagsByTaskId = new Map<string, Tag[]>();
  if (taskIds.length === 0) return tagsByTaskId;

  const taskTagsByTaskId = new Map<string, string[]>();
  
  const chunks = chunkArray(taskIds, FIREBASE_IN_LIMIT);
  await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(collection(db, 'taskTags'), where('taskId', 'in', chunk));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach((d) => {
        const { taskId, tagId } = d.data();
        if (!taskTagsByTaskId.has(taskId)) taskTagsByTaskId.set(taskId, []);
        taskTagsByTaskId.get(taskId)!.push(tagId);
      });
    })
  );

  const allTagIds = [...new Set([...taskTagsByTaskId.values()].flat())];
  if (allTagIds.length === 0) return tagsByTaskId;

  const tagCache = new Map<string, Tag>();
  const tagIdChunks = chunkArray(allTagIds, FIREBASE_IN_LIMIT);
  await Promise.all(
    tagIdChunks.map(async (chunk) => {
      const q = query(collection(db, 'tags'), where('__name__', 'in', chunk));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach((d) => {
        tagCache.set(d.id, { id: d.id, ...d.data() } as Tag);
      });
    })
  );

  taskTagsByTaskId.forEach((tagIds, taskId) => {
    const tags = tagIds.map((tagId) => tagCache.get(tagId)).filter(Boolean) as Tag[];
    tagsByTaskId.set(taskId, tags);
  });

  return tagsByTaskId;
}

async function batchFetchUsers(userIds: string[]): Promise<Record<string, User>> {
  const users: Record<string, User> = {};
  if (userIds.length === 0) return users;

  const uniqueIds = [...new Set(userIds)];
  const chunks = chunkArray(uniqueIds, FIREBASE_IN_LIMIT);
  await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach((d) => {
        users[d.id] = { uid: d.id, ...d.data() } as User;
      });
    })
  );
  return users;
}

export const getProjectTasks = async (projectId: string, teamId: string): Promise<TaskWithDetails[]> => {
  const tasksQuery = query(
    collection(db, 'tasks'), 
    where('projectId', '==', projectId),
    where('isArchived', '==', false)
  );
  const tasksSnapshot = await getDocs(tasksQuery);
  const tasks: Task[] = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

  if (tasks.length === 0) return [];

  const taskIds = tasks.map(t => t.id);
  const userIds = tasks.flatMap(t => t.assignedToIds || []);

  const [users, subtasksByTaskId, tagsByTaskId] = await Promise.all([
    batchFetchUsers(userIds),
    batchFetchSubtasks(taskIds),
    batchFetchTags(taskIds),
  ]);

  return tasks.map(task => serializeForClient({
    ...task,
    assignedTo: (task.assignedToIds || []).map(id => users[id]).filter(Boolean),
    subtasks: subtasksByTaskId.get(task.id) || [],
    tags: tagsByTaskId.get(task.id) || [],
  }));
};

export const updateTaskStatus = async (
  taskId: string,
  newStatus: 'todo' | 'in-progress' | 'done',
  userId: string,
  teamId: string,
) => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, { status: newStatus, updatedAt: Timestamp.now() });

  await logActivity({
    taskId,
    teamId,
    userId,
    action: ActivityAction.TASK_MOVED,
    details: { newStatus },
  });
};

export const updateSubtaskCompletion = async (
  subtaskId: string,
  taskId: string,
  completed: boolean,
  userId: string,
  teamId: string,
  newStatus?: 'todo' | 'in-progress' | 'done',
) => {
  const batch = writeBatch(db);
  const subtaskRef = doc(db, 'subtasks', subtaskId);
  batch.update(subtaskRef, { completed });

  // Activity log in the same batch
  const activityRef = doc(collection(db, 'activityLog'));
  batch.set(activityRef, {
    taskId,
    teamId,
    userId,
    action: completed ? ActivityAction.SUBTASK_COMPLETED : ActivityAction.SUBTASK_UNCOMPLETED,
    details: { subtaskId },
    createdAt: Timestamp.now(),
  });

  // If client already computed the new status, update task status in the same batch
  if (newStatus) {
    const taskRef = doc(db, 'tasks', taskId);
    batch.update(taskRef, { status: newStatus, updatedAt: Timestamp.now() });

    // Also log the status change
    const statusActivityRef = doc(collection(db, 'activityLog'));
    batch.set(statusActivityRef, {
      taskId,
      teamId,
      userId,
      action: ActivityAction.TASK_MOVED,
      details: { newStatus },
      createdAt: Timestamp.now(),
    });
  } else {
    // Fallback: update task timestamp only
    const taskRef = doc(db, 'tasks', taskId);
    batch.update(taskRef, { updatedAt: Timestamp.now() });
  }

  await batch.commit();
};


export const getTeamMembersForFilter = async (teamId: string): Promise<User[]> => {
  const membersQuery = query(collection(db, "teamMembers"), where("teamId", "==", teamId));
  const membersSnap = await getDocs(membersQuery);
  const userIds = membersSnap.docs.map(doc => doc.data().userId);

  if (userIds.length === 0) return [];

  const users = await batchFetchUsers(userIds);
  return Object.values(users);
}


type CreateTaskData = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
  subtaskTitles?: string[];
  tagIds?: string[];
};

export const createTask = async (taskData: CreateTaskData): Promise<string> => {
  const batch = writeBatch(db);
  const taskRef = doc(collection(db, 'tasks'));

  batch.set(taskRef, {
    ...taskData,
    status: 'todo',
    isArchived: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  taskData.subtaskTitles?.forEach(title => {
    if (title.trim() === '') return;
    const subtaskRef = doc(collection(db, 'subtasks'));
    batch.set(subtaskRef, { taskId: taskRef.id, title, completed: false, createdAt: Timestamp.now() });
  });

  taskData.tagIds?.forEach(tagId => {
    const taskTagRef = doc(collection(db, 'taskTags'));
    batch.set(taskTagRef, { taskId: taskRef.id, tagId });
  });

  // Add activity log to the same batch
  const activityRef = doc(collection(db, 'activityLog'));
  batch.set(activityRef, {
    taskId: taskRef.id,
    teamId: taskData.teamId,
    projectId: taskData.projectId,
    userId: taskData.createdBy,
    action: ActivityAction.TASK_CREATED,
    details: { title: taskData.title },
    createdAt: Timestamp.now(),
  });

  await batch.commit();
  return taskRef.id;
};


export const updateTask = async (
  taskId: string,
  updates: Partial<Omit<Task, 'id' | 'createdAt'>>,
  userId: string,
  teamId: string
) => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, { ...updates, updatedAt: Timestamp.now() });

  await logActivity({
    taskId,
    teamId,
    projectId: updates.projectId,
    userId,
    action: ActivityAction.TASK_UPDATED,
    details: { updatedFields: Object.keys(updates) },
  });
};

export const deleteTask = async (taskId: string, userId: string, teamId: string) => {
  const batch = writeBatch(db);

  const taskRef = doc(db, 'tasks', taskId);
  batch.delete(taskRef);

  const subtasksQuery = query(collection(db, 'subtasks'), where('taskId', '==', taskId));
  const subtasksSnapshot = await getDocs(subtasksQuery);
  subtasksSnapshot.forEach(doc => batch.delete(doc.ref));

  const taskTagsQuery = query(collection(db, 'taskTags'), where('taskId', '==', taskId));
  const taskTagsSnapshot = await getDocs(taskTagsQuery);
  taskTagsSnapshot.forEach(doc => batch.delete(doc.ref));

  // Add activity log to the same batch
  const activityRef = doc(collection(db, 'activityLog'));
  batch.set(activityRef, {
    taskId,
    teamId,
    userId,
    action: ActivityAction.TASK_DELETED,
    createdAt: Timestamp.now(),
  });

  await batch.commit();
};


export const addSubtask = async (taskId: string, title: string, userId: string, teamId: string): Promise<string> => {
  const newSubtaskRef = await addDoc(collection(db, 'subtasks'), {
    taskId,
    title,
    completed: false,
    createdAt: Timestamp.now(),
  });

  await logActivity({
    taskId,
    teamId,
    userId,
    action: ActivityAction.SUBTASK_CREATED,
    details: { title },
  });

  return newSubtaskRef.id;
};

export const removeSubtask = async (subtaskId: string, taskId: string, userId: string, teamId: string) => {
  await deleteDoc(doc(db, 'subtasks', subtaskId));

  await logActivity({
    taskId,
    teamId,
    userId,
    action: ActivityAction.SUBTASK_DELETED,
    details: { subtaskId },
  });
};

export const setTaskTags = async (taskId: string, newTagIds: string[], userId: string, teamId: string) => {
  const batch = writeBatch(db);

  const oldTagsQuery = query(collection(db, 'taskTags'), where('taskId', '==', taskId));
  const oldTagsSnapshot = await getDocs(oldTagsQuery);
  oldTagsSnapshot.forEach(doc => batch.delete(doc.ref));

  newTagIds.forEach(tagId => {
    const newTaskTagRef = doc(collection(db, 'taskTags'));
    batch.set(newTaskTagRef, { taskId, tagId });
  });

  // Add activity log to the same batch
  const activityRef = doc(collection(db, 'activityLog'));
  batch.set(activityRef, {
    taskId,
    teamId,
    userId,
    action: ActivityAction.TAGS_UPDATED,
    details: { newTagIds },
    createdAt: Timestamp.now(),
  });

  await batch.commit();
};

export const updateSubtaskTitle = async (
  subtaskId: string,
  newTitle: string,
  userId: string,
  teamId: string,
  taskId: string
) => {
  if (!newTitle.trim()) {
    throw new Error("Subtask title cannot be empty.");
  }
  const subtaskRef = doc(db, 'subtasks', subtaskId);
  await updateDoc(subtaskRef, { title: newTitle });

  await logActivity({
    taskId,
    teamId,
    userId,
    action: ActivityAction.SUBTASK_UPDATED,
    details: { subtaskId, newTitle },
  });
};

export const updateSubtaskStatus = async (
  taskId: string,
  subtaskId: string,
  completed: boolean
) => {
  try {
    const batch = writeBatch(db);

    const taskRef = doc(db, "tasks", taskId);
    const subtaskRef = doc(db, "subtasks", subtaskId);

    batch.update(subtaskRef, { completed });
    batch.update(taskRef, { updatedAt: new Date() });

    await batch.commit();
    console.log(`Subtarea ${subtaskId} actualizada a: ${completed}`);
  } catch (error) {
    console.error("Error al actualizar la subtarea:", error);
    throw new Error("No se pudo actualizar el estado de la subtarea.");
  }
};

export const enrichTaskWithDetails = async (task: Task, usersCache: Record<string, User>): Promise<TaskWithDetails> => {
  const [subtasksSnapshot, taskTagsSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'subtasks'), where('taskId', '==', task.id))),
    getDocs(query(collection(db, 'taskTags'), where('taskId', '==', task.id)))
  ]);

  const subtasks = subtasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subtask));
  const tagIds = taskTagsSnapshot.docs.map(doc => doc.data().tagId);

  const tags = tagIds.length > 0 
    ? (await batchFetchTags([task.id])).get(task.id) || []
    : [];

  return serializeForClient({
    ...task,
    assignedTo: (task.assignedToIds || []).map(id => usersCache[id]).filter(Boolean),
    subtasks,
    tags,
  });
};

export const getCurrentUserTasks = async (userId: string): Promise<TaskWithDetails[]> => {
  const tasksQuery = query(
    collection(db, 'tasks'), 
    where('assignedToIds', 'array-contains', userId),
    where('isArchived', '==', false)
  ); 
  const tasksSnapshot = await getDocs(tasksQuery);
  const tasks: Task[] = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

  if (tasks.length === 0) return [];

  const taskIds = tasks.map(t => t.id);
  const userIds = tasks.flatMap(t => t.assignedToIds || []);

  const [users, subtasksByTaskId, tagsByTaskId] = await Promise.all([
    batchFetchUsers(userIds),
    batchFetchSubtasks(taskIds),
    batchFetchTags(taskIds),
  ]);

  return tasks.map(task => serializeForClient({
    ...task,
    assignedTo: (task.assignedToIds || []).map(id => users[id]).filter(Boolean),
    subtasks: subtasksByTaskId.get(task.id) || [],
    tags: tagsByTaskId.get(task.id) || [],
  }));
};

export const archiveTask = async (
  taskId: string, 
  userId: string, 
  teamId: string
) => {
  const taskRef = doc(db, 'tasks', taskId);
  
  await updateDoc(taskRef, {
    isArchived: true,
    archivedAt: Timestamp.now(),
    archivedBy: userId
  });

  await logActivity({
    taskId,
    teamId,
    userId,
    action: ActivityAction.TASK_ARCHIVED,
  });
};

export const getArchivedTasks = async (projectId: string, teamId: string): Promise<TaskWithDetails[]> => {
  console.log(`[getArchivedTasks] Buscando tareas archivadas para proyecto: ${projectId}`);
  const tasksQuery = query(
    collection(db, 'tasks'),
    where('projectId', '==', projectId),
    where('isArchived', '==', true),
    orderBy('archivedAt', 'desc')
  );

  const tasksSnapshot = await getDocs(tasksQuery);
  const tasks: Task[] = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  console.log(`[getArchivedTasks] ${tasks.length} tareas archivadas encontradas.`);

  if (tasks.length === 0) return [];

  const taskIds = tasks.map(t => t.id);
  const userIds = [...new Set(tasks.flatMap(t => [...(t.assignedToIds || []), t.archivedBy || []]).flat())];

  const [users, subtasksByTaskId, tagsByTaskId] = await Promise.all([
    batchFetchUsers(userIds),
    batchFetchSubtasks(taskIds),
    batchFetchTags(taskIds),
  ]);

  console.log(`[getArchivedTasks] Enriquecimiento completo.`);
  return tasks.map(task => serializeForClient({
    ...task,
    assignedTo: (task.assignedToIds || []).map(id => users[id]).filter(Boolean),
    archivedByUser: task.archivedBy ? users[task.archivedBy] : undefined,
    subtasks: subtasksByTaskId.get(task.id) || [],
    tags: tagsByTaskId.get(task.id) || [],
  } as TaskWithDetails));
};

export const archiveAllDoneTasks = async (
  projectId: string,
  userId: string,
  teamId: string
): Promise<{ archivedCount: number }> => {
  
  const tasksToArchiveQuery = query(
    collection(db, 'tasks'),
    where('projectId', '==', projectId),
    where('status', '==', 'done'),
    where('isArchived', '==', false)
  );

  const querySnapshot = await getDocs(tasksToArchiveQuery);
  const tasksToArchive = querySnapshot.docs;

  if (tasksToArchive.length === 0) {
    console.log("[archiveAllDoneTasks] No hay tareas completadas para archivar.");
    return { archivedCount: 0 };
  }

  if (tasksToArchive.length >= 500) {
     console.warn("[archiveAllDoneTasks] Se encontraron más de 499 tareas para archivar. Solo se procesarán las primeras 499.");
  }
  
  const batch = writeBatch(db);
  let count = 0;

  for (const taskDoc of tasksToArchive) {
     if (count >= 499) break;
     const taskRef = doc(db, 'tasks', taskDoc.id);
     batch.update(taskRef, {
        isArchived: true,
        archivedAt: Timestamp.now(),
        archivedBy: userId
     });
     count++;
  }

  await batch.commit();

  await logActivity({
     projectId,
     teamId,
     userId,
     action: ActivityAction.BULK_ARCHIVE,
     details: { count },
  });

  console.log(`[archiveAllDoneTasks] ${count} tareas completadas fueron archivadas.`);
  return { archivedCount: count };
};

export const unarchiveTask = async (
  taskId: string,
  userId: string,
  teamId: string
) => {
  const taskRef = doc(db, 'tasks', taskId);

  await updateDoc(taskRef, {
    isArchived: false,
    archivedAt: deleteField(),
    archivedBy: deleteField()
  });

  await logActivity({
    taskId,
    teamId,
    userId,
    action: ActivityAction.TASK_UNARCHIVED,
  });
};

export async function canMoveTask(
  taskId: string,
  newStatus: string,
  allTasksStatusMap: Map<string, string>
): Promise<{ allowed: boolean; blockedBy?: string[] }> {
  if (newStatus !== 'todo') {
    const blockers = await getBlockedByTasks(taskId);
    const activeBlockerIds = blockers
      .filter((dep) => allTasksStatusMap.get(dep.fromTaskId) !== 'done')
      .map((dep) => dep.fromTaskId);

    if (activeBlockerIds.length > 0) {
      return { allowed: false, blockedBy: activeBlockerIds };
    }
  }

  return { allowed: true };
}

export async function canArchiveTask(
  taskId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const dependents = await hasDependents(taskId);
  if (dependents) {
    return {
      allowed: false,
      reason: 'This task has dependencies. Remove them first.',
    };
  }
  return { allowed: true };
}

export async function canDeleteTask(
  taskId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const dependents = await hasDependents(taskId);
  if (dependents) {
    return {
      allowed: false,
      reason: 'This task has dependencies. Remove them first.',
    };
  }
  return { allowed: true };
}