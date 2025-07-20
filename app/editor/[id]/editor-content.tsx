"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import {
  Play,
  Square,
  SkipBack,
  SkipForward,
  Download,
  Settings,
  Plus,
  Trash2,
  Copy,
  Edit3,
  BarChart3,
  Table,
  Sparkles,
  Upload,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Save,
} from "lucide-react"
import { UltimateSlideRenderer } from "@/components/UltimateSlideRenderer"
import { ExportDialog } from "@/components/export-dialog"
import { SettingsModal } from "@/components/settings-modal"
import type { UltimateSlide } from "@/types/ultimate-slide"
import { useClaudeSlides } from "@/hooks/useClaudeSlides"

interface EditorContentProps {
  presentationId: string
  initialSlides: UltimateSlide[]
  presentationTitle: string
  onSave: (slides: UltimateSlide[], title: string) => Promise<void>
}

export default function EditorContent({
  presentationId,
  initialSlides,
  presentationTitle,
  onSave,
}: EditorContentProps) {
  const [slides, setSlides] = useState<UltimateSlide[]>(initialSlides)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [title, setTitle] = useState(presentationTitle)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedTool, setSelectedTool] = useState<string>("select")
  const [editingSlide, setEditingSlide] = useState<UltimateSlide | null>(null)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    generateSlides,
    isGenerating,
    error: aiError,
    clearError,
  } = useClaudeSlides({
    onSlidesGenerated: (newSlides) => {
      setSlides(newSlides)
      setCurrentSlideIndex(0)
      setShowAIPanel(false)
      setAiPrompt("")
      setSelectedFile(null)
      toast({
        title: "Slides Generated",
        description: `Successfully generated ${newSlides.length} slides with AI.`,
      })
    },
  })

  const currentSlide = slides[currentSlideIndex]

  // Auto-save functionality
  useEffect(() => {
    const autoSave = async () => {
      if (slides.length > 0) {
        try {
          await onSave(slides, title)
        } catch (error) {
          console.error("Auto-save failed:", error)
        }
      }
    }

    const interval = setInterval(autoSave, 30000) // Auto-save every 30 seconds
    return () => clearInterval(interval)
  }, [slides, title, onSave])

  // Presentation mode controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isPresentationMode) {
        switch (e.key) {
          case "ArrowRight":
          case " ":
            nextSlide()
            break
          case "ArrowLeft":
            previousSlide()
            break
          case "Escape":
            exitPresentationMode()
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [isPresentationMode, currentSlideIndex])

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1)
    }
  }

  const previousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1)
    }
  }

  const enterPresentationMode = () => {
    setIsPresentationMode(true)
    setIsPlaying(true)
  }

  const exitPresentationMode = () => {
    setIsPresentationMode(false)
    setIsPlaying(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(slides, title)
      toast({
        title: "Saved",
        description: "Presentation saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save presentation.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const addSlide = () => {
    const newSlide: UltimateSlide = {
      id: `slide-${Date.now()}`,
      title: "New Slide",
      content: "Click to edit content",
      background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
      textColor: "#ffffff",
      layout: "content",
      titleFont: "SF Pro Display, Inter, sans-serif",
      contentFont: "SF Pro Text, Inter, sans-serif",
      titleSize: "2.5rem",
      contentSize: "1.125rem",
      spacing: "comfortable",
      alignment: "left",
      titleColor: "#ffffff",
      accentColor: "#fbbf24",
      shadowEffect: "0 15px 35px rgba(0,0,0,0.1)",
      borderRadius: "20px",
      glassmorphism: false,
      icons: [],
      animations: {
        entrance: "fadeIn",
        emphasis: [],
      },
      customCSS: "",
    }

    const newSlides = [...slides]
    newSlides.splice(currentSlideIndex + 1, 0, newSlide)
    setSlides(newSlides)
    setCurrentSlideIndex(currentSlideIndex + 1)
  }

  const deleteSlide = () => {
    if (slides.length > 1) {
      const newSlides = slides.filter((_, index) => index !== currentSlideIndex)
      setSlides(newSlides)
      if (currentSlideIndex >= newSlides.length) {
        setCurrentSlideIndex(newSlides.length - 1)
      }
    }
  }

  const duplicateSlide = () => {
    const slideToClone = slides[currentSlideIndex]
    const newSlide: UltimateSlide = {
      ...slideToClone,
      id: `slide-${Date.now()}`,
      title: `${slideToClone.title} (Copy)`,
    }

    const newSlides = [...slides]
    newSlides.splice(currentSlideIndex + 1, 0, newSlide)
    setSlides(newSlides)
    setCurrentSlideIndex(currentSlideIndex + 1)
  }

  const updateSlide = (updatedSlide: UltimateSlide) => {
    const newSlides = [...slides]
    newSlides[currentSlideIndex] = updatedSlide
    setSlides(newSlides)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      toast({
        title: "File Selected",
        description: `Selected ${file.name} for AI analysis.`,
      })
    }
  }

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt for AI generation.",
        variant: "destructive",
      })
      return
    }

    try {
      await generateSlides({
        prompt: aiPrompt,
        slideCount: 6,
        presentationType: "business",
        audience: "team",
        tone: "professional",
        file: selectedFile,
      })
    } catch (error) {
      console.error("AI generation failed:", error)
    }
  }

  const handleEditSlide = async (slideId: string) => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter instructions for editing the slide.",
        variant: "destructive",
      })
      return
    }

    const slideToEdit = slides.find((s) => s.id === slideId)
    if (!slideToEdit) return

    try {
      await generateSlides({
        prompt: aiPrompt,
        editMode: "selected",
        selectedSlideId: slideId,
        selectedSlideTitle: slideToEdit.title,
        existingSlides: slides,
      })
    } catch (error) {
      console.error("Slide editing failed:", error)
    }
  }

  // Static thumbnail renderer for PowerPoint-like previews
  const renderThumbnail = (slide: UltimateSlide, index: number) => {
    const isSelected = index === currentSlideIndex

    return (
      <div
        key={slide.id}
        className={`relative cursor-pointer transition-all duration-200 ${
          isSelected ? "ring-2 ring-blue-500 ring-opacity-60" : "hover:ring-1 hover:ring-gray-300"
        }`}
        onClick={() => setCurrentSlideIndex(index)}
      >
        <div
          className="w-full h-24 rounded-lg overflow-hidden relative"
          style={{
            background: slide.background || "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
            borderRadius: slide.borderRadius || "12px",
          }}
        >
          {/* Static content preview */}
          <div className="absolute inset-0 p-2 flex flex-col justify-between">
            {/* Title preview */}
            <div
              className="text-xs font-semibold truncate"
              style={{
                color: slide.titleColor || slide.textColor || "#ffffff",
                fontFamily: slide.titleFont || "Inter, sans-serif",
              }}
            >
              {slide.title}
            </div>

            {/* Content preview */}
            <div className="flex-1 flex items-center">
              <div
                className="text-xs opacity-80 line-clamp-2"
                style={{
                  color: slide.textColor || "#ffffff",
                  fontFamily: slide.contentFont || "Inter, sans-serif",
                }}
              >
                {slide.content && typeof slide.content === "string"
                  ? slide.content.split("\n")[0].replace(/^•\s*/, "")
                  : ""}
              </div>
            </div>

            {/* Visual indicators */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                {slide.chartData && (
                  <div className="w-3 h-3 bg-white/20 rounded flex items-center justify-center">
                    <BarChart3 size={8} className="text-white" />
                  </div>
                )}
                {slide.tableData && (
                  <div className="w-3 h-3 bg-white/20 rounded flex items-center justify-center">
                    <Table size={8} className="text-white" />
                  </div>
                )}
              </div>

              {/* Single contextual icon if present */}
              {slide.icons && slide.icons.length > 0 && <div className="text-xs opacity-60">{slide.icons[0].icon}</div>}
            </div>
          </div>

          {/* Accent bar */}
          {slide.accentColor && (
            <div className="absolute bottom-0 left-0 h-0.5 w-full" style={{ backgroundColor: slide.accentColor }} />
          )}
        </div>

        {/* Slide number */}
        <div className="text-xs text-gray-500 text-center mt-1">{index + 1}</div>
      </div>
    )
  }

  if (isPresentationMode) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="w-full h-full flex items-center justify-center">
          <UltimateSlideRenderer slide={currentSlide} isPresentationMode={true} />
        </div>

        {/* Presentation controls */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
          <Button variant="ghost" size="sm" onClick={previousSlide} disabled={currentSlideIndex === 0}>
            <SkipBack className="w-4 h-4" />
          </Button>
          <span className="text-white text-sm">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <Button variant="ghost" size="sm" onClick={nextSlide} disabled={currentSlideIndex === slides.length - 1}>
            <SkipForward className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={exitPresentationMode}>
            <Square className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Thumbnails */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-semibold text-lg border-none px-0 focus-visible:ring-0"
            placeholder="Presentation Title"
          />
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">{slides.map((slide, index) => renderThumbnail(slide, index))}</div>
        </ScrollArea>

        <div className="p-4 border-t border-gray-200">
          <Button onClick={addSlide} className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Slide
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button onClick={enterPresentationMode} size="sm">
              <Play className="w-4 h-4 mr-2" />
              Present
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button onClick={duplicateSlide} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </Button>
            <Button onClick={deleteSlide} variant="outline" size="sm" disabled={slides.length <= 1}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowAIPanel(!showAIPanel)}
              variant={showAIPanel ? "default" : "outline"}
              size="sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Assistant
            </Button>
            <Button onClick={() => setShowExportDialog(true)} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowSettingsModal(true)} variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Main Editor */}
          <div className="flex-1 flex flex-col">
            {/* Slide Canvas */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-100">
              <div className="w-full max-w-4xl aspect-video bg-white rounded-lg shadow-lg overflow-hidden">
                <UltimateSlideRenderer slide={currentSlide} />
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button onClick={previousSlide} disabled={currentSlideIndex === 0} variant="outline" size="sm">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  {currentSlideIndex + 1} of {slides.length}
                </span>
                <Button
                  onClick={nextSlide}
                  disabled={currentSlideIndex === slides.length - 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{currentSlide.layout}</Badge>
                {currentSlide.chartData && <Badge variant="outline">Chart</Badge>}
                {currentSlide.tableData && <Badge variant="outline">Table</Badge>}
                {currentSlide.icons && currentSlide.icons.length > 0 && <Badge variant="outline">Icon</Badge>}
              </div>
            </div>
          </div>

          {/* AI Panel */}
          {showAIPanel && (
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-lg flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  AI Assistant
                </h3>
              </div>

              <div className="flex-1 p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Describe your presentation or changes</label>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., Create a business presentation about our Q4 results with charts showing 25% growth..."
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Upload file (optional)</label>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {selectedFile ? selectedFile.name : "Choose file"}
                    </Button>
                    {selectedFile && (
                      <Button onClick={() => setSelectedFile(null)} variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    accept=".txt,.md,.pdf,.docx"
                    className="hidden"
                  />
                </div>

                <div className="space-y-2">
                  <Button onClick={handleAIGenerate} disabled={isGenerating} className="w-full">
                    <Wand2 className="w-4 h-4 mr-2" />
                    {isGenerating ? "Generating..." : "Generate New Presentation"}
                  </Button>

                  <Button
                    onClick={() => handleEditSlide(currentSlide.id)}
                    disabled={isGenerating}
                    variant="outline"
                    className="w-full"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {isGenerating ? "Editing..." : "Edit Current Slide"}
                  </Button>
                </div>

                {aiError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{aiError}</p>
                    <Button onClick={clearError} variant="ghost" size="sm" className="mt-2">
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} slides={slides} title={title} />

      {/* Settings Modal */}
      <SettingsModal open={showSettingsModal} onOpenChange={setShowSettingsModal} />
    </div>
  )
}
