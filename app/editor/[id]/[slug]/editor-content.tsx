"use client"

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
  Home,
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
  const { user: authUser, isLoading: authLoading } = useAuth()

  // Get current presentation ID and slug from URL params
  const presentationId = params.id as string
  const currentSlug = params.slug as string

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

  // Update URL when project name changes
  const updateURL = useCallback(
    (newName: string) => {
      if (presentationId && newName) {
        const newSlug = createSlug(newName)
        if (newSlug !== currentSlug) {
          router.replace(`/editor/${presentationId}/${newSlug}`, { scroll: false })
        }
      }
    },
    [presentationId, currentSlug, router],
  )

  // Auto-save function with URL update
  const autoSave = useCallback(async () => {
    if (!presentationId || !authUser || slides.length === 0) return

    setIsSaving(true)
    try {
      await presentationsAPI.updatePresentation(presentationId, {
        name: projectName,
        slides,
        thumbnail: slides[0]?.background,
      })

      // Update URL with new slug if name changed
      updateURL(projectName)
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }, [presentationId, authUser, slides, projectName, updateURL])

  // Auto-save effect
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (slides.length > 0 && presentationId) {
        autoSave()
      }
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(saveTimer)
  }, [slides, projectName, autoSave, presentationId])

  // Handle initial generation for new presentations
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

      // Use streaming generation with real-time updates
      await v0.generateSlidesStreaming(
        prompt,
        uploadedFile,
        // onChunk - real-time content streaming
        (chunk: string) => {
          setStreamingContent((prev) => prev + chunk)

          // Transition to designing stage when we start getting content
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

          // Parse slides from streaming content to update progress
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
            }))

            setSlides(themedSlides)
            setSelectedSlide(themedSlides[0]?.id || "")
            setCurrentSlideIndex(0)

            // Update presentation name based on content
            const newName = result.slides[0]?.title || "New Presentation"
            setProjectName(newName)

            // Update to completion state
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.isLoading
                  ? {
                      ...msg,
                      isLoading: false,
                      content: `I've successfully created your presentation with ${result.slides.length} slides. Each slide is designed to tell your story effectively. You can now edit individual slides or ask me to make changes to the entire presentation.`,
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
            content: `I encountered an error: ${error.message}\n\nPlease try again or describe your presentation differently.`,
            timestamp: new Date(),
          }
          setChatMessages((prev) => [...prev, errorMessage])
        },
      )
    },
    [v0, uploadedFile, selectedTheme, streamingContent],
  )

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
      content: "Working on it...",
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

    // Start thinking timer for follow-up requests
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

    if (editMode === "selected" && selectedSlide) {
      // Edit only the selected slide
      const slide = slides.find((s) => s.id === selectedSlide)
      if (slide) {
        const result = await v0.editSlide(selectedSlide, slide.title, currentInput)

        clearInterval(thinkingInterval)
        setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))

        if (result) {
          setSlides(
            result.slides.map((s, index) => ({
              ...s,
              background: index === 0 ? selectedTheme.primary : selectedTheme.secondary,
              textColor: selectedTheme.text,
            })),
          )
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            type: "assistant",
            content: `Great! I've updated the "${slide.title}" slide based on your request. The changes should now be visible in the preview.`,
            timestamp: new Date(),
          }
          setChatMessages((prev) => [...prev, assistantMessage])
        }
      }
    } else {
      // Regenerate all slides or create new ones
      let result
      if (slides.length > 0) {
        result = await v0.regenerateAllSlides(currentInput)
      } else {
        result = await v0.generateSlides(currentInput, uploadedFile)
      }

      clearInterval(thinkingInterval)
      setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))

      if (result) {
        const themedSlides = result.slides.map((slide, index) => ({
          ...slide,
          background: index === 0 ? selectedTheme.primary : selectedTheme.secondary,
          textColor: selectedTheme.text,
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
              ? "Perfect! I've updated all slides based on your feedback. Take a look at the changes in the preview."
              : `Excellent! I've created ${result.slides.length} slides for your presentation. You can now review them, make edits, or ask for specific changes.`,
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
        content: `I encountered an error: ${v0.error}\n\nPlease try rephrasing your request or try again.`,
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
        content: "Analyzing your document and creating slides...",
        timestamp: new Date(),
        isLoading: true,
      }

      setChatMessages((prev) => [...prev, userMessage, loadingMessage])

      const result = await v0.generateSlides("Create a presentation from this document", file)

      // Remove loading message
      setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))

      if (result) {
        const themedSlides = result.slides.map((slide, index) => ({
          ...slide,
          background: index === 0 ? selectedTheme.primary : selectedTheme.secondary,
          textColor: selectedTheme.text,
        }))
        setSlides(themedSlides)
        setSelectedSlide(themedSlides[0]?.id || "")
        setCurrentSlideIndex(0)

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content: `Great! I've analyzed your document and created ${result.slides.length} slides. The presentation covers the key points from your file. Feel free to ask me to adjust any content or styling.`,
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
      content: `Perfect! I've applied the ${theme.name} theme to all your slides. The new color scheme gives your presentation a fresh look.`,
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, themeMessage])
  }

  const handleNameSave = () => {
    setIsEditingName(false)
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

  const currentSlide = slides.find((slide) => slide.id === selectedSlide)

  // Initialize presentation data
  useEffect(() => {
    if (isInitialized || !authUser) return

    const loadPresentation = async () => {
      try {
        const presentation = await presentationsAPI.getPresentation(presentationId)
        setSlides(presentation.slides)
        setSelectedSlide(presentation.slides[0]?.id || "")
        setCurrentSlideIndex(0)
        setProjectName(presentation.name)

        // If presentation is empty and we have messages from home page, start generation
        if (presentation.slides.length === 0 && messages.length > 0) {
          const lastMessage = messages[messages.length - 1]
          if (lastMessage.type === "user") {
            setTimeout(() => {
              handleInitialGeneration(lastMessage.content)
            }, 100)
          }
        } else if (presentation.slides.length > 0) {
          // Welcome message for existing presentations
          const welcomeMessage: ChatMessage = {
            id: Date.now().toString(),
            type: "assistant",
            content: `Welcome back to "${presentation.name}"! This presentation has ${presentation.slides.length} slides and was last updated ${new Date(presentation.updated_at).toLocaleDateString()}.\n\nYou can now:\n• Edit individual slides by selecting them\n• Regenerate content with new ideas\n• Change colors and themes\n• Ask me to modify specific aspects\n\nWhat would you like to work on?`,
            timestamp: new Date(),
          }
          setChatMessages([welcomeMessage])
        }
      } catch (error) {
        console.error("Failed to load presentation:", error)
        // If presentation doesn't exist, redirect to home
        router.push("/")
      }
    }

    loadPresentation()
    setIsInitialized(true)
  }, [authUser, presentationId, messages, handleInitialGeneration, router, isInitialized])

  // Screen size check
  useEffect(() => {
    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // Focus name input when editing
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

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
            <h1 className="text-2xl font-bold text-foreground mb-2">Desktop Required</h1>
            <p className="text-muted-foreground leading-relaxed">
              The SlydPRO editor works best on desktop and tablet devices. Please use a larger screen for the optimal
              experience.
            </p>
          </div>
          <Button onClick={() => router.push("/")} className="bg-[#027659] hover:bg-[#065f46] text-white">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  if (authLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#027659] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading presentation...</p>
        </div>
      </div>
    )
  }

  if (isPresentationMode) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="w-full h-full flex items-center justify-center p-8">
          {currentSlide && (
            <div
              className="w-full max-w-6xl h-full max-h-[80vh] rounded-lg shadow-2xl flex flex-col justify-center p-12 text-center"
              style={{
                backgroundColor: currentSlide.background,
                color: currentSlide.textColor,
              }}
            >
              <h1 className="text-6xl font-bold mb-8 leading-tight">{currentSlide.title}</h1>
              <div className="text-2xl leading-relaxed whitespace-pre-wrap">{currentSlide.content}</div>
            </div>
          )}
        </div>

        {/* Presentation Controls */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/80 backdrop-blur-sm rounded-full px-6 py-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const prevIndex = Math.max(0, currentSlideIndex - 1)
              setCurrentSlideIndex(prevIndex)
              setSelectedSlide(slides[prevIndex]?.id || "")
            }}
            disabled={currentSlideIndex === 0}
            className="text-white hover:bg-white/20"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <span className="text-white text-sm">
            {currentSlideIndex + 1} / {slides.length}
          </span>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const nextIndex = Math.min(slides.length - 1, currentSlideIndex + 1)
              setCurrentSlideIndex(nextIndex)
              setSelectedSlide(slides[nextIndex]?.id || "")
            }}
            disabled={currentSlideIndex === slides.length - 1}
            className="text-white hover:bg-white/20"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button size="sm" variant="ghost" onClick={exitPresentationMode} className="text-white hover:bg-white/20">
            <Minimize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="text-muted-foreground">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center space-x-2">
              {isEditingName ? (
                <Input
                  ref={nameInputRef}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyPress={(e) => e.key === "Enter" && handleNameSave()}
                  className="text-lg font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              ) : (
                <h1
                  className="text-lg font-semibold text-foreground cursor-pointer hover:text-muted-foreground"
                  onClick={() => setIsEditingName(true)}
                >
                  {projectName}
                </h1>
              )}
              {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePresentationMode}
              disabled={slides.length === 0}
              className="border-border bg-transparent"
            >
              <Play className="h-4 w-4 mr-2" />
              Present
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              disabled={slides.length === 0}
              className="border-border"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Slides */}
          <div className="w-80 border-r border-border bg-card flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground">Slides ({slides.length})</h2>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant={editMode === "all" ? "default" : "outline"}
                    onClick={() => setEditMode("all")}
                    className={
                      editMode === "all"
                        ? "bg-[#027659] hover:bg-[#065f46] text-white"
                        : "border-border text-muted-foreground"
                    }
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={editMode === "selected" ? "default" : "outline"}
                    onClick={() => setEditMode("selected")}
                    className={
                      editMode === "selected"
                        ? "bg-[#027659] hover:bg-[#065f46] text-white"
                        : "border-border text-muted-foreground"
                    }
                  >
                    Selected
                  </Button>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {colorThemes.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => handleThemeChange(theme.name)}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        selectedTheme.name === theme.name
                          ? "border-[#027659] ring-2 ring-[#027659]/20"
                          : "border-border"
                      }`}
                    >
                      <div className="flex space-x-1">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.primary }} />
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.secondary }} />
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 block">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Slides List */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {slides.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No slides yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Start by describing your presentation</p>
                  </div>
                ) : (
                  slides.map((slide, index) => (
                    <div
                      key={slide.id}
                      onClick={() => handleSlideSelect(slide.id, index)}
                      className={`cursor-pointer rounded-lg border-2 transition-all ${
                        selectedSlide === slide.id
                          ? "border-[#027659] ring-2 ring-[#027659]/20"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div
                        className="aspect-video rounded-t-lg p-3 text-white text-xs flex flex-col justify-center"
                        style={{ backgroundColor: slide.background }}
                      >
                        <div className="font-semibold mb-1 line-clamp-2">{slide.title}</div>
                        <div className="opacity-80 line-clamp-3">{slide.content.substring(0, 80)}...</div>
                      </div>
                      <div className="p-2 bg-card">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Slide {index + 1}</span>
                          <div className="flex space-x-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground">
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Center - Preview */}
          <div className="flex-1 flex flex-col bg-muted/30">
            <div className="flex-1 flex items-center justify-center p-8">
              {slides.length === 0 ? (
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#027659] to-[#10b981] rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <div className="flex space-x-1">
                      <div
                        className="w-2 h-8 bg-white/30 rounded-full animate-pulse"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-6 bg-white/50 rounded-full animate-pulse"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-10 bg-white/40 rounded-full animate-pulse"
                        style={{ animationDelay: "300ms" }}
                      />
                      <div
                        className="w-2 h-7 bg-white/60 rounded-full animate-pulse"
                        style={{ animationDelay: "450ms" }}
                      />
                      <div
                        className="w-2 h-9 bg-white/35 rounded-full animate-pulse"
                        style={{ animationDelay: "600ms" }}
                      />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">SlydPRO Designing</h3>
                  <p className="text-muted-foreground mb-6">
                    Your presentation is being crafted with precision. Each slide is designed to tell your story
                    effectively.
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-[#027659] rounded-full animate-pulse" />
                      <span>Analyzing content</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"
                        style={{ animationDelay: "1s" }}
                      />
                      <span>Designing layout</span>
                    </div>
                  </div>
                </div>
              ) : currentSlide ? (
                <div className="w-full max-w-4xl">
                  <div
                    className="aspect-video rounded-xl shadow-2xl flex flex-col justify-center p-12 text-center"
                    style={{
                      backgroundColor: currentSlide.background,
                      color: currentSlide.textColor,
                    }}
                  >
                    <h1 className="text-4xl font-bold mb-6 leading-tight">{currentSlide.title}</h1>
                    <div className="text-lg leading-relaxed whitespace-pre-wrap">{currentSlide.content}</div>
                  </div>

                  {/* Slide Navigation */}
                  <div className="flex items-center justify-center mt-6 space-x-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const prevIndex = Math.max(0, currentSlideIndex - 1)
                        setCurrentSlideIndex(prevIndex)
                        setSelectedSlide(slides[prevIndex]?.id || "")
                      }}
                      disabled={currentSlideIndex === 0}
                      className="border-border"
                    >
                      <SkipBack className="h-4 w-4 mr-2" />
                      Previous
                    </Button>

                    <span className="text-sm text-muted-foreground">
                      {currentSlideIndex + 1} of {slides.length}
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const nextIndex = Math.min(slides.length - 1, currentSlideIndex + 1)
                        setCurrentSlideIndex(nextIndex)
                        setSelectedSlide(slides[nextIndex]?.id || "")
                      }}
                      disabled={currentSlideIndex === slides.length - 1}
                      className="border-border"
                    >
                      Next
                      <SkipForward className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Sidebar - Chat */}
          <div className="w-96 border-l border-border bg-card flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#027659] to-[#10b981] rounded-lg flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI Assistant</h3>
                  <p className="text-xs text-muted-foreground">
                    {editMode === "selected" ? "Editing selected slide" : "Editing all slides"}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        message.type === "user"
                          ? "bg-[#027659] text-white"
                          : "bg-muted text-foreground border border-border"
                      }`}
                    >
                      {message.isLoading && message.generationProgress ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm font-medium">
                                {message.generationProgress.stage === "thinking"
                                  ? "Thinking..."
                                  : message.generationProgress.stage === "designing"
                                    ? "Designing..."
                                    : "Complete"}
                              </span>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleProgressMinimization(message.id)}
                              className="h-6 w-6"
                            >
                              <Minimize className="h-3 w-3" />
                            </Button>
                          </div>

                          {!message.generationProgress.isMinimized && (
                            <div className="space-y-2 text-sm">
                              {message.generationProgress.stage === "thinking" && (
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                  <span>Analyzing your request ({message.generationProgress.thinkingTime}s)</span>
                                </div>
                              )}

                              {message.generationProgress.stage === "designing" && (
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span>Creating slides...</span>
                                  </div>
                                  {message.generationProgress.completedSlides !== undefined && (
                                    <div className="text-xs text-muted-foreground">
                                      Progress: {message.generationProgress.completedSlides} /{" "}
                                      {message.generationProgress.totalSlides || "?"} slides
                                    </div>
                                  )}
                                </div>
                              )}

                              {message.generationProgress.version && (
                                <div className="text-xs text-muted-foreground">
                                  Generation #{message.generationProgress.version}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                          {message.type === "assistant" && (
                            <div className="flex items-center justify-between pt-2">
                              <div className="text-xs text-muted-foreground">
                                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleCopyMessage(message.id, message.content)}
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="h-3 w-3" />
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

                {/* Streaming content */}
                {isStreaming && streamingContent && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg p-3 bg-muted text-foreground border border-border">
                      <div className="text-sm whitespace-pre-wrap">{streamingContent}</div>
                      <div className="flex items-center space-x-1 mt-2">
                        <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
                        <div
                          className="w-1 h-1 bg-current rounded-full animate-pulse"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <div
                          className="w-1 h-1 bg-current rounded-full animate-pulse"
                          style={{ animationDelay: "0.4s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t border-border">
              <div className="space-y-3">
                <div className="relative">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={
                      editMode === "selected"
                        ? `Edit "${currentSlide?.title || "selected slide"}"...`
                        : slides.length > 0
                          ? "Describe changes to make..."
                          : "Describe your presentation..."
                    }
                    onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleChatSubmit()}
                    className="resize-none bg-muted border-border text-foreground placeholder:text-muted-foreground pr-12"
                    rows={3}
                    disabled={v0.isLoading || isStreaming}
                  />
                  <Button
                    size="icon"
                    onClick={handleChatSubmit}
                    disabled={!inputMessage.trim() || v0.isLoading || isStreaming}
                    className="absolute bottom-2 right-2 h-8 w-8 bg-[#027659] hover:bg-[#065f46] text-white"
                  >
                    {v0.isLoading || isStreaming ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-muted-foreground hover:text-foreground"
                    disabled={v0.isLoading || isStreaming}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>

                  {editMode === "selected" && currentSlide && (
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-[#027659]" />
                      <span className="text-xs text-muted-foreground">Editing slide {currentSlideIndex + 1}</span>
                    </div>
                  )}
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

        {/* Export Dialog */}
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          slides={slides}
          projectName={projectName}
        />
      </div>
    </TooltipProvider>
  )
}

export default EditorContent
