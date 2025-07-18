"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Clock, MoreHorizontal, ArrowUp, ArrowRight, Loader2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useChatContext } from "@/lib/chat-context"
import { useAuth } from "@/lib/auth-context"
import { ModernHeader } from "@/components/modern-header"
import { Footer } from "@/components/footer"
import { PLATFORM_CONFIG } from "@/lib/constants"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Edit2, Trash2 } from "lucide-react"

interface Presentation {
  id: string
  name: string
  description?: string
  slides: any[]
  thumbnail?: string
  is_starred: boolean
  views: number
  category?: string
  created_at: string
  updated_at: string
}

export default function SlydPROHome() {
  const { user, isAuthenticated, isLoading, login, signup, session } = useAuth()
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin")
  const [inputMessage, setInputMessage] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [presentationsLoading, setPresentationsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const router = useRouter()
  const { addMessage, clearMessages } = useChatContext()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null)
  const [newName, setNewName] = useState("")

  // Fetch user's presentations
  useEffect(() => {
    if (isAuthenticated && session) {
      fetchPresentations()
    }
  }, [isAuthenticated, session])

  const fetchPresentations = async () => {
    if (!session) return

    setPresentationsLoading(true)
    try {
      const response = await fetch("/api/presentations", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPresentations(data)
      } else {
        console.error("Failed to fetch presentations")
      }
    } catch (error) {
      console.error("Error fetching presentations:", error)
    } finally {
      setPresentationsLoading(false)
    }
  }

  const handleChatSubmit = async () => {
    if (!inputMessage.trim()) return

    if (!isAuthenticated) {
      setShowAuthDialog(true)
      return
    }

    // Create new presentation first
    try {
      const response = await fetch("/api/presentations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: "Untitled Presentation",
          slides: [],
        }),
      })

      if (response.ok) {
        const presentation = await response.json()
        const slug = "untitled-presentation"

        // Add message to chat context
        const userMessage = {
          id: Date.now().toString(),
          type: "user" as const,
          content: inputMessage,
          timestamp: new Date(),
        }

        clearMessages()
        addMessage(userMessage)

        // Redirect to new editor URL
        router.push(`/editor/${presentation.id}`)
      } else {
        console.error("Failed to create presentation")
      }
    } catch (error) {
      console.error("Error creating presentation:", error)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!isAuthenticated) {
        setShowAuthDialog(true)
        return
      }

      // Create new presentation and redirect
      const createAndRedirect = async () => {
        try {
          const response = await fetch("/api/presentations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              name: "Untitled Presentation",
              slides: [],
            }),
          })

          if (response.ok) {
            const presentation = await response.json()
            const slug = file.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "")

            const userMessage = {
              id: Date.now().toString(),
              type: "user" as const,
              content: `Uploaded: ${file.name}`,
              timestamp: new Date(),
            }

            clearMessages()
            addMessage(userMessage)

            // Redirect to new editor URL
            router.push(`/editor/${presentation.id}?file=${encodeURIComponent(file.name)}`)
          }
        } catch (error) {
          console.error("Error creating presentation:", error)
        }
      }

      createAndRedirect()
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError("")

    try {
      if (authMode === "signup") {
        if (formData.password !== formData.confirmPassword) {
          setAuthError("Passwords do not match")
          return
        }
        if (formData.password.length < 6) {
          setAuthError("Password must be at least 6 characters")
          return
        }
        await signup(formData.name, formData.email, formData.password)
      } else {
        await login(formData.email, formData.password)
      }

      setShowAuthDialog(false)
      setFormData({ name: "", email: "", password: "", confirmPassword: "" })
    } catch (error: any) {
      setAuthError(error.message || "Authentication failed")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleRename = (presentation: Presentation) => {
    setSelectedPresentation(presentation)
    setNewName(presentation.name)
    setShowRenameDialog(true)
  }

  const handleDelete = (presentation: Presentation) => {
    setSelectedPresentation(presentation)
    setShowDeleteDialog(true)
  }

  const confirmRename = async () => {
    if (!selectedPresentation || !newName.trim() || !session) return

    try {
      const response = await fetch(`/api/presentations/${selectedPresentation.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...selectedPresentation,
          name: newName.trim(),
        }),
      })

      if (response.ok) {
        await fetchPresentations()
        setShowRenameDialog(false)
        setSelectedPresentation(null)
        setNewName("")
      }
    } catch (error) {
      console.error("Error renaming presentation:", error)
    }
  }

  const confirmDelete = async () => {
    if (!selectedPresentation || !session) return

    try {
      const response = await fetch(`/api/presentations/${selectedPresentation.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        await fetchPresentations()
        setShowDeleteDialog(false)
        setSelectedPresentation(null)
      }
    } catch (error) {
      console.error("Error deleting presentation:", error)
    }
  }

  const handleOpenPresentation = (presentation: Presentation) => {
    router.push(`/editor/${presentation.id}`)
  }

  // Show only first 6 presentations on home page
  const recentPresentations = presentations.slice(0, 6)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Modern Header */}
      <ModernHeader onAuthClick={() => setShowAuthDialog(true)} />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="font-bold text-foreground mb-4 sm:mb-6 leading-tight text-3xl sm:text-4xl lg:text-5xl">
            Design something{" "}
            <span className="bg-gradient-to-r from-[#027659] to-[#10b981] bg-clip-text text-transparent">
              Presentable
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
            Create presentation slides by chatting with AI
          </p>
        </div>

        {/* Chat Interface */}
        <div className="max-w-2xl mx-auto mb-12 sm:mb-16 px-4 sm:px-0">
          <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="relative">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Describe your presentation idea... (e.g., 'Create a pitch deck for a food delivery startup')"
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleChatSubmit()}
                  className="w-full bg-muted border-0 text-foreground placeholder:text-muted-foreground text-sm sm:text-base focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[100px] sm:min-h-[120px] max-h-[200px] shadow-none outline-none focus:outline-none rounded-xl p-3 sm:p-4"
                  rows={4}
                />
              </div>
              <div className="flex items-center justify-between mt-3 sm:mt-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg px-2 sm:px-3 py-2"
                  >
                    <Upload className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Upload</span>
                  </Button>
                </div>
                <Button
                  onClick={handleChatSubmit}
                  className="bg-[#027659] hover:bg-[#065f46] text-white rounded-lg px-4 sm:px-6 py-2 shadow-sm hover:shadow-md transition-all duration-200"
                  disabled={!inputMessage.trim()}
                >
                  <span className="mr-2">Create</span>
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.doc,.docx,.pdf"
            className="hidden"
          />
        </div>

        {/* Recent Presentations - Only show for authenticated users with presentations */}
        {isAuthenticated && !presentationsLoading && presentations.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Recent Presentations</h2>
              <Button
                variant="ghost"
                onClick={() => router.push("/recent")}
                className="text-[#027659] hover:text-[#065f46] hover:bg-[#027659]/5"
              >
                View all
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {recentPresentations.map((presentation) => {
                const firstSlide = presentation.slides[0]
                return (
                  <Card
                    key={presentation.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-border hover:border-muted-foreground bg-card overflow-hidden"
                    onClick={() => {
                      router.push(`/editor/${presentation.id}`)
                    }}
                  >
                    {/* Actual Slide Thumbnail */}
                    <div className="w-full h-40 flex flex-col justify-center p-4 text-white relative overflow-hidden">
                      {presentation.thumbnail ? (
                        <img
                          src={presentation.thumbnail || "/placeholder.svg"}
                          alt={presentation.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : firstSlide ? (
                        <div
                          style={{
                            backgroundColor: firstSlide?.background || "#027659",
                            color: firstSlide?.textColor || "#ffffff",
                          }}
                          className="absolute inset-0 w-full h-full flex flex-col justify-center p-4"
                        >
                          <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight">{firstSlide.title}</h3>
                          <p className="text-sm opacity-80 line-clamp-3 leading-relaxed">
                            {firstSlide.content.substring(0, 120)}...
                          </p>
                        </div>
                      ) : (
                        <div
                          className="absolute inset-0 w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: "#027659" }}
                        >
                          <h3 className="text-lg font-bold text-white">Empty Presentation</h3>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate mb-2">{presentation.name}</h3>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{new Date(presentation.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRename(presentation)
                              }}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(presentation)
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Loading state for presentations */}
        {isAuthenticated && presentationsLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#027659]" />
            <p className="text-muted-foreground">Loading your presentations...</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md bg-card border border-border mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-foreground">
              {authMode === "signin" ? "Welcome back" : `Join ${PLATFORM_CONFIG.name}`}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAuth} className="space-y-6 py-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-6">
                {authMode === "signin"
                  ? "Sign in to create and save your presentations"
                  : "Create an account to get started with AI-powered presentations"}
              </p>
            </div>

            {authError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {authMode === "signup" && (
                <Input
                  placeholder="Full name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  required
                />
              )}
              <Input
                placeholder="Email address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                required
              />
              <Input
                placeholder="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                required
              />
              {authMode === "signup" && (
                <Input
                  placeholder="Confirm password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  required
                />
              )}
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full h-12 text-base bg-[#027659] text-white hover:bg-[#065f46]"
                disabled={authLoading}
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {authMode === "signin" ? "Signing In..." : "Creating Account..."}
                  </>
                ) : authMode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>

              <div className="flex items-center justify-center">
                <Separator className="flex-1 bg-border" />
                <span className="px-4 text-xs text-muted-foreground">or</span>
                <Separator className="flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 bg-background border-border text-foreground hover:bg-muted"
                disabled={authLoading}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAuthMode(authMode === "signin" ? "signup" : "signin")
                  setAuthError("")
                  setFormData({ name: "", email: "", password: "", confirmPassword: "" })
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
                disabled={authLoading}
              >
                {authMode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Presentation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              onKeyPress={(e) => e.key === "Enter" && confirmRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmRename}
              disabled={!newName.trim()}
              className="bg-[#027659] hover:bg-[#065f46] text-white"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Presentation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{selectedPresentation?.name}"? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
