import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, ProjectUrl, TaskCountBreakdown } from '@/types';
import { chunkArray } from '@/lib/utils/helpers';

const FIREBASE_IN_LIMIT = 10;

function serializeForClient<T extends Record<string, any>>(data: T): T {
  const serialized = { ...data } as Record<string, any>;
  
  for (const key in serialized) {
    const value = serialized[key];
    
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      serialized[key] = value.toDate().toISOString();
    }
    else if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      serialized[key] = new Date(value.seconds * 1000).toISOString();
    }
    else if (Array.isArray(value)) {
      serialized[key] = value.map((item: any) => 
        typeof item === 'object' && item !== null ? serializeForClient(item) : item
      );
    }
    else if (value && typeof value === 'object' && value !== null && !('toDate' in value) && !('seconds' in value)) {
      serialized[key] = serializeForClient(value);
    }
  }
  
  return serialized as T;
}

export interface CreateProjectData {
  teamId: string;
  name: string;
  description?: string;
  urls?: ProjectUrl[]; 
}

async function getTaskBreakdown(projectId: string): Promise<TaskCountBreakdown> {
  const tasksRef = collection(db, 'tasks');
  
  const baseQuery = query(
    tasksRef,
    where('projectId', '==', projectId),
    where('isArchived', '==', false)
  );

  const [allCount, todoCount, inProgressCount, doneCount] = await Promise.all([
    getCountFromServer(baseQuery),
    getCountFromServer(query(baseQuery, where('status', '==', 'todo'))),
    getCountFromServer(query(baseQuery, where('status', '==', 'in-progress'))),
    getCountFromServer(query(baseQuery, where('status', '==', 'done'))),
  ]);

  return {
    all: allCount.data().count,
    todo: todoCount.data().count,
    inProgress: inProgressCount.data().count,
    done: doneCount.data().count,
  };
}

async function getBatchTaskBreakdown(projectIds: string[]): Promise<Map<string, TaskCountBreakdown>> {
  const breakdownMap = new Map<string, TaskCountBreakdown>();
  if (projectIds.length === 0) return breakdownMap;

  const tasksRef = collection(db, 'tasks');
  
  const chunks = chunkArray(projectIds, FIREBASE_IN_LIMIT);
  
  const allTasksByProject = new Map<string, number>();
  const todoTasksByProject = new Map<string, number>();
  const inProgressTasksByProject = new Map<string, number>();
  const doneTasksByProject = new Map<string, number>();

  await Promise.all(
    chunks.map(async (chunk) => {
      const baseQuery = query(
        tasksRef,
        where('projectId', 'in', chunk),
        where('isArchived', '==', false)
      );

      const snapshot = await getDocs(baseQuery);
      snapshot.docs.forEach((d) => {
        const projectId = d.data().projectId;
        const status = d.data().status;
        allTasksByProject.set(projectId, (allTasksByProject.get(projectId) || 0) + 1);
        if (status === 'todo') todoTasksByProject.set(projectId, (todoTasksByProject.get(projectId) || 0) + 1);
        if (status === 'in-progress') inProgressTasksByProject.set(projectId, (inProgressTasksByProject.get(projectId) || 0) + 1);
        if (status === 'done') doneTasksByProject.set(projectId, (doneTasksByProject.get(projectId) || 0) + 1);
      });
    })
  );

  projectIds.forEach((projectId) => {
    breakdownMap.set(projectId, {
      all: allTasksByProject.get(projectId) || 0,
      todo: todoTasksByProject.get(projectId) || 0,
      inProgress: inProgressTasksByProject.get(projectId) || 0,
      done: doneTasksByProject.get(projectId) || 0,
    });
  });

  return breakdownMap;
}

/**
 * Obtiene todos los proyectos ACTIVOS de un equipo.
 * Ahora incluye el desglose de tareas (todo, inProgress, done).
 */
export async function getProjectsByTeamWithTaskCount(teamId: string): Promise<Project[]> {
  if (!teamId) return [];

  const projectsRef = collection(db, 'projects');
  const projectsQuery = query(
    projectsRef,
    where('teamId', '==', teamId),
    where('status', '==', 'active')
  );

  const projectsSnapshot = await getDocs(projectsQuery);
  const projects = projectsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      urls: data.urls || [],
    } as Project;
  });

  if (projects.length === 0) return [];

  const taskCountsMap = await getBatchTaskBreakdown(projects.map(p => p.id));

  return projects.map(project => serializeForClient({
    ...project,
    taskCounts: taskCountsMap.get(project.id) || { all: 0, todo: 0, inProgress: 0, done: 0 },
  }));
}

export async function getArchivedProjectsByTeamWithTaskCount(teamId: string): Promise<Project[]> {
  if (!teamId) return [];

  const projectsRef = collection(db, 'projects');
  const projectsQuery = query(
    projectsRef,
    where('teamId', '==', teamId),
    where('status', '==', 'archived')
  );

  const projectsSnapshot = await getDocs(projectsQuery);
  const projects = projectsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      urls: data.urls || [],
    } as Project;
  });

  if (projects.length === 0) return [];

  const taskCountsMap = await getBatchTaskBreakdown(projects.map(p => p.id));

  return projects.map(project => serializeForClient({
    ...project,
    taskCounts: taskCountsMap.get(project.id) || { all: 0, todo: 0, inProgress: 0, done: 0 },
  }));
}


export async function createProject(projectData: CreateProjectData) { 
  if (!projectData.teamId || !projectData.name) {
    throw new Error("El ID del equipo y el nombre del proyecto son requeridos.");
  }

  const projectsRef = collection(db, 'projects');
  return await addDoc(projectsRef, {
    ...projectData,
    description: projectData.description || "", 
    status: 'active',
    urls: projectData.urls || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  if (!projectId) return null;

  const projectRef = doc(db, 'projects', projectId);
  const projectSnap = await getDoc(projectRef);

  if (!projectSnap.exists()) {
    console.error("No se encontró el proyecto con ID:", projectId);
    return null;
  }

  const data = projectSnap.data();
const taskCounts = await getTaskBreakdown(projectId);

  return serializeForClient({
    id: projectSnap.id,
    ...data,
    urls: data.urls || [],
    taskCounts: taskCounts,
  } as Project);
}
export interface UpdateProjectData {
  name?: string;
  description?: string;
  urls?: ProjectUrl[];
}


export async function updateProject(
  projectId: string,
  dataToUpdate: UpdateProjectData
) {
  if (!projectId) {
    throw new Error("El ID del proyecto es requerido para actualizar.");
  }

  const projectRef = doc(db, 'projects', projectId);

  return await updateDoc(projectRef, {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveProject(projectId: string) {
  if (!projectId) {
    throw new Error("El ID del proyecto es requerido para archivar.");
  }

  const projectRef = doc(db, 'projects', projectId);

  return await updateDoc(projectRef, {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
}
export async function unarchivedProject(projectId: string) {
  if (!projectId) {
    throw new Error("El ID del proyecto es requerido para archivar.");
  }

  const projectRef = doc(db, 'projects', projectId);

  return await updateDoc(projectRef, {
    status: 'active',
    updatedAt: serverTimestamp(),
  });
}