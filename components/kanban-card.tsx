"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Task } from "@/types"
import { Card } from "@/components/ui/card"
import { GripVertical } from "lucide-react"

interface KanbanCardProps {
  task: Task
  isDragging?: boolean
  onClick?: () => void
}

export function KanbanCard({ task, isDragging, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  }

  const priorityColors = {
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex gap-2">
        <div {...attributes} {...listeners} className="flex-shrink-0 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm break-words">{task.title}</p>
          {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
          <div className="flex gap-2 mt-2">
            <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[task.priority]}`}>{task.priority}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
