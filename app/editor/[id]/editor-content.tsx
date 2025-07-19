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
  RefreshCw,
  Play,
  Download,
  Minimize,
  Loader2,
  Check,
  Square,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useChatContext } from "@/lib/chat-context"
import { ExportDialog } from "@/components/export-dialog"
import { presentationsAPI } from "@/lib/presentations-api"
import { useAuth } from "@/lib/auth-context"
import { useClaudeSlides } from "@/hooks/useClaudeSlides"
import UltimateSlideRenderer from "@/components/UltimateSlideRenderer"
import type { UltimateSlide } from "@/lib/types"

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
  const [slides, setSlides] = useState<UltimateSlide[]>([])
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

  // Update the handleInitialGeneration function to provide real-time streaming:
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

      // Use streaming generation with real-time updates
      await claude.generateSlidesStreaming(
        prompt,
        uploadedFile,
        // onChunk - real-time content streaming
        (chunk: string) => {
          setStreamingContent((prev) => {
            const newContent = prev + chunk

            // Parse slides from streaming content to update progress in real-time
            const slideMatches = newContent.match(/(?:##|###)\s*(?:Slide\s*\d+:?\s*)?(.+?)(?=(?:##|###)|$)/gs)

            if (slideMatches) {
              const completedSlides = slideMatches.length

              // Update progress immediately with real-time feedback
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

          // Transition to designing stage when we start getting content
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

            // Save to database and redirect to new URL
            if (authUser) {
              try {
                const presentation = await presentationsAPI.createPresentation({
                  name: projectName,
                  slides: themedSlides,
                  category: "ai-generated",
                  chat_history: [],
                })
                setCurrentPresentationId(presentation.id)

                // Generate slug from project name
                const slug = projectName
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "")

                // Update URL without page reload
                window.history.replaceState(null, "", `/editor/${presentation.id}`)
              } catch (error) {
                console.error("Failed to save presentation:", error)
              }
            }

            // Update to completion state
            const completedMessages = chatMessages.map((msg) =>
              msg.isLoading
                ? {
                    ...msg,
                    isLoading: false,
                    content: `I've successfully created your presentation with ${result.slides.length} slides. Each slide is designed to tell your story effectively. You can now edit individual slides or ask me to make changes to the entire presentation.`,
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

            // Save chat history after completion
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
    [claude, uploadedFile, selectedTheme, projectName, authUser, streamingContent, chatMessages, saveChatHistory],
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
        const result = await claude.editSlide(selectedSlide, slide.title, currentInput)

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
          const updatedMessages = [...newMessages.filter((msg) => !msg.isLoading), assistantMessage]
          setChatMessages(updatedMessages)
          saveChatHistory(updatedMessages)
        }
      }
    } else {
      // Regenerate all slides or create new ones
      let result
      if (slides.length > 0) {
        result = await claude.regenerateAllSlides(currentInput)
      } else {
        result = await claude.generateSlides(currentInput, uploadedFile)
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
    const updatedMessages = [...chatMessages, themeMessage]
    setChatMessages(updatedMessages)
    saveChatHistory(updatedMessages)
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

            // Ensure slides data is properly loaded
            if (presentation.slides && Array.isArray(presentation.slides)) {
              setSlides(presentation.slides)
              setSelectedSlide(presentation.slides[0]?.id || "")
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
                content: `Welcome back to "${presentation.name}"! This presentation has ${presentation.slides?.length || 0} slides and was last updated ${new Date(presentation.updated_at).toLocaleDateString()}.\n\nYou can now:\n• Edit individual slides by selecting them\n• Regenerate content with new ideas\n• Change colors and themes\n• Ask me to modify specific aspects\n\nWhat would you like to work on?`,
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
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Desktop Required</h1>
            <p className="text-muted-foreground">
              SlydPRO's editor is optimized for desktop screens. Please use a device with a larger screen for the best
              experience.
            </p>
          </div>
          <Button onClick={() => router.push("/")} className="bg-[#027659] hover:bg-[#025a47] text-white">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="text-muted-foreground">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <div className="h-6 w-px bg-border" />
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
                  className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
                  onClick={handleNameInputFocus}
                >
                  {projectName}
                </h1>
              )}
              {isSaving && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Saving...
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handlePresentationMode} disabled={slides.length === 0}>
                <Play className="w-4 h-4 mr-2" />
                Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                disabled={slides.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-73px)]">
          {/* Left Sidebar - Chat */}
          <div className="w-80 border-r bg-muted/30 flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">AI Assistant</h2>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        message.type === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border shadow-sm"
                      }`}
                    >
                      {message.isLoading && message.generationProgress ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              <span className="font-medium text-sm">
                                {message.generationProgress.stage === "thinking" && "Thinking..."}
                                {message.generationProgress.stage === "designing" && "Designing slides..."}
                                {message.generationProgress.stage === "complete" && "Complete!"}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleProgressMinimization(message.id)}
                              className="h-6 w-6 p-0"
                            >
                              {message.generationProgress.isMinimized ? (
                                <Square className="w-3 h-3" />
                              ) : (
                                <Minimize className="w-3 h-3" />
                              )}
                            </Button>
                          </div>

                          {!message.generationProgress.isMinimized && (
                            <div className="space-y-2 text-xs text-muted-foreground">
                              {message.generationProgress.stage === "thinking" && (
                                <div>Analyzing your request... ({message.generationProgress.thinkingTime}s)</div>
                              )}

                              {message.generationProgress.stage === "designing" && (
                                <div className="space-y-1">
                                  <div>
                                    Creating slide {message.generationProgress.completedSlides || 0} of{" "}
                                    {message.generationProgress.totalSlides || "?"}
                                  </div>
                                  {message.generationProgress.currentSlide && (
                                    <div className="text-primary">
                                      Working on: {message.generationProgress.currentSlide}
                                    </div>
                                  )}
                                </div>
                              )}

                              {message.generationProgress.version && (
                                <div className="text-xs opacity-60">Version {message.generationProgress.version}</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          {message.type === "assistant" && (
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyMessage(message.id, message.content)}
                                className="h-6 px-2 text-xs opacity-60 hover:opacity-100"
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
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
            <div className="p-4 border-t space-y-3">
              {/* Edit Mode Toggle */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-muted-foreground">Edit:</span>
                <Button
                  variant={editMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditMode("all")}
                  className="h-6 px-2 text-xs"
                >
                  All Slides
                </Button>
                <Button
                  variant={editMode === "selected" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditMode("selected")}
                  className="h-6 px-2 text-xs"
                  disabled={!selectedSlide}
                >
                  Selected
                </Button>
              </div>

              <div className="flex space-x-2">
                <div className="flex-1">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={
                      editMode === "selected" && selectedSlide
                        ? "Edit the selected slide..."
                        : slides.length > 0
                          ? "Modify the presentation..."
                          : "Describe your presentation..."
                    }
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleChatSubmit()
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <Button
                    onClick={handleChatSubmit}
                    disabled={!inputMessage.trim() || claude.isLoading}
                    size="sm"
                    className="h-[30px]"
                  >
                    {claude.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-[30px]"
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {uploadedFile && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">📎 {uploadedFile.name}</div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".txt,.md,.pdf"
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Slide Preview */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-muted/20 to-muted/40">
              {currentSlide ? (
                <div className="relative">
                  <div className="lg:w-[632px] lg:h-[355px] xl:w-[732px] xl:h-[412px] 2xl:w-[816px] 2xl:h-[459px] 3xl:w-[980px] 3xl:h-[551px] shadow-2xl rounded-lg overflow-hidden border-4 border-white">
                    <UltimateSlideRenderer slide={currentSlide} isSelected={true} isPresentationMode={false} />
                  </div>

                  {/* Navigation Controls */}
                  <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newIndex = Math.max(0, currentSlideIndex - 1)
                        setCurrentSlideIndex(newIndex)
                        setSelectedSlide(slides[newIndex].id)
                      }}
                      disabled={currentSlideIndex === 0}
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentSlideIndex + 1} of {slides.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newIndex = Math.min(slides.length - 1, currentSlideIndex + 1)
                        setCurrentSlideIndex(newIndex)
                        setSelectedSlide(slides[newIndex].id)
                      }}
                      disabled={currentSlideIndex === slides.length - 1}
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                    <Zap className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Ready to Create</h3>
                    <p className="text-muted-foreground">
                      Describe your presentation idea or upload a document to get started with AI-powered slide
                      generation.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Theme:</span>
                    <div className="flex space-x-1">
                      {colorThemes.map((theme) => (
                        <Button
                          key={theme.name}
                          variant={selectedTheme.name === theme.name ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleThemeChange(theme.name)}
                          className="h-8 px-3 text-xs"
                        >
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: theme.primary }} />
                          {theme.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {slides.length > 0 && (
                    <>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Slide
                      </Button>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Slide Thumbnails */}
          <div className="w-64 border-l bg-muted/30 flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Slides ({slides.length})
              </h2>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`relative group cursor-pointer rounded-lg border-2 transition-all ${
                      selectedSlide === slide.id
                        ? "border-primary shadow-md"
                        : "border-transparent hover:border-muted-foreground/20"
                    }`}
                    onClick={() => handleSlideSelect(slide.id, index)}
                  >
                    <div className="w-full aspect-video rounded border overflow-hidden">
                      <UltimateSlideRenderer
                        slide={slide}
                        isSelected={selectedSlide === slide.id}
                        onClick={() => handleSlideSelect(slide.id, index)}
                        className="scale-75 origin-top-left"
                      />
                    </div>
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {index + 1}
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="destructive" size="sm" className="h-6 w-6 p-0">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{slide.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Presentation Mode */}
        {isPresentationMode && currentSlide && (
          <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            <div className="w-full h-full">
              <UltimateSlideRenderer
                slide={currentSlide}
                isSelected={false}
                isPresentationMode={true}
                className="w-full h-full"
              />
            </div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 rounded-lg px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newIndex = Math.max(0, currentSlideIndex - 1)
                  setCurrentSlideIndex(newIndex)
                  setSelectedSlide(slides[newIndex].id)
                }}
                disabled={currentSlideIndex === 0}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <span className="text-white text-sm">
                {currentSlideIndex + 1} / {slides.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newIndex = Math.min(slides.length - 1, currentSlideIndex + 1)
                  setCurrentSlideIndex(newIndex)
                  setSelectedSlide(slides[newIndex].id)
                }}
                disabled={currentSlideIndex === slides.length - 1}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={exitPresentationMode} className="text-white hover:bg-white/20">
                Exit
              </Button>
            </div>
          </div>
        )}

        {/* Export Dialog */}
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          slides={slides}
          presentationName={projectName}
        />
      </div>
    </TooltipProvider>
  )
}

export default EditorContent
