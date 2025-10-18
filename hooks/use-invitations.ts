"use client"

import { useCallback, useState } from "react"
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface Invitation {
  id: string
  code: string
  teamId: string
  createdBy: string
  createdAt: Date
  expiresAt: Date
  usedBy?: string[]
}

export function useInvitations(teamId: string | null) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchInvitations = useCallback(async () => {
    if (!teamId) return
    setLoading(true)
    try {
      const q = query(collection(db, "invitationCodes"), where("teamId", "==", teamId))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Invitation[]
      setInvitations(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch invitations"))
    } finally {
      setLoading(false)
    }
  }, [teamId])

  const generateInvitation = useCallback(
    async (createdBy: string) => {
      if (!teamId) return
      try {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        const docRef = await addDoc(collection(db, "invitationCodes"), {
          code,
          teamId,
          createdBy,
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(expiresAt),
          usedBy: [],
        })

        const newInvitation: Invitation = {
          id: docRef.id,
          code,
          teamId,
          createdBy,
          createdAt: new Date(),
          expiresAt,
          usedBy: [],
        }
        setInvitations([...invitations, newInvitation])
        return newInvitation
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to generate invitation"))
      }
    },
    [teamId, invitations],
  )

  const acceptInvitation = useCallback(async (code: string, userId: string) => {
    try {
      const q = query(collection(db, "invitationCodes"), where("code", "==", code))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        throw new Error("Invalid invitation code")
      }

      const invitationDoc = snapshot.docs[0]
      const invitation = invitationDoc.data() as Invitation

      if (new Date(invitation.expiresAt) < new Date()) {
        throw new Error("Invitation has expired")
      }

      await addDoc(collection(db, "teamMembers"), {
        teamId: invitation.teamId,
        userId,
        role: "member",
        joinedAt: Timestamp.now(),
      })

      const usedBy = invitation.usedBy || []
      await updateDoc(doc(db, "invitationCodes", invitationDoc.id), {
        usedBy: [...usedBy, userId],
      })

      return invitation.teamId
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to accept invitation"))
      throw err
    }
  }, [])

  const revokeInvitation = useCallback(
    async (invitationId: string) => {
      try {
        await deleteDoc(doc(db, "invitationCodes", invitationId))
        setInvitations(invitations.filter((i) => i.id !== invitationId))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to revoke invitation"))
      }
    },
    [invitations],
  )

  return { invitations, loading, error, fetchInvitations, generateInvitation, acceptInvitation, revokeInvitation }
}
