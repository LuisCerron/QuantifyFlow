"use client"

import React from "react"
import { StrictModeDroppable } from "./StrictModeDroppable"
import TaskCard from "./TaskCard"
import type { TaskWithDetails } from "@/types"

interface KanbanColumnProps {
  column: {
    id: string
    title: string
    tasks: TaskWithDetails[]
  }
  onTaskClick: (task: TaskWithDetails) => void
  onRefreshBoard: () => void
}

export default function KanbanColumn({ column, onTaskClick, onRefreshBoard }: KanbanColumnProps) {
  return (
    <section
      aria-label={`Columna ${column.title}`}
      className="group relative flex min-h-[420px] flex-col rounded-2xl p-4 transition-all
                 bg-white/70 dark:bg-white/5 backdrop-blur-sm
                 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_36px_-18px_rgba(0,0,0,0.45)]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
          {column.title}
        </h2>
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium dark:bg-white/10">
          {column.tasks.length}
        </span>
      </div>

      <StrictModeDroppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            aria-live="polite"
            className={[
              "flex-1 space-y-3 rounded-xl p-1 transition-colors",
              snapshot.isDraggingOver
                ? "bg-white/90 dark:bg-white/10"
                : "bg-white/70 dark:bg-white/5",
            ].join(" ")}
          >
            {column.tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onClick={() => onTaskClick(task)}
                onUpdate={onRefreshBoard}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </StrictModeDroppable>
    </section>
  )
}