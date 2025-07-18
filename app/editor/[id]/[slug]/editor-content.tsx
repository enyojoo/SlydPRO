"use client"
import { Home } from "lucide-react" // Import Home icon

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
  RefreshCw,
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
import { getTemplateById } from "@/lib/slide-templates"
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
      setTimeout(() => setCopiedMessageId(null), 2000) // Reset after 2 seconds
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
    if (!currentPresentationId || !authUser || slides.length === 0) return

    setIsSaving(true)
    try {
      await presentationsAPI.updatePresentation(currentPresentationId, {
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
  }, [currentPresentationId, authUser, slides, projectName, updateURL])

  // Create new presentation and redirect to new URL
  const createNewPresentation = useCallback(
    async (name: string, slidesData: Slide[]) => {
      if (!authUser) return null

      try {
        const presentation = await presentationsAPI.createPresentation({
          name,
          slides: slidesData,
          category: "ai-generated",
        })

        const slug = createSlug(name)
        router.replace(`/editor/${presentation.id}/${slug}`)
        setCurrentPresentationId(presentation.id)
        return presentation
      } catch (error) {
        console.error("Failed to create presentation:", error)
        return null
      }
    },
    [authUser, router],
  )

  // Update the handleInitialGeneration function to create new presentation:
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

            // Create new presentation and redirect to new URL
            const presentation = await createNewPresentation(projectName, themedSlides)

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
    [v0, uploadedFile, selectedTheme, projectName, createNewPresentation, streamingContent],
  )

  // Add function to toggle progress minimization
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
      if (slides.length > 0 && currentPresentationId) {
        autoSave()
      }
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(saveTimer)
  }, [slides, projectName, autoSave, currentPresentationId])

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

    // Remove the automatic chat message - only update the UI indicator
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
    // Auto-save will be triggered by useEffect
  }

  const handlePresentationMode = () => {
    setIsPresentationMode(true)
    // Enter fullscreen presentation mode
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

    // Load existing presentation from URL params
    if (presentationId && presentationId !== "new") {
      const loadProject = async () => {
        try {
          if (authUser) {
            const presentation = await presentationsAPI.getPresentation(presentationId)
            setSlides(presentation.slides)
            setSelectedSlide(presentation.slides[0]?.id || "")
            setCurrentSlideIndex(0)
            setProjectName(presentation.name)
            setCurrentPresentationId(presentation.id)

            const welcomeMessage: ChatMessage = {
              id: Date.now().toString(),
              type: "assistant",
              content: `Welcome back to "${presentation.name}"! This presentation has ${presentation.slides.length} slides and was last updated ${new Date(presentation.updated_at).toLocaleDateString()}.\n\nYou can now:\n• Edit individual slides by selecting them\n• Regenerate content with new ideas\n• Change colors and themes\n• Ask me to modify specific aspects\n\nWhat would you like to work on?`,
              timestamp: new Date(),
            }
            setChatMessages([welcomeMessage])
          } else {
            // Fallback to template loading if not authenticated
            const project = getTemplateById(presentationId)
            if (project) {
              setSlides(project.slides)
              setSelectedSlide(project.slides[0]?.id || "")
              setCurrentSlideIndex(0)
              setProjectName(project.name)
            }
          }
        } catch (error) {
          console.error("Failed to load presentation:", error)
          // Fallback to template loading
          const project = getTemplateById(presentationId)
          if (project) {
            setSlides(project.slides)
            setSelectedSlide(project.slides[0]?.id || "")
            setCurrentSlideIndex(0)
            setProjectName(project.name)
          }
        }
      }

      loadProject()
    } else {
      // New presentation - check if there's an initial message from home page
      setChatMessages([])

      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1]
        if (lastMessage.type === "user") {
          // Process the initial message
          setTimeout(() => {
            handleInitialGeneration(lastMessage.content)
          }, 100)
        }
      }
    }

    setIsInitialized(true)
  }, [authUser, messages, handleInitialGeneration, presentationId, streamingContent])

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
            <Button variant="outline" onClick={() => window.open("/features", "_blank")} className="w-full">
              Learn about our editor
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

          {/* Add Slide Button - Fixed */}
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

          {/* Slide Thumbnails - Scrollable */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {isStreaming
                ? // Skeleton thumbnails while loading
                  Array.from({ length: 7 }, (_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className="relative group rounded-lg border-2 border-gray-200 bg-white"
                    >
                      <div className="absolute -left-2 top-2 z-10">
                        <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse"></div>
                      </div>
                      <div className="p-3 pt-4">
                        <div className="w-full aspect-video rounded border overflow-hidden bg-gray-200 animate-pulse">
                          <div className="p-2 h-full flex flex-col space-y-2">
                            <div className="h-2 bg-gray-300 rounded animate-pulse"></div>
                            <div className="h-1 bg-gray-300 rounded animate-pulse w-3/4"></div>
                            <div className="h-1 bg-gray-300 rounded animate-pulse w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                : slides.map((slide, index) => (
                    <div
                      key={slide.id}
                      className={`relative group cursor-pointer rounded-lg border-2 transition-all ${
                        selectedSlide === slide.id
                          ? "border-[#027659] bg-[#027659]/5"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                      onClick={() => handleSlideSelect(slide.id, index)}
                    >
                      {/* Slide Number */}
                      <div className="absolute -left-2 top-2 z-10">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            selectedSlide === slide.id
                              ? "bg-[#027659] text-white"
                              : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                          }`}
                        >
                          {index + 1}
                        </div>
                      </div>

                      {/* Slide Preview */}
                      <div className="p-3 pt-4">
                        <div
                          className="w-full aspect-video rounded border overflow-hidden text-xs relative"
                          style={{
                            backgroundColor: slide.background,
                            color: slide.textColor,
                          }}
                        >
                          <div className="absolute inset-0 p-1.5 lg:p-2 flex flex-col">
                            <div className="font-bold text-[7px] lg:text-[8px] xl:text-[9px] 2xl:text-[10px] mb-1 truncate leading-tight">
                              {slide.title}
                            </div>
                            <div className="text-[6px] lg:text-[7px] xl:text-[8px] 2xl:text-[9px] opacity-80 line-clamp-3 leading-tight overflow-hidden">
                              {slide.content.substring(0, 50)}...
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex space-x-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6 bg-white/80 hover:bg-white">
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 bg-white/80 hover:bg-white text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Toolbar */}
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              {/* Left Section - Project Title */}
              <div className="flex-1">
                <Input
                  ref={nameInputRef}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onFocus={handleNameInputFocus}
                  onBlur={handleNameInputBlur}
                  onKeyPress={handleNameInputKeyPress}
                  className="w-auto min-w-[200px] max-w-md bg-transparent border-0 text-base font-normal text-gray-900 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none outline-none focus:outline-none px-3 py-2 h-auto hover:bg-gray-50 focus:bg-gray-50 rounded-lg transition-colors"
                  placeholder="Enter presentation title..."
                  style={{ width: `${Math.max(200, projectName.length * 8 + 24)}px` }}
                />
                {isSaving && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
              </div>

              {/* Center Section - Empty for clean look */}
              <div></div>

              {/* Right Section - Play and Share */}
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={handlePresentationMode} className="flex items-center bg-transparent">
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </Button>

                <Button
                  onClick={() => setShowExportDialog(true)}
                  className="bg-[#027659] hover:bg-[#065f46] text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Slide Preview Area */}
          <div className="flex-1 flex items-center justify-center bg-gray-100">
            {isPresentationMode && (
              <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
                {currentSlide && (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      backgroundColor: currentSlide.background,
                      color: currentSlide.textColor,
                    }}
                  >
                    <div className="max-w-6xl mx-auto p-16">
                      {currentSlide.layout === "title" ? (
                        <div className="text-center">
                          <h1 className="text-8xl font-bold mb-12 leading-tight">{currentSlide.title}</h1>
                          <p className="text-4xl opacity-90 leading-relaxed">{currentSlide.content}</p>
                        </div>
                      ) : (
                        <>
                          <h1 className="text-7xl font-bold mb-16 leading-tight">{currentSlide.title}</h1>
                          <div className="text-4xl leading-relaxed opacity-90 space-y-8">
                            {currentSlide.content.split("\n").map((line, index) => (
                              <p key={index}>{line}</p>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Presentation Controls */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
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

                  <span className="text-white font-medium px-4">
                    {currentSlideIndex + 1} / {slides.length}
                  </span>

                  <Button
                    variant="ghost"
                    size="icon"
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

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={exitPresentationMode}
                    className="text-white hover:bg-white/20 ml-4"
                  >
                    <Minimize className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
            {isStreaming ? (
              <div className="relative">
                {/* Design-focused Skeleton Slide */}
                <div className="lg:w-[632px] lg:h-[355px] xl:w-[732px] xl:h-[412px] 2xl:w-[816px] 2xl:h-[459px] 3xl:w-[980px] 3xl:h-[551px] shadow-2xl rounded-lg overflow-hidden border-4 border-white bg-gradient-to-br from-gray-100 to-gray-200 relative">
                  <div className="h-full p-12 flex flex-col justify-center items-center relative overflow-hidden">
                    {/* Animated paint strokes in background */}
                    <div className="absolute inset-0 opacity-20">
                      <div
                        className="absolute top-8 left-8 w-32 h-1 bg-[#027659] rounded-full animate-pulse"
                        style={{ animationDelay: "0s" }}
                      ></div>
                      <div
                        className="absolute top-16 left-12 w-24 h-1 bg-[#10b981] rounded-full animate-pulse"
                        style={{ animationDelay: "0.5s" }}
                      ></div>
                      <div
                        className="absolute top-24 left-16 w-40 h-1 bg-[#027659] rounded-full animate-pulse"
                        style={{ animationDelay: "1s" }}
                      ></div>

                      <div
                        className="absolute bottom-20 right-8 w-28 h-1 bg-[#10b981] rounded-full animate-pulse"
                        style={{ animationDelay: "1.5s" }}
                      ></div>
                      <div
                        className="absolute bottom-12 right-12 w-36 h-1 bg-[#027659] rounded-full animate-pulse"
                        style={{ animationDelay: "2s" }}
                      ></div>

                      <div
                        className="absolute top-1/2 left-1/4 w-20 h-1 bg-[#10b981] rounded-full animate-pulse"
                        style={{ animationDelay: "0.8s" }}
                      ></div>
                      <div
                        className="absolute top-1/2 right-1/4 w-32 h-1 bg-[#027659] rounded-full animate-pulse"
                        style={{ animationDelay: "1.3s" }}
                      ></div>
                    </div>

                    <div className="text-center space-y-6 z-10">
                      <div className="flex items-center justify-center space-x-3">
                        {/* Design brush icon with animation */}
                        <div className="relative">
                          <svg className="w-8 h-8 text-[#027659] animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
                          </svg>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#10b981] rounded-full animate-ping"></div>
                        </div>
                        <h2 className="text-4xl font-bold text-[#027659]">SlydPRO Designing</h2>
                      </div>

                      {/* Animated design elements */}
                      <div className="flex justify-center items-center space-x-4">
                        <div className="flex space-x-2">
                          <div className="w-3 h-3 bg-[#027659] rounded-full animate-bounce"></div>
                          <div
                            className="w-3 h-3 bg-[#10b981] rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-3 h-3 bg-[#027659] rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>

                      {/* Design progress indicators */}
                      <div className="flex justify-center space-x-2 mt-4">
                        <div
                          className="w-2 h-8 bg-[#027659] rounded-full animate-pulse"
                          style={{ animationDelay: "0s" }}
                        ></div>
                        <div
                          className="w-2 h-6 bg-[#10b981] rounded-full animate-pulse"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className="w-2 h-10 bg-[#027659] rounded-full animate-pulse"
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                        <div
                          className="w-2 h-7 bg-[#10b981] rounded-full animate-pulse"
                          style={{ animationDelay: "0.6s" }}
                        ></div>
                        <div
                          className="w-2 h-9 bg-[#027659] rounded-full animate-pulse"
                          style={{ animationDelay: "0.8s" }}
                        ></div>
                      </div>
                    </div>

                    {/* Floating design elements */}
                    <div
                      className="absolute top-4 right-4 w-4 h-4 bg-[#10b981] rounded-full animate-ping"
                      style={{ animationDelay: "1s" }}
                    ></div>
                    <div
                      className="absolute bottom-4 left-4 w-3 h-3 bg-[#027659] rounded-full animate-ping"
                      style={{ animationDelay: "1.5s" }}
                    ></div>
                    <div
                      className="absolute top-1/3 right-8 w-2 h-2 bg-[#10b981] rounded-full animate-ping"
                      style={{ animationDelay: "2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : currentSlide ? (
              <div className="relative">
                {/* Main Slide */}
                <div
                  className="lg:w-[632px] lg:h-[355px] xl:w-[732px] xl:h-[412px] 2xl:w-[816px] 2xl:h-[459px] 3xl:w-[980px] 3xl:h-[551px] shadow-2xl rounded-lg overflow-hidden border-4 border-white"
                  style={{
                    backgroundColor: currentSlide.background,
                    color: currentSlide.textColor,
                  }}
                >
                  <div className="h-full p-12 flex flex-col justify-center relative">
                    {currentSlide.layout === "title" ? (
                      <div className="text-center">
                        <h1 className="text-7xl font-bold mb-8 leading-tight">{currentSlide.title}</h1>
                        <p className="text-3xl opacity-90 leading-relaxed max-w-4xl mx-auto">{currentSlide.content}</p>
                      </div>
                    ) : (
                      <>
                        <h1 className="text-6xl font-bold mb-12 leading-tight">{currentSlide.title}</h1>
                        <div className="text-3xl leading-relaxed opacity-90 space-y-6">
                          {currentSlide.content.split("\n").map((line, index) => (
                            <p key={index}>{line}</p>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Navigation Controls */}
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (currentSlideIndex > 0) {
                        const newIndex = currentSlideIndex - 1
                        setCurrentSlideIndex(newIndex)
                        setSelectedSlide(slides[newIndex].id)
                      }
                    }}
                    disabled={currentSlideIndex === 0}
                    className="bg-white shadow-lg hover:shadow-xl"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center space-x-2 bg-white rounded-full px-6 py-3 shadow-lg border">
                    <span className="text-sm font-medium text-gray-700">
                      {currentSlideIndex + 1} / {slides.length}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (currentSlideIndex < slides.length - 1) {
                        const newIndex = currentSlideIndex + 1
                        setCurrentSlideIndex(newIndex)
                        setSelectedSlide(slides[newIndex].id)
                      }
                    }}
                    disabled={currentSlideIndex === slides.length - 1}
                    className="bg-white shadow-lg hover:shadow-xl"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 max-w-md">
                <div className="mb-6">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Zap className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Design</h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Ask SlydPRO AI to design your presentation slides.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - AI Chat */}
        <div className="lg:w-[220px] xl:w-[260px] 2xl:w-[300px] 3xl:w-[360px] bg-white border-l border-gray-200 flex flex-col shadow-lg">
          {/* Chat Header */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            {/* Edit Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                variant={editMode === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode("all")}
                className="flex-1 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                All Slides
              </Button>
              <Button
                variant={editMode === "selected" ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode("selected")}
                className="flex-1 text-xs"
                disabled={!selectedSlide}
              >
                <Target className="h-3 w-3 mr-1" />
                Selected
              </Button>
            </div>

            {selectedSlide && editMode === "selected" && (
              <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg p-3 mt-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#027659] rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-[#027659]">Editing: Slide {currentSlideIndex + 1}</span>
                </div>
                <p className="text-xs text-[#027659]/80 mt-1 truncate">
                  {slides.find((s) => s.id === selectedSlide)?.title}
                </p>
              </div>
            )}
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id} className="space-y-2">
                  {message.type === "user" ? (
                    // User message - modern design, full width
                    <div className="flex justify-end">
                      <div className="bg-[#027659] text-white rounded-2xl px-4 py-3 max-w-[85%] shadow-sm">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
                          <span className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/20"
                              onClick={() => handleCopyMessage(message.id, message.content)}
                            >
                              {copiedMessageId === message.id ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-red-200/20"
                              onClick={() => {
                                setChatMessages((prev) => prev.filter((m) => m.id !== message.id))
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Assistant message - modern design, full width
                    <div className="flex justify-start">
                      <div className="bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl px-4 py-3 max-w-[85%] shadow-sm">
                        {message.isLoading ? (
                          <div className="space-y-4">
                            {message.generationProgress?.stage === "thinking" && (
                              <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                  <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                    <div
                                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                      style={{ animationDelay: "0.1s" }}
                                    ></div>
                                    <div
                                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                      style={{ animationDelay: "0.2s" }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">Thinking...</span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Analyzing your request ({message.generationProgress.thinkingTime}s)
                                </p>
                              </div>
                            )}

                            {message.generationProgress?.stage === "designing" && (
                              <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-semibold text-blue-900">
                                      Version {message.generationProgress.version}
                                    </span>
                                  </div>
                                  <span className="text-xs text-blue-600 font-medium px-2 py-0.5 bg-blue-100 rounded-md">
                                    Designing
                                  </span>
                                </div>

                                {/* Real-time slide generation progress */}
                                <div className="space-y-1.5">
                                  {Array.from(
                                    { length: Math.max(1, message.generationProgress?.completedSlides || 0) },
                                    (_, i) => {
                                      const isCompleted = i < (message.generationProgress?.completedSlides || 0)
                                      const isCurrent =
                                        i === (message.generationProgress?.completedSlides || 0) && !isCompleted

                                      return (
                                        <div key={i} className="flex items-center space-x-2 py-0.5">
                                          {/* Status indicator */}
                                          <div className="w-3 h-3 flex items-center justify-center">
                                            {isCompleted ? (
                                              <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                                <Check className="w-2 h-2 text-white" />
                                              </div>
                                            ) : (
                                              <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                                <Loader2 className="w-2 h-2 text-white animate-spin" />
                                              </div>
                                            )}
                                          </div>

                                          {/* Slide info */}
                                          <span
                                            className={`text-xs ${
                                              isCompleted ? "text-green-700 font-medium" : "text-blue-700 font-medium"
                                            }`}
                                          >
                                            {isCompleted ? `Designed slide ${i + 1}` : `Designing slide ${i + 1}`}
                                          </span>
                                        </div>
                                      )
                                    },
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>

                            {/* Completed generation progress */}
                            {message.generationProgress?.isComplete && (
                              <div className="border border-green-200 rounded-lg p-3 bg-green-50/30">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                    <span className="text-xs font-semibold text-green-900">
                                      Version {message.generationProgress.version}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-green-600 font-medium px-2 py-0.5 bg-green-100 rounded-md">
                                      Complete
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-5 w-5 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                                      onClick={() => toggleProgressMinimization(message.id)}
                                    >
                                      {message.generationProgress.isMinimized ? (
                                        <Plus className="h-2.5 w-2.5" />
                                      ) : (
                                        <Minimize className="h-2.5 w-2.5" />
                                      )}
                                    </Button>
                                  </div>
                                </div>

                                {!message.generationProgress.isMinimized && (
                                  <div className="mt-2 pt-2 border-t border-green-200 space-y-1">
                                    {Array.from({ length: message.generationProgress.completedSlides || 0 }, (_, i) => (
                                      <div key={i} className="flex items-center space-x-2 py-0.5">
                                        <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                          <Check className="w-2 h-2 text-white" />
                                        </div>
                                        <span className="text-xs text-green-700">Designed slide {i + 1}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message timestamp and actions */}
                        {!message.isLoading && (
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
                            <span className="text-xs text-gray-500">
                              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                onClick={() => handleCopyMessage(message.id, message.content)}
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setChatMessages((prev) => prev.filter((m) => m.id !== message.id))
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    editMode === "selected"
                      ? "How should I modify this slide?"
                      : slides.length > 0
                        ? "Ask me to modify your presentation..."
                        : "Describe the presentation you want to create..."
                  }
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleChatSubmit()}
                  className="w-full bg-transparent border-0 text-gray-900 placeholder:text-gray-500 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[80px] max-h-[120px] shadow-none outline-none focus:outline-none p-4"
                  rows={3}
                  disabled={v0.isLoading}
                />
                <div className="flex items-center justify-between p-3 pt-0">
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".txt,.doc,.docx,.pdf"
                      className="hidden"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-gray-500 hover:text-gray-700 h-8 px-2"
                      disabled={v0.isLoading}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={
                      isStreaming
                        ? () => {
                            setIsStreaming(false)
                            setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))
                          }
                        : handleChatSubmit
                    }
                    size="sm"
                    disabled={!isStreaming && !inputMessage.trim()}
                    className={`${isStreaming ? "bg-red-600 hover:bg-red-700" : "bg-[#027659] hover:bg-[#065f46]"} text-white rounded-lg px-4 py-2`}
                  >
                    {isStreaming ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        projectName={projectName}
        slideCount={slides.length}
      />
    </TooltipProvider>
  )
}

export default EditorContent
