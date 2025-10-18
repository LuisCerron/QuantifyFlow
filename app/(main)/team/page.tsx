"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useTeamManagement } from "@/hooks/use-team-management"
import { useInvitations } from "@/hooks/use-invitations"
import { useTeamMembers } from "@/hooks/use-team-members"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Mail, Trash2, Copy, Shield, User } from "lucide-react"

export default function TeamPage() {
  const { user } = useAuth()
  const { teams, fetchUserTeams, createTeam } = useTeamManagement(user?.uid || null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const { invitations, fetchInvitations, generateInvitation, revokeInvitation } = useInvitations(selectedTeamId)
  const { members, fetchMembers, updateMemberRole, removeMember } = useTeamMembers(selectedTeamId)
  const [newTeamName, setNewTeamName] = useState("")
  const [showNewTeam, setShowNewTeam] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchUserTeams()
    }
  }, [user, fetchUserTeams])

  useEffect(() => {
    if (selectedTeamId) {
      fetchInvitations()
      fetchMembers()
    }
  }, [selectedTeamId, fetchInvitations, fetchMembers])

  const handleCreateTeam = async () => {
    if (newTeamName.trim() && user) {
      await createTeam(newTeamName)
      setNewTeamName("")
      setShowNewTeam(false)
    }
  }

  const handleGenerateInvitation = async () => {
    if (selectedTeamId && user) {
      await generateInvitation(user.uid)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const selectedTeam = teams.find((t) => t.id === selectedTeamId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
        <p className="text-muted-foreground mt-2">Manage teams, members, and invitations</p>
      </div>

      {/* Teams List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Teams</CardTitle>
              <CardDescription>Teams you are a member of</CardDescription>
            </div>
            <Button onClick={() => setShowNewTeam(!showNewTeam)} size="sm">
              New Team
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showNewTeam && (
            <div className="flex gap-2 p-3 border border-border rounded-lg">
              <Input
                placeholder="Team name..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCreateTeam()}
              />
              <Button onClick={handleCreateTeam} size="sm">
                Create
              </Button>
              <Button variant="outline" onClick={() => setShowNewTeam(false)} size="sm">
                Cancel
              </Button>
            </div>
          )}

          {teams.length > 0 ? (
            teams.map((team) => (
              <div
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedTeamId === team.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <p className="font-medium">{team.name}</p>
                <p className="text-sm text-muted-foreground">{team.description || "No description"}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No teams yet. Create one to get started!</p>
          )}
        </CardContent>
      </Card>

      {selectedTeam && (
        <>
          {/* Invitations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invitations</CardTitle>
                  <CardDescription>Share these codes to invite team members</CardDescription>
                </div>
                <Button onClick={handleGenerateInvitation} size="sm" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Generate Code
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invitations.length > 0 ? (
                  invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div>
                        <p className="font-mono font-medium">{invitation.code}</p>
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 bg-transparent"
                          onClick={() => handleCopyCode(invitation.code)}
                        >
                          <Copy className="w-4 h-4" />
                          {copiedCode === invitation.code ? "Copied!" : "Copy"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => revokeInvitation(invitation.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No active invitations</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>{members.length} members in this team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {members.length > 0 ? (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {member.role === "admin" ? (
                            <Shield className="w-4 h-4 text-primary" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{member.user?.displayName || member.user?.email || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.id, e.target.value as "admin" | "member")}
                          className="text-xs px-2 py-1 border border-border rounded-md bg-background text-foreground"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeMember(member.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No members yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
