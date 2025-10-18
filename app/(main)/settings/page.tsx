"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useTheme, type ColorPalette } from "@/lib/theme-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Link from "next/link"

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const { theme, colorPalette, setTheme, setColorPalette } = useTheme()
  const [displayName, setDisplayName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
    if (user) {
      setDisplayName(user.displayName)
    }
  }, [user, authLoading, router])

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName,
      })
      setSuccess("Profile updated successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  const colorPalettes: ColorPalette[] = ["default", "blue", "green", "purple"]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/dashboard" className="text-primary hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={user.email} disabled className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1"
                />
              </div>
              {error && <div className="text-sm text-destructive">{error}</div>}
              {success && <div className="text-sm text-green-600">{success}</div>}
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how the app looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-3 block">Theme</label>
                <div className="flex gap-3">
                  <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
                    Light
                  </Button>
                  <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
                    Dark
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">Color Palette</label>
                <div className="grid grid-cols-2 gap-3">
                  {colorPalettes.map((palette) => (
                    <Button
                      key={palette}
                      variant={colorPalette === palette ? "default" : "outline"}
                      onClick={() => setColorPalette(palette)}
                      className="capitalize"
                    >
                      {palette}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
