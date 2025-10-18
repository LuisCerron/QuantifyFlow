"use client"

import { useCallback, useState } from "react"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Team, TeamMember } from "@/types"

export function useTeam(teamId: string | null) {
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTeam = useCallback(async () => {
    if (!teamId) return
    setLoading(true)
    try {
      const teamDoc = await getDoc(doc(db, "teams", teamId))
      if (teamDoc.exists()) {
        setTeam(teamDoc.data() as Team)
      }

      const membersQuery = query(collection(db, "teamMembers"), where("teamId", "==", teamId))
      const membersSnapshot = await getDocs(membersQuery)
      setMembers(membersSnapshot.docs.map((doc) => doc.data() as TeamMember))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch team"))
    } finally {
      setLoading(false)
    }
  }, [teamId])

  return { team, members, loading, error, fetchTeam }
}
