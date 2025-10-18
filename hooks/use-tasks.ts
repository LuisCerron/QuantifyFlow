"use client"

import { useCallback, useState } from "react"
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Task } from "@/types"

export function useTasks(projectId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const q = query(collection(db, "tasks"), where("projectId", "==", projectId))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Task[]
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch tasks"))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const createTask = useCallback(
    async (
      teamId: string,
      title: string,
      description?: string,
      priority: "low" | "medium" | "high" = "medium",
      createdBy?: string,
    ) => {
      if (!projectId) return
      try {
        const docRef = await addDoc(collection(db, "tasks"), {
          projectId,
          teamId,
          title,
          description,
          status: "todo",
          priority,
          createdBy: createdBy || "unknown",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        })
        const newTask: Task = {
          id: docRef.id,
          projectId,
          teamId,
          title,
          description,
          status: "todo",
          priority,
          createdBy: createdBy || "unknown",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setTasks([...tasks, newTask])
        return newTask
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to create task"))
      }
    },
    [projectId, tasks],
  )

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      try {
        await updateDoc(doc(db, "tasks", taskId), {
          ...updates,
          updatedAt: Timestamp.now(),
        })
        setTasks(tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to update task"))
      }
    },
    [tasks],
  )

  const deleteTask = useCallback(
    async (taskId: string) => {
      try {
        await deleteDoc(doc(db, "tasks", taskId))
        setTasks(tasks.filter((t) => t.id !== taskId))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to delete task"))
      }
    },
    [tasks],
  )

  return { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask }
}
