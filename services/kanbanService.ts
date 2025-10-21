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
} from 'firebase/firestore';
import type { Task, Subtask, Tag, User, ActivityLog, TaskWithDetails } from '@/types';

// Helper para crear logs de actividad
const createActivityLog = async (logData: Omit<ActivityLog, 'id' | 'createdAt'>) => {
  try {
    await addDoc(collection(db, 'activityLog'), {
      ...logData,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error creating activity log:", error);
  }
};

// Obtiene todas las tareas y sus detalles para un proyecto específico
export const getProjectTasks = async (projectId: string, teamId: string): Promise<TaskWithDetails[]> => {
  const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectId));
  const tasksSnapshot = await getDocs(tasksQuery);
  const tasks: Task[] = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

  // Optimización: Recolectar todos los IDs para hacer menos consultas
  const userIds = new Set<string>();
  tasks.forEach(task => {
    if (task.assignedToId) userIds.add(task.assignedToId);
  });

  let users: Record<string, User> = {};
  if (userIds.size > 0) {
    const usersQuery = query(collection(db, 'users'), where('uid', 'in', Array.from(userIds)));
    const usersSnapshot = await getDocs(usersQuery);
    usersSnapshot.forEach(doc => {
        const userData = doc.data() as User;
        users[doc.id] = { ...userData, uid: doc.id };
    });
  }

  // Obtener subtareas, etiquetas para cada tarea
  const tasksWithDetails = await Promise.all(
    tasks.map(async (task) => {
      // Subtareas
      const subtasksQuery = query(collection(db, 'subtasks'), where('taskId', '==', task.id));
      const subtasksSnapshot = await getDocs(subtasksQuery);
      const subtasks = subtasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subtask));

      // Etiquetas (a través de taskTags)
      const taskTagsQuery = query(collection(db, 'taskTags'), where('taskId', '==', task.id));
      const taskTagsSnapshot = await getDocs(taskTagsQuery);
      const tagIds = taskTagsSnapshot.docs.map(doc => doc.data().tagId);
      let tags: Tag[] = [];
      if (tagIds.length > 0) {
        // Firestore limita 'in' a 30 elementos, si tienes más, necesitas dividir la consulta
        const tagsQuery = query(collection(db, 'tags'), where('__name__', 'in', tagIds));
        const tagsSnapshot = await getDocs(tagsQuery);
        tags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
      }
      
      return {
        ...task,
        assignedTo: task.assignedToId ? users[task.assignedToId] : undefined,
        subtasks,
        tags,
      };
    })
  );

  return tasksWithDetails;
};

// Actualiza el estado de una tarea (usado para Drag-and-Drop)
export const updateTaskStatus = async (
    taskId: string, 
    newStatus: 'todo' | 'in-progress' | 'done',
    userId: string,
    teamId: string,
) => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, { status: newStatus, updatedAt: Timestamp.now() });
  
  await createActivityLog({
    taskId,
    teamId,
    userId,
    action: 'status_change',
    details: { newStatus },
  });
};


// Actualiza una subtarea y verifica si la tarea principal debe completarse
export const updateSubtaskCompletion = async (
    subtaskId: string, 
    taskId: string, 
    completed: boolean,
    userId: string,
    teamId: string,
) => {
  const subtaskRef = doc(db, 'subtasks', subtaskId);
  await updateDoc(subtaskRef, { completed });

  await createActivityLog({
      taskId,
      teamId,
      userId,
      action: completed ? 'subtask_completed' : 'subtask_uncompleted',
      details: { subtaskId }
  });
  
  // Lógica para auto-completar la tarea principal
  const subtasksQuery = query(collection(db, 'subtasks'), where('taskId', '==', taskId));
  const subtasksSnapshot = await getDocs(subtasksQuery);
  const allSubtasks = subtasksSnapshot.docs.map(d => d.data() as Subtask);
  
  const allCompleted = allSubtasks.every(st => st.completed);

  if (allCompleted && allSubtasks.length > 0) {
    await updateTaskStatus(taskId, 'done', userId, teamId);
  }
};


export const getTeamMembersForFilter = async (teamId: string): Promise<User[]> => {
    const membersQuery = query(collection(db, "teamMembers"), where("teamId", "==", teamId));
    const membersSnap = await getDocs(membersQuery);
    const userIds = membersSnap.docs.map(doc => doc.data().userId);

    if (userIds.length === 0) return [];

    const usersQuery = query(collection(db, "users"), where("uid", "in", userIds));
    const usersSnap = await getDocs(usersQuery);

    return usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
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

    await batch.commit();

    await createActivityLog({
        taskId: taskRef.id,
        teamId: taskData.teamId,
        userId: taskData.createdBy,
        action: 'task_created',
        details: { title: taskData.title },
    });

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

    await createActivityLog({
        taskId,
        teamId,
        userId,
        action: 'task_updated',
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

    await batch.commit();

    await createActivityLog({
        taskId,
        teamId,
        userId,
        action: 'task_deleted',
    });
};


export const addSubtask = async (taskId: string, title: string, userId: string, teamId: string): Promise<string> => {
    const newSubtaskRef = await addDoc(collection(db, 'subtasks'), {
        taskId,
        title,
        completed: false,
        createdAt: Timestamp.now(),
    });

    await createActivityLog({
        taskId,
        teamId,
        userId,
        action: 'subtask_added',
        details: { title },
    });

    return newSubtaskRef.id;
};

export const removeSubtask = async (subtaskId: string, taskId: string, userId: string, teamId: string) => {
    await deleteDoc(doc(db, 'subtasks', subtaskId));

    await createActivityLog({
        taskId,
        teamId,
        userId,
        action: 'subtask_removed',
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

    await batch.commit();

    await createActivityLog({
        taskId,
        teamId,
        userId,
        action: 'tags_updated',
        details: { newTagIds },
    });
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

  await createActivityLog({
    taskId,
    teamId,
    userId,
    action: 'subtask_updated',
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

    // Referencia al documento de la tarea padre (esto sigue siendo correcto)
    const taskRef = doc(db, "tasks", taskId);
    
    // --- CORRECCIÓN AQUÍ ---
    // Apunta a la colección raíz 'subtasks' usando el ID de la subtarea
    const subtaskRef = doc(db, "subtasks", subtaskId);

    // 1. Actualiza el campo 'completed' de la subtarea
    batch.update(subtaskRef, { completed });

    // 2. Actualiza el campo 'updatedAt' de la tarea padre para reflejar el cambio
    batch.update(taskRef, { updatedAt: new Date() });

    // Ejecuta ambas operaciones de forma atómica
    await batch.commit();
    console.log(`Subtarea ${subtaskId} actualizada a: ${completed}`);
  } catch (error) {
    console.error("Error al actualizar la subtarea:", error);
    // Relanza el error para que el componente pueda manejarlo
    throw new Error("No se pudo actualizar el estado de la subtarea.");
  }
};

export const enrichTaskWithDetails = async (task: Task, usersCache: Record<string, User>): Promise<TaskWithDetails> => {
  // 1. Obtener subtareas
  const subtasksQuery = query(collection(db, 'subtasks'), where('taskId', '==', task.id));
  
  // 2. Obtener IDs de etiquetas
  const taskTagsQuery = query(collection(db, 'taskTags'), where('taskId', '==', task.id));

  // Ejecutamos ambas consultas en paralelo para ser más eficientes
  const [subtasksSnapshot, taskTagsSnapshot] = await Promise.all([
    getDocs(subtasksQuery),
    getDocs(taskTagsQuery)
  ]);

  const subtasks = subtasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subtask));
  const tagIds = taskTagsSnapshot.docs.map(doc => doc.data().tagId);

  // 3. Obtener los documentos de las etiquetas si existen IDs
  let tags: Tag[] = [];
  if (tagIds.length > 0) {
    const tagsQuery = query(collection(db, 'tags'), where('__name__', 'in', tagIds));
    const tagsSnapshot = await getDocs(tagsQuery);
    tags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
  }

  // 4. Construir y devolver el objeto completo
  return {
    ...task,
    assignedTo: task.assignedToId ? usersCache[task.assignedToId] : undefined,
    subtasks,
    tags,
  };
};
export const getCurrentUserTasks = async (userId: string): Promise<TaskWithDetails[]> => {
  // 1. Consulta inicial: Obtener todas las tareas asignadas al usuario actual.
  const tasksQuery = query(collection(db, 'tasks'), where('assignedToId', '==', userId));
  const tasksSnapshot = await getDocs(tasksQuery);
  const tasks: Task[] = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

  // Si el usuario no tiene tareas asignadas, retornamos un array vacío para evitar trabajo innecesario.
  if (tasks.length === 0) {
    return [];
  }

  // 2. Obtener los datos del usuario actual una sola vez, ya que todas las tareas le pertenecen.
  const userRef = doc(db, 'users', userId);
  const userSnapshot = await getDoc(userRef);
  const currentUser = userSnapshot.exists() ? ({ uid: userSnapshot.id, ...userSnapshot.data() } as User) : undefined;

  // 3. Para cada tarea, obtener sus subtareas y etiquetas (lógica idéntica a tu función original).
  const tasksWithDetails = await Promise.all(
    tasks.map(async (task) => {
      // Obtener subtareas de la tarea actual
      const subtasksQuery = query(collection(db, 'subtasks'), where('taskId', '==', task.id));
      const subtasksSnapshot = await getDocs(subtasksQuery);
      const subtasks = subtasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subtask));

      // Obtener etiquetas a través de la colección intermedia 'taskTags'
      const taskTagsQuery = query(collection(db, 'taskTags'), where('taskId', '==', task.id));
      const taskTagsSnapshot = await getDocs(taskTagsQuery);
      const tagIds = taskTagsSnapshot.docs.map(doc => doc.data().tagId);

      let tags: Tag[] = [];
      if (tagIds.length > 0) {
        // Recordar la limitación de Firestore: la cláusula 'in' soporta hasta 30 elementos.
        const tagsQuery = query(collection(db, 'tags'), where('__name__', 'in', tagIds));
        const tagsSnapshot = await getDocs(tagsQuery);
        tags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
      }
      
      // 4. Combinar toda la información en un solo objeto.
      return {
        ...task,
        assignedTo: currentUser, // Asignamos el objeto del usuario que ya obtuvimos.
        subtasks,
        tags,
      };
    })
  );

  return tasksWithDetails;
};