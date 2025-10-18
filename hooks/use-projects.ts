"use client"

import { useCallback, useState } from "react"
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Project } from "@/types"

export function useProjects(teamId: string | null) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchProjects = useCallback(async () => {
    if (!teamId) return
    setLoading(true)
    try {
      const q = query(collection(db, "projects"), where("teamId", "==", teamId))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Project[]
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch projects"))
    } finally {
      setLoading(false)
    }
  }, [teamId])

  const createProject = useCallback(
    async (name: string, description?: string) => {
      if (!teamId) return
      try {
        const docRef = await addDoc(collection(db, "projects"), {
          teamId,
          name,
          description,
          status: "active",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        })
        const newProject: Project = {
          id: docRef.id,
          teamId,
          name,
          description,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setProjects([...projects, newProject])
        return newProject
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to create project"))
      }
    },
    [teamId, projects],
  )

  const updateProject = useCallback(
    async (projectId: string, updates: Partial<Project>) => {
      try {
        await updateDoc(doc(db, "projects", projectId), {
          ...updates,
          updatedAt: Timestamp.now(),
        })
        setProjects(projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p)))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to update project"))
      }
    },
    [projects],
  )

  const deleteProject = useCallback(
    async (projectId: string) => {
      try {
        await deleteDoc(doc(db, "projects", projectId))
        setProjects(projects.filter((p) => p.id !== projectId))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to delete project"))
      }
    },
    [projects],
  )

  return { projects, loading, error, fetchProjects, createProject, updateProject, deleteProject }
}
