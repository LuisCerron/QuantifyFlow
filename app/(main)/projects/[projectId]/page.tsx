"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useTasks } from "@/hooks/use-tasks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"
import Link from "next/link"
import { KanbanBoard } from "@/components/kanban-board"
import { TaskDetailsModal } from "@/components/task-details-modal"
import type { Task } from "@/types"

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { user } = useAuth()
  const { tasks, loading, fetchTasks, createTask, updateTask } = useTasks(projectId)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [projectId, fetchTasks])

  const handleCreateTask = async () => {
    if (newTaskTitle.trim() && user) {
      await createTask(user.uid, newTaskTitle, "", newTaskPriority, user.uid)
      setNewTaskTitle("")
    }
  }

  const handleTaskMove = async (taskId: string, newStatus: Task["status"]) => {
    await updateTask(taskId, { status: newStatus })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/projects" className="text-primary hover:underline text-sm mb-2 inline-block">
            ← Back to Projects
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Project Board</h1>
          <p className="text-muted-foreground mt-2">Drag and drop tasks to organize your work</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Task</CardTitle>
          <CardDescription>Add a new task to this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCreateTask()}
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as "low" | "medium" | "high")}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <Button onClick={handleCreateTask} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </div>
      ) : (
        <KanbanBoard tasks={tasks} onTaskMove={handleTaskMove} onTaskClick={setSelectedTask} />
      )}

      {selectedTask && (
        <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={updateTask} />
      )}
    </div>
  )
}
