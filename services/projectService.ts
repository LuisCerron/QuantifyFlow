import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project } from '@/types'; // Asegúrate de que este tipo coincida con tu nueva estructura

/**
 * Obtiene todos los proyectos activos de un equipo y cuenta sus tareas.
 * @param teamId - El ID del equipo.
 * @returns Una promesa que resuelve a un array de proyectos con taskCount.
 */
export async function getProjectsByTeamWithTaskCount(teamId: string): Promise<Project[]> {
  if (!teamId) return [];

  const projectsRef = collection(db, 'projects');
  // 👇 CAMBIO: Se busca por 'status' en lugar de 'estado'
  const projectsQuery = query(
    projectsRef,
    where('teamId', '==', teamId),
    where('status', '==', 'active')
  );

  const projectsSnapshot = await getDocs(projectsQuery);
  const projects = projectsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Project[];

  // Para cada proyecto, obtenemos el conteo de tareas
  const projectPromises = projects.map(async (project) => {
    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('projectId', '==', project.id));
    const tasksSnapshot = await getDocs(tasksQuery);

    return {
      ...project,
      taskCount: tasksSnapshot.size,
    };
  });

  return Promise.all(projectPromises);
}

/**
 * Crea un nuevo proyecto en Firestore.
 * @param projectData - Objeto con teamId, name y description.
 */
// 👇 CAMBIO: El parámetro ahora espera 'name' y 'description'
export async function createProject(projectData: { teamId: string; name: string; description: string; }) {
  // 👇 CAMBIO: La validación ahora comprueba 'name'
  if (!projectData.teamId || !projectData.name) {
    throw new Error("El ID del equipo y el nombre del proyecto son requeridos.");
  }

  const projectsRef = collection(db, 'projects');
  return await addDoc(projectsRef, {
    ...projectData,
    // 👇 CAMBIO: Se establece 'status' en lugar de 'estado'
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(), // Es buena práctica añadirlo también en la creación
  });
}
