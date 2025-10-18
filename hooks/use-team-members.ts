"use client"

import { useCallback, useState } from "react"
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
      const membersData: TeamMemberWithUser[] = []

      for (const memberDoc of snapshot.docs) {
        const member = memberDoc.data() as TeamMember
        const userDoc = await getDoc(doc(db, "users", member.userId))
        membersData.push({
          ...member,
          id: memberDoc.id,
          user: userDoc.exists() ? (userDoc.data() as User) : undefined,
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
        setMembers(members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to update member role"))
      }
    },
    [members],
  )

  const removeMember = useCallback(
    async (memberId: string) => {
      try {
        await deleteDoc(doc(db, "teamMembers", memberId))
        setMembers(members.filter((m) => m.id !== memberId))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to remove member"))
      }
    },
    [members],
  )

  return { members, loading, error, fetchMembers, updateMemberRole, removeMember }
}
