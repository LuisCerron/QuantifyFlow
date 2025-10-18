"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import type { Task } from "@/types"
import { KanbanCard } from "./kanban-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface KanbanColumnProps {
  status: Task["status"]
  title: string
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

export function KanbanColumn({ status, title, tasks, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: `column-${status}`,
    data: { status },
  })

  const statusColors = {
    todo: "bg-blue-50 dark:bg-blue-950",
    "in-progress": "bg-yellow-50 dark:bg-yellow-950",
    done: "bg-green-50 dark:bg-green-950",
  }

  return (
    <Card className={statusColors[status]}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{tasks.length} tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={setNodeRef} className="space-y-2 min-h-96 rounded-lg p-2 bg-background/50">
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <KanbanCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
            ))}
          </SortableContext>
          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No tasks yet</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
