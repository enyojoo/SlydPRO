"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Grid3X3, LayoutGrid, Download, Save, Play, Plus, Trash2, Copy } from "lucide-react"
import { useEnhancedClaudeSlides } from "@/hooks/useEnhancedClaudeSlides"
import { usePresentationsApi } from "@/lib/presentations-api"
import UltimateSlideRenderer from "@/components/UltimateSlideRenderer"
import { ExportDialog } from "@/components/export-dialog"
import { toast } from "@/hooks/use-toast"
import type { ExportSlide } from "@/lib/export-utils"

interface EditorContentProps {
  presentationId: string
  initialSlides?: any[]
  initialTitle?: string
}

export default function EditorContent({
  presentationId,
  initialSlides = [],
  initialTitle = "Untitled Presentation",
}: EditorContentProps) {
  const [slides, setSlides] = useState(initialSlides)
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0)
  const [viewMode, setViewMode] = useState<"grid" | "single">("single")
  const [presentationTitle, setPresentationTitle] = useState(initialTitle)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const {
    isLoading: isGenerating,
    progress: generationProgress,
    error: generationError,
    generateSlides,
    clearError,
  } = useEnhancedClaudeSlides()

  const {
    isLoading: isApiLoading,
    error: apiError,
    update: updatePresentation,
    clearError: clearApiError,
  } = usePresentationsApi()

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!slides.length || isSaving) return

    setIsSaving(true)
    try {
      await updatePresentation(presentationId, {
        title: presentationTitle,
        slides: slides,
      })
      setLastSaved(new Date())
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }, [slides, presentationTitle, presentationId, updatePresentation, isSaving])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(autoSave, 30000)
    return () => clearInterval(interval)
  }, [autoSave])

  // Manual save
  const handleSave = async () => {
    await autoSave()
    toast({
      title: "Saved",
      description: "Your presentation has been saved successfully.",
    })
  }

  // Convert slides to export format
  const convertSlidesToExportFormat = useCallback((): ExportSlide[] => {
    return slides.map((slide, index) => ({
      id: slide.id || `slide-${index}`,
      title: slide.title || "",
      content: slide.content || "",
      background: slide.background || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      textColor: slide.textColor || "#ffffff",
      titleColor: slide.titleColor,
      accentColor: slide.accentColor || "#3b82f6",
      layout: slide.layout || "content",
      chartData: slide.chartData,
      tableData: slide.tableData,
    }))
  }, [slides])

  // Handle export
  const handleExport = () => {
    if (!slides.length) {
      toast({
        title: "No slides to export",
        description: "Please generate some slides first.",
        variant: "destructive",
      })
      return
    }
    setIsExportDialogOpen(true)
  }

  // Handle slide selection
  const handleSlideSelect = (index: number) => {
    setSelectedSlideIndex(index)
  }

  // Handle slide duplication
  const handleDuplicateSlide = (index: number) => {
    const slideToClone = slides[index]
    const duplicatedSlide = {
      ...slideToClone,
      id: `${slideToClone.id}-copy-${Date.now()}`,
      title: `${slideToClone.title} (Copy)`,
    }
    const newSlides = [...slides]
    newSlides.splice(index + 1, 0, duplicatedSlide)
    setSlides(newSlides)
  }

  // Handle slide deletion
  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "You must have at least one slide.",
        variant: "destructive",
      })
      return
    }

    const newSlides = slides.filter((_, i) => i !== index)
    setSlides(newSlides)

    // Adjust selected index if necessary
    if (selectedSlideIndex >= newSlides.length) {
      setSelectedSlideIndex(newSlides.length - 1)
    }
  }

  // Handle adding new slide
  const handleAddSlide = () => {
    const newSlide = {
      id: `slide-${Date.now()}`,
      title: "New Slide",
      content: "Click to edit this slide content.",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      textColor: "#ffffff",
      accentColor: "#3b82f6",
      layout: "content",
    }
    setSlides([...slides, newSlide])
    setSelectedSlideIndex(slides.length)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">{presentationTitle}</h1>
          {lastSaved && <span className="text-sm text-gray-500">Last saved: {lastSaved.toLocaleTimeString()}</span>}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "grid" | "single")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Single
              </TabsTrigger>
              <TabsTrigger value="grid" className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                Grid
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Action Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddSlide}
            className="flex items-center gap-2 bg-transparent"
          >
            <Plus className="w-4 h-4" />
            Add Slide
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-transparent"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>

          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Export
          </Button>

          <Button size="sm" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Present
          </Button>
        </div>
      </div>

      {/* Generation Progress */}
      {generationProgress && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900 capitalize">{generationProgress.stage}</span>
            <span className="text-sm text-blue-700">{generationProgress.progress}%</span>
          </div>
          <Progress value={generationProgress.progress} className="h-2 mb-2" />
          <p className="text-sm text-blue-800">{generationProgress.message}</p>
        </div>
      )}

      {/* Error Messages */}
      {(generationError || apiError) && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-800">{generationError || apiError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearError()
                clearApiError()
              }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === "single" ? (
          <>
            {/* Slide Thumbnails Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Slides ({slides.length})</h3>
                <div className="space-y-2">
                  {slides.map((slide, index) => (
                    <div
                      key={slide.id || index}
                      className={`relative group cursor-pointer rounded-lg border-2 transition-all ${
                        selectedSlideIndex === index
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleSlideSelect(index)}
                    >
                      <div className="aspect-video p-2">
                        <div
                          className="w-full h-full rounded text-xs flex items-center justify-center text-white font-medium"
                          style={{ background: slide.background }}
                        >
                          {index + 1}
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="text-xs font-medium text-gray-900 truncate">{slide.title}</div>
                      </div>

                      {/* Slide Actions */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDuplicateSlide(index)
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSlide(index)
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Slide View */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-100">
              {slides.length > 0 && slides[selectedSlideIndex] ? (
                <div className="w-full max-w-4xl aspect-video">
                  <UltimateSlideRenderer
                    slide={slides[selectedSlideIndex]}
                    isSelected={false}
                    className="w-full h-full shadow-2xl"
                  />
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p className="text-lg mb-4">No slides available</p>
                  <Button onClick={handleAddSlide}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Slide
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Grid View */
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {slides.map((slide, index) => (
                <div
                  key={slide.id || index}
                  className="relative group cursor-pointer"
                  onClick={() => {
                    setSelectedSlideIndex(index)
                    setViewMode("single")
                  }}
                >
                  <div className="aspect-video">
                    <UltimateSlideRenderer
                      slide={slide}
                      isSelected={selectedSlideIndex === index}
                      className="w-full h-full shadow-lg hover:shadow-xl transition-shadow"
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Slide {index + 1}</span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDuplicateSlide(index)
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSlide(index)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Slide Card */}
              <div
                className="aspect-video border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={handleAddSlide}
              >
                <div className="text-center text-gray-500">
                  <Plus className="w-8 h-8 mx-auto mb-2" />
                  <span className="text-sm">Add Slide</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        slides={convertSlidesToExportFormat()}
        presentationTitle={presentationTitle}
      />
    </div>
  )
}
