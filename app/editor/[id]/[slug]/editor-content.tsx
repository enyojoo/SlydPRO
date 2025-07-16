"use client"
import { Home } from "lucide-react"

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
  User,
  Play,
  Download,
  Minimize,
  Loader2,
  Palette,
  BarChart3,
  ImageIcon,
  Lightbulb,
  Layout,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
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
  layout: "title" | "content" | "two-column" | "image" | "chart"
  designElements?: {
    icons?: string[]
    charts?: {
      type: "bar" | "pie" | "line" | "donut"
      data?: any[]
    }[]
    images?: string[]
    gradients?: string[]
    patterns?: string[]
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
  stage: "analyzing" | "designing" | "styling" | "complete"
  thinkingTime?: number
  currentSlide?: string
  totalSlides?: number
  completedSlides?: number
  version?: number
  designPhase?: "layout" | "colors" | "icons" | "charts" | "final"
}

const modernColorPalettes = [
  {
    name: "Corporate Blue",
    primary: "#1e40af",
    secondary: "#3b82f6",
    accent: "#60a5fa",
    text: "#ffffff",
    gradient: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
  },
  {
    name: "Startup Green",
    primary: "#027659",
    secondary: "#10b981",
    accent: "#34d399",
    text: "#ffffff",
    gradient: "linear-gradient(135deg, #027659 0%, #10b981 100%)",
  },
  {
    name: "Creative Purple",
    primary: "#7c3aed",
    secondary: "#a855f7",
    accent: "#c084fc",
    text: "#ffffff",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
  },
  {
    name: "Energy Orange",
    primary: "#ea580c",
    secondary: "#f97316",
    accent: "#fb923c",
    text: "#ffffff",
    gradient: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
  },
  {
    name: "Tech Dark",
    primary: "#1f2937",
    secondary: "#374151",
    accent: "#6b7280",
    text: "#ffffff",
    gradient: "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
  },
  {
    name: "Modern Pink",
    primary: "#ec4899",
    secondary: "#f472b6",
    accent: "#f9a8d4",
    text: "#ffffff",
    gradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
  },
]

interface EditorContentProps {
  presentationId: string
  slideSlug: string
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
  const [selectedPalette, setSelectedPalette] = useState(modernColorPalettes[1]) // Default to Startup Green
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
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

  // Enhanced AI prompt for expert slide design
  const createExpertDesignPrompt = (userPrompt: string, slideContext?: string) => {
    return `You are SlydPRO AI, an expert presentation designer specializing in modern, high-quality pitch decks and business presentations. You create visually stunning slides with professional design elements.

USER REQUEST: ${userPrompt}

${slideContext ? `CURRENT SLIDE CONTEXT: ${slideContext}` : ""}

DESIGN EXPERTISE:
- Create modern, professional slide layouts with visual hierarchy
- Use appropriate icons, charts, and design elements based on content
- Apply color psychology and modern design principles
- Suggest charts/graphs when data is mentioned
- Add relevant icons for key concepts
- Use gradients, patterns, and visual elements strategically
- Ensure content is scannable and visually engaging

CONTENT ANALYSIS:
- Analyze the content to determine the best slide type (title, content, chart, image, two-column)
- If content mentions numbers/data → suggest charts (bar, pie, line, donut)
- If content has comparisons → use two-column layout
- If content is introductory → use title layout with strong visual impact
- Add relevant emojis and icons to enhance readability

DESIGN ELEMENTS TO INCLUDE:
- 📊 Charts for data/statistics
- 🎯 Icons for key points
- 🎨 Color gradients and modern styling
- 📈 Visual hierarchy with typography
- 🖼️ Image placeholders where appropriate

Please create slides with this level of design thinking and visual sophistication. Structure each slide with:

## Slide [Number]: [Title]
**Layout**: [title/content/chart/image/two-column]
**Design Elements**: [List icons, charts, colors to use]
**Content**: [Well-formatted content with visual elements]

Focus on creating presentation-ready slides that look professional and modern.`
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
          stage: "analyzing",
          thinkingTime: 0,
          version: 1,
          designPhase: "layout",
        },
      }

      setChatMessages((prev) => [...prev, userMessage, loadingMessage])
      setIsStreaming(true)
      setStreamingContent("")

      // Enhanced thinking timer with design phases
      let thinkingTime = 0
      let currentPhase: "layout" | "colors" | "icons" | "charts" | "final" = "layout"
      const phases = ["layout", "colors", "icons", "charts", "final"] as const

      const thinkingInterval = setInterval(() => {
        thinkingTime += 1

        // Change design phase every 3 seconds
        if (thinkingTime % 3 === 0) {
          const currentIndex = phases.indexOf(currentPhase)
          if (currentIndex < phases.length - 1) {
            currentPhase = phases[currentIndex + 1]
          }
        }

        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.isLoading
              ? {
                  ...msg,
                  generationProgress: {
                    ...msg.generationProgress!,
                    thinkingTime,
                    designPhase: currentPhase,
                  },
                }
              : msg,
          ),
        )
      }, 1000)

      try {
        const expertPrompt = createExpertDesignPrompt(prompt)

        // Use real streaming generation
        await v0.generateSlidesStreaming(
          expertPrompt,
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
                        totalSlides: 8,
                        completedSlides: 0,
                        currentSlide: "Analyzing content structure...",
                        designPhase: "layout",
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
              // Enhanced slide processing with design elements
              const designedSlides = result.slides.map((slide, index) => {
                const designElements = analyzeContentForDesign(slide.content, slide.title)

                return {
                  ...slide,
                  background: index === 0 ? selectedPalette.primary : selectedPalette.secondary,
                  textColor: selectedPalette.text,
                  layout: determineOptimalLayout(slide.content, slide.title),
                  designElements,
                } as Slide
              })

              setSlides(designedSlides)
              setSelectedSlide(designedSlides[0]?.id || "")
              setCurrentSlideIndex(0)

              // Save presentation
              if (authUser) {
                try {
                  await presentationsAPI.updatePresentation(presentationId, {
                    name: projectName,
                    slides: designedSlides,
                    thumbnail: designedSlides[0]?.background,
                  })

                  // Update URL with first slide title
                  const firstSlideTitle = designedSlides[0]?.title || "untitled-slide"
                  const slugTitle = firstSlideTitle
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")
                  router.replace(`/editor/${presentationId}/${slugTitle}`)
                } catch (error) {
                  console.error("Failed to save presentation:", error)
                }
              }

              // Enhanced completion message with design insights
              setChatMessages((prev) => {
                return prev.map((msg) =>
                  msg.isLoading
                    ? {
                        ...msg,
                        isLoading: false,
                        content: `🎨 **Professional Presentation Created!**

I've designed ${result.slides.length} modern slides with expert-level visual elements:

${result.slides
  .map((slide, i) => {
    const elements = analyzeContentForDesign(slide.content, slide.title)
    const icons = elements.icons?.slice(0, 3).join(" ") || ""
    return `${i + 1}. **${slide.title}** ${icons}`
  })
  .join("\n")}

**🎯 Design Features Applied:**
• Modern color palette with gradients
• Strategic icon placement for key concepts
• Professional typography hierarchy
• Visual elements based on content analysis
• Chart suggestions for data visualization

**✨ What you can do next:**
• **"Make slide 3 more visual"** - Add charts/icons
• **"Change to corporate blue theme"** - Switch color palette
• **"Add a chart to the market slide"** - Include data visualization
• **"Make the design more modern"** - Enhance visual elements

Ready to refine your presentation design?`,
                        generationProgress: {
                          stage: "complete",
                          version: 1,
                          totalSlides: result.slides.length,
                          completedSlides: result.slides.length,
                          designPhase: "final",
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
                content: `❌ **Design Generation Failed**

I encountered an error: ${error.message}

Let me help you create something amazing! Try describing your presentation with more detail:
• **Topic**: What's your presentation about?
• **Audience**: Who are you presenting to?
• **Style**: Professional, creative, minimal?
• **Content**: Key points you want to cover?

I'm ready to design your perfect presentation!`,
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
    [v0, uploadedFile, selectedPalette, projectName, authUser, router, presentationId],
  )

  // Enhanced content analysis for design elements
  const analyzeContentForDesign = (content: string, title: string) => {
    const designElements: Slide["designElements"] = {
      icons: [],
      charts: [],
      images: [],
      gradients: [],
      patterns: [],
    }

    const lowerContent = (content + " " + title).toLowerCase()

    // Icon suggestions based on content
    const iconMappings = [
      { keywords: ["problem", "challenge", "issue", "pain"], icon: "🎯" },
      { keywords: ["solution", "solve", "fix", "answer"], icon: "💡" },
      { keywords: ["market", "opportunity", "size", "tam"], icon: "📊" },
      { keywords: ["business", "model", "revenue", "money"], icon: "💰" },
      { keywords: ["team", "founder", "people", "staff"], icon: "👥" },
      { keywords: ["growth", "scale", "expand", "increase"], icon: "📈" },
      { keywords: ["technology", "tech", "ai", "software"], icon: "⚡" },
      { keywords: ["customer", "user", "client", "audience"], icon: "👤" },
      { keywords: ["competition", "competitor", "vs", "compare"], icon: "⚔️" },
      { keywords: ["timeline", "roadmap", "plan", "future"], icon: "🗓️" },
      { keywords: ["funding", "investment", "raise", "capital"], icon: "💎" },
      { keywords: ["product", "feature", "demo", "showcase"], icon: "🚀" },
    ]

    iconMappings.forEach(({ keywords, icon }) => {
      if (keywords.some((keyword) => lowerContent.includes(keyword))) {
        designElements.icons?.push(icon)
      }
    })

    // Chart suggestions based on content
    if (lowerContent.includes("percent") || lowerContent.includes("%") || lowerContent.includes("share")) {
      designElements.charts?.push({ type: "pie" })
    }
    if (lowerContent.includes("growth") || lowerContent.includes("trend") || lowerContent.includes("over time")) {
      designElements.charts?.push({ type: "line" })
    }
    if (lowerContent.includes("compare") || lowerContent.includes("vs") || lowerContent.includes("versus")) {
      designElements.charts?.push({ type: "bar" })
    }

    return designElements
  }

  const determineOptimalLayout = (content: string, title: string): Slide["layout"] => {
    const lowerContent = (content + " " + title).toLowerCase()

    if (
      lowerContent.includes("welcome") ||
      lowerContent.includes("introduction") ||
      title.toLowerCase().includes("title")
    ) {
      return "title"
    }
    if (lowerContent.includes("chart") || lowerContent.includes("graph") || lowerContent.includes("data")) {
      return "chart"
    }
    if (lowerContent.includes("vs") || lowerContent.includes("compare") || lowerContent.includes("before/after")) {
      return "two-column"
    }
    if (lowerContent.includes("demo") || lowerContent.includes("screenshot") || lowerContent.includes("image")) {
      return "image"
    }
    return "content"
  }

  const autoSave = useCallback(async () => {
    if (!presentationId || !authUser || slides.length === 0) return

    setIsSaving(true)
    try {
      await presentationsAPI.updatePresentation(presentationId, {
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
        const expectedPath = `/editor/${presentationId}/${slugTitle}`

        if (currentPath !== expectedPath) {
          router.replace(expectedPath)
        }
      }
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }, [presentationId, authUser, slides, projectName, selectedSlide, router])

  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (slides.length > 0) {
        autoSave()
      }
    }, 2000)

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
        stage: "analyzing",
        thinkingTime: 0,
        version: chatMessages.filter((m) => m.generationProgress?.stage === "complete").length + 1,
        designPhase: "layout",
      },
    }

    setChatMessages((prev) => [...prev, userMessage, loadingMessage])
    const currentInput = inputMessage
    setInputMessage("")
    setIsStreaming(true)

    // Enhanced thinking timer with design phases
    let thinkingTime = 0
    let currentPhase: "layout" | "colors" | "icons" | "charts" | "final" = "layout"
    const phases = ["layout", "colors", "icons", "charts", "final"] as const

    const thinkingInterval = setInterval(() => {
      thinkingTime += 1

      if (thinkingTime % 2 === 0) {
        const currentIndex = phases.indexOf(currentPhase)
        if (currentIndex < phases.length - 1) {
          currentPhase = phases[currentIndex + 1]
        }
      }

      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.isLoading
            ? {
                ...msg,
                generationProgress: {
                  ...msg.generationProgress!,
                  thinkingTime,
                  designPhase: currentPhase,
                },
              }
            : msg,
        ),
      )
    }, 1000)

    try {
      if (editMode === "selected" && selectedSlide) {
        // Edit only the selected slide with expert design
        const slide = slides.find((s) => s.id === selectedSlide)
        if (slide) {
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
                        designPhase: "styling",
                      },
                    }
                  : msg,
              ),
            )
          }, 2000)

          const expertPrompt = createExpertDesignPrompt(
            currentInput,
            `Current slide: "${slide.title}" - ${slide.content}`,
          )
          const result = await v0.editSlide(selectedSlide, slide.title, expertPrompt)

          setIsStreaming(false)
          clearInterval(thinkingInterval)

          if (result) {
            const designedSlides = result.slides.map((s, index) => {
              const designElements = analyzeContentForDesign(s.content, s.title)
              return {
                ...s,
                background: index === 0 ? selectedPalette.primary : selectedPalette.secondary,
                textColor: selectedPalette.text,
                layout: determineOptimalLayout(s.content, s.title),
                designElements,
              } as Slide
            })

            setSlides(designedSlides)

            // Update URL if slide title changed
            const updatedSlide = designedSlides.find((s) => s.id === selectedSlide)
            if (updatedSlide) {
              const slugTitle = updatedSlide.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")
              router.replace(`/editor/${presentationId}/${slugTitle}`)
            }

            setChatMessages((prev) => {
              return prev.map((msg) =>
                msg.isLoading
                  ? {
                      ...msg,
                      isLoading: false,
                      content: `🎨 **Slide Design Updated!**

I've enhanced "${slide.title}" with professional design elements:

**✨ Design Improvements:**
• Modern visual hierarchy and typography
• Strategic color application
• Content-based icon suggestions
• Optimized layout for readability
• Professional styling elements

**🎯 Applied Design Elements:**
${designedSlides[0]?.designElements?.icons?.slice(0, 3).join(" ") || "• Visual enhancements"}

**Continue refining:**
• **"Make it more visual"** - Add charts/graphics
• **"Change the color scheme"** - Try different palette
• **"Add more icons"** - Enhance visual elements
• **"Make it corporate style"** - Adjust design tone

What other design improvements would you like?`,
                      generationProgress: {
                        stage: "complete",
                        version: loadingMessage.generationProgress!.version,
                        totalSlides: 1,
                        completedSlides: 1,
                        designPhase: "final",
                      },
                    }
                  : msg,
              )
            })
          }
        }
      } else {
        // Regenerate all slides with expert design
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
                      totalSlides: slides.length || 8,
                      completedSlides: 0,
                      currentSlide: "Redesigning presentation...",
                      designPhase: "styling",
                    },
                  }
                : msg,
            ),
          )
        }, 2000)

        const expertPrompt = createExpertDesignPrompt(currentInput)
        let result

        if (slides.length > 0 && v0.currentChatId) {
          result = await v0.regenerateAllSlides(v0.currentChatId, expertPrompt)
        } else {
          result = await v0.generateSlides(expertPrompt, uploadedFile)
        }

        setIsStreaming(false)
        clearInterval(thinkingInterval)

        if (result) {
          const designedSlides = result.slides.map((slide, index) => {
            const designElements = analyzeContentForDesign(slide.content, slide.title)
            return {
              ...slide,
              background: index === 0 ? selectedPalette.primary : selectedPalette.secondary,
              textColor: selectedPalette.text,
              layout: determineOptimalLayout(slide.content, slide.title),
              designElements,
            } as Slide
          })

          setSlides(designedSlides)
          if (designedSlides.length > 0 && !selectedSlide) {
            setSelectedSlide(designedSlides[0].id)
            setCurrentSlideIndex(0)
          }

          // Update presentation
          if (authUser) {
            try {
              await presentationsAPI.updatePresentation(presentationId, {
                name: projectName,
                slides: designedSlides,
                thumbnail: designedSlides[0]?.background,
              })

              const firstSlideTitle = designedSlides[0]?.title || "untitled-slide"
              const slugTitle = firstSlideTitle
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")
              router.replace(`/editor/${presentationId}/${slugTitle}`)
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
                    content: `🎨 **Presentation Redesigned!**

I've applied expert design principles to all ${result.slides.length} slides:

${result.slides
  .map((slide, i) => {
    const elements = analyzeContentForDesign(slide.content, slide.title)
    const icons = elements.icons?.slice(0, 2).join(" ") || ""
    return `${i + 1}. **${slide.title}** ${icons}`
  })
  .join("\n")}

**🚀 Professional Design Features:**
• Modern color palette and gradients
• Content-aware icon placement
• Optimized layouts for each slide type
• Professional typography hierarchy
• Visual elements that enhance comprehension

**🎯 Design Customization Options:**
• **"Make it more corporate"** - Professional business style
• **"Add more charts to data slides"** - Enhanced visualizations
• **"Use warmer colors"** - Different color psychology
• **"Make slide 3 more visual"** - Specific slide enhancements

Ready for more design refinements?`,
                    generationProgress: {
                      stage: "complete",
                      version: loadingMessage.generationProgress!.version,
                      totalSlides: result.slides.length,
                      completedSlides: result.slides.length,
                      designPhase: "final",
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
          content: `❌ **Design Update Failed**

I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}

Let me help you with specific design improvements:
• **"Make slide 2 more visual"** - Add charts and icons
• **"Change to blue color theme"** - Switch color palette
• **"Add icons to key points"** - Enhance visual elements
• **"Make it look more professional"** - Apply corporate styling

What design aspect would you like me to focus on?`,
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
        content: "🎨 Analyzing your document and creating professionally designed slides...",
        timestamp: new Date(),
        isLoading: true,
      }

      setChatMessages((prev) => [...prev, userMessage, loadingMessage])

      const expertPrompt = createExpertDesignPrompt(
        "Create a professional presentation from this document with modern design elements",
      )
      const result = await v0.generateSlides(expertPrompt, file)

      setChatMessages((prev) => prev.filter((msg) => !msg.isLoading))

      if (result) {
        const designedSlides = result.slides.map((slide, index) => {
          const designElements = analyzeContentForDesign(slide.content, slide.title)
          return {
            ...slide,
            background: index === 0 ? selectedPalette.primary : selectedPalette.secondary,
            textColor: selectedPalette.text,
            layout: determineOptimalLayout(slide.content, slide.title),
            designElements,
          } as Slide
        })

        setSlides(designedSlides)
        setSelectedSlide(designedSlides[0]?.id || "")
        setCurrentSlideIndex(0)

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content: `🎨 **Professional Design Applied!**

I've analyzed your document and created ${result.slides.length} expertly designed slides with:

• **Modern visual hierarchy** for better readability
• **Strategic color application** using professional palette
• **Content-aware icons** for key concepts
• **Optimized layouts** based on content type
• **Professional styling** throughout

Your presentation is ready for refinement! Ask me to adjust colors, add charts, or enhance specific slides.`,
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
      // Update URL with selected slide
      const slugTitle = slide.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      router.replace(`/editor/${presentationId}/${slugTitle}`)

      const designElements = slide.designElements
      const contextMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "assistant",
        content: `🎯 **Now Editing: "${slide.title}"** (Slide ${index + 1})

**Current Design Elements:**
${designElements?.icons?.length ? `• Icons: ${designElements.icons.join(" ")}` : ""}
${designElements?.charts?.length ? `• Charts: ${designElements.charts.map((c) => c.type).join(", ")}` : ""}
• Layout: ${slide.layout}
• Color: ${selectedPalette.name}

**🎨 Design Enhancement Options:**
• **"Make this slide more visual"** - Add charts, icons, graphics
• **"Change the layout to two-column"** - Restructure content
• **"Add a chart for the data"** - Include data visualization
• **"Use more icons for key points"** - Enhance visual elements
• **"Make it more professional"** - Apply corporate styling
• **"Change colors to blue theme"** - Switch color palette

What design improvements would you like for this slide?`,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, contextMessage])
    }
  }

  const handlePaletteChange = (paletteName: string) => {
    const palette = modernColorPalettes.find((p) => p.name === paletteName) || modernColorPalettes[0]
    setSelectedPalette(palette)

    const themedSlides = slides.map((slide, index) => ({
      ...slide,
      background: index === 0 ? palette.primary : palette.secondary,
      textColor: palette.text,
    }))
    setSlides(themedSlides)

    const paletteMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "assistant",
      content: `🎨 **${palette.name} Theme Applied!**

I've updated your entire presentation with the ${palette.name} color palette. This modern color scheme enhances visual appeal and maintains professional consistency across all slides.

**Color Psychology:**
${palette.name === "Corporate Blue" ? "• Blue conveys trust, stability, and professionalism" : ""}
${palette.name === "Startup Green" ? "• Green represents growth, innovation, and success" : ""}
${palette.name === "Creative Purple" ? "• Purple suggests creativity, luxury, and innovation" : ""}
${palette.name === "Energy Orange" ? "• Orange conveys enthusiasm, energy, and confidence" : ""}
${palette.name === "Tech Dark" ? "• Dark themes suggest sophistication and modernity" : ""}
${palette.name === "Modern Pink" ? "• Pink represents creativity, compassion, and modernity" : ""}

The new theme works perfectly with your content structure and design elements!`,
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, paletteMessage])
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

    // Load presentation data
    const loadPresentation = async () => {
      try {
        if (authUser && presentationId) {
          const presentation = await presentationsAPI.getPresentation(presentationId)
          setSlides(presentation.slides)
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

          // Check for messages from chat context (from home page)
          if (messages.length > 0) {
            // Process initial generation from home page
            const lastMessage = messages[messages.length - 1]
            if (lastMessage.type === "user") {
              await handleInitialGeneration(lastMessage.content)
            }
            clearMessages()
          } else {
            // Show welcome message for existing presentation
            const welcomeMessage: ChatMessage = {
              id: Date.now().toString(),
              type: "assistant",
              content: `🎨 **Welcome back to "${presentation.name}"!**

I'm your expert presentation designer, ready to help you create stunning slides with:

**🚀 Professional Design Capabilities:**
• Modern layouts with visual hierarchy
• Strategic color palettes and gradients
• Content-aware icons and graphics
• Data visualization with charts
• Professional typography and spacing

**✨ Current Presentation:**
• ${presentation.slides.length} slides designed
• Last updated: ${new Date(presentation.updated_at).toLocaleDateString()}
• Currently viewing: **${presentation.slides[slideIndex]?.title || "Slide 1"}**

**🎯 What I can help you with:**
• **"Make slide 3 more visual"** - Add charts, icons, graphics
• **"Change to corporate blue theme"** - Switch color palette
• **"Add icons to key points"** - Enhance visual elements
• **"Redesign the layout"** - Optimize slide structure
• **"Make it more professional"** - Apply business styling

What design improvements would you like to make?`,
              timestamp: new Date(),
            }
            setChatMessages([welcomeMessage])
          }
        }
      } catch (error) {
        console.error("Failed to load presentation:", error)
        router.push("/")
      }
    }

    loadPresentation()
    setIsInitialized(true)
  }, [authUser, messages, presentationId, slideSlug, router, clearMessages, handleInitialGeneration])

  // Presentation Mode View
  if (isPresentationMode) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        {currentSlide && (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: currentSlide.designElements?.gradients?.[0] || currentSlide.background,
              color: currentSlide.textColor,
            }}
          >
            <div className="max-w-6xl mx-auto p-16">
              {currentSlide.layout === "title" ? (
                <div className="text-center">
                  <h1 className="text-8xl font-bold mb-12 leading-tight">{currentSlide.title}</h1>
                  <p className="text-4xl opacity-90 leading-relaxed">{currentSlide.content}</p>
                  {currentSlide.designElements?.icons && (
                    <div className="text-6xl mt-8 space-x-4">
                      {currentSlide.designElements.icons.slice(0, 3).map((icon, i) => (
                        <span key={i}>{icon}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : currentSlide.layout === "chart" ? (
                <>
                  <h1 className="text-7xl font-bold mb-16 leading-tight flex items-center">
                    <BarChart3 className="mr-6" />
                    {currentSlide.title}
                  </h1>
                  <div className="text-4xl leading-relaxed opacity-90 space-y-8">
                    {currentSlide.content.split("\n").map((line, index) => (
                      <p key={index} className="flex items-center">
                        <span className="text-5xl mr-4">📊</span>
                        {line}
                      </p>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-7xl font-bold mb-16 leading-tight flex items-center">
                    {currentSlide.designElements?.icons?.[0] && (
                      <span className="text-8xl mr-6">{currentSlide.designElements.icons[0]}</span>
                    )}
                    {currentSlide.title}
                  </h1>
                  <div className="text-4xl leading-relaxed opacity-90 space-y-8">
                    {currentSlide.content.split("\n").map((line, index) => (
                      <p key={index} className="flex items-center">
                        {currentSlide.designElements?.icons?.[index + 1] && (
                          <span className="text-5xl mr-4">{currentSlide.designElements.icons[index + 1]}</span>
                        )}
                        {line}
                      </p>
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
                ? Array.from({ length: 8 }, (_, index) => (
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
                            background: slide.designElements?.gradients?.[0] || slide.background,
                            color: slide.textColor,
                          }}
                        >
                          <div className="p-2 h-full flex flex-col">
                            <div className="font-bold text-[8px] mb-1 truncate flex items-center">
                              {slide.designElements?.icons?.[0] && (
                                <span className="mr-1">{slide.designElements.icons[0]}</span>
                              )}
                              {slide.title}
                            </div>
                            <div className="text-[7px] opacity-80 line-clamp-3">
                              {slide.content.substring(0, 60)}...
                            </div>
                            {slide.layout === "chart" && (
                              <div className="mt-1">
                                <BarChart3 className="w-3 h-3 opacity-60" />
                              </div>
                            )}
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

              {/* Center Section - Color Palette Selector */}
              <div className="flex items-center space-x-2">
                <Palette className="h-4 w-4 text-gray-500" />
                <div className="flex space-x-1">
                  {modernColorPalettes.map((palette) => (
                    <button
                      key={palette.name}
                      onClick={() => handlePaletteChange(palette.name)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        selectedPalette.name === palette.name
                          ? "border-gray-800 scale-110"
                          : "border-gray-300 hover:border-gray-500"
                      }`}
                      style={{ background: palette.gradient }}
                      title={palette.name}
                    />
                  ))}
                </div>
              </div>

              {/* Right Section - Play and Export */}
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
                {/* Enhanced Skeleton Slide with Design Elements */}
                <div className="w-[960px] h-[540px] shadow-2xl rounded-lg overflow-hidden border-4 border-white bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse">
                  <div className="h-full p-12 flex flex-col justify-center items-center">
                    <div className="text-center space-y-6">
                      <div className="w-20 h-20 bg-[#027659]/20 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
                        <Palette className="w-10 h-10 text-[#027659] animate-spin" />
                      </div>
                      <h2 className="text-4xl font-bold text-gray-600">🎨 SlydPRO Designing</h2>
                      <p className="text-xl text-gray-500">
                        Creating professional slides with modern design elements...
                      </p>
                      <div className="flex space-x-4 justify-center text-2xl">
                        <span className="animate-bounce">🎯</span>
                        <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>
                          📊
                        </span>
                        <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>
                          💡
                        </span>
                        <span className="animate-bounce" style={{ animationDelay: "0.3s" }}>
                          🚀
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentSlide ? (
              <div className="relative">
                {/* Enhanced Main Slide with Design Elements */}
                <div
                  className="w-[960px] h-[540px] shadow-2xl rounded-lg overflow-hidden border-4 border-white"
                  style={{
                    background: currentSlide.designElements?.gradients?.[0] || currentSlide.background,
                    color: currentSlide.textColor,
                  }}
                >
                  <div className="h-full p-12 flex flex-col justify-center relative">
                    {currentSlide.layout === "title" ? (
                      <div className="text-center">
                        <h1 className="text-7xl font-bold mb-8 leading-tight flex items-center justify-center">
                          {currentSlide.designElements?.icons?.[0] && (
                            <span className="text-8xl mr-6">{currentSlide.designElements.icons[0]}</span>
                          )}
                          {currentSlide.title}
                        </h1>
                        <p className="text-3xl opacity-90 leading-relaxed max-w-4xl mx-auto">{currentSlide.content}</p>
                        {currentSlide.designElements?.icons && currentSlide.designElements.icons.length > 1 && (
                          <div className="text-5xl mt-8 space-x-4">
                            {currentSlide.designElements.icons.slice(1, 4).map((icon, i) => (
                              <span key={i} className="inline-block animate-pulse">
                                {icon}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : currentSlide.layout === "chart" ? (
                      <>
                        <h1 className="text-6xl font-bold mb-12 leading-tight flex items-center">
                          <BarChart3 className="mr-6 text-7xl" />
                          {currentSlide.title}
                        </h1>
                        <div className="text-3xl leading-relaxed opacity-90 space-y-6">
                          {currentSlide.content.split("\n").map((line, index) => (
                            <p key={index} className="flex items-center">
                              <span className="text-4xl mr-4">📊</span>
                              {line}
                            </p>
                          ))}
                        </div>
                      </>
                    ) : currentSlide.layout === "two-column" ? (
                      <>
                        <h1 className="text-6xl font-bold mb-12 leading-tight text-center">{currentSlide.title}</h1>
                        <div className="grid grid-cols-2 gap-12 text-2xl leading-relaxed opacity-90">
                          <div className="space-y-4">
                            {currentSlide.content
                              .split("\n")
                              .slice(0, Math.ceil(currentSlide.content.split("\n").length / 2))
                              .map((line, index) => (
                                <p key={index} className="flex items-center">
                                  {currentSlide.designElements?.icons?.[index] && (
                                    <span className="text-3xl mr-3">{currentSlide.designElements.icons[index]}</span>
                                  )}
                                  {line}
                                </p>
                              ))}
                          </div>
                          <div className="space-y-4">
                            {currentSlide.content
                              .split("\n")
                              .slice(Math.ceil(currentSlide.content.split("\n").length / 2))
                              .map((line, index) => (
                                <p key={index} className="flex items-center">
                                  {currentSlide.designElements?.icons?.[
                                    index + Math.ceil(currentSlide.content.split("\n").length / 2)
                                  ] && (
                                    <span className="text-3xl mr-3">
                                      {
                                        currentSlide.designElements.icons[
                                          index + Math.ceil(currentSlide.content.split("\n").length / 2)
                                        ]
                                      }
                                    </span>
                                  )}
                                  {line}
                                </p>
                              ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h1 className="text-6xl font-bold mb-12 leading-tight flex items-center">
                          {currentSlide.designElements?.icons?.[0] && (
                            <span className="text-7xl mr-6">{currentSlide.designElements.icons[0]}</span>
                          )}
                          {currentSlide.title}
                        </h1>
                        <div className="text-3xl leading-relaxed opacity-90 space-y-6">
                          {currentSlide.content.split("\n").map((line, index) => (
                            <p key={index} className="flex items-center">
                              {currentSlide.designElements?.icons?.[index + 1] && (
                                <span className="text-4xl mr-4">{currentSlide.designElements.icons[index + 1]}</span>
                              )}
                              {line}
                            </p>
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

        {/* Right Sidebar - Enhanced AI Chat */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-lg">
          {/* Chat Header */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-[#027659] to-[#10b981] rounded-lg flex items-center justify-center">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">SlydPRO Designer AI</h3>
                <p className="text-xs text-gray-600">Expert Presentation Designer</p>
              </div>
            </div>

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
                    <AvatarFallback
                      className={
                        message.type === "user" ? "bg-[#027659]/10" : "bg-gradient-to-r from-blue-100 to-indigo-100"
                      }
                    >
                      {message.type === "user" ? (
                        <User className="w-4 h-4 text-[#027659]" />
                      ) : (
                        <Palette className="w-4 h-4 text-blue-600" />
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
                          {message.isLoading && message.generationProgress?.stage === "analyzing" && (
                            <div className="flex items-center space-x-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                <div
                                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                                  style={{ animationDelay: "0.1s" }}
                                ></div>
                                <div
                                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                                  style={{ animationDelay: "0.2s" }}
                                ></div>
                              </div>
                              <span className="text-sm">
                                Analyzing content for {message.generationProgress.thinkingTime}s...
                              </span>
                            </div>
                          )}

                          {message.generationProgress?.designPhase && message.isLoading && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-700">
                                  Design Phase: {message.generationProgress.designPhase}
                                </span>
                                <div className="flex space-x-1">
                                  {message.generationProgress.designPhase === "layout" && (
                                    <Layout className="h-4 w-4 text-blue-600" />
                                  )}
                                  {message.generationProgress.designPhase === "colors" && (
                                    <Palette className="h-4 w-4 text-blue-600" />
                                  )}
                                  {message.generationProgress.designPhase === "icons" && (
                                    <Lightbulb className="h-4 w-4 text-blue-600" />
                                  )}
                                  {message.generationProgress.designPhase === "charts" && (
                                    <BarChart3 className="h-4 w-4 text-blue-600" />
                                  )}
                                  {message.generationProgress.designPhase === "final" && (
                                    <Zap className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-blue-600">
                                {message.generationProgress.designPhase === "layout" && "Structuring slide layouts..."}
                                {message.generationProgress.designPhase === "colors" && "Applying color psychology..."}
                                {message.generationProgress.designPhase === "icons" && "Adding visual elements..."}
                                {message.generationProgress.designPhase === "charts" &&
                                  "Creating data visualizations..."}
                                {message.generationProgress.designPhase === "final" && "Finalizing design elements..."}
                              </div>
                            </div>
                          )}

                          {(message.isLoading && message.generationProgress?.stage === "designing") ||
                          message.generationProgress?.stage === "styling" ||
                          message.generationProgress?.stage === "complete" ? (
                            <div className="border border-gray-200 rounded-lg p-3 bg-white mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Design Version {message.generationProgress.version}
                                </span>
                                <span
                                  className={`text-xs ${message.generationProgress.stage === "complete" ? "text-green-600" : "text-blue-500"}`}
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
                                        : `Professional Design`}
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

          {/* Enhanced Chat Input */}
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    editMode === "selected"
                      ? "How should I enhance this slide's design?"
                      : slides.length > 0
                        ? "Ask me to improve your presentation design..."
                        : "Describe the presentation you want me to design..."
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

                    {/* Design Suggestion Buttons */}
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInputMessage("Make this more visual with icons and charts")}
                        className="text-xs text-gray-500 hover:text-gray-700 h-8 px-2"
                        disabled={v0.isLoading}
                      >
                        <ImageIcon className="h-3 w-3 mr-1" />
                        Visual
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInputMessage("Add charts and data visualization")}
                        className="text-xs text-gray-500 hover:text-gray-700 h-8 px-2"
                        disabled={v0.isLoading}
                      >
                        <BarChart3 className="h-3 w-3 mr-1" />
                        Charts
                      </Button>
                    </div>
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

              {/* Design Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage("Make the design more professional and corporate")}
                  className="text-xs bg-transparent"
                  disabled={v0.isLoading}
                >
                  🏢 Corporate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage("Add more icons and visual elements")}
                  className="text-xs bg-transparent"
                  disabled={v0.isLoading}
                >
                  ✨ Visual
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage("Make it more modern and creative")}
                  className="text-xs bg-transparent"
                  disabled={v0.isLoading}
                >
                  🎨 Modern
                </Button>
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
