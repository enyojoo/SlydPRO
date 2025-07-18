"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Calendar, FileText, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { presentationsAPI } from "@/lib/presentations-api"
import { useAuth } from "@/lib/auth-context"
import type { Presentation } from "@/lib/supabase"

export default function RecentPresentationsClient() {
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user) {
      loadPresentations()
    }
  }, [user, authLoading])

  const loadPresentations = async () => {
    try {
      setIsLoading(true)
      const data = await presentationsAPI.getUserPresentations()
      setPresentations(data)
    } catch (error) {
      console.error("Failed to load presentations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!confirm("Are you sure you want to delete this presentation?")) return

    try {
      setDeletingId(id)
      await presentationsAPI.deletePresentation(id)
      setPresentations((prev) => prev.filter((p) => p.id !== id))
    } catch (error) {
      console.error("Failed to delete presentation:", error)
      alert("Failed to delete presentation")
    } finally {
      setDeletingId(null)
    }
  }

  const handleOpenPresentation = (presentation: Presentation) => {
    router.push(`/editor/${presentation.id}`)
  }

  if (authLoading || isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="flex space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="w-24 h-16 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (presentations.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No presentations yet</h3>
        <p className="text-gray-500 mb-6">Create your first AI-powered presentation to get started.</p>
        <Button onClick={() => router.push("/")} className="bg-[#027659] hover:bg-[#065f46] text-white">
          Create Presentation
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {presentations.map((presentation) => (
        <Card
          key={presentation.id}
          className="hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => handleOpenPresentation(presentation)}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate group-hover:text-[#027659] transition-colors">
                  {presentation.name}
                </h3>

                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center space-x-1">
                    <FileText className="h-4 w-4" />
                    <span>{presentation.slides?.length || 0} slides</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{presentation.chat_history?.length || 0} messages</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(presentation.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    AI Generated
                  </Badge>
                  {presentation.chat_history && presentation.chat_history.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Has Chat History
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 ml-4">
                {/* Thumbnail */}
                <div className="w-24 h-16 rounded border overflow-hidden bg-gray-100 flex-shrink-0">
                  {presentation.thumbnail ? (
                    <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: presentation.thumbnail }} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#027659] to-[#10b981] flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDelete(presentation.id, e)}
                  disabled={deletingId === presentation.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
