// services/adminService.ts

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    orderBy,
    limit,
    getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    User,
    Team,
    Project,
    Task,
    ActivityLog,
    TeamMember,
    TaskCountBreakdown,
} from '@/types/index';
import {
    AdminDashboardData,
    TeamMemberWithDetails,
} from '@/types/dashboard-types';
import { getCurrentUserTasks } from './kanbanService';
import { chunkArray } from '@/lib/utils/helpers';
import { serializeForClient } from '@/lib/utils/serializer';

const FIREBASE_IN_LIMIT = 10;

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

export const getAdminDashboardData = async (
    teamId: string,
    adminUserId: string
): Promise<AdminDashboardData | null> => {
    console.log(
        `[AdminService] Iniciando la obtención de datos para el equipo: ${teamId}`
    );

    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);

    if (!teamSnap.exists()) {
        console.error(
            `[AdminService] ERROR: No se encontró el equipo con ID: ${teamId}`
        );
        return null;
    }
    const teamData = { id: teamSnap.id, ...teamSnap.data() } as Team;
    console.log(
        `[AdminService] ✅ Datos del equipo '${teamData.teamName}' obtenidos.`
    );

    try {
        const [
            members,
            projects,
            tasks,
            recentActivity,
            adminAssignedTasks,
        ] = await Promise.all([
            (async (): Promise<TeamMemberWithDetails[]> => {
                const membersQuery = query(
                    collection(db, 'teamMembers'),
                    where('teamId', '==', teamId)
                );
                const membersSnap = await getDocs(membersQuery);
                const memberDocsData = membersSnap.docs.map((d) => ({
                    id: d.id,
                    ...(d.data() as Omit<TeamMember, 'id'>),
                }));

                console.log(
                    `[AdminService] Obtenidos ${memberDocsData.length} registros de miembros.`
                );
                if (memberDocsData.length === 0) return [];

                const userIds = memberDocsData.map((m) => m.userId);
                const usersDataMap = await batchFetchUsers(userIds);

                const membersWithDetails: TeamMemberWithDetails[] = memberDocsData.map(
                    (memberDoc) => {
                        const userDetail = usersDataMap[memberDoc.userId];
                        return {
                            ...(userDetail || {
                                uid: memberDoc.userId,
                                displayName: 'Usuario Desconocido',
                                email: '',
                                preferences: { theme: 'light', colorPalette: 'default' },
                                createdAt: new Date(),
                            }),
                            role: memberDoc.rol,
                            teamMemberDocId: memberDoc.id,
                            joinedAt: memberDoc ? memberDoc.joinedAt : undefined,
                        };
                    }
                );
                console.log(
                    `[AdminService] ✅ Obtenidos detalles completos de ${membersWithDetails.length} miembros.`
                );
                return membersWithDetails;
            })(),

            (async (): Promise<Project[]> => {
                const projectsQuery = query(
                    collection(db, 'projects'),
                    where('teamId', '==', teamId),
                    where('status', '==', 'active'),
                    orderBy('updatedAt', 'desc'),
                    limit(6)
                );
                const projectsSnap = await getDocs(projectsQuery);
                const projectsData = projectsSnap.docs.map(
                    (d) =>
                    ({
                        id: d.id,
                        ...d.data(),
                        urls: d.data().urls || [],
                    } as Project)
                );

                console.log(
                    `[AdminService] Obtenidos ${projectsData.length} proyectos base.`
                );

                if (projectsData.length === 0) return [];

                const taskCountsMap = await getBatchTaskBreakdown(projectsData.map(p => p.id));

                const projectsWithCounts = projectsData.map(project => ({
                    ...project,
                    taskCounts: taskCountsMap.get(project.id) || { all: 0, todo: 0, inProgress: 0, done: 0 },
                }));

                console.log(
                    `[AdminService] ✅ Obtenidos ${projectsWithCounts.length} proyectos con conteo de tareas.`
                );
                return projectsWithCounts;
            })(),

            (async (): Promise<Task[]> => {
                const tasksQuery = query(
                    collection(db, 'tasks'),
                    where('teamId', '==', teamId),
                    orderBy('updatedAt', 'desc'),
                    limit(500)
                );
                const tasksSnap = await getDocs(tasksQuery);
                const tasksData = tasksSnap.docs.map(
                    (d) => ({ id: d.id, ...d.data() } as Task)
                );

                console.log(
                    `[AdminService] ✅ Obtenidas ${tasksData.length} tareas totales.`
                );
                return tasksData;
            })(),

            (async (): Promise<ActivityLog[]> => {
                const activityQuery = query(
                    collection(db, 'activityLog'),
                    where('teamId', '==', teamId),
                    orderBy('createdAt', 'desc'),
                    limit(20)
                );
                const activitySnap = await getDocs(activityQuery);
                const activityData = activitySnap.docs.map(
                    (d) => ({ id: d.id, ...d.data() } as ActivityLog)
                );

                console.log(
                    `[AdminService] ✅ Obtenidos ${activityData.length} registros de actividad reciente.`
                );
                return activityData;
            })(),

            getCurrentUserTasks(adminUserId).then((tasks) => {
                console.log(
                    `[AdminService] ✅ Obtenidas ${tasks.length} tareas asignadas al admin.`
                );
                return tasks;
            }),
        ]);

        const dashboardData: AdminDashboardData = serializeForClient({
            team: teamData,
            members,
            projects,
            tasks,
            recentActivity,
            adminAssignedTasks,
        });

        console.log(
            `[AdminService] 🚀 Ensamblaje de datos del dashboard de admin completado.`
        );
        return dashboardData;
    } catch (error) {
        console.error(
            '[AdminService] ERROR: Ocurrió un error al obtener los datos en paralelo.',
            error
        );
        return null;
    }
};