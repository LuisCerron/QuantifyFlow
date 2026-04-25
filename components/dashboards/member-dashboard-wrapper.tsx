// components/dashboards/member-dashboard-wrapper.tsx
"use client";

import React, { useState, useEffect } from "react"; // <-- Importar hooks de estado
import { useRouter } from "next/navigation";
import { MemberDashboard } from "./member-dashboard";
import type { UserDashboardData } from "@/types/dashboard-types";
import { useProjects } from '@/hooks/useProjects';
import { getTasksDependencySummary } from '@/services/dependencyService';

interface MemberDashboardWrapperProps {
  userName: string | null;
  // Recibimos los datos iniciales del servidor
  memberData: UserDashboardData | null;
}

export function MemberDashboardWrapper({
  userName,
  memberData,
}: MemberDashboardWrapperProps) {
  const router = useRouter();

  // --- CAMBIO: Guardamos los datos en un estado local ---
  // memberData (prop) = datos iniciales del servidor
  // liveData (estado) = datos que el usuario ve y modifica
  const [liveData, setLiveData] = useState(memberData);
  const [dependencyMap, setDependencyMap] = useState<Map<string, { blockedBy: number; blocking: number; related: number; isBlocked: boolean }>>(new Map());
  const { allProjects, isLoading: isLoadingProjects, error: projectsError } = useProjects(liveData?.teams[0]?.id);
  // Sincroniza el estado si los props del servidor cambian
  useEffect(() => {
    setLiveData(memberData);
  }, [memberData]);

  // Fetch dependency data for visible tasks
  useEffect(() => {
    if (!liveData) return;

    const allTasks = liveData.assignedTasks;
    const projectIds = [...new Set(allTasks.map((t) => t.projectId).filter(Boolean))];

    if (projectIds.length === 0) return;

    const taskStatusMap = new Map<string, string>();
    allTasks.forEach((t) => taskStatusMap.set(t.id, t.status));

    let cancelled = false;

    (async () => {
      const merged = new Map<string, { blockedBy: number; blocking: number; related: number; isBlocked: boolean }>();
      await Promise.all(
        projectIds.map(async (projectId) => {
          const taskIds = allTasks.filter((t) => t.projectId === projectId).map((t) => t.id);
          try {
            const map = await getTasksDependencySummary(projectId, taskIds, taskStatusMap);
            map.forEach((value, key) => merged.set(key, value));
          } catch (err) {
            console.error('Error fetching dependency summary for project', projectId, err);
          }
        })
      );
      if (!cancelled) setDependencyMap(merged);
    })();

    return () => { cancelled = true; };
  }, [liveData]);

  // Esta función se usará para la sincronización de fondo
  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <MemberDashboard
      userName={userName}
      // Pasamos el estado (liveData) en lugar del prop (memberData)
      liveData={liveData}
      // Pasamos la función para MODIFICAR el estado
      setLiveData={setLiveData}
      // Pasamos la función de refresco del router
      onRefresh={handleRefresh}
      projects={allProjects} // 👈 Pasando la lista completa
      isLoadingProjects={isLoadingProjects}
      dependencyMap={dependencyMap}
    />
  );
}