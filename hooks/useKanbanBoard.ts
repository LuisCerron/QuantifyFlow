'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DropResult } from 'react-beautiful-dnd';
// Se corrige el nombre del servicio según lo indicado.
import { getProjectTasks, updateTaskStatus, getTeamMembersForFilter } from '@/services/kanbanService'; 
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TaskWithDetails, User, Tag } from '@/types';
// Se corrige la ruta del contexto según lo indicado.
import { useAuth } from '@/context/AuthContext'; 

type TaskStatus = 'todo' | 'in-progress' | 'done';

export const useKanbanBoard = (projectId: string, teamId: string) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Datos para los filtros
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  
  // Estados para filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedUserFilter, setAssignedUserFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    if (!projectId || !teamId) {
      console.warn("[useKanbanBoard] ProjectId o TeamId no proporcionados. Abortando fetch.");
      return;
    }
    setIsLoading(true);
    console.log(`[useKanbanBoard] Iniciando fetch para projectId: ${projectId}, teamId: ${teamId}`);
    try {
      // Cargar en paralelo tareas, miembros y etiquetas
      const [projectTasks, members, tags] = await Promise.all([
        getProjectTasks(projectId, teamId),
        getTeamMembersForFilter(teamId),
        getDocs(query(collection(db, 'tags'), where('teamId', '==', teamId)))
      ]);
      
      // --- LOGS DE DEPURACIÓN ---
      console.log('[useKanbanBoard] Datos crudos de getProjectTasks:', projectTasks);
      console.log('[useKanbanBoard] Miembros del equipo para filtro:', members);
      const allTags = tags.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
      console.log('[useKanbanBoard] Etiquetas disponibles para filtro:', allTags);

      // Verificación clave: Revisa la consola del navegador para estos logs.
      // Si en `projectTasks`, las tareas no tienen los objetos `assignedTo` o `tags`,
      // el problema está en el servicio `kanbanService.ts` (en la función getProjectTasks).
      projectTasks.forEach(task => {
        if (!task.assignedTo && task.assignedToId) {
          console.warn(`[useKanbanBoard] Tarea ${task.id} tiene assignedToId (${task.assignedToId}) pero no se encontró el objeto de usuario.`);
        }
      });
      // --- FIN DE LOGS DE DEPURACIÓN ---
      
      setTasks(projectTasks);
      setTeamMembers(members);
      setAvailableTags(allTags);

    } catch (err) {
      setError('Failed to fetch project data.');
      console.error("[useKanbanBoard] Error durante el fetch:", err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, teamId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesUser = assignedUserFilter.length === 0 || (task.assignedToId && assignedUserFilter.includes(task.assignedToId));
      const matchesTags = tagFilter.length === 0 || task.tags.some(tag => tagFilter.includes(tag.id));
      return matchesSearch && matchesUser && matchesTags;
    });
  }, [tasks, searchQuery, assignedUserFilter, tagFilter]);
  
  const columns = useMemo(() => {
    const allColumns: Record<TaskStatus, { id: TaskStatus; title: string; tasks: TaskWithDetails[] }> = {
      todo: { id: 'todo', title: 'To Do', tasks: [] },
      'in-progress': { id: 'in-progress', title: 'In Progress', tasks: [] },
      done: { id: 'done', title: 'Done', tasks: [] },
    };

    filteredTasks.forEach(task => {
      if (allColumns[task.status]) {
        allColumns[task.status].tasks.push(task);
      }
    });

    return allColumns;
  }, [filteredTasks]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || !user) return;
    
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    
    console.log(`[useKanbanBoard] Moviendo tarea ${draggableId} a la columna ${newStatus}`);
    
    // Optimistic UI Update
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === draggableId ? { ...task, status: newStatus } : task
      )
    );
    
    updateTaskStatus(draggableId, newStatus, user.uid, teamId)
      .catch(err => {
        console.error("[useKanbanBoard] Error al actualizar estado de la tarea:", err);
        setError("Failed to update task. Please try again.");
        fetchData(); // Re-fetch para revertir
      });
  };

  return {
    columns,
    isLoading,
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
    refreshTasks: fetchData,
  };
};
