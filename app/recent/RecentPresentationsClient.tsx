"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Clock, MoreHorizontal, Search, ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Edit2, Trash2 } from "lucide-react"

// Helper function to create URL-friendly slug
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

interface Presentation {
  id: string
  name: string
  slides: any[]
  thumbnail?: string
  created_at: string
  updated_at: string
}

export default function RecentPresentationsClient() {
  const { session } = useAuth()
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null)
  const [newName, setNewName] = useState("")
  const router = useRouter()

  // Fetch presentations
  useEffect(() => {
    if (session) {
      fetchPresentations()
    }
  }, [session])

  const fetchPresentations = async () => {
    if (!session) return

    setLoading(true)
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
      setLoading(false)
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

  // Filter presentations based on search query
  const filteredPresentations = presentations.filter((presentation) =>
    presentation.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#027659]" />
          <p className="text-muted-foreground">Loading your presentations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.push("/")} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Your Presentations</h1>
              <p className="text-muted-foreground mt-1">{presentations.length} presentations total</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search presentations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
        </div>

        {/* Presentations Grid */}
        {filteredPresentations.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {searchQuery ? "No presentations found" : "No presentations yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? `No presentations match "${searchQuery}"`
                : "Create your first presentation to get started"}
            </p>
            <Button onClick={() => router.push("/")} className="bg-[#027659] hover:bg-[#065f46] text-white">
              Create Presentation
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPresentations.map((presentation) => {
              const firstSlide = presentation.slides[0]
              return (
                <Card
                  key={presentation.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-border hover:border-muted-foreground bg-card overflow-hidden group"
                  onClick={() => router.push(`/editor/${presentation.id}/${createSlug(presentation.name)}`)}
                >
                  {/* Slide Thumbnail */}
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
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{new Date(presentation.created_at).toLocaleDateString()}</span>
                          </div>
                          <span>{presentation.slides.length} slides</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
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
        )}
      </div>

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
