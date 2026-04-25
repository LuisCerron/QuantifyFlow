"use client";

import type { Timestamp } from "firebase/firestore";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { User, Tag, TaskWithDetails, Subtask } from "@/types";
import {
  createTask,
  updateTask,
  deleteTask,
  setTaskTags,
  addSubtask as apiAddSubtask,
  removeSubtask as apiRemoveSubtask,
  updateSubtaskTitle,
} from "@/services/kanbanService"; // Asumo que este es el path correcto
import { X, Plus, Trash2, GitGraph, Lock, Link2, ArrowRight, Copy } from "lucide-react";
import Link from "next/link";
import { useTaskDependencies } from "@/hooks/useTaskDependencies";
import type { DependencyType, TaskDependency } from "@/types";

// shadcn/ui Select para resolver el dropdown blanco en modo oscuro
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

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
  allProjectTasks?: TaskWithDetails[];
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
  allProjectTasks = [],
}: TaskModalProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // 👇 CAMBIO: De un string a un array de strings
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<Partial<Subtask>[]>([]);

  // Control state
  // 👇 CAMBIO: Añadido estado para IDs de asignados originales (para diff)
  const [originalAssignedIds, setOriginalAssignedIds] = useState<string[]>([]);
  const [originalSubtasks, setOriginalSubtasks] = useState<Subtask[]>([]);
  const [originalTagIds, setOriginalTagIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = !!taskToEdit;

  const formRef = useRef<HTMLFormElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  // ... (Helpers de fecha y efectos de teclado no cambian) ...
  const dateFromInput = (d?: string) => (d ? new Date(`${d}T00:00:00`) : undefined);
  const normalizeDate = (value: unknown): Date | undefined => {
    if (!value) return undefined;
    if (typeof (value as any)?.toDate === "function") return (value as Timestamp).toDate();
    if (value instanceof Date) return value;
    return undefined;
  };
  const sameYMD = (a?: Date, b?: Date) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };

  const closeOnEsc = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") {
        formRef.current?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", closeOnEsc);
    return () => window.removeEventListener("keydown", closeOnEsc);
  }, [isOpen, closeOnEsc]);

  useEffect(() => {
    if (isOpen) setTimeout(() => titleRef.current?.focus(), 50);
  }, [isOpen]);

  // Populate/reset form on open
  useEffect(() => {
    if (!isOpen) return;

    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || "");

      // 👇 CAMBIO: Usar 'assignedToIds' (el array de strings)
      const initialAssignedIds = taskToEdit.assignedToIds || [];
      setAssignedToIds(initialAssignedIds);
      setOriginalAssignedIds(initialAssignedIds);

      setPriority(taskToEdit.priority);

      const d = normalizeDate(taskToEdit.dueDate);
      setDueDate(d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "");

      const initialTagIds = (taskToEdit.tags || []).map((t) => t.id);
      setTagIds(initialTagIds);
      setOriginalTagIds(initialTagIds);

      const initialSubtasks = taskToEdit.subtasks || [];
      setSubtasks(initialSubtasks);
      setOriginalSubtasks(initialSubtasks);
      setError(null);
    } else {
      // Crear
      setTitle("");
      setDescription("");
      setAssignedToIds([]); // 👈 CAMBIO: Resetear a array vacío
      setOriginalAssignedIds([]); // 👈 CAMBIO: Resetear a array vacío
      setPriority("medium");
      setDueDate("");
      setTagIds([]);
      setOriginalTagIds([]);
      setSubtasks([]);
      setOriginalSubtasks([]);
      setError(null);
    }
  }, [isOpen, taskToEdit]);

  // ... (Handlers de Subtasks no cambian) ...
  const handleSubtaskChange = (index: number, newTitle: string) => {
    setSubtasks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], title: newTitle };
      return copy;
    });
  };
  const handleAddSubtaskLocal = () => setSubtasks((s) => [...s, { title: "", completed: false }]);
  const handleRemoveSubtaskLocal = (index: number) => setSubtasks((s) => s.filter((_, i) => i !== index));

  const notifyDiscord = async (payload: any) => {
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => {

      console.warn("No se pudo disparar la notificación:", err);
    });
  };
  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("El título es obligatorio.");
      titleRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const toastId = toast.loading(isEditMode ? "Guardando cambios..." : "Creando tarea...");

    // 👇 NUEVO: Variables para controlar la notificación
    let finalTaskId: string | null = null;
    let shouldNotify = false;
    try {
      if (isEditMode && taskToEdit) {
        const promises: Promise<any>[] = [];

        // Core updates diff
        const core: Record<string, any> = {};
        if (title !== taskToEdit.title) core.title = title;
        if (description !== (taskToEdit.description || "")) core.description = description;
        if (priority !== taskToEdit.priority) core.priority = priority;

        // 👇 CAMBIO: Diff de asignados (comparando arrays)
        const assignedChanged = JSON.stringify([...assignedToIds].sort()) !== JSON.stringify([...originalAssignedIds].sort());
        if (assignedChanged) {
          core.assignedToIds = assignedToIds;
          shouldNotify = true; // 👈 NUEVO: Marcamos para notificar
        }

        // Due date diff (comparar por YMD)
        const originalDate = normalizeDate(taskToEdit.dueDate);
        const newDue = dateFromInput(dueDate);
        if (!sameYMD(originalDate, newDue)) core.dueDate = newDue || null;

        if (Object.keys(core).length > 0) {
          promises.push(updateTask(taskToEdit.id, core, userId, teamId));
        }

        // Tags diff
        const tagsChanged = JSON.stringify([...tagIds].sort()) !== JSON.stringify([...originalTagIds].sort());
        if (tagsChanged) promises.push(setTaskTags(taskToEdit.id, tagIds, userId, teamId));

        // ... (La lógica de diff de Subtasks no cambia) ...
        const originalIds = new Set(originalSubtasks.map((s) => s.id));
        const currentIds = new Set(subtasks.filter((s) => s.id).map((s) => s.id!));
        for (const os of originalSubtasks) {
          if (!currentIds.has(os.id)) {
            promises.push(apiRemoveSubtask(os.id!, taskToEdit.id, userId, teamId));
          }
        }
        for (const cs of subtasks) {
          if (cs.id) {
            if (originalIds.has(cs.id)) {
              const orig = originalSubtasks.find((x) => x.id === cs.id)!;
              if ((orig.title || "") !== (cs.title || "")) {
                promises.push(updateSubtaskTitle(cs.id, cs.title || "", userId, teamId, taskToEdit.id));
              }
            }
          } else if ((cs.title || "").trim()) {
            promises.push(apiAddSubtask(taskToEdit.id, cs.title!.trim(), userId, teamId));
          }
        }

        await Promise.all(promises);
        finalTaskId = taskToEdit.id;
      } else {
        // Create
        const payload: any = {
          projectId,
          teamId,
          title,
          description,
          priority,
          createdBy: userId,
          dueDate: dateFromInput(dueDate),
          tagIds,
          subtaskTitles: subtasks.map((s) => (s.title || "").trim()).filter(Boolean),
          assignedToIds: assignedToIds, // 👈 CAMBIO: Pasar el array de IDs
        };

        const newTaskId = await createTask(payload);
        finalTaskId = newTaskId; // 👈 NUEVO: Guardamos el nuevo ID

        if (assignedToIds.length > 0) {
          shouldNotify = true; // 👈 NUEVO: Es nueva y tiene asignados
        }


      }

      // --- 👇 LÓGICA DE NOTIFICACIÓN ---
      if (shouldNotify && finalTaskId) {
        // Filtramos la lista COMPLETA de miembros para obtener los objetos de los asignados
        const assignedUsers = teamMembers.filter(member =>
          assignedToIds.includes(member.uid)
        );

        // Creamos el payload exacto que n8n espera
        const n8nPayload = {
          id: finalTaskId,
          title: title, // El título del estado actual del formulario
          description: description,
          priority: priority,
          // Mapeamos al formato {id, name}
          assignedTo: assignedUsers.map(user => ({
            id: user.uid,
            name: user.displayName || user.email // O el campo de nombre que uses
          })),
          url_tarea: `http://37.60.233.86:3002/` // (Cambia esta URL por la tuya)
        };

        // ¡Llamamos a nuestra función helper!
        await notifyDiscord(n8nPayload);
      }
      //

      toast.success(isEditMode ? "Cambios guardados." : "Tarea creada.", { id: toastId });
      onSave();
      onClose();
    } catch (err) {
      console.error("ERROR: No se pudo guardar la tarea.", err);
      toast.error("No se pudo guardar la tarea. Inténtalo de nuevo.", { id: toastId });
      setError("No se pudo guardar la tarea. Inténtalo de nuevo.");
      setIsSubmitting(false);
    } finally {
      // 👇 NUEVO: movemos esto al 'finally' para que se ejecute siempre
      setIsSubmitting(false);
    }
  };

  // ... (Delete no cambia) ...
  const handleDelete = async () => {
    if (!isEditMode || !taskToEdit || userRole !== "admin") return;
    if (!window.confirm("¿Eliminar esta tarea? Esta acción no se puede deshacer.")) return;

    const toastId = toast.loading("Eliminando tarea...");
    try {
      setIsSubmitting(true);
      setError(null);
      await deleteTask(taskToEdit.id, userId, teamId);
      toast.success("Tarea eliminada.", { id: toastId });
      onSave();
      onClose();
    } catch (err) {
      console.error("ERROR: No se pudo eliminar la tarea.", err);
      toast.error("No se pudo eliminar la tarea.", { id: toastId });
      setError("No se pudo eliminar la tarea.");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // ... (Estilos consistentes no cambian) ...
  const inputClass = isLight
    ? "h-11 w-full rounded-2xl border-2 border-black bg-transparent px-3 text-sm text-black placeholder:text-black/50 outline-none"
    : "h-11 w-full rounded-2xl bg-transparent px-3 text-sm outline-none transition ring-2 ring-white/20 placeholder:text-muted-foreground/70 focus-visible:ring-violet-400/70";
  const areaClass = isLight
    ? "min-h-[110px] w-full rounded-2xl border-2 border-black bg-transparent px-3 py-2 text-sm text-black placeholder:text-black/50 outline-none"
    : "min-h-[110px] w-full rounded-2xl bg-transparent px-3 py-2 text-sm outline-none transition ring-2 ring-white/20 placeholder:text-muted-foreground/70 focus-visible:ring-violet-400/70";
  const pillClass = (active?: boolean) =>
    isLight
      ? `inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs border-2 ${active ? "border-black bg-black text-white" : "border-black text-black hover:bg-black/5"
      }`
      : `inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ring-2 ${active ? "ring-violet-400/70 bg-white/10" : "ring-white/20 hover:ring-violet-400/60"
      }`;
  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };
  const selectTriggerClass = isLight
    ? "h-11 rounded-2xl border-2 border-black bg-transparent text-left"
    : "h-11 rounded-2xl bg-transparent text-left ring-2 ring-white/20";
  const selectContentClass = isLight
    ? "z-[60] border-2 border-black bg-white text-black"
    : "z-[60] border border-white/10 bg-neutral-900 text-white";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      onMouseDown={onOverlayClick}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={
          isLight
            ? "relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-black bg-white text-black shadow-2xl"
            : "relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-background ring-2 ring-white/20 shadow-2xl"
        }
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header (no cambia) */}
        <div
          className={
            isLight
              ? "flex flex-shrink-0 items-center justify-between gap-3 border-b-2 border-black px-5 py-4"
              : "flex flex-shrink-0 items-center justify-between gap-3 px-5 py-4 ring-1 ring-inset ring-white/10"
          }
        >
          <h2 className={isLight ? "text-lg font-extrabold" : "text-lg font-bold"}>
            {isEditMode ? "Editar tarea" : "Nueva tarea"}
          </h2>
          <button
            onClick={onClose}
            className={
              isLight
                ? "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-black hover:bg-black hover:text-white"
                : "inline-flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white/20 hover:ring-violet-400/60"
            }
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form id="task-form" ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-6">
            {/* Título (no cambia) */}
            <div>
              <label htmlFor="title" className={isLight ? "mb-1 block text-xs font-semibold" : "mb-1 block text-xs font-medium text-muted-foreground"}>
                Título *
              </label>
              <input
                id="title"
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={inputClass}
                placeholder="Ej. Diseñar landing, Implementar auth..."
              />
            </div>

            {/* Descripción (no cambia) */}
            <div>
              <label htmlFor="description" className={isLight ? "mb-1 block text-xs font-semibold" : "mb-1 block text-xs font-medium text-muted-foreground"}>
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

              {/* 👇 CAMBIO: Reemplazado <Select> por un sistema de "pills" */}
              <div>
                <span className={isLight ? "mb-1 block text-xs font-semibold" : "mb-1 block text-xs font-medium text-muted-foreground"}>
                  Asignar a
                </span>
                <div className={isLight ? "min-h-[46px] rounded-2xl border-2 border-black p-2" : "min-h-[46px] rounded-2xl p-2 ring-2 ring-white/20"}>
                  {teamMembers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {teamMembers.map((member) => {
                        const active = assignedToIds.includes(member.uid);
                        return (
                          <button
                            key={member.uid}
                            type="button"
                            onClick={() =>
                              setAssignedToIds((prev) =>
                                prev.includes(member.uid)
                                  ? prev.filter((id) => id !== member.uid)
                                  : [...prev, member.uid]
                              )
                            }
                            className={pillClass(active)}
                            title={member.displayName || member.email}
                          >
                            {/* (Opcional: puedes poner un avatar aquí) */}
                            {member.displayName || member.email}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span className={isLight ? "text-xs text-black/60" : "text-xs text-muted-foreground"}>
                      No hay miembros en el equipo
                    </span>
                  )}
                </div>
              </div>

              {/* Prioridad (no cambia) */}
              <div>
                <label className={isLight ? "mb-1 block text-xs font-semibold" : "mb-1 block text-xs font-medium text-muted-foreground"}>
                  Prioridad
                </label>
                <Select
                  value={priority}
                  onValueChange={(v: "low" | "medium" | "high") => setPriority(v)}
                >
                  <SelectTrigger className={selectTriggerClass} aria-label="Prioridad">
                    <SelectValue placeholder="Selecciona prioridad" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass} sideOffset={6} position="popper" align="start">
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ... (Resto del formulario: Fecha, Etiquetas, Subtareas, Error no cambian) ... */}

            {/* Grid Fecha / Etiquetas */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="dueDate" className={isLight ? "mb-1 block text-xs font-semibold" : "mb-1 block text-xs font-medium text-muted-foreground"}>
                  Fecha de vencimiento
                </label>
                <input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <span className={isLight ? "mb-1 block text-xs font-semibold" : "mb-1 block text-xs font-medium text-muted-foreground"}>Etiquetas</span>
                <div className={isLight ? "min-h-[46px] rounded-2xl border-2 border-black p-2" : "min-h-[46px] rounded-2xl p-2 ring-2 ring-white/20"}>
                  {availableTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => {
                        const active = tagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() =>
                              setTagIds((prev) => (prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]))
                            }
                            className={pillClass(active)}
                            title={tag.tagName}
                          >
                            <span
                              className={isLight ? "inline-block h-2.5 w-2.5 rounded-full border-2 border-black" : "inline-block h-2.5 w-2.5 rounded-full"}
                              style={{ backgroundColor: tag.color || (isLight ? "#000000" : "#64748b") }}
                            />
                            {tag.tagName}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span className={isLight ? "text-xs text-black/60" : "text-xs text-muted-foreground"}>No hay etiquetas disponibles</span>
                  )}
                </div>
              </div>
            </div>

            {/* Subtareas */}
            <div>
              <h3 className={isLight ? "mb-2 text-sm font-extrabold" : "mb-2 text-sm font-semibold"}>Subtareas</h3>
              <div className="space-y-2">
                {subtasks.map((subtask, index) => (
                  <div key={subtask.id || `new-${index}`} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!subtask.completed}
                      disabled
                      className={isLight ? "h-4 w-4 cursor-not-allowed rounded border-black text-black" : "h-4 w-4 cursor-not-allowed rounded border-muted-foreground/30 text-primary"}
                      aria-label="Completada"
                    />
                    <input
                      type="text"
                      value={subtask.title || ""}
                      onChange={(e) => handleSubtaskChange(index, e.target.value)}
                      placeholder="Describe la subtarea"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtaskLocal(index)}
                      className={
                        isLight
                          ? "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-black hover:bg-black hover:text-white"
                          : "inline-flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-white/20 hover:ring-rose-500/60"
                      }
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
                className={isLight ? "mt-3 inline-flex items-center gap-2 text-sm font-semibold text-black hover:underline" : "mt-3 inline-flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300"}
              >
                <Plus size={16} /> Añadir subtarea
              </button>
            </div>

            {/* Dependencies Section */}
            {isEditMode && taskToEdit && (
              <DependencySection
                taskId={taskToEdit.id}
                projectId={projectId}
                teamId={teamId}
                allTasks={allProjectTasks}
                currentUserId={userId}
              />
            )}

            {/* Error */}
            {error && (
              <p className={isLight ? "rounded-2xl border-2 border-black p-3 text-sm font-semibold text-black" : "rounded-2xl bg-rose-500/10 p-3 text-sm font-medium text-rose-500 ring-2 ring-rose-500/30"}>
                {error}
              </p>
            )}

          </div>
        </form>

        {/* Footer (no cambia) */}
        <div className={isLight ? "flex flex-shrink-0 items-center justify-between gap-4 border-t-2 border-black px-5 py-4" : "flex flex-shrink-0 items-center justify-between gap-4 px-5 py-4 ring-1 ring-inset ring-white/10"}>
          <div>
            {isEditMode && userRole === "admin" && (
              <button type="button" onClick={handleDelete} className={isLight ? "font-semibold text-black hover:underline disabled:opacity-50" : "text-rose-500 hover:underline disabled:opacity-50"} disabled={isSubmitting}>
                Eliminar tarea
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className={
                isLight
                  ? "h-11 rounded-2xl border-2 border-black px-4 font-semibold text-black hover:bg-black hover:text-white disabled:opacity-50"
                  : "h-11 rounded-2xl px-4 font-semibold ring-2 ring-white/20 hover:ring-violet-400/60 disabled:opacity-50"
              }
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="task-form"
              className={
                isLight
                  ? "h-11 rounded-2xl border-2 border-black bg-black px-6 font-semibold text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
                  : "h-11 rounded-2xl px-6 font-semibold text-white shadow-md disabled:cursor-wait disabled:opacity-70 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 hover:from-indigo-400 hover:via-violet-500 hover:to-fuchsia-400"
              }
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

function DependencySection({
  taskId,
  projectId,
  teamId,
  allTasks,
  currentUserId,
}: {
  taskId: string;
  projectId: string;
  teamId: string;
  allTasks: TaskWithDetails[];
  currentUserId: string;
}) {
  const {
    dependencies,
    blockedBy,
    blocking,
    related,
    loading,
    addDependency,
    deleteDependency,
  } = useTaskDependencies(taskId, projectId);

  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedType, setSelectedType] = useState<DependencyType>("blocks");
  const [isAdding, setIsAdding] = useState(false);

  // Direction-aware lists for display
  const precededBy = dependencies.filter(
    (d) => d.type === "precedes" && d.toTaskId === taskId
  );
  const precedesOthers = dependencies.filter(
    (d) => d.type === "precedes" && d.fromTaskId === taskId
  );
  const duplicatedBy = dependencies.filter(
    (d) => d.type === "duplicates" && d.toTaskId === taskId
  );
  const duplicatesOthers = dependencies.filter(
    (d) => d.type === "duplicates" && d.fromTaskId === taskId
  );

  const availableTasks = allTasks.filter(
    (t) =>
      t.id !== taskId &&
      !dependencies.some(
        (d) => d.fromTaskId === t.id || d.toTaskId === t.id
      )
  );

  const handleAdd = async () => {
    if (!selectedTaskId) return;
    setIsAdding(true);
    try {
      const fromId =
        selectedType === "blocks" ||
        selectedType === "precedes" ||
        selectedType === "duplicates"
          ? selectedTaskId
          : taskId;
      const toId =
        selectedType === "blocks" ||
        selectedType === "precedes" ||
        selectedType === "duplicates"
          ? taskId
          : selectedTaskId;

      await addDependency(fromId, toId, selectedType, teamId, currentUserId);
      setSelectedTaskId("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add dependency"
      );
    } finally {
      setIsAdding(false);
    }
  };

  const typeConfig: Record<
    DependencyType,
    { label: string; icon: React.ReactNode; color: string }
  > = {
    blocks: { label: "Blocks", icon: <Lock className="h-4 w-4" />, color: "text-red-500" },
    relates_to: { label: "Relates to", icon: <Link2 className="h-4 w-4" />, color: "text-green-500" },
    precedes: { label: "Precedes", icon: <ArrowRight className="h-4 w-4" />, color: "text-blue-500" },
    duplicates: { label: "Duplicates", icon: <Copy className="h-4 w-4" />, color: "text-yellow-500" },
  };

  const getStatusBadgeClass = (status?: string) => {
    if (status === "done")
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (status === "in-progress")
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  };

  const renderDependencyList = (
    deps: TaskDependency[],
    title: string,
    direction: "inbound" | "outbound" | "bidirectional"
  ) => {
    if (deps.length === 0) return null;

    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">
          {title}
        </h4>
        <div className="space-y-2">
          {deps.map((dep) => {
            let otherTaskId: string;
            let text: string;

            if (direction === "inbound") {
              otherTaskId = dep.fromTaskId;
              const otherTitle = allTasks.find((t) => t.id === otherTaskId)?.title || "Unknown";
              text = `${otherTitle} ${typeConfig[dep.type].label.toLowerCase()} this`;
            } else if (direction === "outbound") {
              otherTaskId = dep.toTaskId;
              const otherTitle = allTasks.find((t) => t.id === otherTaskId)?.title || "Unknown";
              text = `This ${typeConfig[dep.type].label.toLowerCase()} ${otherTitle}`;
            } else {
              otherTaskId =
                dep.fromTaskId === taskId ? dep.toTaskId : dep.fromTaskId;
              const otherTitle = allTasks.find((t) => t.id === otherTaskId)?.title || "Unknown";
              text = `Related to ${otherTitle}`;
            }

            const otherTask = allTasks.find((t) => t.id === otherTaskId);
            const config = typeConfig[dep.type];

            return (
              <div
                key={dep.id}
                className="flex items-center justify-between p-2 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={config.color}>{config.icon}</span>
                  <span className="text-sm">{text}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(
                      otherTask?.status
                    )}`}
                  >
                    {otherTask?.status || "unknown"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    deleteDependency(dep.id, teamId, currentUserId).catch(
                      (err) =>
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Failed to remove dependency"
                        )
                    )
                  }
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Dependencies</h3>
        <Link
          href={`/projects/${projectId}/dependencies`}
          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          <GitGraph className="h-4 w-4" />
          View Graph
        </Link>
      </div>

      {/* Add dependency */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">Task</label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full p-2 rounded-lg border bg-background"
          >
            <option value="">Select a task...</option>
            {availableTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        <div className="w-40">
          <label className="text-sm font-medium mb-1 block">Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as DependencyType)}
            className="w-full p-2 rounded-lg border bg-background"
          >
            <option value="blocks">Blocks</option>
            <option value="relates_to">Relates to</option>
            <option value="precedes">Precedes</option>
            <option value="duplicates">Duplicates</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedTaskId || isAdding}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
        >
          {isAdding ? "Adding..." : "Add"}
        </button>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Loading dependencies...</p>
      )}

      {/* Lists by category */}
      {renderDependencyList(blockedBy, "Blocked By", "inbound")}
      {renderDependencyList(blocking, "Blocking", "outbound")}
      {renderDependencyList(related, "Related", "bidirectional")}
      {renderDependencyList(precededBy, "Preceded By", "inbound")}
      {renderDependencyList(precedesOthers, "Precedes", "outbound")}
      {renderDependencyList(duplicatedBy, "Duplicated By", "inbound")}
      {renderDependencyList(duplicatesOthers, "Duplicates", "outbound")}

      {[
        blockedBy,
        blocking,
        related,
        precededBy,
        precedesOthers,
        duplicatedBy,
        duplicatesOthers,
      ].every((d) => d.length === 0) &&
        !loading && (
          <p className="text-sm text-muted-foreground italic">
            No dependencies yet
          </p>
        )}
    </div>
  );
}