"use client"

import { useCallback, useEffect, useState } from "react"
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { TeamMember, User } from "@/types"

interface TeamMemberWithUser extends TeamMember {
  user?: User
}

export function useTeamMembers(teamId: string | null) {
  const [members, setMembers] = useState<TeamMemberWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!teamId) return
    setLoading(true)
    try {
      const q = query(collection(db, "teamMembers"), where("teamId", "==", teamId))
      const snapshot = await getDocs(q)
      const membersData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as TeamMemberWithUser[]

      const userIds = [...new Set(membersData.map((m) => m.userId).filter(Boolean))]
      if (userIds.length > 0) {
        const usersQuery = query(collection(db, "users"), where("__name__", "in", userIds.slice(0, 30)))
        const usersSnapshot = await getDocs(usersQuery)
        const usersMap = new Map(usersSnapshot.docs.map((doc) => [doc.id, doc.data() as User]))

        membersData.forEach((member) => {
          if (member.userId) {
            member.user = usersMap.get(member.userId)
          }
        })
      }

      setMembers(membersData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch team members"))
    } finally {
      setLoading(false)
    }
  }, [teamId])

  const updateMemberRole = useCallback(
    async (memberId: string, newRole: "admin" | "member") => {
      try {
        await updateDoc(doc(db, "teamMembers", memberId), {
          role: newRole,
        })
        setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to update member role"))
      }
    },
    [],
  )

  const removeMember = useCallback(
    async (memberId: string) => {
      try {
        await deleteDoc(doc(db, "teamMembers", memberId))
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to remove member"))
      }
    },
    [],
  )

  useEffect(() => {
    if (teamId) {
      fetchMembers()
    }
  }, [teamId, fetchMembers])

  return { members, loading, error, fetchMembers, updateMemberRole, removeMember }
}
