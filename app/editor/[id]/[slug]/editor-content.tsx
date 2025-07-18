"use client"
import { Home } from "lucide-react"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"
import {
  Send,
  Upload,
  Plus,
  Trash2,
  Copy,
  SkipBack,
  SkipForward,
  Zap,
  Target,
  Play,
  Download,
  Minimize,
  Loader2,
  Check,
  Square,
} from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useV0Integration } from "@/hooks/useV0Integration"
import { useChatContext } from "@/lib/chat-context"
import { ExportDialog } from "@/components/export-dialog"
import { presentationsAPI } from "@/lib/presentations-api"
import { useAuth } from "@/lib/auth-context"

interface Slide {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  layout: "title" | "content" | "two-column" | "image"
  designElements?: {
    icons?: string[]
    charts?: boolean
    images?: boolean
    bullets?: boolean
  }
}

interface ChatMessage {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  isLoading?: boolean
  generationProgress?: GenerationProgress
}

interface GenerationProgress {
  stage: "thinking" | "designing" | "complete"
  thinkingTime?: number
  currentSlide?: string
  totalSlides?: number
  completedSlides?: number
  version?: number
  isComplete?: boolean
  isMinimized?: boolean
}

const colorThemes = [
  { name: "Blue", primary: "#1e40af", secondary: "#3b82f6", text: "#ffffff" },
  { name: "Purple", primary: "#7c3aed", secondary: "#a855f7", text: "#ffffff" },
  { name: "Green", primary: "#059669", secondary: "#10b981", text: "#ffffff" },
  { name: "Red", primary: "#dc2626", secondary: "#ef4444", text: "#ffffff" },
  { name: "Orange", primary: "#ea580c", secondary: "#f97316", text: "#ffffff" },
  { name: "Dark", primary: "#1f2937", secondary: "#374151", text: "#ffffff" },
]

// Helper function to create URL-friendly slug
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

function EditorContent() {
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const [slides, setSlides] = useState<Slide[]>([])
  const [selectedSlide, setSelectedSlide] = useState<string>("")
  const [inputMessage, setInputMessage] = useState("")
  const [projectName, setProjectName] = useState("Untitled Presentation")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [editMode, setEditMode] = useState<"all" | "selected">("all")
  const [selectedTheme, setSelectedTheme] = useState(colorThemes[0])
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [currentPresentationId, setCurrentPresentationId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  const router = useRouter()
  const params = useParams()
  const v0 = useV0Integration()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const { messages } = useChatContext()
  const { user: authUser, isLoading: authLoading, session } = useAuth()

  const checkScreenSize = () => {
    setIsSmallScreen(window.innerWidth < 1024)
  }

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error("Failed to copy message:", error)
    }
  }

  // Enhanced AI prompt for expert presentation design
  const createExpertPrompt = (userPrompt: string, isEdit = false) => {
    const basePrompt = `You are an expert presentation designer and pitch deck specialist with deep knowledge of modern design principles, visual hierarchy, and effective storytelling through slides.

${userPrompt}

As a presentation design expert, please:

1. **Content Analysis**: Analyze the content to determine the most effective slide types (title, content, two-column, image, chart, etc.)

2. **Design Elements**: For each slide, intelligently suggest:
   - Relevant icons that enhance understanding
   - Charts/graphs when data is presented
   - Visual elements that support the message
   - Bullet points vs. paragraphs based on content type
   - Color schemes that match the content mood

3. **Modern Design**: Apply contemporary design principles:
   - Clean, minimalist layouts
   - Proper white space usage
   - Visual hierarchy with typography
   - Color psychology for different slide purposes

4. **Slide Structure**: Create slides with clear purposes:
   - Problem slides: Use contrasting colors, warning icons
   - Solution slides: Use positive colors, checkmarks, arrows
   - Data slides: Include chart indicators, numbers emphasis
   - Team slides: Use people icons, professional layouts
   - Financial slides: Use money icons, growth indicators

Please structure each slide as:
## Slide [number]: [Title]
**Layout**: [title/content/two-column/image/chart]
**Design Elements**: [icons, charts, visual elements to include]
**Content**: [the actual slide content]
**Color Mood**: [professional/energetic/trustworthy/innovative based on content]

${isEdit ? "Focus on enhancing the existing design while maintaining consistency." : "Create a complete, cohesive presentation flow."}

Make sure each slide tells part of a compelling story and uses appropriate visual elements to enhance comprehension and engagement.`

    return basePrompt
  }

  // Update URL when presentation name changes
  const updateURL = useCallback((name: string, id: string) => {
    const slug = createSlug(name)
    const newUrl = `/editor/${id}/${slug}`

    // Only update if the URL is different
    if (window.location.pathname !== newUrl) {
      window.history.replaceState({}, "", newUrl)
    }
  }, [])

  // Auto-save function with URL update
  const autoSave = useCallback(async () => {
    if (!currentPresentationId || !authUser || !session || slides.length === 0) return

    setIsSaving(true)
    try {
      await presentationsAPI.updatePresentation(currentPresentationId, {
        name: projectName,
        slides,
        thumbnail: slides[0]?.background,
      })

      // Update URL when name changes
      updateURL(projectName, currentPresentationId)
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }, [currentPresentationId, authUser, session, slides, projectName, updateURL])

  // Enhanced slide generation with design intelligence
  const handleInitialGeneration = useCallback(
    async (prompt: string) => {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "user",
        content: prompt,
        timestamp: new Date(),
      }

      const loadingMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
        generationProgress: {
          stage: "thinking",
          thinkingTime: 0,
          version: 1,
          totalSlides: 0,
          completedSlides: 0,
        },
      }

      setChatMessages((prev) => [...prev, userMessage, loadingMessage])
      setIsStreaming(true)
      setStreamingContent("")

      // Start thinking timer
      let thinkingTime = 0
      const thinkingInterval = setInterval(() => {
        thinkingTime += 1
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.isLoading
              ? {
                  ...msg,
                  generationProgress: {
                    ...msg.generationProgress!,
                    thinkingTime,
                  },
                }
              : msg,
          ),
        )
      }, 1000)

      // Use enhanced expert prompt
      const expertPrompt = createExpertPrompt(prompt)

      await v0.generateSlidesStreaming(
        expertPrompt,
        uploadedFile,
        // onChunk
        (chunk: string) => {
          setStreamingContent((prev) => prev + chunk)

          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.isLoading && msg.generationProgress?.stage === "thinking"
                ? {
                    ...msg,
                    generationProgress: {
                      ...msg.generationProgress,
                      stage: "designing",
                      currentSlide: "slide content",
                    },
                  }
                : msg,
            ),
          )

          const slideMatches = (streamingContent + chunk).match(
            /(?:##|###)\s*(?:Slide\s*\d+:?\s*)?(.+?)(?=(?:##|###)|$)/gs,
          )
          if (slideMatches) {
            const completedSlides = slideMatches.length
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.isLoading
                  ? {
                      ...msg,
                      generationProgress: {
                        ...msg.generationProgress!,
                        completedSlides,
                        totalSlides: Math.max(completedSlides, msg.generationProgress?.totalSlides || 0),
                      },
                    }
                  : msg,
              ),
            )
          }
        },
        // onComplete
        async (result) => {
          setIsStreaming(false)
          clearInterval(thinkingInterval)

          if (result) {
            const themedSlides = result.slides.map((slide, index) => ({
              ...slide,
              background: index === 0 ? selectedTheme.primary : selectedTheme.secondary,
              textColor: selectedTheme.text,
              designElements: {
                icons: [],
                charts: slide.content.includes("$") || slide.content.includes("%") || slide.content.includes("growth"),
                images: slide.layout === "image",
                bullets: slide.content.includes("•") || slide.content.includes("-"),
              },
            }))

            setSlides(themedSlides)
            setSelectedSlide(themedSlides[0]?.id || "")
            setCurrentSlideIndex(0)

            // Update existing presentation in database
            if (authUser && session && currentPresentationId) {
              try {
                await presentationsAPI.updatePresentation(currentPresentationId, {
                  name: projectName,
                  slides: themedSlides,
                  category: "ai-generated",
                })
              } catch (error) {
                console.error("Failed to update presentation:", error)
              }
            }

            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.isLoading
                  ? {
                      ...msg,
                      isLoading: false,
                      content: `🎨 I've designed your presentation with ${result.slides.length} professional slides! Each slide is crafted with modern design principles, appropriate visual elements, and optimized layouts.\n\n✨ **Design Features Applied:**\n• Smart color schemes based on content\n• Relevant icons and visual elements\n• Professional typography hierarchy\n• Optimized layouts for each slide type\n\nYou can now edit individual slides, request design changes, or ask me to enhance specific visual elements!`,
                      generationProgress: {
                        ...msg.generationProgress!,
                        stage: "complete",
                        isComplete: true,
                        completedSlides: result.slides.length,
                        totalSlides: result.slides.length,
                        isMinimized: false,
                      },
                    }
                  : msg,
              ),
            )
          }
        },
        // onError
        (error) => {
          setIsStreaming(false)
          clearInterval(thinkingInterval)
          setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))

          const errorMessage: ChatMessage = {
            id: (Date.now() + 3).toString(),
            type: "assistant",
            content: `❌ I encountered an error: ${error.message}\n\nPlease try again or describe your presentation differently. I'm here to help you create amazing slides!`,
            timestamp: new Date(),
          }
          setChatMessages((prev) => [...prev, errorMessage])
        },
      )
    },
    [v0, uploadedFile, selectedTheme, projectName, authUser, session, streamingContent, currentPresentationId],
  )

  const toggleProgressMinimization = (messageId: string) => {
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.generationProgress
          ? {
              ...msg,
              generationProgress: {
                ...msg.generationProgress,
                isMinimized: !msg.generationProgress.isMinimized,
              },
            }
          : msg,
      ),
    )
  }

  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (slides.length > 0) {
        autoSave()
      }
    }, 2000)

    return () => clearTimeout(saveTimer)
  }, [slides, projectName, autoSave])

  const handleChatSubmit = async () => {
    if (!inputMessage.trim() || v0.isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    }

    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content: "🎨 Analyzing your request and applying design expertise...",
      timestamp: new Date(),
      isLoading: true,
      generationProgress: {
        stage: "thinking",
        thinkingTime: 0,
        version: chatMessages.filter((m) => m.generationProgress?.version).length + 1,
      },
    }

    setChatMessages((prev) => [...prev, userMessage, loadingMessage])
    const currentInput = inputMessage
    setInputMessage("")

    let thinkingTime = 0
    const thinkingInterval = setInterval(() => {
      thinkingTime += 1
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.isLoading
            ? {
                ...msg,
                generationProgress: {
                  ...msg.generationProgress!,
                  thinkingTime,
                },
              }
            : msg,
        ),
      )
    }, 1000)

    // Use expert prompt for edits too
    const expertPrompt = createExpertPrompt(currentInput, true)

    if (editMode === "selected" && selectedSlide) {
      const slide = slides.find((s) => s.id === selectedSlide)
      if (slide) {
        const result = await v0.editSlide(selectedSlide, slide.title, expertPrompt)

        clearInterval(thinkingInterval)
        setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))

        if (result) {
          const themedSlides = result.slides.map((s, index) => ({
            ...s,
            background: index === 0 ? selectedTheme.primary : selectedTheme.secondary,
            textColor: selectedTheme.text,
            designElements: {
              icons: [],
              charts: s.content.includes("$") || s.content.includes("%"),
              images: s.layout === "image",
              bullets: s.content.includes("•") || s.content.includes("-"),
            },
          }))

          setSlides(themedSlides)
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            type: "assistant",
            content: `✨ Perfect! I've redesigned the "${slide.title}" slide with enhanced visual elements and modern design principles. The updated slide now features improved layout, appropriate visual cues, and better content hierarchy.`,
            timestamp: new Date(),
          }
          setChatMessages((prev) => [...prev, assistantMessage])
        }
      }
    } else {
      let result
      if (slides.length > 0) {
        result = await v0.regenerateAllSlides(expertPrompt)
      } else {
        result = await v0.generateSlides(expertPrompt, uploadedFile)
      }

      clearInterval(thinkingInterval)
      setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))

      if (result) {
        const themedSlides = result.slides.map((slide, index) => ({
          ...slide,
          background: index === 0 ? selectedTheme.primary : selectedTheme.secondary,
          textColor: selectedTheme.text,
          designElements: {
            icons: [],
            charts: slide.content.includes("$") || slide.content.includes("%"),
            images: slide.layout === "image",
            bullets: slide.content.includes("•") || slide.content.includes("-"),
          },
        }))

        setSlides(themedSlides)
        if (themedSlides.length > 0 && !selectedSlide) {
          setSelectedSlide(themedSlides[0].id)
          setCurrentSlideIndex(0)
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content:
            slides.length > 0
              ? "🎨 Excellent! I've redesigned all slides with your feedback, applying modern design principles and enhanced visual elements. Each slide now has improved layouts, better color schemes, and appropriate design elements that support your message."
              : `🚀 Amazing! I've created ${result.slides.length} professionally designed slides for your presentation. Each slide features:\n\n• Modern, clean layouts\n• Strategic use of colors and typography\n• Relevant visual elements and icons\n• Optimized content hierarchy\n\nYou can now review, edit individual slides, or ask for specific design enhancements!`,
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, assistantMessage])
      }
    }

    if (v0.error) {
      clearInterval(thinkingInterval)
      setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))

      const errorMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        type: "assistant",
        content: `❌ I encountered an error: ${v0.error}\n\nPlease try rephrasing your request. I'm here to help you create stunning presentations!`,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "user",
        content: `📎 Uploaded: ${file.name}`,
        timestamp: new Date(),
      }

      const loadingMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "🎨 Analyzing your document and designing professional slides...",
        timestamp: new Date(),
        isLoading: true,
      }

      setChatMessages((prev) => [...prev, userMessage, loadingMessage])

      const expertPrompt = createExpertPrompt(
        "Create a professional presentation from this document with modern design elements",
      )
      const result = await v0.generateSlides(expertPrompt, file)

      setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))

      if (result) {
        const themedSlides = result.slides.map((slide, index) => ({
          ...slide,
          background: index === 0 ? selectedTheme.primary : selectedTheme.secondary,
          textColor: selectedTheme.text,
          designElements: {
            icons: [],
            charts: slide.content.includes("$") || slide.content.includes("%"),
            images: slide.layout === "image",
            bullets: slide.content.includes("•") || slide.content.includes("-"),
          },
        }))

        setSlides(themedSlides)
        setSelectedSlide(themedSlides[0]?.id || "")
        setCurrentSlideIndex(0)

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content: `🎯 Perfect! I've analyzed your document and created ${result.slides.length} professionally designed slides. The presentation captures all key points from your file with modern layouts, appropriate visual elements, and strategic design choices that enhance readability and engagement.`,
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, assistantMessage])
      }
    }
  }

  const handleSlideSelect = (slideId: string, index: number) => {
    setSelectedSlide(slideId)
    setCurrentSlideIndex(index)
    setEditMode("selected")
  }

  const handleThemeChange = (themeName: string) => {
    const theme = colorThemes.find((t) => t.name === themeName) || colorThemes[0]
    setSelectedTheme(theme)

    const themedSlides = slides.map((slide, index) => ({
      ...slide,
      background: index === 0 ? theme.primary : theme.secondary,
      textColor: theme.text,
    }))
    setSlides(themedSlides)

    const themeMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "assistant",
      content: `🎨 Excellent choice! I've applied the ${theme.name} theme to all your slides. The new color scheme creates a cohesive, professional look that enhances your presentation's visual impact.`,
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, themeMessage])
  }

  const handleNameSave = () => {
    setIsEditingName(false)
    // Auto-save will handle the database update and URL change
  }

  const handlePresentationMode = () => {
    setIsPresentationMode(true)
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
    }
  }

  const exitPresentationMode = () => {
    setIsPresentationMode(false)
    if (document.exitFullscreen) {
      document.exitFullscreen()
    }
  }

  const currentSlide = slides.find((slide) => slide.id === selectedSlide)

  const handleScreenResize = useCallback(() => {
    checkScreenSize()
  }, [])

  const handleNameInputFocus = useCallback(() => {
    setIsEditingName(true)
  }, [])

  const handleNameInputBlur = useCallback(() => {
    handleNameSave()
  }, [])

  const handleNameInputKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameSave()
    }
  }, [])

  useEffect(() => {
    window.addEventListener("resize", handleScreenResize)
    return () => window.removeEventListener("resize", handleScreenResize)
  }, [])

  useEffect(() => {
    checkScreenSize()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  useEffect(() => {
    if (isInitialized) return

    const presentationId = params.id as string

    if (presentationId && presentationId !== "new") {
      // Load existing presentation
      const loadPresentation = async () => {
        try {
          if (authUser && session) {
            const presentation = await presentationsAPI.getPresentation(presentationId)
            setSlides(presentation.slides)
            setSelectedSlide(presentation.slides[0]?.id || "")
            setCurrentSlideIndex(0)
            setProjectName(presentation.name)
            setCurrentPresentationId(presentation.id)

            const welcomeMessage: ChatMessage = {
              id: Date.now().toString(),
              type: "assistant",
              content: `🎨 Welcome back to "${presentation.name}"! This presentation has ${presentation.slides.length} professionally designed slides.\n\n✨ **What I can help you with:**\n• Redesign individual slides with modern elements\n• Add charts, icons, and visual enhancements\n• Change color themes and layouts\n• Optimize content hierarchy and typography\n• Apply advanced design principles\n\nWhat design improvements would you like to make?`,
              timestamp: new Date(),
            }
            setChatMessages([welcomeMessage])
          }
        } catch (error) {
          console.error("Failed to load presentation:", error)
          router.push("/")
        }
      }

      loadPresentation()
    } else {
      // New presentation - set the ID from params
      setCurrentPresentationId(presentationId)
      setChatMessages([])

      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1]
        if (lastMessage.type === "user") {
          setTimeout(() => {
            handleInitialGeneration(lastMessage.content)
          }, 100)
        }
      }
    }

    setIsInitialized(true)
  }, [authUser, session, messages, handleInitialGeneration, params.id, router])

  // Show warning for small screens
  if (isSmallScreen) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-[#027659]/10 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-[#027659]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Editor requires laptop/desktop</h2>
            <p className="text-muted-foreground">
              Please use a device with 1024px or wider screen to access the presentation editor.
            </p>
          </div>
          <div className="space-y-3">
            <Button onClick={() => router.push("/")} className="w-full bg-[#027659] hover:bg-[#065f46] text-white">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-green-50/30">
        {/* Left Sidebar - Slide Thumbnails */}
        <div className="lg:w-[180px] xl:w-[200px] 2xl:w-[220px] 3xl:w-[240px] bg-white border-r border-gray-200 flex flex-col shadow-sm">
          {/* Header */}
          <div className="p-4 h-[61px] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="hover:bg-gray-100">
                <Home className="h-4 w-4" />
              </Button>
              <img src="https://cldup.com/dAXA3nE5xd.svg" alt="SlydPRO" className="h-16 w-24" />
            </div>
          </div>

          {/* Add Slide Button */}
          <div className="p-4 border-b border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-gray-700 hover:bg-gray-50 bg-transparent"
              onClick={() => {
                // Add new slide logic here
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add slide
            </Button>
          </div>

          {/* Slide Thumbnails */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {isStreaming
                ? Array.from({ length: 7 }, (_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className="relative group rounded-lg border-2 border-gray-200 bg-white"
                    >
                      <div className="absolute -left-2 top-2 z-10">
                        <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse"></div>
                      </div>
                      <div className="p-3 pt-4">
                        <div className="w-full aspect-video rounded border overflow-hidden bg-gray-200 animate-pulse">
                          <div className="p-2 h-full flex flex-col justify-center">
                            <div className="h-3 bg-gray-300 rounded mb-2 animate-pulse"></div>
                            <div className="h-2 bg-gray-300 rounded mb-1 animate-pulse"></div>
                            <div className="h-2 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))
                : slides.map((slide, index) => (
                    <div
                      key={slide.id}
                      className={`relative group cursor-pointer rounded-lg border-2 transition-all duration-200 ${
                        selectedSlide === slide.id
                          ? "border-[#027659] bg-[#027659]/5 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                      }`}
                      onClick={() => handleSlideSelect(slide.id, index)}
                    >
                      {/* Slide Number */}
                      <div className="absolute -left-2 top-2 z-10">
                        <div
                          className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                            selectedSlide === slide.id
                              ? "bg-[#027659] text-white"
                              : "bg-gray-500 text-white group-hover:bg-gray-600"
                          }`}
                        >
                          {index + 1}
                        </div>
                      </div>

                      <div className="p-3 pt-4">
                        {/* Slide Preview */}
                        <div className="w-full aspect-video rounded border overflow-hidden">
                          <div
                            className="p-2 h-full flex flex-col justify-center text-white text-xs"
                            style={{
                              backgroundColor: slide.background,
                              color: slide.textColor,
                            }}
                          >
                            <h4 className="font-semibold mb-1 line-clamp-2 leading-tight">{slide.title}</h4>
                            <p className="opacity-80 line-clamp-3 leading-relaxed">
                              {slide.content.substring(0, 80)}...
                            </p>
                          </div>
                        </div>

                        {/* Slide Title */}
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700 truncate">{slide.title}</p>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 hover:bg-red-100 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Delete slide logic here
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Toolbar */}
          <div className="h-[61px] bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
            <div className="flex items-center space-x-4">
              {/* Project Name */}
              <div className="flex items-center space-x-2">
                {isEditingName ? (
                  <Input
                    ref={nameInputRef}
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={handleNameInputBlur}
                    onKeyPress={handleNameInputKeyPress}
                    className="text-lg font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                ) : (
                  <h1
                    className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-[#027659] transition-colors"
                    onClick={handleNameInputFocus}
                  >
                    {projectName}
                  </h1>
                )}
                {isSaving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              </div>

              {/* Edit Mode Toggle */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={editMode === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setEditMode("all")}
                  className={`text-xs px-3 py-1 h-7 ${
                    editMode === "all"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                  }`}
                >
                  All slides
                </Button>
                <Button
                  variant={editMode === "selected" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setEditMode("selected")}
                  className={`text-xs px-3 py-1 h-7 ${
                    editMode === "selected"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                  }`}
                >
                  Selected slide
                </Button>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-3">
              {/* Theme Selector */}
              <select
                value={selectedTheme.name}
                onChange={(e) => handleThemeChange(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#027659] focus:border-transparent"
              >
                {colorThemes.map((theme) => (
                  <option key={theme.name} value={theme.name}>
                    {theme.name}
                  </option>
                ))}
              </select>

              {/* Action Buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePresentationMode}
                className="text-gray-700 border-gray-300 hover:bg-gray-50 bg-transparent"
              >
                <Play className="h-4 w-4 mr-2" />
                Present
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex">
            {/* Slide Preview */}
            <div className="flex-1 flex flex-col bg-gray-50">
              {/* Slide Navigation */}
              <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (currentSlideIndex > 0) {
                      const newIndex = currentSlideIndex - 1
                      setCurrentSlideIndex(newIndex)
                      setSelectedSlide(slides[newIndex].id)
                    }
                  }}
                  disabled={currentSlideIndex === 0}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <span className="text-sm text-gray-600 font-medium">
                  {currentSlideIndex + 1} of {slides.length}
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (currentSlideIndex < slides.length - 1) {
                      const newIndex = currentSlideIndex + 1
                      setCurrentSlideIndex(newIndex)
                      setSelectedSlide(slides[newIndex].id)
                    }
                  }}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              {/* Slide Display */}
              <div className="flex-1 flex items-center justify-center p-8">
                {isStreaming ? (
                  <div className="w-full max-w-4xl aspect-video bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col items-center justify-center space-y-6">
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-8 h-8 bg-[#027659] rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </div>
                        <div className="w-2 h-2 bg-[#027659] rounded-full animate-pulse"></div>
                      </div>
                      <h3 className="text-2xl font-bold text-[#027659]">SlydPRO Designing</h3>
                      <p className="text-gray-600">Creating your professional presentation...</p>
                    </div>

                    <div className="flex space-x-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-8 bg-[#027659] rounded-full animate-pulse"
                          style={{
                            animationDelay: `${i * 0.2}s`,
                            animationDuration: "1s",
                          }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-[#027659] border-t-transparent rounded-full animate-spin"></div>
                        <span>Analyzing content</span>
                      </div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-[#027659]" />
                        <span>Applying design principles</span>
                      </div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-[#027659]" />
                        <span>Optimizing layouts</span>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      </div>
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                      </div>
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-orange-500 rounded"></div>
                      </div>
                    </div>
                  </div>
                ) : currentSlide ? (
                  <div className="w-full max-w-4xl aspect-video bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div
                      className="w-full h-full p-12 flex flex-col justify-center"
                      style={{
                        backgroundColor: currentSlide.background,
                        color: currentSlide.textColor,
                      }}
                    >
                      <h2 className="text-4xl font-bold mb-6 leading-tight">{currentSlide.title}</h2>
                      <div className="text-lg leading-relaxed whitespace-pre-wrap opacity-90">
                        {currentSlide.content}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-4xl aspect-video bg-white rounded-lg shadow-lg border border-gray-200 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                        <Plus className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No slides yet</h3>
                        <p className="text-gray-600">Start by describing your presentation in the chat</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Chat */}
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-sm">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  AI Design Expert
                </h3>
                <p className="text-xs text-gray-500 mt-1">Professional presentation designer</p>
              </div>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          message.type === "user"
                            ? "bg-[#027659] text-white"
                            : "bg-gray-100 text-gray-900 border border-gray-200"
                        }`}
                      >
                        {message.isLoading ? (
                          <div className="space-y-3">
                            {message.generationProgress && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    {message.generationProgress.stage === "thinking" && "🤔 Analyzing your request..."}
                                    {message.generationProgress.stage === "designing" && "🎨 Designing slides..."}
                                    {message.generationProgress.stage === "complete" && "✅ Complete!"}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-gray-200"
                                    onClick={() => toggleProgressMinimization(message.id)}
                                  >
                                    <Minimize className="h-3 w-3" />
                                  </Button>
                                </div>

                                {!message.generationProgress.isMinimized && (
                                  <>
                                    {message.generationProgress.stage === "thinking" && (
                                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <div className="w-4 h-4 border-2 border-[#027659] border-t-transparent rounded-full animate-spin"></div>
                                        <span>Thinking... ({message.generationProgress.thinkingTime}s)</span>
                                      </div>
                                    )}

                                    {message.generationProgress.stage === "designing" && (
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-sm text-gray-600">
                                          <span>Progress</span>
                                          <span>
                                            {message.generationProgress.completedSlides || 0}/
                                            {message.generationProgress.totalSlides || "?"}
                                          </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div
                                            className="bg-[#027659] h-2 rounded-full transition-all duration-300"
                                            style={{
                                              width: `${
                                                message.generationProgress.totalSlides
                                                  ? (
                                                      message.generationProgress.completedSlides! /
                                                        message.generationProgress.totalSlides
                                                    ) * 100
                                                  : 0
                                              }%`,
                                            }}
                                          ></div>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                            {message.type === "assistant" && (
                              <div className="flex items-center justify-end space-x-2 mt-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 hover:bg-gray-200"
                                  onClick={() => handleCopyMessage(message.id, message.content)}
                                >
                                  {copiedMessageId === message.id ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-100">
                <div className="space-y-3">
                  <div className="relative">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={
                        slides.length === 0
                          ? "Describe your presentation... (e.g., 'Create a startup pitch deck with modern design')"
                          : editMode === "selected"
                            ? "How should I redesign this slide? (e.g., 'Add charts and icons, make it more visual')"
                            : "What design changes would you like? (e.g., 'Make it more colorful and add icons')"
                      }
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleChatSubmit()
                        }
                      }}
                      className="min-h-[80px] max-h-[120px] resize-none text-sm border-gray-300 focus:border-[#027659] focus:ring-[#027659]"
                      disabled={isStreaming}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        disabled={isStreaming}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        <span className="text-xs">Upload</span>
                      </Button>
                      {uploadedFile && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{uploadedFile.name}</span>
                      )}
                    </div>

                    <Button
                      onClick={handleChatSubmit}
                      disabled={!inputMessage.trim() || isStreaming}
                      className="bg-[#027659] hover:bg-[#065f46] text-white"
                      size="sm"
                    >
                      {isStreaming ? (
                        <>
                          <Square className="h-4 w-4 mr-2" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.doc,.docx,.pdf"
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Export Dialog */}
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          slides={slides}
          projectName={projectName}
        />

        {/* Presentation Mode */}
        {isPresentationMode && (
          <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center">
              {currentSlide && (
                <div
                  className="w-full h-full flex flex-col justify-center px-16"
                  style={{
                    backgroundColor: currentSlide.background,
                    color: currentSlide.textColor,
                  }}
                >
                  <h1 className="text-6xl font-bold mb-8 leading-tight">{currentSlide.title}</h1>
                  <div className="text-2xl leading-relaxed whitespace-pre-wrap opacity-90">{currentSlide.content}</div>
                </div>
              )}
            </div>

            {/* Presentation Controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 rounded-full px-6 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (currentSlideIndex > 0) {
                    const newIndex = currentSlideIndex - 1
                    setCurrentSlideIndex(newIndex)
                    setSelectedSlide(slides[newIndex].id)
                  }
                }}
                disabled={currentSlideIndex === 0}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="h-5 w-5" />
              </Button>

              <span className="text-white font-medium">
                {currentSlideIndex + 1} / {slides.length}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (currentSlideIndex < slides.length - 1) {
                    const newIndex = currentSlideIndex + 1
                    setCurrentSlideIndex(newIndex)
                    setSelectedSlide(slides[newIndex].id)
                  }
                }}
                disabled={currentSlideIndex === slides.length - 1}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="h-5 w-5" />
              </Button>

              <div className="w-px h-6 bg-white/30 mx-2"></div>

              <Button variant="ghost" size="sm" onClick={exitPresentationMode} className="text-white hover:bg-white/20">
                Exit
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default EditorContent
