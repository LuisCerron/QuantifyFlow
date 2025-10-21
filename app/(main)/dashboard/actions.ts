// /app/(main)/dashboard/actions.ts
'use server';
import { enrichTaskWithDetails } from '@/services/kanbanService';
import { db } from '@/lib/firebase';
import { Task, TaskWithDetails, TimeLog, User } from '@/types';
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
// Define los tipos de retorno para mayor claridad

interface TaskStats {
  todo: number;
  inProgress: number;
  done: number;
}

interface AdminDashboardData {
  projectCount: number;
  taskStats: TaskStats;
  totalHoursLogged: number;
}
export interface MemberTask {
  id: string;
  title: string;
  status: Task['status'];
  priority: Task['priority'];
}

export async function getUserRoleAndTeam(userId: string): Promise<{ role: string; teamId: string } | null> {
  noStore();
  console.log(`[Service] Buscando rol y equipo para el userId: ${userId}`);

  const teamMembersRef = collection(db, 'teamMembers');
  const q = query(teamMembersRef, where('userId', '==', userId));
  
  const querySnapshot = await getDocs(q);
  console.log(`[Service] Se encontraron ${querySnapshot.size} membresías para el usuario.`);

  if (querySnapshot.empty) {
    console.warn(`[Service] El usuario ${userId} no pertenece a ningún equipo.`);
    return null; 
  }

  const memberDoc = querySnapshot.docs[0];
  const data = memberDoc.data();

  if (!data) {
    console.error(`[Service] El documento de membresía para ${userId} está vacío.`);
    return null;
  }

  const result = { 
    role: data.rol || 'member',
    teamId: data.teamId        
  };
  
  console.log('[Service] Rol y equipo encontrados:', result);
  return result;
}
export async function getAdminDashboardData(teamId: string): Promise<AdminDashboardData> {
  noStore();
  console.log(`[Service] Obteniendo datos del dashboard de admin para el teamId: ${teamId}`);

  const projectsRef = collection(db, 'projects');
  const tasksRef = collection(db, 'tasks');
  const timeLogRef = collection(db, 'timeLog');

  // Ejecuta todas las consultas en paralelo para mayor eficiencia
  const [projectsSnapshot, tasksSnapshot, timeLogSnapshot] = await Promise.all([
    getDocs(query(projectsRef, where('teamId', '==', teamId))),
    getDocs(query(tasksRef, where('teamId', '==', teamId))),
    getDocs(query(timeLogRef, where('teamId', '==', teamId)))
  ]);

  console.log(`[Service] Proyectos: ${projectsSnapshot.size}, Tareas: ${tasksSnapshot.size}, Logs de tiempo: ${timeLogSnapshot.size}`);

  // 1. Contar proyectos
  const projectCount = projectsSnapshot.size;

  // 2. Obtener estadísticas de tareas
  const taskStats: TaskStats = { todo: 0, inProgress: 0, done: 0 };
  tasksSnapshot.forEach(doc => {
    const task = doc.data() as Task;
    // CORREGIDO: Se usa 'status' en lugar de 'estado' y los valores correctos
    if (task.status === 'done') taskStats.done++;
    else if (task.status === 'in-progress') taskStats.inProgress++;
    else taskStats.todo++;
  });

  // 3. Sumar horas registradas
  let totalMillis = 0;
  timeLogSnapshot.forEach(doc => {
    const log = doc.data() as TimeLog;
    // CORREGIDO: Se usa 'startTime' y 'endTime' en lugar de 'tiempoInicio'/'tiempoFin'
    const startTime = (log.startTime as unknown as Timestamp).toMillis();
    const endTime = (log.endTime as unknown as Timestamp)?.toMillis() || startTime;
    totalMillis += (endTime - startTime);
  });
  const totalHoursLogged = Math.floor(totalMillis / (1000 * 60 * 60));

  const result = { projectCount, taskStats, totalHoursLogged };
  console.log('[Service] Datos del dashboard de admin generados:', result);
  
  return result;
}

export async function getMemberDashboardData(userId: string): Promise<TaskWithDetails[]> {
  noStore();
  console.log(`[Service] Obteniendo tareas detalladas para el miembro: ${userId}`);
  
  const tasksRef = collection(db, 'tasks');
  const q = query(tasksRef, where('assignedToId', '==', userId));
  const tasksSnapshot = await getDocs(q);
  const tasks: Task[] = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

  if (tasks.length === 0) {
      console.log(`[Service] No se encontraron tareas asignadas a ${userId}.`);
      return [];
  }

  const usersCache: Record<string, User> = {};
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    usersCache[userId] = { uid: userSnap.id, ...userSnap.data() } as User;
  }

  // Usamos la misma función auxiliar para enriquecer las tareas de este usuario
  const tasksWithDetails = await Promise.all(
    tasks.map(task => enrichTaskWithDetails(task, usersCache))
  );

  console.log(`[Service] Se encontraron y enriquecieron ${tasksWithDetails.length} tareas para el miembro.`);
  return tasksWithDetails;
}
