"use client";

import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { useAuth } from "@/context/AuthContext";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useKanbanBoard } from "@/hooks/useKanbanBoard";
import ProjectHeader from "@/components/projects/kanban/ProjectHeader";
import KanbanColumn from "@/components/projects/kanban/KanbanColumn";
import TaskModal from "@/components/projects/kanban/TaskModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search } from "lucide-react";
import type { TaskWithDetails } from "@/types";

interface ProjectPageProps {
  params: { projectId: string };
}

// Skeleton para tablero Kanban (sin marcos, vidrio sutil)
const BoardSkeleton = () => (
  <div className="flex gap-4 overflow-x-auto pb-4">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="min-w-[320px] sm:min-w-[360px] lg:min-w-[380px] rounded-2xl bg-card/60 p-4 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl"
      >
        <div className="h-5 w-40 animate-pulse rounded-md bg-muted/60" />
        <div className="mt-3 space-y-3">
          {[...Array(4)].map((_, j) => (
            <div key={j} className="rounded-xl bg-muted/40 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted/60" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted/50" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  const { user } = useAuth();
  const { currentTeam, userRole, isLoading: isTeamLoading } = useCurrentTeam(user?.uid);
  const teamId = currentTeam?.teamId ?? "";

  const {
    columns,
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
  } = useKanbanBoard(projectId, teamId);

  // Estado modal (crear/editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);

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

  const isLoading = isBoardLoading || isTeamLoading;

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6">
        <div className="mb-4 h-7 w-64 animate-pulse rounded-md bg-muted/60" />
        <BoardSkeleton />
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-10">
        <p className="text-center text-sm font-medium text-destructive">
          Error: No se pudo encontrar el equipo o no perteneces a uno.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-10">
        <p className="text-center text-sm font-medium text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    // Contenedor fluido, sin fondos extras ni min-h-screen para evitar marcos
    <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6">
      {/* Header de proyecto sticky sutil (queda bajo el header global) */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 2xl:-mx-12 sticky top-0 z-30 bg-background/70 px-4 sm:px-6 lg:px-8 2xl:px-12 py-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
        <ProjectHeader
          projectName={currentTeam?.teamName || "Proyecto"}
          teamMembers={teamMembers}
          availableTags={availableTags}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedUsers={assignedUserFilter}
          onUserFilterChange={setAssignedUserFilter}
          selectedTags={tagFilter}
          onTagFilterChange={setTagFilter}
          onNewTaskClick={openCreateModal}
        />
      </div>

      {/* Tablero Kanban horizontal, sin marcos y con scroll suave */}
      <DragDropContext onDragEnd={handleDragEnd as (result: DropResult) => void}>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-6">
          {Object.values(columns).map((column) => (
            <div
              key={column.id}
              className="min-w-[320px] sm:min-w-[360px] lg:min-w-[380px] flex-shrink-0"
            >
              <KanbanColumn
                column={column}
                onTaskClick={openEditModal}
                onRefreshBoard={refreshTasks}
              />
            </div>
          ))}
        </div>
      </DragDropContext>

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
        />
      )}
    </div>
  );
}