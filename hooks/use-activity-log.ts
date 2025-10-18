"use client"

import { useCallback, useState } from "react"
import { collection, query, where, getDocs, addDoc, Timestamp, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { ActivityLog } from "@/types"

export function useActivityLog(taskId: string | null) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!taskId) return
    setLoading(true)
    try {
      const q = query(collection(db, "activityLog"), where("taskId", "==", taskId), orderBy("createdAt", "desc"))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as ActivityLog[]
      setLogs(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch activity logs"))
    } finally {
      setLoading(false)
    }
  }, [taskId])

  const addLog = useCallback(
    async (teamId: string, userId: string, action: string, details?: Record<string, any>) => {
      if (!taskId) return
      try {
        const docRef = await addDoc(collection(db, "activityLog"), {
          taskId,
          teamId,
          userId,
          action,
          details,
          createdAt: Timestamp.now(),
        })
        const newLog: ActivityLog = {
          id: docRef.id,
          taskId,
          teamId,
          userId,
          action,
          details,
          createdAt: new Date(),
        }
        setLogs([newLog, ...logs])
        return newLog
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to add activity log"))
      }
    },
    [taskId, logs],
  )

  return { logs, loading, error, fetchLogs, addLog }
}
