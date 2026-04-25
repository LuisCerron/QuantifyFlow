"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type { DropResult } from "react-beautiful-dnd";

import { useAuth } from "@/context/AuthContext";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useKanbanBoard } from "@/hooks/useKanbanBoard";

import ProjectHeader from "@/components/projects/kanban/ProjectHeader";
import type { TaskWithDetails } from "@/types";
import Spinner from "@/components/ui/spinner";
import { toast } from "sonner";
import { archiveAllDoneTasks } from "@/services/kanbanService";

const TaskModal = dynamic(
  () => import("@/components/projects/kanban/TaskModal"),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
        <div className="animate-pulse bg-muted rounded-2xl h-[400px] w-full max-w-2xl" />
      </div>
    ),
  }
);

const KanbanBoard = dynamic(
  () => import("@/components/projects/kanban/KanbanBoard"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-4 flex gap-4 md:gap-6 overflow-x-auto pb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-[0_0_320px] md:flex-[0_0_360px] xl:flex-[0_0_380px] shrink-0">
            <div className="rounded-2xl border-2 border-black dark:border-transparent dark:bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="h-5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-5 w-8 animate-pulse rounded bg-muted" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="h-28 animate-pulse rounded-xl bg-muted/70" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
  }
);

interface ProjectPageProps {
  params: { projectId: string };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const { currentTeam, userRole, isLoading: isTeamLoading } = useCurrentTeam(user?.uid);
  const teamId = currentTeam?.teamId ?? "";

  const {
    columns,
    allTasks,
    isLoading: isBoardLoading,
    error,
    handleDragEnd,
    teamMembers,
    availableTags,
    searchQuery,
    setSearchQuery,
    assignedUserFilter,
    setAssignedUserFilter,
    tagFilter,
    setTagFilter,
    refreshTasks,
    handleSubtaskToggle,
    updatingSubtaskId,
    dependencyMap,
  } = useKanbanBoard(projectId, teamId);
  const [isArchivingAll, setIsArchivingAll] = useState(false);
  // Estado modal (crear/editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [initialFilterSet, setInitialFilterSet] = useState(false);

  useEffect(() => {
    // Espera a que el rol y el usuario estén cargados
    if (userRole && user?.uid && !isTeamLoading && !initialFilterSet) {
      if (userRole === 'member') {
        // Si es member, aplica el filtro de "mis tareas" por defecto
        setAssignedUserFilter([user.uid]);
      }
      // Marcamos como aplicado (para admin o member)
      setInitialFilterSet(true);
    }
  }, [userRole, user?.uid, isTeamLoading, initialFilterSet, setAssignedUserFilter]);

  const openCreateModal = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: TaskWithDetails) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleSaveChanges = () => {
    refreshTasks();
    closeModal();
  };

  const handleArchiveAllDone = async () => {
    if (!user || userRole !== 'admin' || isArchivingAll) return;

    // Preguntar confirmación
    if (!window.confirm("¿Estás seguro de que deseas archivar todas las tareas completadas en este proyecto?")) {
      return;
    }

    setIsArchivingAll(true);
    const toastId = toast.loading("Archivando tareas completadas...");

    try {
      const result = await archiveAllDoneTasks(projectId, user.uid, teamId);

      if (result.archivedCount > 0) {
        toast.success(`${result.archivedCount} tarea(s) archivada(s). Refrescando tablero...`, { id: toastId });
        refreshTasks(); // Actualiza la UI del tablero
      } else {
        toast.success("No había tareas completadas para archivar.", { id: toastId });
      }
    } catch (err) {
      console.error("Error al archivar tareas completadas:", err);
      toast.error("Error al archivar las tareas.", { id: toastId });
    } finally {
      setIsArchivingAll(false);
    }
  };

  const isLoading = isBoardLoading || isTeamLoading || !user;

  // Errores y estados sin equipo
  if (!teamId && !isTeamLoading) {
    return (
      <div className="w-full px-4 py-10 sm:px-6 lg:px-8 2xl:px-12">
        <p className={isLight ? "text-center text-sm font-semibold text-black" : "text-center text-sm font-medium text-destructive"}>
          Error: No se pudo encontrar el equipo o no perteneces a uno.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 py-10 sm:px-6 lg:px-8 2xl:px-12">
        <p className={isLight ? "text-center text-sm font-semibold text-black" : "text-center text-sm font-medium text-destructive"}>
          Error: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
      {/* Header normal (NO sticky): se desplaza con el scroll */}
      <div className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 2xl:-mx-12 2xl:px-12">
        <ProjectHeader
          projectId={projectId || "Proyecto"}
          teamMembers={teamMembers}
          availableTags={availableTags}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedUsers={assignedUserFilter}
          onUserFilterChange={setAssignedUserFilter}
          selectedTags={tagFilter}
          onTagFilterChange={setTagFilter}
          onNewTaskClick={openCreateModal}
          userRole={userRole}
          currentUserId={user?.uid}
          onArchiveAllDone={handleArchiveAllDone}
          isArchivingAll={isArchivingAll}
        />
      </div>

      {/* Tablero Kanban horizontal */}
      {isLoading ? (
        <div className="py-10 flex justify-center">
          <Spinner size={40} label="Cargando tareas…" />
        </div>
      ) : (
        <KanbanBoard
          columns={columns}
          onDragEnd={handleDragEnd as (result: DropResult) => void}
          onTaskClick={openEditModal}
          onSubtaskToggle={handleSubtaskToggle}
          updatingSubtaskId={updatingSubtaskId}
          userRole={userRole}
          currentUserId={user!.uid}
          dependencyMap={dependencyMap}
        />
      )}

      {/* Modal de tarea */}
      {isModalOpen && user && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSaveChanges}
          taskToEdit={selectedTask}
          projectId={projectId}
          teamId={teamId}
          userId={user.uid}
          userRole={userRole}
          teamMembers={teamMembers}
          availableTags={availableTags}
          allProjectTasks={allTasks}
        />
      )}
    </div>
  );
}