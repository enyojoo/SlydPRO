"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Clock, MoreHorizontal, Search, ArrowLeft, Edit2, Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { presentationsAPI } from "@/lib/presentations-api"

interface Presentation {
  id: string
  name: string
  slides: any[]
  thumbnail?: string
  created_at: string
  updated_at: string
}

// Helper function to create URL-friendly slug
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

export default function RecentPresentationsClient() {
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [filteredPresentations, setFilteredPresentations] = useState<Presentation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null)
  const [newName, setNewName] = useState("")

  const router = useRouter()
  const { session } = useAuth()

  useEffect(() => {
    if (session) {
      fetchPresentations()
    }
  }, [session])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = presentations.filter((presentation) =>
        presentation.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredPresentations(filtered)
    } else {
      setFilteredPresentations(presentations)
    }
  }, [searchQuery, presentations])

  const fetchPresentations = async () => {
    try {
      const data = await presentationsAPI.getUserPresentations()
      setPresentations(data)
      setFilteredPresentations(data)
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
    if (!selectedPresentation || !newName.trim()) return

    try {
      await presentationsAPI.updatePresentation(selectedPresentation.id, {
        name: newName.trim(),
      })
      await fetchPresentations()
      setShowRenameDialog(false)
      setSelectedPresentation(null)
      setNewName("")
    } catch (error) {
      console.error("Error renaming presentation:", error)
    }
  }

  const confirmDelete = async () => {
    if (!selectedPresentation) return

    try {
      await presentationsAPI.deletePresentation(selectedPresentation.id)
      await fetchPresentations()
      setShowDeleteDialog(false)
      setSelectedPresentation(null)
    } catch (error) {
      console.error("Error deleting presentation:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#027659]" />
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
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">All Presentations</h1>
              <p className="text-muted-foreground mt-1">{presentations.length} presentations</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search presentations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted border-border"
            />
          </div>
        </div>

        {/* Presentations Grid */}
        {filteredPresentations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPresentations.map((presentation) => {
              const firstSlide = presentation.slides[0]
              return (
                <Card
                  key={presentation.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-border hover:border-muted-foreground bg-card overflow-hidden"
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
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Search className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              {searchQuery ? "No presentations found" : "No presentations yet"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? `No presentations match "${searchQuery}"`
                : "Create your first presentation to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push("/")} className="bg-[#027659] hover:bg-[#065f46] text-white">
                Create Presentation
              </Button>
            )}
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
