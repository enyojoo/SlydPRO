"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plus,
  Send,
  Download,
  Share2,
  Settings,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Square,
  StopCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useChatContext } from "@/lib/chat-context"
import { useAuth } from "@/lib/auth-context"
import { ModernHeader } from "@/components/modern-header"
import { ExportDialog } from "@/components/export-dialog"
import { SettingsModal } from "@/components/settings-modal"
import { presentationsAPI } from "@/lib/presentations-api"

interface Slide {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  layout: "title" | "content" | "two-column" | "image" | "chart"
  elements?: any[]
}

interface Presentation {
  id: string
  name: string
  slides: Slide[]
  thumbnail?: string
  created_at: string
  updated_at: string
}

interface EditorContentProps {
  presentationId: string
  slug: string
  file?: string
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

export function EditorContent({ presentationId, slug, file }: EditorContentProps) {
  const { user, session } = useAuth()
  const { messages, addMessage, clearMessages } = useChatContext()
  const router = useRouter()

  // State
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [presentationName, setPresentationName] = useState("Untitled Presentation")
  const [inputMessage, setInputMessage] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  // Load presentation data
  useEffect(() => {
    const loadPresentation = async () => {
      if (!session || !presentationId) return

      setIsLoading(true)
      try {
        if (presentationId === "new") {
          // Create new presentation
          const newPresentation = await presentationsAPI.createPresentation({
            name: "Untitled Presentation",
            slides: [],
            category: "ai-generated",
          })

          // Redirect to the new presentation URL
          const newSlug = createSlug(newPresentation.name)
          router.replace(`/editor/${newPresentation.id}/${newSlug}`)
          return
        }

        // Load existing presentation
        const loadedPresentation = await presentationsAPI.getPresentation(presentationId)
        setPresentation(loadedPresentation)
        setSlides(loadedPresentation.slides || [])
        setPresentationName(loadedPresentation.name)
      } catch (error) {
        console.error("Failed to load presentation:", error)
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }

    loadPresentation()
  }, [presentationId, session, router])

  // Auto-save presentation
  const savePresentation = useCallback(async () => {
    if (!presentation || !session || isSaving) return

    setIsSaving(true)
    try {
      await presentationsAPI.updatePresentation(presentation.id, {
        name: presentationName,
        slides,
      })
    } catch (error) {
      console.error("Failed to save presentation:", error)
    } finally {
      setIsSaving(false)
    }
  }, [presentation, presentationName, slides, session, isSaving])

  // Auto-save with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      savePresentation()
    }, 2000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [savePresentation])

  // Update URL when presentation name changes
  useEffect(() => {
    if (presentation && presentationName !== presentation.name) {
      const newSlug = createSlug(presentationName)
      if (newSlug !== slug) {
        router.replace(`/editor/${presentation.id}/${newSlug}`, { scroll: false })
      }
    }
  }, [presentationName, presentation, slug, router])

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handle chat submission
  const handleChatSubmit = async () => {
    if (!inputMessage.trim() || isGenerating) return

    const userMessage = {
      id: Date.now().toString(),
      type: "user" as const,
      content: inputMessage,
      timestamp: new Date(),
    }

    addMessage(userMessage)
    setInputMessage("")
    setIsGenerating(true)

    try {
      // Enhanced AI prompt for presentation design expert
      const systemPrompt = `You are an expert presentation designer and pitch deck specialist. You create modern, professional slides with:

1. DESIGN EXPERTISE:
   - Modern, clean layouts with proper visual hierarchy
   - Strategic use of colors, typography, and spacing
   - Professional iconography and visual elements
   - Data visualization when appropriate (charts, graphs, infographics)

2. CONTENT ANALYSIS:
   - Analyze user content to determine optimal slide types
   - Suggest appropriate visual elements (icons, charts, images)
   - Structure information for maximum impact
   - Apply storytelling principles to slide flow

3. SLIDE TYPES & LAYOUTS:
   - Title slides with compelling headlines
   - Content slides with bullet points and visuals
   - Two-column layouts for comparisons
   - Chart slides for data presentation
   - Image slides for visual impact

4. DESIGN ELEMENTS:
   - Use relevant icons from lucide-react
   - Apply color psychology (blues for trust, greens for growth, etc.)
   - Create visual consistency across slides
   - Ensure readability and accessibility

5. MODERN TRENDS:
   - Minimalist design approach
   - Bold typography and clear hierarchy
   - Strategic use of white space
   - Consistent brand colors and styling

Based on the user's request: "${inputMessage}", create professional slides with appropriate design elements, colors, and layouts. Make each slide visually engaging and content-focused.`

      const response = await fetch("/api/v0/chats/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: inputMessage },
          ],
          chatId: presentation?.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate slides")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      let aiResponse = ""
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant" as const,
        content: "",
        timestamp: new Date(),
      }

      addMessage(aiMessage)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        aiResponse += chunk

        // Update the AI message content
        aiMessage.content = aiResponse
        addMessage({ ...aiMessage })
      }

      // Parse the AI response to extract slide data
      const newSlides = parseAIResponseToSlides(aiResponse)
      if (newSlides.length > 0) {
        setSlides((prev) => [...prev, ...newSlides])
      }
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant" as const,
        content: "Sorry, I encountered an error while generating your slides. Please try again.",
        timestamp: new Date(),
      }
      addMessage(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  // Parse AI response to create slides
  const parseAIResponseToSlides = (response: string): Slide[] => {
    const slides: Slide[] = []

    // Simple parsing logic - in a real implementation, this would be more sophisticated
    const slideMatches = response.match(/SLIDE \d+:(.*?)(?=SLIDE \d+:|$)/gs)

    if (slideMatches) {
      slideMatches.forEach((match, index) => {
        const titleMatch = match.match(/Title: (.*?)(?:\n|$)/)
        const contentMatch = match.match(/Content: (.*?)(?:\n|$)/)

        slides.push({
          id: `slide-${Date.now()}-${index}`,
          title: titleMatch?.[1] || `Slide ${slides.length + 1}`,
          content: contentMatch?.[1] || "Content goes here",
          background: "#027659",
          textColor: "#ffffff",
          layout: "content",
          elements: [],
        })
      })
    } else {
      // Fallback: create a single slide from the response
      slides.push({
        id: `slide-${Date.now()}`,
        title: "AI Generated Slide",
        content: response.substring(0, 200) + "...",
        background: "#027659",
        textColor: "#ffffff",
        layout: "content",
        elements: [],
      })
    }

    return slides
  }

  // Handle stop generation
  const handleStopGeneration = () => {
    setIsGenerating(false)
  }

  // Add new slide
  const addSlide = () => {
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      title: `Slide ${slides.length + 1}`,
      content: "Click to edit content",
      background: "#027659",
      textColor: "#ffffff",
      layout: "content",
      elements: [],
    }
    setSlides([...slides, newSlide])
    setCurrentSlideIndex(slides.length)
  }

  // Delete slide
  const deleteSlide = (index: number) => {
    if (slides.length <= 1) return
    const newSlides = slides.filter((_, i) => i !== index)
    setSlides(newSlides)
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1)
    }
  }

  // Update slide
  const updateSlide = (index: number, updates: Partial<Slide>) => {
    const newSlides = [...slides]
    newSlides[index] = { ...newSlides[index], ...updates }
    setSlides(newSlides)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#027659]" />
          <p className="text-muted-foreground">Loading presentation...</p>
        </div>
      </div>
    )
  }

  const currentSlide = slides[currentSlideIndex]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <ModernHeader />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Slides */}
        <div className="w-80 bg-card border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <Input
              value={presentationName}
              onChange={(e) => setPresentationName(e.target.value)}
              className="font-semibold text-lg bg-transparent border-none p-0 focus-visible:ring-0"
              placeholder="Presentation Name"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-muted-foreground">
                {slides.length} slide{slides.length !== 1 ? "s" : ""}
              </span>
              {isSaving && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Saving...
                </div>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {slides.map((slide, index) => (
                <Card
                  key={slide.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    index === currentSlideIndex
                      ? "ring-2 ring-[#027659] border-[#027659]"
                      : "hover:border-muted-foreground"
                  }`}
                  onClick={() => setCurrentSlideIndex(index)}
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Slide {index + 1}</div>
                        <div className="font-medium text-sm truncate mb-1">{slide.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{slide.content}</div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSlide(index)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              <Button
                onClick={addSlide}
                variant="outline"
                className="w-full h-20 border-dashed border-2 hover:border-[#027659] hover:bg-[#027659]/5 bg-transparent"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Slide
              </Button>
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Slide Preview */}
          <div className="flex-1 p-8 flex items-center justify-center bg-muted/30">
            {slides.length > 0 && currentSlide ? (
              <Card className="w-full max-w-4xl aspect-video shadow-2xl overflow-hidden">
                <div
                  className="w-full h-full flex flex-col justify-center p-12 text-white relative"
                  style={{
                    backgroundColor: currentSlide.background,
                    color: currentSlide.textColor,
                  }}
                >
                  <Input
                    value={currentSlide.title}
                    onChange={(e) => updateSlide(currentSlideIndex, { title: e.target.value })}
                    className="text-4xl font-bold mb-6 bg-transparent border-none p-0 text-white placeholder:text-white/70 focus-visible:ring-0"
                    placeholder="Slide Title"
                  />
                  <Textarea
                    value={currentSlide.content}
                    onChange={(e) => updateSlide(currentSlideIndex, { content: e.target.value })}
                    className="text-lg leading-relaxed bg-transparent border-none p-0 text-white placeholder:text-white/70 focus-visible:ring-0 resize-none"
                    placeholder="Slide content..."
                    rows={8}
                  />
                </div>
              </Card>
            ) : (
              <div className="text-center text-muted-foreground">
                <Square className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No slides yet</p>
                <p className="text-sm">Start by describing your presentation idea in the chat</p>
              </div>
            )}
          </div>

          {/* Slide Navigation */}
          {slides.length > 0 && (
            <div className="p-4 border-t border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                    disabled={currentSlideIndex === 0}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentSlideIndex + 1} of {slides.length}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                    disabled={currentSlideIndex === slides.length - 1}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={() => setShowExportDialog(true)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Chat */}
        <div className="w-96 bg-card border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-lg">AI Assistant</h3>
            <p className="text-sm text-muted-foreground">Describe what you want to create or modify</p>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === "user" ? "bg-[#027659] text-white" : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-muted text-foreground rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Generating slides...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border">
            <div className="flex space-x-2">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Describe your slide ideas..."
                className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleChatSubmit()
                  }
                }}
                disabled={isGenerating}
              />
              <div className="flex flex-col space-y-2">
                {isGenerating ? (
                  <Button size="icon" onClick={handleStopGeneration} className="bg-red-600 hover:bg-red-700 text-white">
                    <StopCircle className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    onClick={handleChatSubmit}
                    disabled={!inputMessage.trim()}
                    className="bg-[#027659] hover:bg-[#065f46] text-white"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        slides={slides}
        presentationName={presentationName}
      />

      {/* Settings Modal */}
      <SettingsModal open={showSettingsModal} onOpenChange={setShowSettingsModal} />
    </div>
  )
}
