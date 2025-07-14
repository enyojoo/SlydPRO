"use client"
import { Home } from "lucide-react" // Import Home icon

import type React from "react"

import { useState, useRef, useEffect, useCallback, Suspense } from "react"
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
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useV0Integration } from "@/hooks/useV0Integration"
import { useChatContext } from "@/lib/chat-context"
import { ExportDialog } from "@/components/export-dialog"
import { getTemplateById } from "@/lib/slide-templates"

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

  const router = useRouter()
  const searchParams = useSearchParams()
  const v0 = useV0Integration()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const { messages } = useChatContext()

  const checkScreenSize = () => {
    setIsSmallScreen(window.innerWidth < 1024)
  }

  useEffect(() => {
    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)

    return () => window.removeEventListener("resize", checkScreenSize)
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
      // Load existing project
      const project = getTemplateById(projectId)
      if (project) {
        setSlides(project.slides)
        setSelectedSlide(project.slides[0]?.id || "")
        setCurrentSlideIndex(0)
        setProjectName(project.name)

        const welcomeMessage: ChatMessage = {
          id: Date.now().toString(),
          type: "assistant",
          content: `Welcome back to "${project.name}"! This presentation has ${project.slides.length} slides and was last updated ${project.updatedAt.toLocaleDateString()}.\n\nYou can now:\n• Edit individual slides by selecting them\n• Regenerate content with new ideas\n• Change colors and themes\n• Ask me to modify specific aspects\n\nWhat would you like to work on?`,
          timestamp: new Date(),
        }
        setChatMessages([welcomeMessage])
      }
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
  }, []) // Empty dependency array - only run once

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
        content: "Creating your presentation...",
        timestamp: new Date(),
        isLoading: true,
      }

      setChatMessages((prev) => [...prev, userMessage, loadingMessage])

      const result = await v0.generateSlides(prompt, uploadedFile)

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
          content: `Perfect! I've created ${result.slides.length} slides for your presentation. Here's what I included:\n\n${result.slides.map((slide, i) => `${i + 1}. ${slide.title}`).join("\n")}\n\nYou can now:\n• Select any slide to edit it specifically\n• Ask me to modify the content or design\n• Change the color theme\n• Add or remove slides`,
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, assistantMessage])
      }

      if (v0.error) {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 3).toString(),
          type: "assistant",
          content: `I encountered an error: ${v0.error}\n\nPlease try again or describe your presentation differently.`,
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, errorMessage])
      }
    },
    [v0, uploadedFile, selectedTheme],
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
    }

    setChatMessages((prev) => [...prev, userMessage, loadingMessage])
    const currentInput = inputMessage
    setInputMessage("")

    if (editMode === "selected" && selectedSlide) {
      // Edit only the selected slide
      const slide = slides.find((s) => s.id === selectedSlide)
      if (slide) {
        const result = await v0.editSlide(selectedSlide, slide.title, currentInput)

        // Remove loading message
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

      // Remove loading message
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
      // Remove loading message
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
              {slides.map((slide, index) => (
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
                        <div className="text-[7px] opacity-80 line-clamp-3">{slide.content.substring(0, 60)}...</div>
                      </div>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6 bg-white/80 hover:bg-white">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 bg-white/80 hover:bg-white">
                        <Trash2 className="h-3 w-3 text-red-500" />
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
                  onFocus={() => setIsEditingName(true)}
                  onBlur={handleNameSave}
                  onKeyPress={(e) => e.key === "Enter" && handleNameSave()}
                  className="w-auto min-w-[200px] max-w-md bg-transparent border-0 text-base font-normal text-gray-900 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none outline-none focus:outline-none px-3 py-2 h-auto hover:bg-gray-50 focus:bg-gray-50 rounded-lg transition-colors"
                  placeholder="Enter presentation title..."
                  style={{ width: `${Math.max(200, projectName.length * 8 + 24)}px` }}
                />
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
            {currentSlide ? (
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
                      className={`rounded-2xl px-4 py-3 max-w-full ${
                        message.type === "user" ? "bg-[#027659] text-white ml-4" : "bg-gray-100 text-gray-900 mr-4"
                      }`}
                    >
                      {message.isLoading ? (
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
                          <span className="text-sm">Thinking...</span>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
                    onClick={handleChatSubmit}
                    size="sm"
                    disabled={!inputMessage.trim() || v0.isLoading}
                    className="bg-[#027659] hover:bg-[#065f46] text-white rounded-lg px-4 py-2"
                  >
                    <Send className="h-4 w-4" />
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

export default function EditorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditorContent />
    </Suspense>
  )
}
