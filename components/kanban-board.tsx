"use client"

import { useState, useEffect } from "react"
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import type { Task } from "@/types"
import { KanbanColumn } from "./kanban-column"
import { KanbanCard } from "./kanban-card"

interface KanbanBoardProps {
  tasks: Task[]
  onTaskMove: (taskId: string, newStatus: Task["status"]) => Promise<void>
  onTaskClick?: (task: Task) => void
}

export function KanbanBoard({ tasks, onTaskMove, onTaskClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [optimisticTasks, setOptimisticTasks] = useState(tasks)

  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const tasksByStatus = {
    todo: optimisticTasks.filter((t) => t.status === "todo"),
    "in-progress": optimisticTasks.filter((t) => t.status === "in-progress"),
    done: optimisticTasks.filter((t) => t.status === "done"),
  }

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const handleDragOver = (event: any) => {
    const { active, over } = event
    if (!over) return

    const activeTask = optimisticTasks.find((t) => t.id === active.id)
    if (!activeTask) return

    const overStatus = over.data.current?.status
    if (overStatus && activeTask.status !== overStatus) {
      setOptimisticTasks((tasks) => tasks.map((t) => (t.id === active.id ? { ...t, status: overStatus } : t)))
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeTask = optimisticTasks.find((t) => t.id === active.id)
    if (!activeTask) return

    const newStatus = over.data.current?.status || activeTask.status

    if (newStatus !== activeTask.status) {
      try {
        await onTaskMove(activeTask.id, newStatus)
      } catch (error) {
        setOptimisticTasks(tasks)
      }
    }
  }

  const activeTask = optimisticTasks.find((t) => t.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
        <KanbanColumn status="todo" title="To Do" tasks={tasksByStatus.todo} onTaskClick={onTaskClick} />
        <KanbanColumn
          status="in-progress"
          title="In Progress"
          tasks={tasksByStatus["in-progress"]}
          onTaskClick={onTaskClick}
        />
        <KanbanColumn status="done" title="Done" tasks={tasksByStatus.done} onTaskClick={onTaskClick} />
      </div>

      <DragOverlay>{activeTask ? <KanbanCard task={activeTask} isDragging /> : null}</DragOverlay>
    </DndContext>
  )
}
