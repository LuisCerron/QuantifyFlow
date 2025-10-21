"use client";

import type { Timestamp } from "firebase/firestore";
import { useState, useEffect, useCallback } from "react";
import { User, Tag, TaskWithDetails, Subtask } from "@/types";
import {
  createTask,
  updateTask,
  deleteTask,
  setTaskTags,
  addSubtask as apiAddSubtask,
  removeSubtask as apiRemoveSubtask,
  updateSubtaskTitle,
} from "@/services/kanbanService";
import { X, Plus, Trash2 } from "lucide-react";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  taskToEdit?: TaskWithDetails | null;
  projectId: string;
  teamId: string;
  userId: string;
  userRole: "admin" | "member" | null;
  teamMembers: User[];
  availableTags: Tag[];
}

export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  taskToEdit,
  projectId,
  teamId,
  userId,
  userRole,
  teamMembers,
  availableTags,
}: TaskModalProps) {
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<Partial<Subtask>[]>([]);

  // Control state
  const [originalSubtasks, setOriginalSubtasks] = useState<Subtask[]>([]);
  const [originalTagIds, setOriginalTagIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!taskToEdit;

  const closeOnEsc = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", closeOnEsc);
      return () => window.removeEventListener("keydown", closeOnEsc);
    }
  }, [closeOnEsc]);

  // Populate/reset form on open
  useEffect(() => {
    if (isOpen && taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || "");
      setAssignedToId(taskToEdit.assignedToId);
      setPriority(taskToEdit.priority);

      // Normalize due date
      const due = taskToEdit.dueDate as any;
      let d: Date | null = null;
      if (due && typeof due?.toDate === "function") d = (due as Timestamp).toDate();
      else if (due instanceof Date) d = due;
      setDueDate(d ? d.toISOString().substring(0, 10) : "");

      const initialTagIds = taskToEdit.tags.map((t) => t.id);
      setTagIds(initialTagIds);
      setOriginalTagIds(initialTagIds);

      const initialSubtasks = taskToEdit.subtasks;
      setSubtasks(initialSubtasks);
      setOriginalSubtasks(initialSubtasks);
      setError(null);
    } else if (isOpen) {
      // Creating
      setTitle("");
      setDescription("");
      setAssignedToId(undefined);
      setPriority("medium");
      setDueDate("");
      setTagIds([]);
      setOriginalTagIds([]);
      setSubtasks([]);
      setOriginalSubtasks([]);
      setError(null);
    }
  }, [isOpen, taskToEdit]);

  // Subtasks local handlers
  const handleSubtaskChange = (index: number, newTitle: string) => {
    const copy = [...subtasks];
    copy[index].title = newTitle;
    setSubtasks(copy);
  };

  const handleAddSubtaskLocal = () => setSubtasks((s) => [...s, { title: "", completed: false }]);
  const handleRemoveSubtaskLocal = (index: number) =>
    setSubtasks((s) => s.filter((_, i) => i !== index));

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditMode && taskToEdit) {
        const promises: Promise<any>[] = [];

        // Core updates diff
        const core: Record<string, any> = {};
        if (title !== taskToEdit.title) core.title = title;
        if (description !== (taskToEdit.description || "")) core.description = description;
        if (assignedToId !== taskToEdit.assignedToId)
          core.assignedToId = assignedToId || null;
        if (priority !== taskToEdit.priority) core.priority = priority;

        // Due date diff
        let originalDate: Date | undefined;
        const due = taskToEdit.dueDate as any;
        if (due) {
          if (typeof due?.toDate === "function") originalDate = (due as Timestamp).toDate();
          else if (due instanceof Date) originalDate = due;
        }
        const newDueDate = dueDate ? new Date(dueDate) : undefined;
        if (newDueDate?.getTime() !== originalDate?.getTime()) {
          core.dueDate = newDueDate || null;
        }

        if (Object.keys(core).length > 0) {
          promises.push(updateTask(taskToEdit.id, core, userId, teamId));
        }

        // Tags diff
        const tagsChanged =
          JSON.stringify([...tagIds].sort()) !== JSON.stringify([...originalTagIds].sort());
        if (tagsChanged) promises.push(setTaskTags(taskToEdit.id, tagIds, userId, teamId));

        // Subtasks diffs
        const originalIds = new Set(originalSubtasks.map((s) => s.id));
        const currentIds = new Set(subtasks.filter((s) => s.id).map((s) => s.id!));

        // Deletes
        for (const os of originalSubtasks) {
          if (!currentIds.has(os.id)) {
            promises.push(apiRemoveSubtask(os.id!, taskToEdit.id, userId, teamId));
          }
        }

        // Updates / Creates
        for (const cs of subtasks) {
          if (cs.id) {
            if (originalIds.has(cs.id)) {
              const orig = originalSubtasks.find((x) => x.id === cs.id)!;
              if ((orig.title || "") !== (cs.title || "")) {
                promises.push(
                  updateSubtaskTitle(cs.id, cs.title || "", userId, teamId, taskToEdit.id)
                );
              }
            }
          } else if ((cs.title || "").trim()) {
            promises.push(apiAddSubtask(taskToEdit.id, cs.title!.trim(), userId, teamId));
          }
        }

        await Promise.all(promises);
      } else {
        // Create
        const payload: any = {
          projectId,
          teamId,
          title,
          description,
          priority,
          createdBy: userId,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          tagIds,
          subtaskTitles: subtasks
            .map((s) => s.title || "")
            .map((t) => t.trim())
            .filter(Boolean),
        };
        if (assignedToId) payload.assignedToId = assignedToId;
        await createTask(payload);
      }

      onSave();
      onClose();
    } catch (err) {
      console.error("ERROR: No se pudo guardar la tarea.", err);
      setError("No se pudo guardar la tarea. Inténtalo de nuevo.");
      setIsSubmitting(false);
    } finally {
      // keep isSubmitting if closed successfully; otherwise reset above
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!isEditMode || !taskToEdit || userRole !== "admin") return;
    if (!window.confirm("¿Eliminar esta tarea? Esta acción no se puede deshacer.")) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await deleteTask(taskToEdit.id, userId, teamId);
      onSave();
      onClose();
    } catch (err) {
      console.error("ERROR: No se pudo eliminar la tarea.", err);
      setError("No se pudo eliminar la tarea.");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Helpers for consistent field styles (solo contornos, sin fondo sólido)
  const fieldClass =
    "h-11 w-full rounded-2xl bg-transparent px-3 text-sm outline-none transition " +
    "ring-2 ring-neutral-300/90 dark:ring-white/20 " +
    "placeholder:text-muted-foreground/70 " +
    "focus-visible:ring-violet-500/70 dark:focus-visible:ring-violet-400/70";

  const areaClass =
    "min-h-[110px] w-full rounded-2xl bg-transparent px-3 py-2 text-sm outline-none transition " +
    "ring-2 ring-neutral-300/90 dark:ring-white/20 " +
    "placeholder:text-muted-foreground/70 " +
    "focus-visible:ring-violet-500/70 dark:focus-visible:ring-violet-400/70";

  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      onMouseDown={onOverlayClick}
    >
      {/* Opaque overlay (no transparente) */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

      {/* Panel con contornos modernos, sin fondo plano opaco; usamos bg-background para legibilidad */}
      <div
        className="relative z-10 flex w-full max-w-2xl max-h-[88vh] flex-col overflow-hidden rounded-2xl bg-background ring-2 ring-neutral-300/90 dark:ring-white/20 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 px-5 py-4 ring-1 ring-inset ring-neutral-200/70 dark:ring-white/10">
          <h2 className="text-lg font-bold">
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              {isEditMode ? "Editar tarea" : "Nueva tarea"}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-neutral-300/80 dark:ring-white/20 hover:ring-violet-500/60"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form id="task-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-6">
            {/* Título */}
            <div>
              <label htmlFor="title" className="mb-1 block text-xs font-medium text-muted-foreground">
                Título *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={fieldClass}
                placeholder="Ej. Diseñar landing, Implementar auth..."
              />
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="description" className="mb-1 block text-xs font-medium text-muted-foreground">
                Descripción
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Añade más detalles sobre la tarea..."
                className={areaClass}
              />
            </div>

            {/* Grid Asignación / Prioridad */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="assignedTo" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Asignar a
                </label>
                <select
                  id="assignedTo"
                  value={assignedToId || ""}
                  onChange={(e) => setAssignedToId(e.target.value || undefined)}
                  className={fieldClass}
                >
                  <option value="">Sin asignar</option>
                  {teamMembers.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName || m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="priority" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Prioridad
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                  className={fieldClass}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>

            {/* Grid Fecha / Etiquetas */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="dueDate" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Fecha de vencimiento
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={fieldClass}
                />
              </div>

              {/* Etiquetas con solo contorno moderno */}
              <div>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Etiquetas</span>
                <div className="min-h-[46px] rounded-2xl p-2 ring-2 ring-neutral-300/90 dark:ring-white/20">
                  {availableTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => {
                        const isActive = tagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() =>
                              setTagIds((prev) =>
                                prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                              )
                            }
                            className={[
                              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs transition",
                              "ring-2",
                              isActive
                                ? "ring-[var(--tag-color)]"
                                : "ring-neutral-300/80 dark:ring-white/20 hover:ring-violet-500/60",
                            ].join(" ")}
                            style={
                              {
                                // CSS variable para usar en ring color (Tailwind no soporta dinámico directo)
                                ["--tag-color" as any]: tag.color || "#64748b",
                              } as React.CSSProperties
                            }
                            title={tag.tagName}
                          >
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: tag.color || "#64748b" }}
                            />
                            {tag.tagName}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No hay etiquetas disponibles</span>
                  )}
                </div>
              </div>
            </div>

            {/* Subtareas */}
            <div>
              <h3 className="mb-2 text-sm font-semibold">Subtareas</h3>
              <div className="space-y-2">
                {subtasks.map((subtask, index) => (
                  <div key={subtask.id || `new-${index}`} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!subtask.completed}
                      disabled
                      className="h-4 w-4 cursor-not-allowed rounded border-muted-foreground/30 text-primary"
                      aria-label="Completada"
                    />
                    <input
                      type="text"
                      value={subtask.title || ""}
                      onChange={(e) => handleSubtaskChange(index, e.target.value)}
                      placeholder="Describe la subtarea"
                      className={fieldClass}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtaskLocal(index)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-neutral-300/80 dark:ring-white/20 hover:ring-rose-500/60"
                      aria-label="Eliminar subtarea"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddSubtaskLocal}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-violet-500 hover:text-violet-400"
              >
                <Plus size={16} /> Añadir subtarea
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-2xl bg-rose-500/10 p-3 text-sm font-medium text-rose-500 ring-2 ring-rose-500/30">
                {error}
              </p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between gap-4 px-5 py-4 ring-1 ring-inset ring-neutral-200/70 dark:ring-white/10">
          <div>
            {isEditMode && userRole === "admin" && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-rose-500 hover:underline disabled:opacity-50"
                disabled={isSubmitting}
              >
                Eliminar tarea
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-2xl px-4 font-semibold ring-2 ring-neutral-300/80 dark:ring-white/20 hover:ring-violet-500/60 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="task-form"
              className="h-11 rounded-2xl px-6 font-semibold text-white shadow-md disabled:cursor-wait disabled:opacity-70
                         bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 hover:from-indigo-400 hover:via-violet-500 hover:to-fuchsia-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Guardando..." : isEditMode ? "Guardar cambios" : "Crear tarea"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}