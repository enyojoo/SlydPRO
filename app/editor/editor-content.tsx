"use client"
import { Home } from "lucide-react" // Import Home icon

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Bot,
  User,
  Play,
  Download,
  Minimize,
  Loader2,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
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
}

const colorThemes = [
  { name: "Blue", primary: "#1e40af", secondary: "#3b82f6", text: "#ffffff" },
  { name: "Purple", primary: "#7c3aed", secondary: "#a855f7", text: "#ffffff" },
  { name: "Green", primary: "#059669", secondary: "#10b981", text: "#ffffff" },
  { name: "Red", primary: "#dc2626", secondary: "#ef4444", text: "#ffffff" },
  { name: "Orange", primary: "#ea580c", secondary: "#f97316", text: "#ffffff" },
  { name: "Dark", primary: "#1f2937", secondary: "#374151", text: "#ffffff" },
]

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

  const router = useRouter()
  const searchParams = useSearchParams()
  const v0 = useV0Integration()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const { messages } = useChatContext()
  const { user: authUser, isLoading: authLoading } = useAuth()

  const checkScreenSize = () => {
    setIsSmallScreen(window.innerWidth < 1024)
  }

  // Helper function to estimate slide count from content
  const estimateSlideCount = (content: string): number => {
    // Count slide markers or headers
    const slideMarkers = (content.match(/##\s+/g) || []).length
    return Math.max(5, slideMarkers || Math.ceil(content.length / 500))
  }

  // Function to update slide progress based on content analysis
  const startSlideProgressUpdates = (initialContent: string) => {
    const content = initialContent
    let slideCount = estimateSlideCount(content)
    let completedSlides = 0

    // Extract potential slide titles
    const potentialTitles = content.match(/##\s+([^\n]+)/g)?.map((t) => t.replace(/##\s+/, "")) || [
      "Title Slide",
      "Problem Statement",
      "Solution",
      "Market Analysis",
      "Business Model",
      "Competition",
      "Team",
      "Financials",
      "Call to Action",
    ]

    const slideInterval = setInterval(() => {
      // Analyze content to determine progress
      const newSlideMarkers = (content.match(/##\s+/g) || []).length
      if (newSlideMarkers > slideCount) {
        slideCount = newSlideMarkers
      }

      if (completedSlides < slideCount) {
        const currentTitle = potentialTitles[Math.min(completedSlides, potentialTitles.length - 1)]

        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.isLoading
              ? {
                  ...msg,
                  generationProgress: {
                    ...msg.generationProgress!,
                    currentSlide: currentTitle,
                    completedSlides: completedSlides + 1,
                    totalSlides: slideCount,
                  },
                }
              : msg,
          ),
        )
        completedSlides++
      } else {
        clearInterval(slideInterval)
      }
    }, 800)

    return slideInterval
  }

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

      // Use streaming generation
      await v0.generateSlidesStreaming(
        prompt,
        uploadedFile,
        // onChunk
        (chunk: string) => {
          setStreamingContent((prev) => prev + chunk)

          // After receiving some content, transition to designing stage
          if (chunk.length > 50 && thinkingTime > 2) {
            clearInterval(thinkingInterval)

            // Update to designing stage
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.isLoading
                  ? {
                      ...msg,
                      generationProgress: {
                        ...msg.generationProgress!,
                        stage: "designing",
                        totalSlides: estimateSlideCount(chunk),
                        completedSlides: 0,
                        currentSlide: "Title Slide",
                      },
                    }
                  : msg,
              ),
            )

            // Start slide progress updates based on content analysis
            startSlideProgressUpdates(chunk)
          }
        },
        // onComplete
        async (result) => {
          setIsStreaming(false)
          clearInterval(thinkingInterval)

          // Instead of removing the loading message, convert it to a completed progress message
          const progressMessage = chatMessages.find((msg) => msg.isLoading)

          if (progressMessage) {
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.id === progressMessage.id
                  ? {
                      ...msg,
                      isLoading: false,
                      content: `✅ Generation complete!\n\nI've created ${result.slides.length} slides for your presentation based on your request.`,
                      generationProgress: {
                        ...msg.generationProgress!,
                        stage: "complete",
                        completedSlides: result.slides.length,
                        totalSlides: result.slides.length,
                      },
                    }
                  : msg,
              ),
            )
          }

          if (result) {
            const themedSlides = result.slides.map((slide, index) => ({
              ...slide,
              background: index === 0 ? selectedTheme.primary : selectedTheme.secondary,
              textColor: selectedTheme.text,
            }))

            setSlides(themedSlides)
            setSelectedSlide(themedSlides[0]?.id || "")
            setCurrentSlideIndex(0)

            // Save to database only if user is authenticated
            if (authUser) {
              try {
                const presentation = await presentationsAPI.createPresentation({
                  name: projectName,
                  slides: themedSlides,
                  category: "ai-generated",
                })
                setCurrentPresentationId(presentation.id)
              } catch (error) {
                console.error("Failed to save presentation:", error)
              }
            }

            const assistantMessage: ChatMessage = {
              id: (Date.now() + 2).toString(),
              type: "assistant",
              content: `Your slides are ready! Check the preview.\n\nI've created ${result.slides.length} slides for your presentation:\n\n${result.slides.map((slide, i) => `${i + 1}. ${slide.title}`).join("\n")}\n\nYou can make further improvements - just tell me what to change!`,
              timestamp: new Date(),
            }
            setChatMessages((prev) => [...prev, assistantMessage])
          }
        },
        // onError
        (error) => {
          setIsStreaming(false)
          clearInterval(thinkingInterval)

          // Keep the progress message but mark it as failed
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.isLoading
                ? {
                    ...msg,
                    isLoading: false,
                    content: `❌ Generation failed: ${error.message}`,
                    generationProgress: {
                      ...msg.generationProgress!,
                      stage: "complete",
                    },
                  }
                : msg,
            ),
          )

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
    [v0, uploadedFile, selectedTheme, projectName, authUser],
  )

  const autoSave = useCallback(async () => {
    if (!currentPresentationId || !authUser || slides.length === 0) return

    setIsSaving(true)
    try {
      await presentationsAPI.updatePresentation(currentPresentationId, {
        name: projectName,
        slides,
        thumbnail: slides[0]?.background,
      })
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }, [currentPresentationId, authUser, slides, projectName])

  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (slides.length > 0) {
        autoSave()
      }
    }, 2000) // Auto-save after 2 seconds of inactivity

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
      content: "",
      timestamp: new Date(),
      isLoading: true,
      generationProgress: {
        stage: "thinking",
        thinkingTime: 0,
        version: 1,
      },
    }

    setChatMessages((prev) => [...prev, userMessage, loadingMessage])
    const currentInput = inputMessage
    setInputMessage("")

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

    try {
      if (editMode === "selected" && selectedSlide) {
        // Edit only the selected slide
        const slide = slides.find((s) => s.id === selectedSlide)
        if (slide) {
          // Update to designing stage after brief thinking period
          setTimeout(() => {
            clearInterval(thinkingInterval)
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.isLoading
                  ? {
                      ...msg,
                      generationProgress: {
                        ...msg.generationProgress!,
                        stage: "designing",
                        totalSlides: 1,
                        completedSlides: 0,
                        currentSlide: slide.title,
                      },
                    }
                  : msg,
              ),
            )
          }, 2000)

          const result = await v0.editSlide(selectedSlide, slide.title, currentInput)

          // Update progress message to completed state
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.isLoading
                ? {
                    ...msg,
                    isLoading: false,
                    content: `✅ Updated "${slide.title}" slide successfully!`,
                    generationProgress: {
                      ...msg.generationProgress!,
                      stage: "complete",
                      completedSlides: 1,
                      totalSlides: 1,
                    },
                  }
                : msg,
            ),
          )

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
        // Update to designing stage after brief thinking period
        setTimeout(() => {
          clearInterval(thinkingInterval)
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.isLoading
                ? {
                    ...msg,
                    generationProgress: {
                      ...msg.generationProgress!,
                      stage: "designing",
                      totalSlides: slides.length || 5,
                      completedSlides: 0,
                      currentSlide: "Updating slides...",
                    },
                  }
                : msg,
            ),
          )

          // Start slide progress updates
          const slideInterval = setInterval(() => {
            setChatMessages((prev) => {
              const loadingMsg = prev.find((m) => m.isLoading)
              if (!loadingMsg) return prev

              const progress = loadingMsg.generationProgress!
              const newCompleted = Math.min((progress.completedSlides || 0) + 1, progress.totalSlides || 5)

              return prev.map((msg) =>
                msg.isLoading
                  ? {
                      ...msg,
                      generationProgress: {
                        ...msg.generationProgress!,
                        completedSlides: newCompleted,
                        currentSlide: `Slide ${newCompleted}`,
                      },
                    }
                  : msg,
              )
            })
          }, 800)

          // Clear interval after reasonable time
          setTimeout(() => clearInterval(slideInterval), 5000)
        }, 2000)

        let result
        if (slides.length > 0) {
          result = await v0.regenerateAllSlides(currentInput)
        } else {
          result = await v0.generateSlides(currentInput, uploadedFile)
        }

        // Update progress message to completed state
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.isLoading
              ? {
                  ...msg,
                  isLoading: false,
                  content: `✅ Slides ${slides.length > 0 ? "updated" : "created"} successfully!`,
                  generationProgress: {
                    ...msg.generationProgress!,
                    stage: "complete",
                    completedSlides: result?.slides.length || slides.length,
                    totalSlides: result?.slides.length || slides.length,
                  },
                }
              : msg,
          ),
        )

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
    } catch (error) {
      // Clear intervals
      clearInterval(thinkingInterval)

      // Update progress message to failed state
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.isLoading
            ? {
                ...msg,
                isLoading: false,
                content: `❌ Error: ${error instanceof Error ? error.message : "Failed to process request"}`,
                generationProgress: {
                  ...msg.generationProgress!,
                  stage: "complete",
                },
              }
            : msg,
        ),
      )

      const errorMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        type: "assistant",
        content: `I encountered an error: ${error instanceof Error ? error.message : "Something went wrong"}\n\nPlease try rephrasing your request or try again.`,
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

    const slide = slides.find((s) => s.id === slideId)
    if (slide) {
      const contextMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "assistant",
        content: `Now editing: "${slide.title}" (Slide ${index + 1})\n\nI'm ready to help you modify this specific slide. You can ask me to:\n• Change the content or messaging\n• Adjust the layout or design\n• Add or remove elements\n• Modify the tone or style`,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, contextMessage])
    }
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

    const projectId = searchParams.get("project")

    if (projectId) {
      // Load existing project from database
      const loadProject = async () => {
        try {
          if (authUser) {
            const presentation = await presentationsAPI.getPresentation(projectId)
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
            const project = getTemplateById(projectId)
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
          const project = getTemplateById(projectId)
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
      // New presentation - set welcome message
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "assistant",
        content:
          "Hi! I'm your AI presentation assistant. Describe what kind of presentation you'd like to create, and I'll help you build it slide by slide. \n\nFor example:\n• 'Create a startup pitch deck for a food delivery app'\n• 'Make a quarterly business review presentation'\n• 'Build a product launch presentation'",
        timestamp: new Date(),
      }
      setChatMessages([welcomeMessage])

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
  }, [authUser, messages]) // Add authUser and messages as dependencies

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
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
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
                          className="w-full aspect-video rounded border overflow-hidden text-xs"
                          style={{
                            backgroundColor: slide.background,
                            color: slide.textColor,
                          }}
                        >
                          <div className="p-2 h-full flex flex-col">
                            <div className="font-bold text-[8px] mb-1 truncate">{slide.title}</div>
                            <div className="text-[7px] opacity-80 line-clamp-3">
                              {slide.content.substring(0, 60)}...
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
          <div className="flex-1 flex items-center justify-center bg-gray-100 p-8">
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
                {/* Skeleton Slide */}
                <div className="w-[960px] h-[540px] shadow-2xl rounded-lg overflow-hidden border-4 border-white bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse">
                  <div className="h-full p-12 flex flex-col justify-center items-center">
                    <div className="text-center space-y-6">
                      <div className="w-16 h-16 bg-[#027659]/20 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
                        <Loader2 className="w-8 h-8 text-[#027659] animate-spin" />
                      </div>
                      <h2 className="text-4xl font-bold text-gray-600">SlydPRO Designing</h2>
                      <p className="text-xl text-gray-500">Creating your presentation slides...</p>
                      <div className="flex space-x-2 justify-center">
                        <div className="w-3 h-3 bg-[#027659] rounded-full animate-bounce"></div>
                        <div
                          className="w-3 h-3 bg-[#027659] rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-3 h-3 bg-[#027659] rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentSlide ? (
              <div className="relative">
                {/* Main Slide */}
                <div
                  className="w-[960px] h-[540px] shadow-2xl rounded-lg overflow-hidden border-4 border-white"
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Create</h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Start a conversation with the AI assistant to create your presentation. Describe your topic, audience,
                  or upload a document to get started.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - AI Chat */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-lg">
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
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarFallback className={message.type === "user" ? "bg-[#027659]/10" : "bg-gray-100"}>
                      {message.type === "user" ? (
                        <User className="w-4 h-4 text-[#027659]" />
                      ) : (
                        <Bot className="w-4 h-4 text-gray-600" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-full relative group ${
                        message.type === "user" ? "bg-[#027659] text-white ml-4" : "bg-gray-100 text-gray-900 mr-4"
                      }`}
                    >
                      {message.isLoading ? (
                        <div className="space-y-3">
                          {message.generationProgress?.stage === "thinking" && (
                            <div className="flex items-center space-x-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div
                                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                  style={{ animationDelay: "0.1s" }}
                                ></div>
                                <div
                                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                  style={{ animationDelay: "0.2s" }}
                                ></div>
                              </div>
                              <span className="text-sm">
                                Thinking for {message.generationProgress.thinkingTime} seconds...
                              </span>
                            </div>
                          )}

                          {message.generationProgress?.stage === "designing" && (
                            <div className="border border-gray-200 rounded-lg p-3 bg-white">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Version {message.generationProgress.version}
                                </span>
                                <span className="text-xs text-gray-500">Designing</span>
                              </div>
                              <div className="space-y-2">
                                {Array.from({ length: message.generationProgress.totalSlides || 0 }, (_, i) => (
                                  <div key={i} className="flex items-center space-x-2 text-xs">
                                    <div className="w-4 h-4 flex items-center justify-center">
                                      {i < (message.generationProgress?.completedSlides || 0) ? (
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      ) : i === (message.generationProgress?.completedSlides || 0) ? (
                                        <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                      ) : (
                                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                      )}
                                    </div>
                                    <span
                                      className={`${i < (message.generationProgress?.completedSlides || 0) ? "text-green-600" : i === (message.generationProgress?.completedSlides || 0) ? "text-blue-600" : "text-gray-400"}`}
                                    >
                                      Slide {i + 1}:{" "}
                                      {i === (message.generationProgress?.completedSlides || 0)
                                        ? message.generationProgress?.currentSlide
                                        : `Slide ${i + 1}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                          {/* Show completed progress info for non-loading messages that have progress data */}
                          {!message.isLoading && message.generationProgress?.stage === "complete" && (
                            <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-white/80">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-700">Generation completed</span>
                                <span className="text-xs text-green-600">✓ Done</span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs">
                                <span className="text-gray-600">
                                  {message.generationProgress.completedSlides} slides created
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Message Actions for User Messages */}
                      {message.type === "user" && !message.isLoading && (
                        <div className="absolute -right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex space-x-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 bg-white/90 hover:bg-white shadow-sm"
                              onClick={() => navigator.clipboard.writeText(message.content)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 bg-white/90 hover:bg-white shadow-sm text-red-500 hover:text-red-600"
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
                    <span className="text-xs text-gray-500 mt-1 block">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
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
                    {isStreaming ? (
                      <>
                        <div className="w-3 h-3 bg-white rounded-sm mr-2"></div>
                        Stop
                      </>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
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
