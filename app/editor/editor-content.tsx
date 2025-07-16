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

interface EditorContentProps {
  presentationId?: string
  slideSlug?: string
}

function EditorContent({ presentationId, slideSlug }: EditorContentProps) {
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
  const { messages, clearMessages } = useChatContext()
  const { user: authUser, isLoading: authLoading } = useAuth()

  const checkScreenSize = () => {
    setIsSmallScreen(window.innerWidth < 1024)
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

      // Start real-time thinking timer
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
        // Use real streaming generation
        await v0.generateSlidesStreaming(
          prompt,
          uploadedFile,
          // onChunk - real-time streaming
          (chunk: string) => {
            // Switch to designing phase on first chunk
            clearInterval(thinkingInterval)
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.isLoading
                  ? {
                      ...msg,
                      generationProgress: {
                        ...msg.generationProgress!,
                        stage: "designing",
                        totalSlides: 7,
                        completedSlides: 0,
                        currentSlide: "Analyzing content...",
                      },
                    }
                  : msg,
              ),
            )
            setStreamingContent((prev) => prev + chunk)
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

              // Create presentation and update URL if we don't have one yet
              if (authUser && !currentPresentationId) {
                try {
                  const presentation = await presentationsAPI.createPresentation({
                    name: projectName,
                    slides: themedSlides,
                    thumbnail: themedSlides[0]?.background,
                    category: "ai-generated",
                  })
                  setCurrentPresentationId(presentation.id)

                  // Update URL with presentation ID and first slide title
                  const firstSlideTitle = themedSlides[0]?.title || "untitled-slide"
                  const slugTitle = firstSlideTitle
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")
                  router.replace(`/editor/${presentation.id}/${slugTitle}`)
                } catch (error) {
                  console.error("Failed to save presentation:", error)
                }
              }

              // Update loading message to show completion with progress intact
              setChatMessages((prev) => {
                return prev.map((msg) =>
                  msg.isLoading
                    ? {
                        ...msg,
                        isLoading: false,
                        content: `✅ **Presentation Complete!**

I've successfully created ${result.slides.length} slides for your presentation:

${result.slides.map((slide, i) => `${i + 1}. ${slide.title}`).join("\n")}

**What you can do next:**
• Edit individual slides by selecting them
• Change the overall theme or colors  
• Ask me to modify specific content
• Add or remove slides
• Export your presentation

What would you like to improve?`,
                        generationProgress: {
                          stage: "complete",
                          version: 1,
                          totalSlides: result.slides.length,
                          completedSlides: result.slides.length,
                        },
                      }
                    : msg,
                )
              })
            }
          },
          // onError
          (error) => {
            setIsStreaming(false)
            clearInterval(thinkingInterval)
            setChatMessages((prev) => {
              const filtered = prev.filter((msg) => !msg.isLoading)
              const errorMessage: ChatMessage = {
                id: (Date.now() + 3).toString(),
                type: "assistant",
                content: `❌ **Generation Failed**

I encountered an error: ${error.message}

Please try again or describe your presentation differently. I'm here to help!`,
                timestamp: new Date(),
              }
              return [...filtered, errorMessage]
            })
          },
        )
      } catch (error) {
        setIsStreaming(false)
        clearInterval(thinkingInterval)
        console.error("Generation error:", error)
      }
    },
    [v0, uploadedFile, selectedTheme, projectName, authUser, router, currentPresentationId],
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

      // Update URL if current slide title changed
      const currentSlide = slides.find((s) => s.id === selectedSlide)
      if (currentSlide) {
        const slugTitle = currentSlide.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
        const currentPath = window.location.pathname
        const expectedPath = `/editor/${currentPresentationId}/${slugTitle}`

        if (currentPath !== expectedPath) {
          router.replace(expectedPath)
        }
      }
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }, [currentPresentationId, authUser, slides, projectName, selectedSlide, router])

  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (slides.length > 0) {
        autoSave()
      }
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(saveTimer)
  }, [slides, projectName, autoSave])

  const handleChatSubmit = async () => {
    if (!inputMessage.trim() || v0.isLoading || isStreaming) return

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
        version: chatMessages.filter((m) => m.generationProgress?.stage === "complete").length + 1,
      },
    }

    setChatMessages((prev) => [...prev, userMessage, loadingMessage])
    const currentInput = inputMessage
    setInputMessage("")
    setIsStreaming(true)

    // Start real-time thinking timer
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
          // Switch to designing phase
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

          setIsStreaming(false)
          clearInterval(thinkingInterval)

          if (result) {
            const themedSlides = result.slides.map((s, index) => ({
              ...s,
              background: index === 0 ? selectedTheme.primary : selectedTheme.secondary,
              textColor: selectedTheme.text,
            }))

            setSlides(themedSlides)

            // Update URL if slide title changed
            const updatedSlide = themedSlides.find((s) => s.id === selectedSlide)
            if (updatedSlide && currentPresentationId) {
              const slugTitle = updatedSlide.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")
              router.replace(`/editor/${currentPresentationId}/${slugTitle}`)
            }

            setChatMessages((prev) => {
              return prev.map((msg) =>
                msg.isLoading
                  ? {
                      ...msg,
                      isLoading: false,
                      content: `✅ **Slide Updated!**

I've successfully updated "${slide.title}" based on your request.

**What's next?**
• Continue editing this slide
• Select another slide to modify
• Switch to "All Slides" mode for broader changes
• Ask me to adjust colors or themes

What else would you like to improve?`,
                      generationProgress: {
                        stage: "complete",
                        version: loadingMessage.generationProgress!.version,
                        totalSlides: 1,
                        completedSlides: 1,
                      },
                    }
                  : msg,
              )
            })
          }
        }
      } else {
        // Regenerate all slides or create new ones
        let result

        // Switch to designing phase
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
                      totalSlides: slides.length || 7,
                      completedSlides: 0,
                      currentSlide: "Analyzing changes...",
                    },
                  }
                : msg,
            ),
          )
        }, 2000)

        if (slides.length > 0 && v0.currentChatId) {
          result = await v0.regenerateAllSlides(v0.currentChatId, currentInput)
        } else {
          result = await v0.generateSlides(currentInput, uploadedFile)
        }

        setIsStreaming(false)
        clearInterval(thinkingInterval)

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

          // Create or update presentation and URL
          if (authUser) {
            try {
              if (!currentPresentationId) {
                // Create new presentation
                const presentation = await presentationsAPI.createPresentation({
                  name: projectName,
                  slides: themedSlides,
                  thumbnail: themedSlides[0]?.background,
                  category: "ai-generated",
                })
                setCurrentPresentationId(presentation.id)

                const firstSlideTitle = themedSlides[0]?.title || "untitled-slide"
                const slugTitle = firstSlideTitle
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "")
                router.replace(`/editor/${presentation.id}/${slugTitle}`)
              } else {
                // Update existing presentation
                await presentationsAPI.updatePresentation(currentPresentationId, {
                  name: projectName,
                  slides: themedSlides,
                  thumbnail: themedSlides[0]?.background,
                })

                const firstSlideTitle = themedSlides[0]?.title || "untitled-slide"
                const slugTitle = firstSlideTitle
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "")
                router.replace(`/editor/${currentPresentationId}/${slugTitle}`)
              }
            } catch (error) {
              console.error("Failed to save presentation:", error)
            }
          }

          setChatMessages((prev) => {
            return prev.map((msg) =>
              msg.isLoading
                ? {
                    ...msg,
                    isLoading: false,
                    content:
                      slides.length > 0
                        ? `✅ **Presentation Updated!**

I've successfully updated all ${result.slides.length} slides based on your feedback:

${result.slides.map((slide, i) => `${i + 1}. ${slide.title}`).join("\n")}

**Continue improving:**
• Select specific slides to edit
• Ask for theme or color changes
• Request content modifications
• Add or remove slides

What would you like to adjust next?`
                        : `✅ **New Presentation Created!**

I've created ${result.slides.length} slides for you:

${result.slides.map((slide, i) => `${i + 1}. ${slide.title}`).join("\n")}

**Ready for customization:**
• Edit individual slides
• Change themes and colors
• Modify content and structure
• Export when ready

How can I help you improve it?`,
                    generationProgress: {
                      stage: "complete",
                      version: loadingMessage.generationProgress!.version,
                      totalSlides: result.slides.length,
                      completedSlides: result.slides.length,
                    },
                  }
                : msg,
            )
          })
        }
      }
    } catch (error) {
      setIsStreaming(false)
      clearInterval(thinkingInterval)

      setChatMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isLoading)
        const errorMessage: ChatMessage = {
          id: (Date.now() + 3).toString(),
          type: "assistant",
          content: `❌ **Update Failed**

I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}

Please try rephrasing your request or try again. I'm here to help!`,
          timestamp: new Date(),
        }
        return [...filtered, errorMessage]
      })
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
    if (slide && currentPresentationId) {
      // Update URL with selected slide
      const slugTitle = slide.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      router.replace(`/editor/${currentPresentationId}/${slugTitle}`)

      const contextMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "assistant",
        content: `🎯 **Now Editing: "${slide.title}"** (Slide ${index + 1})

I'm ready to help you modify this specific slide. You can ask me to:

• **Content**: Change messaging, add/remove points, adjust tone
• **Layout**: Modify structure, bullet points, or formatting  
• **Design**: Adjust colors, fonts, or visual elements
• **Focus**: Emphasize different aspects or angles

What would you like to change about this slide?`,
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
  }, [handleScreenResize])

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

    // Handle URL-based loading first
    if (presentationId) {
      const loadProject = async () => {
        try {
          if (authUser) {
            const presentation = await presentationsAPI.getPresentation(presentationId)
            setSlides(presentation.slides)
            setCurrentPresentationId(presentation.id)
            setProjectName(presentation.name)

            // Find slide by slug or default to first
            let slideIndex = 0
            if (slideSlug && presentation.slides.length > 0) {
              const foundIndex = presentation.slides.findIndex((slide) => {
                const slugTitle = slide.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "")
                return slugTitle === slideSlug
              })
              if (foundIndex !== -1) {
                slideIndex = foundIndex
              }
            }

            setSelectedSlide(presentation.slides[slideIndex]?.id || "")
            setCurrentSlideIndex(slideIndex)

            const welcomeMessage: ChatMessage = {
              id: Date.now().toString(),
              type: "assistant",
              content: `👋 **Welcome back to "${presentation.name}"!**

This presentation has ${presentation.slides.length} slides and was last updated ${new Date(presentation.updated_at).toLocaleDateString()}.

**You can now:**
• Edit individual slides by selecting them
• Regenerate content with new ideas  
• Change colors and themes
• Ask me to modify specific aspects
• Export your presentation

Currently viewing: **${presentation.slides[slideIndex]?.title || "Slide 1"}**

What would you like to work on?`,
              timestamp: new Date(),
            }
            setChatMessages([welcomeMessage])
          }
        } catch (error) {
          console.error("Failed to load presentation:", error)
          router.push("/editor")
        }
      }

      loadProject()
    } else {
      // Handle legacy URL parameters or new presentation
      const searchProjectId = searchParams.get("project")

      if (searchProjectId) {
        const loadProject = async () => {
          try {
            if (authUser) {
              const presentation = await presentationsAPI.getPresentation(searchProjectId)
              setSlides(presentation.slides)
              setSelectedSlide(presentation.slides[0]?.id || "")
              setCurrentSlideIndex(0)
              setProjectName(presentation.name)
              setCurrentPresentationId(presentation.id)

              // Redirect to new URL format
              const firstSlideTitle = presentation.slides[0]?.title || "untitled-slide"
              const slugTitle = firstSlideTitle
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")
              router.replace(`/editor/${presentation.id}/${slugTitle}`)
            } else {
              // Fallback to template loading
              const project = getTemplateById(searchProjectId)
              if (project) {
                setSlides(project.slides)
                setSelectedSlide(project.slides[0]?.id || "")
                setCurrentSlideIndex(0)
                setProjectName(project.name)
              }
            }
          } catch (error) {
            console.error("Failed to load presentation:", error)
          }
        }

        loadProject()
      } else {
        // New presentation - set welcome message
        const welcomeMessage: ChatMessage = {
          id: Date.now().toString(),
          type: "assistant",
          content: `🚀 **Ready to Create Something Amazing!**

I'm your AI presentation assistant. Describe what kind of presentation you'd like to create, and I'll help you build it slide by slide.

**Popular requests:**
• "Create a startup pitch deck for a food delivery app"
• "Make a quarterly business review presentation"  
• "Build a product launch presentation"
• "Design a sales proposal for enterprise clients"

**Or upload a document** and I'll create slides from your content.

What presentation would you like to create today?`,
          timestamp: new Date(),
        }
        setChatMessages([welcomeMessage])

        // Check if there's an initial message from home page
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1]
          if (lastMessage.type === "user") {
            // Clear the messages from context since we're handling it here
            clearMessages()
            setTimeout(() => {
              handleInitialGeneration(lastMessage.content)
            }, 100)
          }
        }
      }
    }

    setIsInitialized(true)
  }, [authUser, messages, presentationId, slideSlug, router, searchParams, clearMessages])

  // Rest of the component remains the same...
  // [Previous implementation continues here with all the UI components]

  // Presentation Mode View
  if (isPresentationMode) {
    return (
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
                      {message.isLoading || message.generationProgress ? (
                        <div className="space-y-3">
                          {message.isLoading && message.generationProgress?.stage === "thinking" && (
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

                          {message.generationProgress?.stage === "designing" ||
                          message.generationProgress?.stage === "complete" ? (
                            <div className="border border-gray-200 rounded-lg p-3 bg-white mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Version {message.generationProgress.version}
                                </span>
                                <span
                                  className={`text-xs ${message.generationProgress.stage === "complete" ? "text-green-600" : "text-gray-500"}`}
                                >
                                  {message.generationProgress.stage === "complete" ? "Complete" : "Designing"}
                                </span>
                              </div>
                              <div className="space-y-2">
                                {Array.from({ length: message.generationProgress.totalSlides || 0 }, (_, i) => (
                                  <div key={i} className="flex items-center space-x-2 text-xs">
                                    <div className="w-4 h-4 flex items-center justify-center">
                                      {i < (message.generationProgress?.completedSlides || 0) ? (
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      ) : i === (message.generationProgress?.completedSlides || 0) &&
                                        message.isLoading ? (
                                        <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                      ) : (
                                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                      )}
                                    </div>
                                    <span
                                      className={`${i < (message.generationProgress?.completedSlides || 0) ? "text-green-600" : i === (message.generationProgress?.completedSlides || 0) && message.isLoading ? "text-blue-600" : "text-gray-400"}`}
                                    >
                                      Slide {i + 1}:{" "}
                                      {i === (message.generationProgress?.completedSlides || 0) && message.isLoading
                                        ? message.generationProgress?.currentSlide
                                        : `Slide ${i + 1}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {!message.isLoading && message.content && (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
