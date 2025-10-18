// /app/(main)/dashboard/actions.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';

// Tipos para los datos del dashboard
export interface AdminDashboardData {
  projectCount: number;
  taskStats: {
    pending: number;
    inProgress: number;
    completed: number;
  };
  totalHoursLogged: number;
}

export interface MemberTask {
  id: string;
  titulo: string;
  estado: 'pending' | 'inProgress' | 'completed';
  prioridad: 'low' | 'medium' | 'high';
}

/**
 * Obtiene el rol y el teamId de un usuario.
 */
export async function getUserRoleAndTeam(userId: string): Promise<{ role: string; teamId: string } | null> {
  noStore(); // Evita que esta función sea cacheada estáticamente
  const teamMembersRef = collection(db, 'teamMembers');
  const q = query(teamMembersRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null; // El usuario no pertenece a ningún equipo
  }

  const memberDoc = querySnapshot.docs[0];
  const data = memberDoc.data();
  return { role: data.role || 'member', teamId: data.teamId };
}

/**
 * Obtiene las estadísticas para el dashboard de un Administrador.
 */
export async function getAdminDashboardData(teamId: string): Promise<AdminDashboardData> {
  noStore();
  const projectsRef = collection(db, 'projects');
  const tasksRef = collection(db, 'tasks');
  const timeLogRef = collection(db, 'timeLog');

  // 1. Contar proyectos
  const projectsQuery = query(projectsRef, where('teamId', '==', teamId));
  const projectsSnapshot = await getDocs(projectsQuery);
  const projectCount = projectsSnapshot.size;

  // 2. Obtener estadísticas de tareas
  const tasksQuery = query(tasksRef, where('teamId', '==', teamId));
  const tasksSnapshot = await getDocs(tasksQuery);
  const taskStats = { pending: 0, inProgress: 0, completed: 0 };
  tasksSnapshot.forEach(doc => {
    const task = doc.data();
    if (task.estado === 'completed') taskStats.completed++;
    else if (task.estado === 'inProgress') taskStats.inProgress++;
    else taskStats.pending++;
  });

  // 3. Sumar horas registradas
  const timeLogQuery = query(timeLogRef, where('teamId', '==', teamId));
  const timeLogSnapshot = await getDocs(timeLogQuery);
  let totalMillis = 0;
  timeLogSnapshot.forEach(doc => {
    const log = doc.data();
    const startTime = (log.tiempoInicio as Timestamp).toMillis();
    const endTime = (log.tiempoFin as Timestamp)?.toMillis() || startTime; // Si no hay fin, no suma tiempo
    totalMillis += (endTime - startTime);
  });
  const totalHoursLogged = Math.floor(totalMillis / (1000 * 60 * 60));

  return { projectCount, taskStats, totalHoursLogged };
}

/**
 * Obtiene las tareas asignadas para el dashboard de un Miembro.
 */
export async function getMemberDashboardData(userId: string): Promise<MemberTask[]> {
  noStore();
  const tasksRef = collection(db, 'tasks');
  const q = query(tasksRef, where('usuarioAsignadoId', '==', userId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    titulo: doc.data().titulo,
    estado: doc.data().estado,
    prioridad: doc.data().prioridad,
  } as MemberTask));
}