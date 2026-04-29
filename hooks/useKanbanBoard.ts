"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { DropResult } from "react-beautiful-dnd";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toDateSafe } from "@/lib/utils/date";

import {
  getProjectTasks,
  updateTaskStatus,
  getTeamMembersForFilter,
  updateSubtaskCompletion,
  canMoveTask,
} from "@/services/kanbanService";
import { toast } from "sonner";

import type { TaskWithDetails, User, Tag, Subtask, TaskDependency } from "@/types";
import { useAuth } from "@/context/AuthContext";

type TaskStatus = "todo" | "in-progress" | "done";

type ColumnsMap = Record<
  TaskStatus,
  {
    id: TaskStatus;
    title: string;
    tasks: TaskWithDetails[];
  }
>;

const COLUMN_TITLES: Record<TaskStatus, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

const sortByDueDateThenTitle = (a: TaskWithDetails, b: TaskWithDetails) => {
  const ad = toDateSafe(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
  const bd = toDateSafe(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
  if (ad !== bd) return ad - bd;
  return a.title.localeCompare(b.title);
};

export const useKanbanBoard = (projectId: string, teamId: string) => {
  const { user } = useAuth();

  // Estado base
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [updatingSubtaskId, setUpdatingSubtaskId] = useState<string | null>(null);

  // Filtros
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignedUserFilter, setAssignedUserFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  // Dependencias entre tareas
  const [allDependencies, setAllDependencies] = useState<TaskDependency[]>([]);

  // Para evitar condiciones de carrera al refrescar rápidamente
  const fetchIdRef = useRef(0);
  
  // Ref para acceso estable a tasks sin añadirlo a deps
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!projectId || !teamId) {
      setTasks([]);
      setTeamMembers([]);
      setAvailableTags([]);
      setAllDependencies([]);
      setIsLoading(false);
      return;
    }

    const currentFetchId = ++fetchIdRef.current;
    if (!opts?.silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [projectTasks, members, tagsSnapshot] = await Promise.all([
        getProjectTasks(projectId, teamId),
        getTeamMembersForFilter(teamId),
        getDocs(query(collection(db, "tags"), where("teamId", "==", teamId))),
      ]);

      if (currentFetchId !== fetchIdRef.current) return;

      const allTags: Tag[] = tagsSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...(doc.data() as Omit<Tag, "id">),
          } as Tag)
      );

      setTasks(projectTasks);
      setTeamMembers(members);
      setAvailableTags(allTags);

      const { getProjectDependencies } = await import("@/services/dependencyService");
      const deps = await getProjectDependencies(projectId);
      if (currentFetchId === fetchIdRef.current) {
        setAllDependencies(deps);
      }
    } catch (err) {
      console.error("[useKanbanBoard] Error durante el fetch:", err);
      setError("Failed to fetch project data.");
    } finally {
      if (!opts?.silent) {
        setIsLoading(false);
      }
    }
  }, [projectId, teamId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const hasUserFilter = assignedUserFilter.length > 0;
    const hasTagFilter = tagFilter.length > 0;

    return tasks.filter((task) => {
      const title = (task.title || "").toLowerCase();
      const matchesSearch = q ? title.includes(q) : true;

      // --- MODIFICACIÓN INICIO: Lógica de filtro para 'assignedToIds' ---
      // 'task.assignedToIds' es ahora un array de strings (IDs de usuario)
      const taskUserIds = task.assignedToIds || [];
      const matchesUser = hasUserFilter
        ? assignedUserFilter.some((filterId) => taskUserIds.includes(filterId))
        : true;

      const taskTags = Array.isArray(task.tags) ? task.tags : [];
      const matchesTags = hasTagFilter
        ? taskTags.some((t) => tagFilter.includes(t.id))
        : true;

      return matchesSearch && matchesUser && matchesTags;
    });
  }, [tasks, searchQuery, assignedUserFilter, tagFilter]);

  const columns = useMemo<ColumnsMap>(() => {
    const base: ColumnsMap = {
      todo: { id: "todo", title: COLUMN_TITLES.todo, tasks: [] },
      "in-progress": { id: "in-progress", title: COLUMN_TITLES["in-progress"], tasks: [] },
      done: { id: "done", title: COLUMN_TITLES.done, tasks: [] },
    };

    for (const t of filteredTasks) {
      if (base[t.status]) base[t.status].tasks.push(t);
    }

    // Ordena cada columna por fecha de vencimiento y luego título
    base.todo.tasks.sort(sortByDueDateThenTitle);
    base["in-progress"].tasks.sort(sortByDueDateThenTitle);
    base.done.tasks.sort(sortByDueDateThenTitle);

    return base;
  }, [filteredTasks]);

  const dependencyMap = useMemo(() => {
    const map = new Map<string, { blockedBy: number; blocking: number; isBlocked: boolean }>();
    const statusMap = new Map(filteredTasks.map(t => [t.id, t.status]));
    
    for (const dep of allDependencies) {
      const taskId = dep.toTaskId;
      if (!map.has(taskId)) {
        map.set(taskId, { blockedBy: 0, blocking: 0, isBlocked: false });
      }
      const info = map.get(taskId)!;
      
      if (dep.type === 'blocks') {
        const blockerStatus = statusMap.get(dep.fromTaskId);
        if (blockerStatus !== 'done') {
          info.blockedBy++;
          info.isBlocked = true;
        }
      }
    }
    
    for (const dep of allDependencies) {
      const taskId = dep.fromTaskId;
      if (!map.has(taskId)) {
        map.set(taskId, { blockedBy: 0, blocking: 0, isBlocked: false });
      }
      if (dep.type === 'blocks') {
        map.get(taskId)!.blocking++;
      }
    }
    
    return map;
  }, [allDependencies, filteredTasks]);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination || !user) return;

      const from = source.droppableId as TaskStatus;
      const to = destination.droppableId as TaskStatus;

      if (from === to && destination.index === source.index) return;
      if (from === to) return; // mismo estado, nada que hacer

      // Check dependency constraints before allowing move
      if (to !== "todo") {
        const statusMap = new Map<string, string>();
        Object.values(filteredTasks).flat().forEach((t) => statusMap.set(t.id, t.status));

        const { allowed, blockedBy } = await canMoveTask(draggableId, to, statusMap);

        if (!allowed) {
          const blockerTitles = blockedBy?.map((id) => {
            const task = Object.values(filteredTasks).flat().find((t) => t.id === id);
            return task?.title || "Unknown task";
          }) || [];

          toast.error(
            `Cannot move: blocked by ${blockerTitles.join(", ")}`,
            { description: "Complete blocking tasks first" }
          );
          return; // Cancel the drag
        }
      }

      // Optimistic UI
      setTasks((prev) =>
        prev.map((t) => (t.id === draggableId ? { ...t, status: to } : t))
      );

      updateTaskStatus(draggableId, to, user.uid, teamId).catch((err) => {
        console.error("[useKanbanBoard] Error al actualizar estado de la tarea:", err);
        setError("Failed to update task. Please try again.");
        // Revertir UI
        setTasks((prev) =>
          prev.map((t) => (t.id === draggableId ? { ...t, status: from } : t))
        );
      });
    },
    [teamId, user, filteredTasks]
  );

  const handleSubtaskToggle = useCallback(
    (taskId: string, subtaskId: string, newCompleted: boolean) => {
      if (updatingSubtaskId) return;
      setUpdatingSubtaskId(subtaskId);

      const originalTasks = tasksRef.current;
      let determinedStatus: TaskStatus = 'in-progress';

      setTasks((prev) => {
        return prev.map((t) => {
          if (t.id !== taskId) return t;
          
          const newSubtasks = t.subtasks.map((sub) =>
            sub.id === subtaskId ? { ...sub, completed: newCompleted } : sub
          );
          
          const total = newSubtasks.length;
          const completed = newSubtasks.filter(s => s.completed).length;
          determinedStatus = 'in-progress';
          if (total === 0 || completed === 0) determinedStatus = 'todo';
          else if (completed === total) determinedStatus = 'done';
          
          return { ...t, subtasks: newSubtasks, status: determinedStatus };
        });
      });

      if (!user) {
        setUpdatingSubtaskId(null);
        return;
      }

      updateSubtaskCompletion(subtaskId, taskId, newCompleted, user.uid, teamId, determinedStatus)
        .catch((err) => {
          console.error("Error updating subtask, reverting:", err);
          setTasks(originalTasks);
        })
        .finally(() => {
          setUpdatingSubtaskId(null);
        });
    },
    [updatingSubtaskId, user, teamId]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setAssignedUserFilter([]);
    setTagFilter([]);
  }, []);

  return {
    // tablero
    columns,
    allTasks: tasks,
    isLoading,
    error,
    dependencyMap,

    // acciones
    handleDragEnd,
    refreshTasks: fetchData,
    handleSubtaskToggle,
    updatingSubtaskId,
    // filtros
    teamMembers,
    availableTags,
    searchQuery,
    setSearchQuery,
    assignedUserFilter,
    setAssignedUserFilter,
    tagFilter,
    setTagFilter,
    clearFilters,
  };
};