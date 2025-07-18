"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import {
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  Settings,
  Type,
  ImageIcon,
  Columns,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react"
import { useClaudeSlides } from "@/hooks/useClaudeSlides"
import { ExportDialog } from "@/components/export-dialog"
import { SettingsModal } from "@/components/settings-modal"
import { useAuth } from "@/lib/auth-context"
import { presentationsAPI } from "@/lib/presentations-api"

interface Slide {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  layout: "title" | "content" | "two-column" | "image"
}

interface EditorContentProps {
  params: {
    id: string
  }
}

const layoutIcons = {
  title: FileText,
  content: Type,
  "two-column": Columns,
  image: ImageIcon,
}

const layoutNames = {
  title: "Title Slide",
  content: "Content Slide",
  "two-column": "Two Column",
  image: "Image Slide",
}

export default function EditorContent({ params }: EditorContentProps) {
  const { user } = useAuth()
  const claude = useClaudeSlides()

  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [prompt, setPrompt] = useState("")
  const [title, setTitle] = useState("Untitled Presentation")
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const currentSlide = slides[currentSlideIndex]

  // Load presentation data
  useEffect(() => {
    const loadPresentation = async () => {
      try {
        const presentation = await presentationsAPI.getPresentation(params.id)
        if (presentation) {
          setTitle(presentation.name)
          setSlides(presentation.slides || [])
        }
      } catch (error) {
        console.error("Failed to load presentation:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadPresentation()
    }
  }, [params.id, user])

  const savePresentation = useCallback(async () => {
    if (!user || !title) return

    try {
      await presentationsAPI.updatePresentation(params.id, {
        name: title,
        slides: slides,
      })
    } catch (error) {
      console.error("Failed to save presentation:", error)
    }
  }, [params.id, title, slides, user])

  useEffect(() => {
    const interval = setInterval(savePresentation, 5000)
    return () => clearInterval(interval)
  }, [savePresentation])

  const handleGenerateSlides = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Please enter a prompt",
        description: "Describe what you want your presentation to be about",
        variant: "destructive",
      })
      return
    }

    setIsStreaming(true)
    setStreamingContent("")

    try {
      await claude.generateSlidesStreaming(
        prompt,
        undefined,
        (chunk) => {
          setStreamingContent((prev) => prev + chunk)
        },
        (result) => {
          setSlides(result.slides)
          setIsStreaming(false)
          setStreamingContent("")
          if (!title && result.slides.length > 0) {
            setTitle(result.slides[0].title)
          }
          toast({
            title: "Slides generated successfully!",
            description: result.message || `Generated ${result.slides.length} slides`,
          })
        },
        (error) => {
          setIsStreaming(false)
          setStreamingContent("")
          toast({
            title: "Generation failed",
            description: error.message,
            variant: "destructive",
          })
        },
      )
    } catch (error) {
      setIsStreaming(false)
      setStreamingContent("")
      console.error("Generation error:", error)
    }
  }

  const handleEditSlide = async (slideIndex: number, editPrompt: string) => {
    const slide = slides[slideIndex]
    if (!slide || !editPrompt.trim()) return

    try {
      const result = await claude.editSlide(slide.id, slide.title, editPrompt)
      if (result && result.slides.length > 0) {
        const updatedSlides = [...slides]
        updatedSlides[slideIndex] = result.slides[0]
        setSlides(updatedSlides)

        toast({
          title: "Slide updated successfully!",
          description: result.message,
        })
      }
    } catch (error) {
      toast({
        title: "Failed to update slide",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleRegenerateAll = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Please enter a prompt",
        description: "Describe what you want your presentation to be about",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await claude.regenerateAllSlides(prompt)
      if (result) {
        setSlides(result.slides)
        toast({
          title: "All slides regenerated!",
          description: result.message,
        })
      }
    } catch (error) {
      toast({
        title: "Failed to regenerate slides",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const addSlide = () => {
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      title: "New Slide",
      content: "Click to edit this slide content",
      background: "#1e40af",
      textColor: "#ffffff",
      layout: "content",
    }
    setSlides([...slides, newSlide])
    setCurrentSlideIndex(slides.length)
  }

  const deleteSlide = (index: number) => {
    if (slides.length <= 1) return

    const newSlides = slides.filter((_, i) => i !== index)
    setSlides(newSlides)

    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1)
    }
  }

  const updateSlide = (field: keyof Slide, value: string) => {
    if (!currentSlide) return

    const updatedSlides = slides.map((slide, index) =>
      index === currentSlideIndex ? { ...slide, [field]: value } : slide,
    )
    setSlides(updatedSlides)
  }

  const duplicateSlide = (index: number) => {
    const slideToClone = slides[index]
    const newSlide = {
      ...slideToClone,
      id: `slide-${Date.now()}`,
      title: `${slideToClone.title} (Copy)`,
    }
    const newSlides = [...slides]
    newSlides.splice(index + 1, 0, newSlide)
    setSlides(newSlides)
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#027659]" />
          <p className="text-muted-foreground">Loading presentation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Presentation Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-transparent px-0"
            />
            <Badge variant="secondary">{slides.length} slides</Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPreviewMode(!isPreviewMode)}>
              {isPreviewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isPreviewMode ? "Edit" : "Preview"}
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowSettingsModal(true)}>
              <Settings className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              disabled={slides.length === 0}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          {/* Generation Controls */}
          <div className="p-4 border-b">
            <div className="space-y-3">
              <Textarea
                placeholder="Describe your presentation... (e.g., 'Create a business pitch for a new mobile app')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[80px] resize-none"
              />

              <div className="flex gap-2">
                <Button onClick={handleGenerateSlides} disabled={claude.isLoading || isStreaming} className="flex-1">
                  {claude.isLoading || isStreaming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Generate Slides
                </Button>

                {slides.length > 0 && (
                  <Button variant="outline" onClick={handleRegenerateAll} disabled={claude.isLoading || isStreaming}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Streaming Content */}
            {isStreaming && streamingContent && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <div className="text-sm text-muted-foreground mb-1">Generating...</div>
                <div className="text-xs font-mono whitespace-pre-wrap max-h-20 overflow-y-auto">{streamingContent}</div>
              </div>
            )}

            {/* Error Display */}
            {claude.error && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="text-sm text-destructive">{claude.error}</div>
              </div>
            )}
          </div>

          {/* Slide Thumbnails */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-2">
              {slides.map((slide, index) => {
                const LayoutIcon = layoutIcons[slide.layout]
                return (
                  <Card
                    key={slide.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      index === currentSlideIndex ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setCurrentSlideIndex(index)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
                          <LayoutIcon className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteSlide(index)
                          }}
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <div
                        className="w-full h-16 rounded text-xs p-2 mb-2 overflow-hidden"
                        style={{
                          backgroundColor: slide.background,
                          color: slide.textColor,
                        }}
                      >
                        <div className="font-semibold truncate">{slide.title}</div>
                        <div className="text-xs opacity-80 line-clamp-2">{slide.content.split("\n")[0]}</div>
                      </div>

                      <div className="text-xs text-muted-foreground truncate">{slide.title}</div>
                    </CardContent>
                  </Card>
                )
              })}

              <Button
                variant="outline"
                onClick={addSlide}
                className="w-full h-20 border-2 border-dashed bg-transparent"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Slide
              </Button>
            </div>
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          {slides.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium">No slides yet</h3>
                  <p className="text-sm">Enter a prompt and generate your first slides</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Slide Editor */}
              <div className="flex-1 p-6 overflow-y-auto">
                {currentSlide && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* Slide Preview */}
                    <Card className="overflow-hidden">
                      <div
                        className="aspect-video p-8 flex flex-col justify-center"
                        style={{
                          backgroundColor: currentSlide.background,
                          color: currentSlide.textColor,
                        }}
                      >
                        {currentSlide.layout === "title" ? (
                          <div className="text-center">
                            <h1 className="text-4xl font-bold mb-4">{currentSlide.title}</h1>
                            <p className="text-xl opacity-90">{currentSlide.content}</p>
                          </div>
                        ) : currentSlide.layout === "two-column" ? (
                          <div className="grid grid-cols-2 gap-8 h-full">
                            <div>
                              <h2 className="text-2xl font-bold mb-4">{currentSlide.title}</h2>
                              <div className="whitespace-pre-line text-lg">
                                {currentSlide.content
                                  .split("\n")
                                  .slice(0, Math.ceil(currentSlide.content.split("\n").length / 2))
                                  .join("\n")}
                              </div>
                            </div>
                            <div className="whitespace-pre-line text-lg">
                              {currentSlide.content
                                .split("\n")
                                .slice(Math.ceil(currentSlide.content.split("\n").length / 2))
                                .join("\n")}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h2 className="text-3xl font-bold mb-6">{currentSlide.title}</h2>
                            <div className="whitespace-pre-line text-lg leading-relaxed">{currentSlide.content}</div>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Slide Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Content Editor */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Content</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Title</label>
                            <Input
                              value={currentSlide.title}
                              onChange={(e) => updateSlide("title", e.target.value)}
                              placeholder="Slide title"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">Content</label>
                            <Textarea
                              value={currentSlide.content}
                              onChange={(e) => updateSlide("content", e.target.value)}
                              placeholder="Slide content..."
                              className="min-h-[120px] resize-none"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Design Controls */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Design</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Layout</label>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(layoutNames).map(([layout, name]) => {
                                const LayoutIcon = layoutIcons[layout as keyof typeof layoutIcons]
                                return (
                                  <Button
                                    key={layout}
                                    variant={currentSlide.layout === layout ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => updateSlide("layout", layout)}
                                    className="justify-start"
                                  >
                                    <LayoutIcon className="h-4 w-4 mr-2" />
                                    {name}
                                  </Button>
                                )
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Background</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={currentSlide.background}
                                  onChange={(e) => updateSlide("background", e.target.value)}
                                  className="w-10 h-10 rounded border cursor-pointer"
                                />
                                <Input
                                  value={currentSlide.background}
                                  onChange={(e) => updateSlide("background", e.target.value)}
                                  placeholder="#1e40af"
                                  className="flex-1"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium mb-2 block">Text Color</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={currentSlide.textColor}
                                  onChange={(e) => updateSlide("textColor", e.target.value)}
                                  className="w-10 h-10 rounded border cursor-pointer"
                                />
                                <Input
                                  value={currentSlide.textColor}
                                  onChange={(e) => updateSlide("textColor", e.target.value)}
                                  placeholder="#ffffff"
                                  className="flex-1"
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Navigation */}
              <div className="border-t p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                      disabled={currentSlideIndex === 0}
                    >
                      Previous
                    </Button>

                    <span className="text-sm text-muted-foreground">
                      {currentSlideIndex + 1} of {slides.length}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                      disabled={currentSlideIndex === slides.length - 1}
                    >
                      Next
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => duplicateSlide(currentSlideIndex)}>
                      Duplicate
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        projectName={title}
        slideCount={slides.length}
      />

      <SettingsModal open={showSettingsModal} onOpenChange={setShowSettingsModal} />
    </div>
  )
}
