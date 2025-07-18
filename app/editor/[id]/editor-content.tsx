"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Send,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  MessageSquare,
  X,
  Loader2,
  StopCircle,
  User,
  Bot,
  Sparkles,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useChatContext } from "@/lib/chat-context"
import { useAuth } from "@/lib/auth-context"
import { ModernHeader } from "@/components/modern-header"
import { ExportDialog } from "@/components/export-dialog"
import { SettingsModal } from "@/components/settings-modal"
import { presentationsAPI } from "@/lib/presentations-api"
import type { Presentation } from "@/lib/supabase"

interface EditorContentProps {
  presentationId: string
}

interface Slide {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  layout: string
  notes?: string
}

interface ChatMessage {
  id: string
  type: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export function EditorContent({ presentationId }: EditorContentProps) {
  const router = useRouter()
  const { user, session } = useAuth()
  const { messages, addMessage, clearMessages } = useChatContext()

  // Presentation state
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // UI state
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(true)

  // Chat state
  const [chatInput, setChatInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  // Auto-save
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()

  // Load presentation data
  useEffect(() => {
    if (presentationId && session) {
      loadPresentation()
    }
  }, [presentationId, session])

  const loadPresentation = async () => {
    try {
      setIsLoading(true)
      const data = await presentationsAPI.getPresentation(presentationId)
      setPresentation(data)
      setSlides(data.slides || [])

      // Load chat history if it exists
      if (data.chat_history && data.chat_history.length > 0) {
        clearMessages()
        data.chat_history.forEach((msg: any) => {
          addMessage({
            id: msg.id || Date.now().toString(),
            type: msg.type,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
          })
        })
      }
    } catch (error) {
      console.error("Failed to load presentation:", error)
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-save functionality
  const savePresentation = useCallback(async () => {
    if (!presentation || !session) return

    try {
      const updatedData = {
        ...presentation,
        slides,
        chat_history: messages,
        updated_at: new Date().toISOString(),
      }

      await presentationsAPI.updatePresentation(presentationId, updatedData)
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
    } catch (error) {
      console.error("Failed to save presentation:", error)
    }
  }, [presentation, slides, messages, presentationId, session])

  // Trigger auto-save when slides or messages change
  useEffect(() => {
    if (slides.length > 0 || messages.length > 0) {
      setHasUnsavedChanges(true)

      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        savePresentation()
      }, 2000) // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [slides, messages, savePresentation])

  // Chat functionality
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isGenerating) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: chatInput.trim(),
      timestamp: new Date(),
    }

    addMessage(userMessage)
    setChatInput("")
    setIsGenerating(true)

    // Create streaming message
    const streamingId = `streaming-${Date.now()}`
    setStreamingMessageId(streamingId)

    const streamingMessage: ChatMessage = {
      id: streamingId,
      type: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    }

    addMessage(streamingMessage)

    try {
      const response = await fetch("/api/v0/chats/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            presentationId,
            currentSlides: slides,
            chatHistory: messages.slice(-10), // Last 10 messages for context
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get AI response")
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      let accumulatedContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                accumulatedContent += data.content
                // Update the streaming message
                addMessage({
                  ...streamingMessage,
                  content: accumulatedContent,
                })
              }
              if (data.slides) {
                setSlides(data.slides)
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }

      // Finalize the message
      addMessage({
        ...streamingMessage,
        content: accumulatedContent,
        isStreaming: false,
      })
    } catch (error) {
      console.error("Error in chat:", error)
      addMessage({
        id: Date.now().toString(),
        type: "system",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      })
    } finally {
      setIsGenerating(false)
      setStreamingMessageId(null)
    }
  }

  const stopGeneration = () => {
    setIsGenerating(false)
    setStreamingMessageId(null)
  }

  // Slide navigation
  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1)
    }
  }

  const currentSlide = slides[currentSlideIndex]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#027659]" />
          <p className="text-muted-foreground">Loading presentation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <ModernHeader
        showBackButton
        onBackClick={() => router.push("/")}
        title={presentation?.name || "Untitled Presentation"}
        subtitle={
          hasUnsavedChanges
            ? "Unsaved changes"
            : lastSaved
              ? `Saved ${lastSaved.toLocaleTimeString()}`
              : "All changes saved"
        }
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettingsModal(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Slide Editor */}
        <div className={`flex-1 flex flex-col ${isChatOpen ? "mr-80" : ""} transition-all duration-300`}>
          {/* Slide Preview */}
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              {slides.length > 0 ? (
                <Card className="aspect-video shadow-lg">
                  <CardContent
                    className="h-full p-8 flex flex-col justify-center"
                    style={{
                      backgroundColor: currentSlide?.background || "#027659",
                      color: currentSlide?.textColor || "#ffffff",
                    }}
                  >
                    <h1 className="text-4xl font-bold mb-6 leading-tight">{currentSlide?.title || "Slide Title"}</h1>
                    <div className="text-lg leading-relaxed whitespace-pre-wrap">
                      {currentSlide?.content || "Slide content will appear here..."}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="aspect-video shadow-lg">
                  <CardContent className="h-full p-8 flex flex-col items-center justify-center bg-gradient-to-br from-[#027659] to-[#10b981] text-white">
                    <Sparkles className="h-16 w-16 mb-4 opacity-50" />
                    <h2 className="text-2xl font-bold mb-2">Start Creating</h2>
                    <p className="text-lg opacity-80 text-center">
                      Use the chat to describe your presentation and I'll help you create it
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Slide Navigation */}
          {slides.length > 0 && (
            <div className="border-t bg-card p-4">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button variant="outline" size="sm" onClick={prevSlide} disabled={currentSlideIndex === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentSlideIndex + 1} of {slides.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextSlide}
                    disabled={currentSlideIndex === slides.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        <div
          className={`fixed right-0 top-16 bottom-0 w-80 bg-card border-l border-border transform transition-transform duration-300 ${
            isChatOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-full flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-[#027659]" />
                <h3 className="font-semibold">AI Assistant</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsChatOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Hi! I'm here to help you create and edit your presentation. What would you like to work on?
                    </p>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.type === "user" ? "bg-[#027659] text-white" : "bg-muted"
                      }`}
                    >
                      {message.type === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div
                      className={`flex-1 p-3 rounded-lg ${
                        message.type === "user" ? "bg-[#027659] text-white ml-auto max-w-[80%]" : "bg-muted max-w-[80%]"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.isStreaming && (
                        <div className="flex items-center mt-2">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          <span className="text-xs opacity-70">Generating...</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t border-border">
              <div className="flex space-x-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Describe what you want to add or change..."
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={isGenerating}
                />
                <div className="flex flex-col space-y-2">
                  {isGenerating ? (
                    <Button size="sm" variant="outline" onClick={stopGeneration} className="px-3 bg-transparent">
                      <StopCircle className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleSendMessage} disabled={!chatInput.trim()} className="px-3">
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Toggle Button */}
        {!isChatOpen && (
          <Button
            className="fixed right-4 top-24 z-50 bg-[#027659] hover:bg-[#065f46] text-white shadow-lg"
            onClick={() => setIsChatOpen(true)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        slides={slides}
        presentationName={presentation?.name || "Untitled Presentation"}
      />

      {/* Settings Modal */}
      <SettingsModal open={showSettingsModal} onOpenChange={setShowSettingsModal} />
    </div>
  )
}
