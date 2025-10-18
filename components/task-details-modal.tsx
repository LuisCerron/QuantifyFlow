"use client"

import { useEffect, useState } from "react"
import type { Task } from "@/types"
import { useSubtasks } from "@/hooks/use-subtasks"
import { useActivityLog } from "@/hooks/use-activity-log"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Plus, CheckCircle2, Circle, Trash2, Clock } from "lucide-react"

interface TaskDetailsModalProps {
  task: Task
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
}

export function TaskDetailsModal({ task, onClose, onUpdate }: TaskDetailsModalProps) {
  const { subtasks, fetchSubtasks, createSubtask, updateSubtask, deleteSubtask } = useSubtasks(task.id)
  const { logs, fetchLogs } = useActivityLog(task.id)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [description, setDescription] = useState(task.description || "")
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "")
  const [priority, setPriority] = useState(task.priority)
  const [status, setStatus] = useState(task.status)

  useEffect(() => {
    fetchSubtasks()
    fetchLogs()
  }, [task.id, fetchSubtasks, fetchLogs])

  const handleAddSubtask = async () => {
    if (newSubtaskTitle.trim()) {
      await createSubtask(newSubtaskTitle)
      setNewSubtaskTitle("")
    }
  }

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    await updateSubtask(subtaskId, { completed: !completed })
  }

  const handleSaveChanges = async () => {
    await onUpdate(task.id, {
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority,
      status,
    })
  }

  const completedSubtasks = subtasks.filter((s) => s.completed).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="flex-1">
            <CardTitle className="text-2xl">{task.title}</CardTitle>
            <CardDescription>Task ID: {task.id}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground min-h-24"
              placeholder="Add task description..."
            />
          </div>

          {/* Task Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Due Date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Subtasks</label>
              <span className="text-xs text-muted-foreground">
                {completedSubtasks} of {subtasks.length} completed
              </span>
            </div>
            <div className="space-y-2 mb-3">
              {subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2 p-2 border border-border rounded-md">
                  <button onClick={() => handleToggleSubtask(subtask.id, subtask.completed)} className="flex-shrink-0">
                    {subtask.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${subtask.completed ? "line-through text-muted-foreground" : ""}`}>
                    {subtask.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => deleteSubtask(subtask.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add new subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddSubtask()}
              />
              <Button onClick={handleAddSubtask} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </div>

          {/* Activity Log */}
          <div>
            <label className="text-sm font-medium mb-3 block flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Activity Log
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="text-sm p-2 border border-border rounded-md">
                    <p className="font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button onClick={handleSaveChanges} className="flex-1">
              Save Changes
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
