'use client';

import { useState } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { useKanbanBoard } from '@/hooks/useKanbanBoard';
import KanbanColumn from '@/components/projects/kanban/KanbanColumn';
import ProjectHeader from '@/components/projects/kanban/ProjectHeader';
import { useAuth } from '@/context/AuthContext';
import { useCurrentTeam } from '@/hooks/useCurrentTeam';
import TaskModal from '@/components/projects/kanban/TaskModal';
import type { TaskWithDetails } from '@/types';

interface ProjectPageProps {
  params: {
    projectId: string;
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  const { user } = useAuth();
  const { currentTeam, userRole, isLoading: isTeamLoading } = useCurrentTeam(user?.uid);
  
  const teamId = currentTeam?.teamId;

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
      refreshTasks
  } = useKanbanBoard(projectId, teamId || '');

  // --- CAMBIOS CLAVE ---
  // Estado para controlar la visibilidad del modal y la tarea seleccionada para edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);

  // Abre el modal en modo CREACIÓN
  const handleOpenModalForCreate = () => {
    setSelectedTask(null); // Asegura que no haya una tarea seleccionada
    setIsModalOpen(true);
  };

  // Abre el modal en modo EDICIÓN
  const handleOpenModalForEdit = (task: TaskWithDetails) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  // Cierra el modal y limpia el estado
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  // Función que se ejecuta después de guardar (crear/editar) una tarea
  const handleSaveChanges = () => {
    refreshTasks(); // Refresca los datos del tablero
    handleCloseModal(); // Cierra el modal
  };
  // --- FIN DE CAMBIOS CLAVE ---

  const isLoading = isBoardLoading || isTeamLoading;

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Cargando proyecto...</div>;
  }
  
  if (!teamId) {
    return (
      <div className="text-red-500 p-8 text-center">
        Error: No se pudo encontrar el equipo o no perteneces a uno.
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-8 text-center">Error: {error}</div>;
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <ProjectHeader
        projectName={currentTeam?.teamName || "Cargando nombre..."}
        teamMembers={teamMembers}
        availableTags={availableTags}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedUsers={assignedUserFilter}
        onUserFilterChange={setAssignedUserFilter}
        selectedTags={tagFilter}
        onTagFilterChange={setTagFilter}
        onNewTaskClick={handleOpenModalForCreate} // Conectado al manejador correcto
      />
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(columns).map(column => (
            <KanbanColumn 
                key={column.id} 
                column={column} 
                onTaskClick={handleOpenModalForEdit} 
                onRefreshBoard={refreshTasks}
            />
          ))}
        </div>
      </DragDropContext>
      
      {/* El modal ahora se renderiza con todas las props necesarias */}
      {isModalOpen && user && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
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
