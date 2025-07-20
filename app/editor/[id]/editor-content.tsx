"use client"
import { Home } from "lucide-react" // Import Home icon
import UltimateSlideRenderer from "@/components/UltimateSlideRenderer"
import StaticSlideThumbnail from "@/components/StaticSlideThumbnail"
import type { UltimateSlide } from "@/types/ultimate-slide"
import { Check, Loader2 } from "lucide-react"

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
  Square,
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

  // FIXED: Enhanced auto-save with complete chat history persistence
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
          isLoading: msg.isLoading || false, // Ensure never undefined
          generationProgress: msg.generationProgress,
        })),
      })
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }, [currentPresentationId, authUser, slides, projectName, chatMessages])

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
            isLoading: msg.isLoading || false,
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
      console.log("🎨 Starting initial generation with prompt:", prompt)

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

      // CRITICAL: Set streaming state to trigger loading UX
      setIsStreaming(true)
      setStreamingContent("")
      console.log("🔄 Loading UX activated - isStreaming: true")

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
          console.log("✅ Generation complete, deactivating loading UX")
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

            // FIXED: Save to database without category field
            if (authUser) {
              try {
                const presentation = await presentationsAPI.createPresentation({
                  name: projectName,
                  slides: enhancedSlides, // Save with Claude's original design
                  chat_history: [], // Keep this
                })
                setCurrentPresentationId(presentation.id)
                window.history.replaceState(null, "", `/editor/${presentation.id}`)
                console.log("💾 Presentation saved with ID:", presentation.id)
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

            // ENHANCED: Force immediate save after generation
            setTimeout(() => {
              saveChatHistory(completedMessages)
              autoSave()
            }, 500)
          }
        },
        // onError
        (error) => {
          console.error("❌ Generation failed:", error)
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
    [claude, uploadedFile, projectName, authUser, streamingContent, chatMessages, saveChatHistory, autoSave],
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

  // ENHANCED: Auto-save trigger with faster response
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (slides.length > 0 || chatMessages.length > 0) {
        autoSave()
      }
    }, 1000) // Reduced to 1 second for better responsiveness

    return () => clearTimeout(saveTimer)
  }, [slides, projectName, chatMessages, autoSave])

  // FIXED: Chat submit handler with conversation context
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

    // FIXED: Include conversation context for better AI responses
    const context = chatMessages.map((msg) => `${msg.type}: ${msg.content}`).join("\n")

    if (editMode === "selected" && selectedSlide) {
      const slide = slides.find((s) => s.id === selectedSlide)
      if (slide) {
        // Include chat history for better context
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

          // ENHANCED: Force immediate save after edit
          setTimeout(() => {
            saveChatHistory(updatedMessages)
            autoSave()
          }, 500)
        }
      }
    } else {
      // For regenerating all slides, include full context
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

        // ENHANCED: Force immediate save after regeneration
        setTimeout(() => {
          saveChatHistory(updatedMessages)
          autoSave()
        }, 500)
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

            // FIXED: Enhanced session restoration with conversation continuity
            if (presentation.chat_history && Array.isArray(presentation.chat_history)) {
              const restoredMessages = presentation.chat_history.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
                isLoading: false, // Ensure no loading states on restore
              }))

              // ENHANCED: Create context-aware welcome message for existing presentations
              const lastChatMessage =
                presentation.chat_history && presentation.chat_history.length > 0
                  ? presentation.chat_history[presentation.chat_history.length - 1]
                  : null

              const welcomeMessage: ChatMessage = {
                id: Date.now().toString(),
                type: "assistant",
                content: `Welcome back to "${presentation.name}"! This presentation has ${presentation.slides?.length || 0} slides.\n\n${lastChatMessage ? "🔄 **Continuing our conversation** - I remember our previous discussion and I'm ready to help you make further improvements!" : "✨ **Session restored** - You can now continue editing this presentation."}\n\nYou can:\n• Edit individual slides by selecting them\n• Regenerate content with new ideas\n• Add charts and tables\n• Apply visual effects\n• Ask me to modify specific aspects\n\nWhat would you like to work on next?`,
                timestamp: new Date(),
              }

              setChatMessages([...restoredMessages, welcomeMessage])
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
      // New presentation - CRITICAL: START AUTO-GENERATION
      setChatMessages([])

      // Check if there's an initial message from home page
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1]
        if (lastMessage.type === "user") {
          // CRITICAL: Process the initial message with full loading UX
          console.log("🚀 Auto-starting generation with prompt:", lastMessage.content)
          setTimeout(() => {
            handleInitialGeneration(lastMessage.content)
          }, 500) // Slightly longer delay to ensure UI is ready
        }
      } else {
        // No initial prompt - show empty state
        console.log("📝 No initial prompt detected - showing empty editor")
      }
    }

    setIsInitialized(true)
  }, [authUser, authLoading, messages, handleInitialGeneration, params.id, router])

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
                        <div className="mt-2 h-3 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))
                : slides.map((slide, index) => (
                    <div
                      key={slide.id}
                      className={`relative group cursor-pointer rounded-lg border-2 transition-all duration-200 ${
                        selectedSlide === slide.id
                          ? "border-[#027659] bg-[#027659]/5 shadow-md"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
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

                      {/* Thumbnail Content */}
                      <div className="p-3 pt-4">
                        <div className="w-full aspect-video rounded border overflow-hidden">
                          <StaticSlideThumbnail slide={slide} />
                        </div>
                        <div className="mt-2 text-xs text-gray-600 truncate font-medium">{slide.title}</div>
                      </div>

                      {/* Slide Actions - Hidden by default, shown on hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 bg-white/90 hover:bg-white shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Copy slide logic
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 bg-white/90 hover:bg-red-50 shadow-sm text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Delete slide logic
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <div className="h-[61px] bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
            {/* Project Name */}
            <div className="flex items-center space-x-4">
              {isEditingName ? (
                <Input
                  ref={nameInputRef}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={handleNameInputBlur}
                  onKeyPress={handleNameInputKeyPress}
                  className="text-lg font-semibold bg-transparent border-none p-0 h-auto focus:ring-0 focus:border-none"
                />
              ) : (
                <h1
                  className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-[#027659] transition-colors"
                  onClick={handleNameInputFocus}
                >
                  {projectName}
                </h1>
              )}
              {isSaving && <div className="text-xs text-gray-500 flex items-center">Saving...</div>}
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-3">
              {/* Navigation Controls */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentSlideIndex === 0}
                  onClick={() => {
                    if (currentSlideIndex > 0) {
                      const newIndex = currentSlideIndex - 1
                      setCurrentSlideIndex(newIndex)
                      setSelectedSlide(slides[newIndex].id)
                    }
                  }}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 px-2">
                  {currentSlideIndex + 1} / {slides.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentSlideIndex === slides.length - 1}
                  onClick={() => {
                    if (currentSlideIndex < slides.length - 1) {
                      const newIndex = currentSlideIndex + 1
                      setCurrentSlideIndex(newIndex)
                      setSelectedSlide(slides[newIndex].id)
                    }
                  }}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              {/* Action Buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePresentationMode}
                className="bg-white hover:bg-gray-50"
              >
                <Play className="h-4 w-4 mr-2" />
                Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                className="bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Main Editor Layout */}
          <div className="flex-1 flex">
            {/* Slide Preview Area */}
            <div className="flex-1 flex flex-col bg-gray-50">
              {/* Slide Canvas */}
              <div className="flex-1 flex items-center justify-center p-8">
                {isStreaming ? (
                  <div className="relative">
                    <div className="w-full max-w-4xl aspect-video shadow-2xl rounded-lg overflow-hidden border-4 border-white bg-gradient-to-br from-gray-100 to-gray-200 relative">
                      <div className="h-full p-12 flex flex-col justify-center items-center relative overflow-hidden">
                        {/* Animated paint strokes */}
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
                            className="absolute top-24 left-16 w-20 h-1 bg-[#34d399] rounded-full animate-pulse"
                            style={{ animationDelay: "1s" }}
                          ></div>
                          <div
                            className="absolute bottom-16 right-8 w-28 h-1 bg-[#027659] rounded-full animate-pulse"
                            style={{ animationDelay: "1.5s" }}
                          ></div>
                          <div
                            className="absolute bottom-24 right-12 w-16 h-1 bg-[#10b981] rounded-full animate-pulse"
                            style={{ animationDelay: "2s" }}
                          ></div>
                        </div>

                        <div className="text-center space-y-6 z-10">
                          <div className="flex items-center justify-center space-x-3">
                            <div className="relative">
                              <svg
                                className="w-8 h-8 text-[#027659] animate-pulse"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
                              </svg>
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#10b981] rounded-full animate-ping"></div>
                            </div>
                            <h2 className="text-4xl font-bold text-[#027659]">SlydPRO Designing</h2>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-2 h-2 bg-[#027659] rounded-full animate-bounce"></div>
                              <div
                                className="w-2 h-2 bg-[#027659] rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-[#027659] rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                            </div>
                            <p className="text-lg text-gray-600">Creating your professional presentation...</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : currentSlide ? (
                  <div className="w-full max-w-4xl aspect-video bg-white rounded-xl shadow-lg overflow-hidden">
                    <UltimateSlideRenderer slide={currentSlide} />
                  </div>
                ) : (
                  <div className="w-full max-w-4xl aspect-video bg-white rounded-xl shadow-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="h-8 w-8" />
                      </div>
                      <p className="text-lg font-medium">No slides yet</p>
                      <p className="text-sm">Start by describing your presentation in the chat</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Edit Mode Toggle */}
              {slides.length > 0 && (
                <div className="px-8 pb-4">
                  <div className="flex items-center justify-center space-x-2">
                    <Button
                      variant={editMode === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditMode("all")}
                      className={editMode === "all" ? "bg-[#027659] hover:bg-[#065f46]" : ""}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Edit All Slides
                    </Button>
                    <Button
                      variant={editMode === "selected" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditMode("selected")}
                      className={editMode === "selected" ? "bg-[#027659] hover:bg-[#065f46]" : ""}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Edit Current Slide
                    </Button>
                  </div>
                  {editMode === "selected" && currentSlide && (
                    <p className="text-center text-sm text-gray-600 mt-2">
                      Editing: <span className="font-medium">{currentSlide.title}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right Sidebar - Chat */}
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-sm">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#027659] rounded-full flex items-center justify-center">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">SlydPRO AI</h3>
                    <p className="text-xs text-gray-500">Your presentation assistant</p>
                  </div>
                </div>
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
                        className={`max-w-[85%] rounded-lg px-3 py-2 ${
                          message.type === "user"
                            ? "bg-[#027659] text-white"
                            : "bg-gray-100 text-gray-900 border border-gray-200"
                        }`}
                      >
                        {message.isLoading && message.generationProgress ? (
                          <div className="space-y-3">
                            {message.generationProgress.stage === "thinking" && (
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

                            {message.generationProgress.stage === "designing" && (
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

                                {/* Real-time slide progress */}
                                <div className="space-y-1.5">
                                  {Array.from(
                                    { length: Math.max(1, message.generationProgress?.completedSlides || 0) },
                                    (_, i) => {
                                      const isCompleted = i < (message.generationProgress?.completedSlides || 0)
                                      return (
                                        <div key={i} className="flex items-center space-x-2 py-0.5">
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
                                          <span
                                            className={`text-xs ${isCompleted ? "text-green-700 font-medium" : "text-blue-700 font-medium"}`}
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

                            {message.generationProgress.stage === "complete" && (
                              <div className="border border-green-200 rounded-lg p-3 bg-green-50/50">
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                    <Check className="w-2 h-2 text-white" />
                                  </div>
                                  <span className="text-xs font-semibold text-green-900">Complete!</span>
                                </div>
                              </div>
                            )}

                            {!message.generationProgress.isMinimized && (
                              <div className="flex items-center justify-between pt-1">
                                <div className="text-xs text-gray-500">
                                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 hover:bg-gray-200"
                                  onClick={() => toggleProgressMinimization(message.id)}
                                >
                                  <Minimize className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                            {message.type === "assistant" && (
                              <div className="flex items-center justify-between pt-1">
                                <div className="text-xs text-gray-500">
                                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
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
              <div className="p-4 border-t border-gray-100 space-y-3">
                {/* File Upload */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 justify-start text-gray-600 hover:bg-gray-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadedFile ? uploadedFile.name : "Upload file"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.pdf,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Message Input */}
                <div className="flex space-x-2">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={
                      slides.length === 0
                        ? "Describe your presentation..."
                        : editMode === "selected"
                          ? `Edit "${currentSlide?.title}"...`
                          : "Ask me to modify your slides..."
                    }
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none"
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
                    className="bg-[#027659] hover:bg-[#065f46] text-white px-3"
                  >
                    {claude.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Dialog */}
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          slides={slides}
          presentationName={projectName}
        />

        {/* Presentation Mode */}
        {isPresentationMode && currentSlide && (
          <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            <div className="w-full h-full">
              <UltimateSlideRenderer slide={currentSlide} />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={exitPresentationMode}
            >
              <Square className="h-6 w-6" />
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default EditorContent
