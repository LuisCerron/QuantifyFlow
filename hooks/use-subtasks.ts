"use client"

import { useCallback, useState } from "react"
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Subtask } from "@/types"

export function useSubtasks(taskId: string | null) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchSubtasks = useCallback(async () => {
    if (!taskId) return
    setLoading(true)
    try {
      const q = query(collection(db, "subtasks"), where("taskId", "==", taskId))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Subtask[]
      setSubtasks(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch subtasks"))
    } finally {
      setLoading(false)
    }
  }, [taskId])

  const createSubtask = useCallback(
    async (title: string) => {
      if (!taskId) return
      try {
        const docRef = await addDoc(collection(db, "subtasks"), {
          taskId,
          title,
          completed: false,
          createdAt: Timestamp.now(),
        })
        const newSubtask: Subtask = {
          id: docRef.id,
          taskId,
          title,
          completed: false,
          createdAt: new Date(),
        }
        setSubtasks([...subtasks, newSubtask])
        return newSubtask
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to create subtask"))
      }
    },
    [taskId, subtasks],
  )

  const updateSubtask = useCallback(
    async (subtaskId: string, updates: Partial<Subtask>) => {
      try {
        await updateDoc(doc(db, "subtasks", subtaskId), updates)
        setSubtasks(subtasks.map((s) => (s.id === subtaskId ? { ...s, ...updates } : s)))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to update subtask"))
      }
    },
    [subtasks],
  )

  const deleteSubtask = useCallback(
    async (subtaskId: string) => {
      try {
        await deleteDoc(doc(db, "subtasks", subtaskId))
        setSubtasks(subtasks.filter((s) => s.id !== subtaskId))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to delete subtask"))
      }
    },
    [subtasks],
  )

  return { subtasks, loading, error, fetchSubtasks, createSubtask, updateSubtask, deleteSubtask }
}
