"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Search, Filter, Clock, MoreHorizontal, Edit2, Trash2, ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ModernHeader } from "@/components/modern-header"
import { Footer } from "@/components/footer"

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
  user_id: string
  name: string
  slides: any[]
  thumbnail?: string
  created_at: string
  updated_at: string
}

export default function RecentPresentationsClient() {
  const { user, isAuthenticated, session } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null)
  const [newName, setNewName] = useState("")
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch presentations
  useEffect(() => {
    if (isAuthenticated && session) {
      fetchPresentations()
    }
  }, [isAuthenticated, session])

  const fetchPresentations = async () => {
    if (!session) return

    setIsLoading(true)
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
      setIsLoading(false)
    }
  }

  const filteredPresentations = presentations.filter((presentation) =>
    presentation.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

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

  if (!isAuthenticated) {
    router.push("/")
    return null
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Modern Header */}
      <ModernHeader />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="mr-2 sm:mr-4 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Recent Presentations</h1>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <p className="text-muted-foreground">
              {filteredPresentations.length} presentation{filteredPresentations.length !== 1 ? "s" : ""}
            </p>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search presentations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64 bg-background border-border"
                />
              </div>
              <Button variant="outline" size="sm" className="shrink-0 bg-transparent">
                <Filter className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#027659]" />
            <p className="text-muted-foreground">Loading presentations...</p>
          </div>
        )}

        {/* Presentations Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredPresentations.map((presentation) => {
              const firstSlide = presentation.slides[0]
              return (
                <Card
                  key={presentation.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-border hover:border-muted-foreground bg-card overflow-hidden"
                  onClick={() => router.push(`/editor/${presentation.id}/${createSlug(presentation.name)}`)}
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
        )}

        {/* Empty State */}
        {!isLoading && filteredPresentations.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              {searchQuery ? "No presentations found matching your search." : "No presentations yet."}
            </div>
            {!searchQuery && (
              <Button onClick={() => router.push("/")} className="mt-4 bg-[#027659] hover:bg-[#065f46] text-white">
                Create your first presentation
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />

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
