"use client"
import { Home } from "lucide-react" // Import Home icon
import UltimateSlideRenderer from "@/components/UltimateSlideRenderer"
import type { UltimateSlide } from "@/types/ultimate-slide"

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
  Presentation,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useChatContext } from "@/lib/chat-context"
import { ExportDialog } from "@/components/export-dialog"
import { presentationsAPI } from "@/lib/presentations-api"
import { useAuth } from "@/lib/auth-context"
import { useClaudeSlides } from "@/hooks/useClaudeSlides"

interface Slide extends UltimateSlide {}

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

interface EditorContentProps {
  params: {
    id: string
  }
}

function EditorContent({ params }: EditorContentProps) {
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
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const { messages } = useChatContext()
  const { user: authUser, isLoading: authLoading } = useAuth()
  const claude = useClaudeSlides()

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

  // Save chat history to database
  const saveChatHistory = useCallback(
    async (messages: ChatMessage[]) => {
      if (!currentPresentationId || !authUser) return

      try {
        await presentationsAPI.updatePresentation(currentPresentationId, {
          chat_history: messages.map((msg) => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp.toISOString(),
            isLoading: msg.isLoading,
            generationProgress: msg.generationProgress,
          })),
        })
      } catch (error) {
        console.error("Failed to save chat history:", error)
      }
    },
    [currentPresentationId, authUser],
  )

  // FIXED: Enhanced generation that preserves Claude's design
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

      const newMessages = [userMessage, loadingMessage]
      setChatMessages((prev) => [...prev, ...newMessages])
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

      // Enhanced generation with better prompt
      await claude.generateSlidesStreaming(
        prompt,
        uploadedFile,
        // onChunk
        (chunk: string) => {
          setStreamingContent((prev) => {
            const newContent = prev + chunk
            const slideMatches = newContent.match(/(?:##|###)\s*(?:Slide\s*\d+:?\s*)?(.+?)(?=(?:##|###)|$)/gs)
            if (slideMatches) {
              const completedSlides = slideMatches.length
              setChatMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.isLoading
                    ? {
                        ...msg,
                        generationProgress: {
                          ...msg.generationProgress!,
                          stage: "designing",
                          currentSlide: `slide ${completedSlides}`,
                          completedSlides,
                          totalSlides: Math.max(completedSlides, msg.generationProgress?.totalSlides || 0),
                        },
                      }
                    : msg,
                ),
              )
            }
            return newContent
          })

          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.isLoading && msg.generationProgress?.stage === "thinking"
                ? {
                    ...msg,
                    generationProgress: {
                      ...msg.generationProgress,
                      stage: "designing",
                      currentSlide: "generating content",
                    },
                  }
                : msg,
            ),
          )
        },
        // onComplete - PRESERVE Claude's design, don't override themes
        async (result) => {
          setIsStreaming(false)
          clearInterval(thinkingInterval)

          if (result) {
            // *** CRITICAL FIX: Don't override Claude's colors ***
            // Use Claude's generated slides as-is with their designed colors
            const enhancedSlides = result.slides.map((slide) => ({
              ...slide,
              // Only add missing properties, don't override existing design
              titleFont: slide.titleFont || "Inter, system-ui, sans-serif",
              contentFont: slide.contentFont || "Inter, system-ui, sans-serif",
              shadowEffect: slide.shadowEffect || "0 20px 40px rgba(0,0,0,0.15)",
              borderRadius: slide.borderRadius || "20px",
              // Preserve Claude's background and textColor - DON'T OVERRIDE
            }))

            setSlides(enhancedSlides)
            setSelectedSlide(enhancedSlides[0]?.id || "")
            setCurrentSlideIndex(0)

            // Save to database
            if (authUser) {
              try {
                const presentation = await presentationsAPI.createPresentation({
                  name: projectName,
                  slides: enhancedSlides, // Save with Claude's original design
                  category: "ai-generated",
                  chat_history: [],
                })
                setCurrentPresentationId(presentation.id)
                window.history.replaceState(null, "", `/editor/${presentation.id}`)
              } catch (error) {
                console.error("Failed to save presentation:", error)
              }
            }

            const completedMessages = chatMessages.map((msg) =>
              msg.isLoading
                ? {
                    ...msg,
                    isLoading: false,
                    content: `I've created your presentation with ${result.slides.length} beautifully designed slides. Each slide uses professional colors and modern visual design. You can now edit individual slides or ask me to make changes to the entire presentation.`,
                    generationProgress: {
                      ...msg.generationProgress!,
                      stage: "complete" as const,
                      isComplete: true,
                      completedSlides: result.slides.length,
                      totalSlides: result.slides.length,
                      isMinimized: false,
                    },
                  }
                : msg,
            )

            setChatMessages(completedMessages)

            setTimeout(() => {
              saveChatHistory(completedMessages)
            }, 1000)
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
          const errorMessages = [...chatMessages.filter((msg) => !msg.isLoading), errorMessage]
          setChatMessages(errorMessages)
          saveChatHistory(errorMessages)
        },
      )
    },
    [claude, uploadedFile, projectName, authUser, streamingContent, chatMessages, saveChatHistory], // REMOVED selectedTheme dependency
  )

  // Add function to toggle progress minimization
  const toggleProgressMinimization = (messageId: string) => {
    setChatMessages((prev) => {
      const updated = prev.map((msg) =>
        msg.id === messageId && msg.generationProgress
          ? {
              ...msg,
              generationProgress: {
                ...msg.generationProgress,
                isMinimized: !msg.generationProgress.isMinimized,
              },
            }
          : msg,
      )
      saveChatHistory(updated)
      return updated
    })
  }

  const autoSave = useCallback(async () => {
    if (!currentPresentationId || !authUser || slides.length === 0) return

    setIsSaving(true)
    try {
      await presentationsAPI.updatePresentation(currentPresentationId, {
        name: projectName,
        slides,
        thumbnail: slides[0]?.background,
        chat_history: chatMessages.map((msg) => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
          isLoading: msg.isLoading,
          generationProgress: msg.generationProgress,
        })),
      })
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }, [currentPresentationId, authUser, slides, projectName, chatMessages])

  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (slides.length > 0 || chatMessages.length > 0) {
        autoSave()
      }
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(saveTimer)
  }, [slides, projectName, chatMessages, autoSave])

  // FIXED: Chat submit handler that preserves Claude's design
  const handleChatSubmit = async () => {
    if (!inputMessage.trim() || claude.isLoading) return

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

    const newMessages = [...chatMessages, userMessage, loadingMessage]
    setChatMessages(newMessages)
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

    if (editMode === "selected" && selectedSlide) {
      const slide = slides.find((s) => s.id === selectedSlide)
      if (slide) {
        const result = await claude.editSlide(selectedSlide, slide.title, currentInput)

        clearInterval(thinkingInterval)
        setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))

        if (result) {
          // *** PRESERVE Claude's design for edited slides too ***
          const enhancedSlides = result.slides.map((s) => ({
            ...s,
            // Don't override Claude's color choices
          }))

          setSlides(enhancedSlides)
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            type: "assistant",
            content: `Great! I've updated the "${slide.title}" slide with a new professional design. The changes should now be visible in the preview.`,
            timestamp: new Date(),
          }
          const updatedMessages = [...newMessages.filter((msg) => !msg.isLoading), assistantMessage]
          setChatMessages(updatedMessages)
          saveChatHistory(updatedMessages)
        }
      }
    } else {
      // Regenerate all slides
      let result
      if (slides.length > 0) {
        result = await claude.regenerateAllSlides(currentInput)
      } else {
        result = await claude.generateSlides(currentInput, uploadedFile)
      }

      clearInterval(thinkingInterval)
      setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))

      if (result) {
        // *** PRESERVE Claude's design for regenerated slides ***
        const enhancedSlides = result.slides.map((slide) => ({
          ...slide,
          // Don't apply theme override
        }))

        setSlides(enhancedSlides)
        if (enhancedSlides.length > 0 && !selectedSlide) {
          setSelectedSlide(enhancedSlides[0].id)
          setCurrentSlideIndex(0)
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content:
            slides.length > 0
              ? "Perfect! I've updated all slides with fresh professional designs and colors. Take a look at the new visual styling in the preview."
              : `Excellent! I've created ${result.slides.length} slides with modern design and professional color schemes. You can now review them, make edits, or ask for specific changes.`,
          timestamp: new Date(),
        }
        const updatedMessages = [...newMessages.filter((msg) => !msg.isLoading), assistantMessage]
        setChatMessages(updatedMessages)
        saveChatHistory(updatedMessages)
      }
    }

    if (claude.error) {
      clearInterval(thinkingInterval)
      setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))

      const errorMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        type: "assistant",
        content: `I encountered an error: ${claude.error}\n\nPlease try rephrasing your request or try again.`,
        timestamp: new Date(),
      }
      const errorMessages = [...newMessages.filter((msg) => !msg.isLoading), errorMessage]
      setChatMessages(errorMessages)
      saveChatHistory(errorMessages)
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

      const newMessages = [...chatMessages, userMessage, loadingMessage]
      setChatMessages(newMessages)

      const result = await claude.generateSlides("Create a presentation from this document", file)

      // Remove loading message
      setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))

      if (result) {
        // Preserve Claude's original design
        const enhancedSlides = result.slides.map((slide) => ({
          ...slide,
          // Don't override colors
        }))
        setSlides(enhancedSlides)
        setSelectedSlide(enhancedSlides[0]?.id || "")
        setCurrentSlideIndex(0)

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content: `Great! I've analyzed your document and created ${result.slides.length} slides. The presentation covers the key points from your file. Feel free to ask me to adjust any content or styling.`,
          timestamp: new Date(),
        }
        const updatedMessages = [...newMessages.filter((msg) => !msg.isLoading), assistantMessage]
        setChatMessages(updatedMessages)
        saveChatHistory(updatedMessages)
      }
    }
  }

  const handleSlideSelect = (slideId: string, index: number) => {
    setSelectedSlide(slideId)
    setCurrentSlideIndex(index)
    setEditMode("selected")

    // Remove the automatic chat message - only update the UI indicator
  }

  // FIXED: Make theme application optional with user confirmation
  const handleThemeChange = (themeName: string) => {
    const theme = colorThemes.find((t) => t.name === themeName) || colorThemes[0]
    setSelectedTheme(theme)

    // Make theme application OPTIONAL - only apply if user explicitly requests it
    const confirmation = window.confirm(
      `Would you like to apply the ${theme.name} theme to all slides? This will override the current AI-generated colors.`,
    )

    if (confirmation) {
      const themedSlides = slides.map((slide, index) => ({
        ...slide,
        background: index === 0 ? theme.primary : theme.secondary,
        textColor: theme.text,
        accentColor: theme.primary,
      }))
      setSlides(themedSlides)

      const themeMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "assistant",
        content: `Perfect! I've applied the ${theme.name} theme to all your slides. The new color scheme gives your presentation a cohesive look.`,
        timestamp: new Date(),
      }
      const updatedMessages = [...chatMessages, themeMessage]
      setChatMessages(updatedMessages)
      saveChatHistory(updatedMessages)
    }
  }

  const handleNameSave = () => {
    setIsEditingName(false)
    // Auto-save logic can be added here
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

    const presentationId = params.id

    if (presentationId && presentationId !== "new") {
      // Load existing presentation from database
      const loadPresentation = async () => {
        try {
          if (authUser) {
            const presentation = await presentationsAPI.getPresentation(presentationId)

            // Enhanced slides data loading with validation
            if (presentation.slides && Array.isArray(presentation.slides)) {
              const enhancedSlides = presentation.slides.map((slide: any, index: number) => {
                // Ensure all required properties exist with fallbacks
                const enhancedSlide = {
                  // Core properties
                  id: slide.id || `slide-${Date.now()}-${index}`,
                  title: slide.title || `Slide ${index + 1}`,
                  content: slide.content || "",
                  background: slide.background || "linear-gradient(135deg, #027659 0%, #065f46 100%)",
                  textColor: slide.textColor || "#ffffff",
                  layout: slide.layout || (index === 0 ? "title" : "content"),

                  // Enhanced design properties with defaults
                  titleFont: slide.titleFont || "Inter, system-ui, sans-serif",
                  contentFont: slide.contentFont || "Inter, system-ui, sans-serif",
                  titleSize: slide.titleSize || (index === 0 ? "3.5rem" : "2.5rem"),
                  contentSize: slide.contentSize || "1.125rem",
                  spacing: slide.spacing || "comfortable",
                  alignment: slide.alignment || (index === 0 ? "center" : "left"),
                  titleColor: slide.titleColor || "#ffffff",
                  accentColor: slide.accentColor || "#10b981",
                  shadowEffect: slide.shadowEffect || "0 20px 40px rgba(0,0,0,0.15)",
                  borderRadius: slide.borderRadius || "20px",
                  glassmorphism: slide.glassmorphism || false,

                  // Visual content - ensure proper structure
                  chartData: slide.chartData
                    ? {
                        type: slide.chartData.type || "bar",
                        data: Array.isArray(slide.chartData.data) ? slide.chartData.data : [],
                        config: slide.chartData.config || { showGrid: true },
                        style: slide.chartData.style || "modern",
                      }
                    : null,

                  tableData: slide.tableData
                    ? {
                        headers: Array.isArray(slide.tableData.headers) ? slide.tableData.headers : [],
                        rows: Array.isArray(slide.tableData.rows) ? slide.tableData.rows : [],
                        style: slide.tableData.style || "modern",
                        interactive: slide.tableData.interactive || false,
                      }
                    : null,

                  icons: Array.isArray(slide.icons) ? slide.icons : [],

                  // Animation and effects
                  animations: slide.animations || {
                    entrance: "fadeIn",
                    emphasis: [],
                  },
                  customCSS: slide.customCSS || "",
                }

                // Auto-enhance old slides that might not have visual content
                if (!enhancedSlide.chartData && !enhancedSlide.tableData) {
                  const content = (enhancedSlide.title + " " + enhancedSlide.content).toLowerCase()

                  // Add chart data if content suggests it
                  if (
                    content.includes("revenue") ||
                    content.includes("growth") ||
                    content.includes("metric") ||
                    content.includes("performance") ||
                    content.includes("quarter") ||
                    content.includes("sales")
                  ) {
                    enhancedSlide.layout = "chart"
                    enhancedSlide.chartData = {
                      type: content.includes("market") ? "pie" : "bar",
                      data: [
                        { name: "Q1", value: 125000 },
                        { name: "Q2", value: 180000 },
                        { name: "Q3", value: 245000 },
                        { name: "Q4", value: 320000 },
                      ],
                      config: { showGrid: true },
                      style: "modern",
                    }
                  }

                  // Add icons if missing
                  if (enhancedSlide.icons.length === 0) {
                    if (content.includes("revenue") || content.includes("financial")) {
                      enhancedSlide.icons.push({
                        icon: "💰",
                        position: "top-right",
                        color: enhancedSlide.accentColor,
                        size: "24",
                      })
                    } else if (content.includes("growth") || content.includes("trend")) {
                      enhancedSlide.icons.push({
                        icon: "📈",
                        position: "top-right",
                        color: enhancedSlide.accentColor,
                        size: "24",
                      })
                    } else if (index === 0) {
                      enhancedSlide.icons.push({
                        icon: "🚀",
                        position: "top-right",
                        color: enhancedSlide.accentColor,
                        size: "24",
                      })
                    }
                  }
                }

                return enhancedSlide
              })

              setSlides(enhancedSlides)
              setSelectedSlide(enhancedSlides[0]?.id || "")
              setCurrentSlideIndex(0)
            }

            setProjectName(presentation.name)
            setCurrentPresentationId(presentation.id)

            // Load chat history if it exists
            if (presentation.chat_history && Array.isArray(presentation.chat_history)) {
              const restoredMessages = presentation.chat_history.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
                isLoading: false, // Ensure no loading states on restore
              }))
              setChatMessages(restoredMessages)
            } else {
              // Default welcome message if no chat history
              const welcomeMessage: ChatMessage = {
                id: Date.now().toString(),
                type: "assistant",
                content: `Welcome back to "${presentation.name}"! This presentation has ${presentation.slides?.length || 0} slides with enhanced visual design.\n\n✨ **Enhanced Features Available:**\n• Modern gradient backgrounds\n• Interactive charts and tables\n• Professional typography\n• Glassmorphism effects\n• Business icons\n\nYou can now:\n• Edit individual slides by selecting them\n• Regenerate content with new ideas\n• Add charts and tables automatically\n• Apply premium visual effects\n• Ask me to modify specific aspects\n\nWhat would you like to work on?`,
                timestamp: new Date(),
              }
              setChatMessages([welcomeMessage])
            }
          }
        } catch (error) {
          console.error("Failed to load presentation:", error)
          // Redirect to home if presentation not found
          router.push("/")
        }
      }

      if (!authLoading) {
        loadPresentation()
      }
    } else {
      // New presentation - no initial welcome message, start clean
      setChatMessages([])

      // Check if there's an initial message from home page
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
  }, [params.id, authUser, authLoading, messages, handleInitialGeneration, router, isInitialized, searchParams])

  // Handle initial prompt from URL
  useEffect(() => {
    const prompt = searchParams.get("prompt")
    if (prompt && !isInitialized && slides.length === 0 && chatMessages.length === 0) {
      handleInitialGeneration(prompt)
    }
  }, [searchParams, isInitialized, slides.length, chatMessages.length, handleInitialGeneration])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!authUser) {
    router.push("/")
    return null
  }

  if (isPresentationMode) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="w-full h-full flex items-center justify-center">
          {currentSlide && (
            <UltimateSlideRenderer
              slide={currentSlide}
              isPresentationMode={true}
              className="w-full h-full max-w-none max-h-none"
            />
          )}
        </div>

        {/* Presentation Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 backdrop-blur-md rounded-full px-6 py-3">
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
            <SkipBack className="h-4 w-4" />
          </Button>

          <span className="text-white text-sm">
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
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={exitPresentationMode} className="text-white hover:bg-white/20">
            Exit
          </Button>
        </div>
      </div>
    )
  }

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
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Left Sidebar - Slide Thumbnails */}
        <div className="w-80 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="text-gray-600 hover:text-gray-900"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              <div className="flex items-center space-x-2">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                <Button variant="ghost" size="sm" onClick={() => setShowExportDialog(true)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Project Name */}
            <div className="mb-4">
              {isEditingName ? (
                <Input
                  ref={nameInputRef}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={handleNameInputBlur}
                  onKeyPress={handleNameInputKeyPress}
                  className="text-lg font-semibold"
                />
              ) : (
                <h1
                  className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-[#027659] transition-colors"
                  onClick={handleNameInputFocus}
                >
                  {projectName}
                </h1>
              )}
              <p className="text-sm text-gray-500">{slides.length} slides</p>
            </div>

            {/* Edit Mode Toggle */}
            <div className="flex items-center space-x-2 mb-4">
              <Button
                variant={editMode === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode("all")}
                className={editMode === "all" ? "bg-[#027659] hover:bg-[#065f46]" : ""}
              >
                All Slides
              </Button>
              <Button
                variant={editMode === "selected" ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode("selected")}
                className={editMode === "selected" ? "bg-[#027659] hover:bg-[#065f46]" : ""}
              >
                Selected
              </Button>
            </div>
          </div>

          {/* Slide Thumbnails */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`relative group cursor-pointer transition-all duration-200 ${
                    selectedSlide === slide.id
                      ? "ring-2 ring-[#027659] ring-opacity-50 scale-105"
                      : "hover:scale-102 hover:shadow-lg"
                  }`}
                  onClick={() => handleSlideSelect(slide.id, index)}
                >
                  <div className="aspect-video rounded-lg overflow-hidden bg-white shadow-sm">
                    <UltimateSlideRenderer slide={slide} className="w-full h-full text-xs" />
                  </div>
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        const newSlides = slides.filter((s) => s.id !== slide.id)
                        setSlides(newSlides)
                        if (selectedSlide === slide.id && newSlides.length > 0) {
                          setSelectedSlide(newSlides[0].id)
                          setCurrentSlideIndex(0)
                        }
                      }}
                      className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Add New Slide Button */}
              <Button
                variant="outline"
                className="w-full aspect-video border-2 border-dashed border-gray-300 hover:border-[#027659] hover:bg-[#027659]/5 transition-colors bg-transparent"
                onClick={() => {
                  const newSlide: Slide = {
                    id: `slide-${Date.now()}`,
                    title: `Slide ${slides.length + 1}`,
                    content: "Click to edit this slide content...",
                    background: "linear-gradient(135deg, #027659 0%, #065f46 100%)",
                    textColor: "#ffffff",
                    layout: "content",
                    titleFont: "Inter, system-ui, sans-serif",
                    contentFont: "Inter, system-ui, sans-serif",
                    titleSize: "2.5rem",
                    contentSize: "1.125rem",
                    accentColor: "#10b981",
                    shadowEffect: "0 20px 40px rgba(0,0,0,0.15)",
                    borderRadius: "20px",
                  }
                  setSlides([...slides, newSlide])
                  setSelectedSlide(newSlide.id)
                  setCurrentSlideIndex(slides.length)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Slide
              </Button>
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Slide Preview */}
          <div className="flex-1 flex flex-col">
            {/* Top Toolbar */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentSlideIndex > 0) {
                          const newIndex = currentSlideIndex - 1
                          setCurrentSlideIndex(newIndex)
                          setSelectedSlide(slides[newIndex].id)
                        }
                      }}
                      disabled={currentSlideIndex === 0}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      {currentSlideIndex + 1} / {slides.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentSlideIndex < slides.length - 1) {
                          const newIndex = currentSlideIndex + 1
                          setCurrentSlideIndex(newIndex)
                          setSelectedSlide(slides[newIndex].id)
                        }
                      }}
                      disabled={currentSlideIndex === slides.length - 1}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Theme Selector */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Theme:</span>
                    <select
                      value={selectedTheme.name}
                      onChange={(e) => handleThemeChange(e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      {colorThemes.map((theme) => (
                        <option key={theme.name} value={theme.name}>
                          {theme.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handlePresentationMode}>
                    <Play className="h-4 w-4 mr-2" />
                    Present
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </div>

            {/* Slide Preview Area */}
            <div className="flex-1 p-8 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              {currentSlide ? (
                <div className="w-full max-w-4xl aspect-video shadow-2xl rounded-2xl overflow-hidden">
                  <UltimateSlideRenderer slide={currentSlide} className="w-full h-full" />
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <div className="w-24 h-24 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Presentation className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No slides yet</h3>
                  <p className="text-gray-400 mb-6">Start by describing your presentation idea</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Chat */}
          <div className="w-96 bg-white/80 backdrop-blur-xl border-l border-gray-200/50 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-[#027659] to-[#10b981] rounded-lg flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI Assistant</h3>
                  <p className="text-xs text-gray-500">
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
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.type === "user"
                          ? "bg-[#027659] text-white"
                          : "bg-gray-100 text-gray-900 border border-gray-200"
                      }`}
                    >
                      {message.isLoading ? (
                        <div className="space-y-3">
                          {message.generationProgress && (
                            <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                  <span className="text-sm font-medium">
                                    {message.generationProgress.stage === "thinking" && "Analyzing your request..."}
                                    {message.generationProgress.stage === "designing" && "Creating slides..."}
                                    {message.generationProgress.stage === "complete" && "Finalizing..."}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleProgressMinimization(message.id)}
                                  className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                                >
                                  {message.generationProgress.isMinimized ? (
                                    <Square className="h-3 w-3" />
                                  ) : (
                                    <Minimize className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>

                              {!message.generationProgress.isMinimized && (
                                <div className="space-y-2">
                                  {message.generationProgress.stage === "thinking" && (
                                    <div className="text-xs text-white/80">
                                      Thinking time: {message.generationProgress.thinkingTime}s
                                    </div>
                                  )}

                                  {message.generationProgress.stage === "designing" && (
                                    <div className="space-y-1">
                                      <div className="text-xs text-white/80">
                                        {message.generationProgress.currentSlide && (
                                          <span>Working on: {message.generationProgress.currentSlide}</span>
                                        )}
                                      </div>
                                      {message.generationProgress.totalSlides &&
                                        message.generationProgress.completedSlides && (
                                          <div className="text-xs text-white/80">
                                            Progress: {message.generationProgress.completedSlides} /{" "}
                                            {message.generationProgress.totalSlides} slides
                                          </div>
                                        )}
                                    </div>
                                  )}

                                  <div className="text-xs text-white/60">
                                    Version {message.generationProgress.version || 1}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Generating...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                          {message.type === "assistant" && (
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                              <div className="text-xs text-gray-500">
                                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyMessage(message.id, message.content)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="h-3 w-3 text-green-500" />
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
            <div className="p-4 border-t border-gray-200/50">
              <div className="space-y-3">
                {/* File Upload */}
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {uploadedFile && (
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <span>📎 {uploadedFile.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => setUploadedFile(null)} className="h-4 w-4 p-0">
                        ×
                      </Button>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="flex items-end space-x-2">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={
                      slides.length === 0
                        ? "Describe your presentation idea..."
                        : editMode === "selected"
                          ? "How should I modify this slide?"
                          : "How can I improve your presentation?"
                    }
                    className="flex-1 min-h-[80px] resize-none"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleChatSubmit()
                      }
                    }}
                  />
                  <Button
                    onClick={handleChatSubmit}
                    disabled={!inputMessage.trim() || claude.isLoading}
                    className="bg-[#027659] hover:bg-[#065f46] text-white"
                  >
                    {claude.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputMessage("Make the slides more professional")}
                    className="text-xs"
                  >
                    <Target className="h-3 w-3 mr-1" />
                    More Professional
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputMessage("Add charts and data visualization")}
                    className="text-xs"
                  >
                    📊 Add Charts
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputMessage("Regenerate with fresh content")}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Dialog */}
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          projectName={projectName}
          slideCount={slides.length}
          slides={slides}
        />
      </div>
    </TooltipProvider>
  )
}

export default EditorContent
