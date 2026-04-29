"use client"

import React, { memo, useMemo, useCallback } from "react"
import { Draggable } from "react-beautiful-dnd"
import { cn } from "@/lib/utils"
import { toDateSafe } from "@/lib/utils/date"
import type { TaskWithDetails, Subtask } from "@/types"
import { Loader2, Square, CheckSquare, Lock, Link2 } from "lucide-react"

type DueKind = "overdue" | "due-soon" | "normal"
const getDueDateStatus = (dueDate?: any): DueKind => {
  const d = toDateSafe(dueDate)
  if (!d) return "normal"
  const diffH = (d.getTime() - Date.now()) / 36e5
  if (diffH < 0) return "overdue"
  if (diffH <= 24) return "due-soon"
  return "normal"
}

const getAccentClass = (dueStatus: DueKind): string => {
  if (dueStatus === "overdue") return "bg-rose-500"
  if (dueStatus === "due-soon") return "bg-amber-500"
  return "bg-transparent"
}

interface TaskCardProps {
  task: TaskWithDetails
  index: number
  onClick: () => void
  isDraggable: boolean
  isEditable: boolean
  onSubtaskToggle: (taskId: string, subtaskId: string, newStatus: boolean) => void
  updatingSubtaskId: string | null
  blockedByCount?: number
  blockingCount?: number
  isBlocked?: boolean
}

const TaskCard = memo(function TaskCard({
  task,
  index,
  onClick,
  isDraggable,
  isEditable,
  onSubtaskToggle,
  updatingSubtaskId,
  blockedByCount = 0,
  blockingCount = 0,
  isBlocked = false,
}: TaskCardProps) {
  const dueStatus = useMemo(() => getDueDateStatus(task.dueDate), [task.dueDate])
  const subtasks = task.subtasks ?? []
  const completedSubtasks = useMemo(() => subtasks.filter((s) => s.completed).length, [subtasks])
  const progressPct = useMemo(() => 
    subtasks.length ? Math.round((completedSubtasks / subtasks.length) * 100) : 0,
    [subtasks.length, completedSubtasks]
  )
  const accentClass = useMemo(() => getAccentClass(dueStatus), [dueStatus])
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isEditable) onClick()
  }, [isEditable, onClick])



  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!isDraggable}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps} 
          style={provided.draggableProps.style}
          onClick={isEditable ? onClick : undefined}
          className={cn(
            "group relative rounded-2xl p-4 transition-shadow select-none",
            "ring-2 ring-neutral-200/80 dark:ring-white/20 hover:shadow-lg",
            "bg-white/70 dark:bg-black/20",
            "text-black dark:text-white",
            snapshot.isDragging && "ring-violet-500/70",
            !isDraggable && "opacity-70 cursor-not-allowed hover:shadow-none",
            isBlocked && "border-l-2 border-l-red-400 dark:border-l-red-500"
          )}
          role={isEditable ? "button" : undefined}
          tabIndex={isEditable ? 0 : undefined}
          aria-grabbed={snapshot.isDragging}
          aria-disabled={!isDraggable}
        >
          <span className={cn("absolute left-0 top-0 h-full w-1.5 rounded-l-2xl", accentClass)} />

          <h3 className="mb-2 line-clamp-2 text-sm font-semibold">{task.title}</h3>

          {/* ... (La lógica de Subtasks no cambia) ... */}
          {subtasks.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-xs text-muted-foreground">
                {completedSubtasks} de {subtasks.length} completadas
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full ring-1 ring-neutral-200/70 dark:ring-white/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    progressPct === 100
                      ? "bg-emerald-500"
                      : "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {subtasks.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {subtasks.map((sub: Subtask) => {
                const isLoading = updatingSubtaskId === sub.id;
                return (
                  <div
                    key={sub.id}
                    onClick={(e) => {
                      e.stopPropagation(); // Previene que se abra el modal
                      if (!isDraggable || isLoading) return; // Respeta permisos y previene doble clic
                      onSubtaskToggle(task.id, sub.id, !sub.completed);
                    }}
                    className={cn(
                      "flex select-none items-center gap-2 rounded-lg px-2 py-1",
                      !isDraggable && "cursor-not-allowed opacity-60",
                      isDraggable && !isLoading && "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5",
                      isLoading && "cursor-wait opacity-60"
                    )}
                  >
                    {/* Reemplazamos <input> con iconos para mostrar estado de carga */}
                    {isLoading ? (
                       <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : sub.completed ? (
                       <CheckSquare className="h-4 w-4 text-emerald-500" />
                    ) : (
                       <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                    
                    <span className={cn("text-xs", sub.completed && "line-through text-muted-foreground")}>
                      {sub.title}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* ... (La lógica de Tags no cambia) ... */}
          {task.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                    "ring-1 ring-neutral-200/70 dark:ring-white/15",
                    "text-black dark:text-white",
                    "bg-black/5 dark:bg-white/10"
                  )}
                >
                  <span
                    className="mr-1 inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color || "#64748b" }}
                  />
                  {tag.tagName}
                </span>
              ))}
            </div>
          ) : null}

          {/* 👇 CAMBIO: Renderizar un "avatar stack" para múltiples asignados */}
          {task.assignedTo && task.assignedTo.length > 0 && (
            <div className="mt-3 flex items-center -space-x-2">
              {/* Mostramos los primeros 3 avatares */}
              {task.assignedTo.slice(0, 3).map((user) => {
                // Calculamos las iniciales para este usuario
                const initials =
                  user.displayName
                    ?.split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "?";

                return user.photoURL ? (
                  <img
                    key={user.uid}
                    src={user.photoURL}
                    alt={user.displayName || "usuario"}
                    title={user.displayName || "usuario"} // Tooltip con el nombre
                    className="h-7 w-7 rounded-full object-cover ring-2 ring-neutral-200/80 dark:ring-white/20"
                  />
                ) : (
                  <div
                    key={user.uid}
                    title={user.displayName || "usuario"} // Tooltip con el nombre
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-neutral-200/80 dark:ring-white/20 bg-black/5 dark:bg-white/10"
                  >
                    {initials}
                  </div>
                );
              })}

              {/* Si hay más de 3, mostramos un indicador "+N" */}
              {task.assignedTo.length > 3 && (
                <div
                  title={`${task.assignedTo.length - 3} más asignados`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-neutral-200/80 dark:ring-white/20 bg-black/5 dark:bg-white/10"
                >
                  +{task.assignedTo.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Dependency indicator */}
          {(blockedByCount > 0 || blockingCount > 0) && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-200/70 dark:border-white/10">
              {isBlocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
                  <Lock className="h-3 w-3" />
                  Blocked ({blockedByCount})
                </span>
              )}
              {blockingCount > 0 && !isBlocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <Link2 className="h-3 w-3" />
                  Blocking ({blockingCount})
                </span>
              )}
            </div>
          )}
        </article>
      )}
    </Draggable>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.task === nextProps.task &&
    prevProps.index === nextProps.index &&
    prevProps.isDraggable === nextProps.isDraggable &&
    prevProps.isEditable === nextProps.isEditable &&
    prevProps.updatingSubtaskId === nextProps.updatingSubtaskId &&
    prevProps.blockedByCount === nextProps.blockedByCount &&
    prevProps.blockingCount === nextProps.blockingCount &&
    prevProps.isBlocked === nextProps.isBlocked
  )
})

export default TaskCard