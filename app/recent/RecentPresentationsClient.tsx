"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Search, Filter, Clock, MoreHorizontal, Edit2, Trash2, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ModernHeader } from "@/components/modern-header"
import { Footer } from "@/components/footer"
import { slideTemplates } from "@/lib/slide-templates"

interface Project {
  id: string
  name: string
  slides: any[]
  createdAt: Date
  updatedAt: Date
  thumbnail?: string
  isStarred?: boolean
  views?: number
  description?: string
  category?: string
}

export default function RecentPresentationsClient() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [newName, setNewName] = useState("")

  const [projects, setProjects] = useState<Project[]>(
    slideTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      slides: template.slides,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      thumbnail: template.thumbnail,
      isStarred: template.isStarred || false,
      views: template.views || 0,
      description: template.description,
      category: template.category,
    })),
  )

  const filteredProjects = projects.filter((project) => project.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleRename = (project: Project) => {
    setSelectedProject(project)
    setNewName(project.name)
    setShowRenameDialog(true)
  }

  const handleDelete = (project: Project) => {
    setSelectedProject(project)
    setShowDeleteDialog(true)
  }

  const confirmRename = () => {
    if (selectedProject && newName.trim()) {
      setProjects(projects.map((p) => (p.id === selectedProject.id ? { ...p, name: newName.trim() } : p)))
      setShowRenameDialog(false)
      setSelectedProject(null)
      setNewName("")
    }
  }

  const confirmDelete = () => {
    if (selectedProject) {
      setProjects(projects.filter((p) => p.id !== selectedProject.id))
      setShowDeleteDialog(false)
      setSelectedProject(null)
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
              {filteredProjects.length} presentation{filteredProjects.length !== 1 ? "s" : ""}
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

        {/* Presentations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredProjects.map((project) => {
            const firstSlide = project.slides[0]
            return (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-border hover:border-muted-foreground bg-card overflow-hidden"
                onClick={() => router.push(`/editor?project=${project.id}`)}
              >
                {/* Actual Slide Thumbnail */}
                <div
                  className="w-full h-40 flex flex-col justify-center p-4 text-white relative overflow-hidden"
                  style={{
                    backgroundColor: firstSlide?.background || project.thumbnail,
                    color: firstSlide?.textColor || "#ffffff",
                  }}
                >
                  {firstSlide ? (
                    <>
                      <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight">{firstSlide.title}</h3>
                      <p className="text-sm opacity-80 line-clamp-3 leading-relaxed">
                        {firstSlide.content.substring(0, 120)}...
                      </p>
                    </>
                  ) : (
                    <div className="text-center">
                      <h3 className="text-lg font-bold">Empty Presentation</h3>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate mb-2">{project.name}</h3>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{project.createdAt.toLocaleDateString()}</span>
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
                            handleRename(project)
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(project)
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

        {/* Empty State */}
        {filteredProjects.length === 0 && (
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
              Are you sure you want to delete "{selectedProject?.name}"? This action cannot be undone.
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
