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

import type { TaskWithDetails, User, Tag, Subtask } from "@/types";
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
  const [dependencyMap, setDependencyMap] = useState<Map<string, { blockedBy: number; blocking: number; isBlocked: boolean }>>(new Map());

  // Para evitar condiciones de carrera al refrescar rápidamente
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!projectId || !teamId) {
      // Si faltan IDs, limpiamos y salimos sin marcar error
      setTasks([]);
      setTeamMembers([]);
      setAvailableTags([]);
      setIsLoading(false);
      return;
    }

    const currentFetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const [projectTasks, members, tagsSnapshot] = await Promise.all([
        getProjectTasks(projectId, teamId),
        getTeamMembersForFilter(teamId),
        getDocs(query(collection(db, "tags"), where("teamId", "==", teamId))),
      ]);

      if (currentFetchId !== fetchIdRef.current) return; // respuesta obsoleta

      const allTags: Tag[] = tagsSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...(doc.data() as Omit<Tag, "id">),
          } as Tag)
      );

      for (const t of projectTasks) {
        // Comprobar si 'assignedToIds' (array de strings) existe pero
        // 'assignedTo' (array de Users) no se populó correctamente.
        if (
          t.assignedToIds &&
          t.assignedToIds.length > 0 &&
          (!t.assignedTo || t.assignedTo.length === 0)
        ) {
          console.warn(
            `[useKanbanBoard] Tarea ${t.id} tiene 'assignedToIds' pero falta el array 'assignedTo' (usuarios populados).`
          );
        }

        // Asegurar que los arrays existan para evitar errores en filtros/render
        if (!Array.isArray(t.tags)) {
          (t as any).tags = [];
        }

        // Nueva comprobación para 'subtasks'
        if (!Array.isArray(t.subtasks)) {
          (t as any).subtasks = [];
        }

        // Opcional: asegurar que assignedToIds exista si assignedTo existe
        if (!Array.isArray(t.assignedToIds)) {
          (t as any).assignedToIds = [];
        }
      }

      setTasks(projectTasks);
      setTeamMembers(members);
      setAvailableTags(allTags);
    } catch (err) {
      console.error("[useKanbanBoard] Error durante el fetch:", err);
      setError("Failed to fetch project data.");
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [projectId, teamId]);

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

  useEffect(() => {
    if (!projectId || !teamId) return;

    const loadDependencies = async () => {
      const taskIds = Object.values(filteredTasks).flat().map((t) => t.id);
      if (taskIds.length === 0) return;

      const { getProjectDependencies } = await import("@/services/dependencyService");
      const allDeps = await getProjectDependencies(projectId);

      const map = new Map<string, { blockedBy: number; blocking: number; isBlocked: boolean }>();
      taskIds.forEach((id) => {
        const blockedBy = allDeps.filter((d) => d.toTaskId === id && d.type === "blocks");
        const blocking = allDeps.filter((d) => d.fromTaskId === id && d.type === "blocks");

        const activeBlockers = blockedBy.filter((dep) => {
          const task = Object.values(filteredTasks).flat().find((t) => t.id === dep.fromTaskId);
          return task?.status !== "done";
        });

        map.set(id, {
          blockedBy: activeBlockers.length,
          blocking: blocking.length,
          isBlocked: activeBlockers.length > 0,
        });
      });

      setDependencyMap(map);
    };

    loadDependencies();
  }, [projectId, teamId, filteredTasks]);

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
      if (updatingSubtaskId) return; // Prevenir clics múltiples
      setUpdatingSubtaskId(subtaskId);

      const originalTasks = tasks;
      let didTaskStatusChange = false;

      // 1. Lógica Optimista
      const newTasks = tasks.map((task) => {
        if (task.id !== taskId) return task;

        const originalStatus = task.status;
        const newSubtasks = task.subtasks.map((sub) =>
          sub.id === subtaskId ? { ...sub, completed: newCompleted } : sub
        );

        // Replicamos la lógica del servidor (todo/in-progress/done)
        const totalSubtasks = newSubtasks.length;
        const completedSubtasks = newSubtasks.filter(s => s.completed).length;

        let determinedStatus: TaskStatus;

        if (totalSubtasks === 0 || completedSubtasks === 0) {
          determinedStatus = 'todo';
        } else if (completedSubtasks === totalSubtasks) {
          determinedStatus = 'done';
        } else {
          determinedStatus = 'in-progress';
        }

        let newStatus = originalStatus;
        if (originalStatus !== determinedStatus) {
          newStatus = determinedStatus;
          didTaskStatusChange = true;
        }

        return { ...task, subtasks: newSubtasks, status: newStatus };
      });

      setTasks(newTasks); // Actualiza la UI al instante

      // 2. Llamada a Firebase
      if (!user) {
        console.error("No hay usuario, revirtiendo.");
        setTasks(originalTasks);
        setUpdatingSubtaskId(null);
        return;
      }

      updateSubtaskCompletion(subtaskId, taskId, newCompleted, user.uid, teamId)
        .then(() => {
          // 3. Sincronización silenciosa (solo si es necesario)
          if (didTaskStatusChange) {
            // El estado de la TAREA cambió (ej. a 'done'),
            // así que refrescamos para confirmar.
            fetchData(); 
          }
        })
        .catch((err) => {
          console.error("Error al actualizar la subtarea, revirtiendo:", err);
          setTasks(originalTasks);
        })
        .finally(() => {
          setUpdatingSubtaskId(null);
        });
    },
    [tasks, teamId, user, updatingSubtaskId, fetchData] // 👈 Añadir dependencias
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