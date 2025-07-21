"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Save,
  Download,
  Grid3X3,
  Square,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  FileText,
  Presentation,
} from "lucide-react"
import { useEnhancedClaudeSlides } from "@/hooks/useEnhancedClaudeSlides"
import { usePresentationsApi } from "@/lib/presentations-api"
import { ExportDialog } from "@/components/export-dialog"
import UltimateSlideRenderer from "@/components/UltimateSlideRenderer"

interface EditorContentProps {
  presentationId: string
  initialData?: {
    name: string
    slides: any[]
    chat_history?: any[]
  }
}

export default function EditorContent({ presentationId, initialData }: EditorContentProps) {
  const [presentationName, setPresentationName] = useState(initialData?.name || "Untitled Presentation")
  const [slides, setSlides] = useState(initialData?.slides || [])
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0)
  const [viewMode, setViewMode] = useState<"grid" | "single">("single")
  const [prompt, setPrompt] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [showExportDialog, setShowExportDialog] = useState(false)

  const { isLoading, error, progress, generateSlides, clearError } = useEnhancedClaudeSlides()

  const { updatePresentation } = usePresentationsApi()

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!presentationId || isSaving) return

    setIsSaving(true)
    setSaveStatus("saving")

    try {
      await updatePresentation(presentationId, {
        name: presentationName,
        slides: slides,
        updated_at: new Date().toISOString(),
      })
      setSaveStatus("saved")
    } catch (error) {
      console.error("Auto-save failed:", error)
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
      // Reset save status after 2 seconds
      setTimeout(() => setSaveStatus("idle"), 2000)
    }
  }, [presentationId, presentationName, slides, updatePresentation, isSaving])

  // Auto-save when slides or name changes
  useEffect(() => {
    const timeoutId = setTimeout(autoSave, 2000)
    return () => clearTimeout(timeoutId)
  }, [autoSave])

  const handleGenerateSlides = async () => {
    if (!prompt.trim()) return

    clearError()

    try {
      const result = await generateSlides(prompt, file, {
        slideCount: "auto",
        presentationType: "business",
        audience: "team",
        tone: "professional",
      })

      if (result?.slides) {
        setSlides(result.slides)
        setSelectedSlideIndex(0)
        // Auto-save after generation
        setTimeout(autoSave, 1000)
      }
    } catch (error) {
      console.error("Failed to generate slides:", error)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      // Validate file type and size
      const validTypes = [
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]
      const maxSize = 10 * 1024 * 1024 // 10MB

      if (!validTypes.includes(selectedFile.type)) {
        alert("Please select a PDF, TXT, or DOCX file")
        return
      }

      if (selectedFile.size > maxSize) {
        alert("File size must be less than 10MB")
        return
      }

      setFile(selectedFile)
    }
  }

  const handleSlideEdit = (index: number, updatedSlide: any) => {
    const newSlides = [...slides]
    newSlides[index] = updatedSlide
    setSlides(newSlides)
  }

  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) return // Don't delete the last slide

    const newSlides = slides.filter((_, i) => i !== index)
    setSlides(newSlides)

    // Adjust selected slide index
    if (selectedSlideIndex >= newSlides.length) {
      setSelectedSlideIndex(newSlides.length - 1)
    } else if (selectedSlideIndex > index) {
      setSelectedSlideIndex(selectedSlideIndex - 1)
    }
  }

  const handleAddSlide = () => {
    const newSlide = {
      id: `slide-${Date.now()}`,
      title: "New Slide",
      content: "Click to edit this slide content...",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      textColor: "#ffffff",
      accentColor: "#3b82f6",
      layout: "content",
    }

    setSlides([...slides, newSlide])
    setSelectedSlideIndex(slides.length)
  }

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case "saving":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "saved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Save className="h-4 w-4" />
    }
  }

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case "saving":
        return "Saving..."
      case "saved":
        return "Saved"
      case "error":
        return "Save failed"
      default:
        return "Save"
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Input
              value={presentationName}
              onChange={(e) => setPresentationName(e.target.value)}
              className="text-lg font-semibold border-none bg-transparent focus:bg-white/80 transition-colors"
              placeholder="Presentation Name"
            />
            <Badge variant="secondary" className="text-xs">
              {slides.length} slides
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Save Status */}
            <Button variant="ghost" size="sm" disabled={isSaving} className="flex items-center gap-2">
              {getSaveStatusIcon()}
              <span className="text-sm">{getSaveStatusText()}</span>
            </Button>

            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === "single" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("single")}
                className="rounded-r-none"
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-l-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>

            {/* Export Button */}
            <Button
              onClick={() => setShowExportDialog(true)}
              disabled={slides.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r bg-gray-50/50 flex flex-col">
          {/* AI Generation Panel */}
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Slides
            </h3>

            <div className="space-y-3">
              <Textarea
                placeholder="Describe your presentation topic..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[80px] resize-none"
              />

              <div>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.docx"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  {file ? file.name : "Upload document (optional)"}
                </label>
              </div>

              <Button onClick={handleGenerateSlides} disabled={isLoading || !prompt.trim()} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Slides
                  </>
                )}
              </Button>

              {/* Progress Display */}
              {progress && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs text-muted-foreground">{progress.message}</span>
                  </div>
                  <Progress value={progress.progress} className="h-1" />
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Slide Thumbnails */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Slides</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddSlide}
                className="flex items-center gap-1 bg-transparent"
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {slides.map((slide, index) => (
                <div
                  key={slide.id || index}
                  className={`relative group cursor-pointer border rounded-lg overflow-hidden transition-all ${
                    selectedSlideIndex === index ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-sm"
                  }`}
                  onClick={() => setSelectedSlideIndex(index)}
                >
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200">
                    <UltimateSlideRenderer
                      slide={slide}
                      isSelected={selectedSlideIndex === index}
                      className="w-full h-full text-xs"
                    />
                  </div>

                  <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSlide(index)
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="p-2 bg-white border-t">
                    <p className="text-xs font-medium truncate">{slide.title || `Slide ${index + 1}`}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {slides.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Presentation className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No slides yet</h3>
                  <p className="text-muted-foreground">Generate slides using AI or add a slide manually</p>
                </div>
                <Button onClick={handleAddSlide} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Slide
                </Button>
              </div>
            </div>
          ) : viewMode === "single" ? (
            <div className="h-full p-8 flex items-center justify-center">
              <div className="w-full max-w-4xl aspect-video">
                <UltimateSlideRenderer
                  slide={slides[selectedSlideIndex]}
                  isSelected={true}
                  className="w-full h-full shadow-2xl"
                  isPresentationMode={true}
                />
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-8">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {slides.map((slide, index) => (
                  <div
                    key={slide.id || index}
                    className="aspect-video cursor-pointer"
                    onClick={() => {
                      setSelectedSlideIndex(index)
                      setViewMode("single")
                    }}
                  >
                    <UltimateSlideRenderer
                      slide={slide}
                      isSelected={selectedSlideIndex === index}
                      className="w-full h-full shadow-lg hover:shadow-xl transition-shadow"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        slides={slides}
        presentationName={presentationName}
      />
    </div>
  )
}
