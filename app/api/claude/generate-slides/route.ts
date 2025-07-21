import { type NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Enhanced TypeScript interfaces
interface SlideGenerationRequest {
  prompt: string
  slideCount?: number | "auto"
  presentationType?: "business" | "academic" | "creative" | "technical" | "marketing"
  audience?: "executive" | "team" | "public" | "students" | "clients"
  tone?: "professional" | "casual" | "persuasive" | "educational" | "inspiring"
  editMode?: "all" | "selected"
  selectedSlideId?: string
  selectedSlideTitle?: string
  existingSlides?: any[]
  hasFile?: boolean
}

interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  text: string
  textSecondary: string
  background: string
}

interface ChartData {
  type: "bar" | "line" | "pie" | "area" | "donut"
  data: Array<{ name: string; value: number; [key: string]: any }>
  config: { showGrid?: boolean; gradient?: boolean; [key: string]: any }
  style: string
}

interface TableData {
  headers: string[]
  rows: string[][]
  style: string
  interactive: boolean
}

interface EnhancedSlide {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  titleColor: string
  accentColor: string
  layout: "title" | "content" | "chart" | "table" | "two-column" | "split"
  titleFont: string
  contentFont: string
  titleSize: string
  contentSize: string
  shadowEffect: string
  borderRadius: string
  glassmorphism: boolean
  chartData?: ChartData
  tableData?: TableData
  contentType?: "opening" | "problem" | "solution" | "data" | "conclusion"
  designTheme: string
  spacing: string
  alignment: string
  icons?: Array<{
    icon: string
    position: string
    color: string
    size: number
  }>
}

interface AISlideResponse {
  id: string
  title: string
  content: string
  layout: string
  contentType?: string
  visualElements?: {
    suggestedChart?: string
    suggestedIcon?: string
    emphasis?: string
    dataPoints?: string[]
  }
}

interface GenerationResult {
  slides: AISlideResponse[]
  designTheme: string
  message: string
  keyMetrics?: string[]
}

// Enhanced Design System with 7 sophisticated palettes
const DESIGN_SYSTEM = {
  colorPalettes: {
    business: {
      primary: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
      secondary: "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
      accent: "#3b82f6",
      text: "#ffffff",
      textSecondary: "#e5e7eb",
      background: "#0f172a",
    },
    creative: {
      primary: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
      secondary: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
      accent: "#a855f7",
      text: "#ffffff",
      textSecondary: "#e5e7eb",
      background: "#1e1b4b",
    },
    minimal: {
      primary: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      secondary: "linear-gradient(135deg, #374151 0%, #4b5563 100%)",
      accent: "#6366f1",
      text: "#ffffff",
      textSecondary: "#d1d5db",
      background: "#111827",
    },
    vibrant: {
      primary: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
      secondary: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
      accent: "#ef4444",
      text: "#ffffff",
      textSecondary: "#fed7d7",
      background: "#7f1d1d",
    },
    nature: {
      primary: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
      secondary: "linear-gradient(135deg, #047857 0%, #065f46 100%)",
      accent: "#10b981",
      text: "#ffffff",
      textSecondary: "#d1fae5",
      background: "#064e3b",
    },
    ocean: {
      primary: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
      secondary: "linear-gradient(135deg, #0e7490 0%, #0891b2 100%)",
      accent: "#06b6d4",
      text: "#ffffff",
      textSecondary: "#cffafe",
      background: "#164e63",
    },
    sunset: {
      primary: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
      secondary: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
      accent: "#f97316",
      text: "#ffffff",
      textSecondary: "#fed7aa",
      background: "#9a3412",
    },
  } as Record<string, ColorPalette>,

  typography: {
    title: {
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
      fontWeight: "700",
      lineHeight: "1.1",
      letterSpacing: "-0.025em",
    },
    subtitle: {
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
      fontWeight: "600",
      lineHeight: "1.2",
      letterSpacing: "-0.01em",
    },
    body: {
      fontFamily: '"SF Pro Text", "Inter", system-ui, sans-serif',
      fontWeight: "400",
      lineHeight: "1.6",
      letterSpacing: "0",
    },
  },

  effects: {
    glassmorphism: "backdrop-blur-sm bg-white/10 border border-white/20",
    modernShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    softGlow: "0 0 50px rgba(59, 130, 246, 0.15)",
    premiumShadow: "0 30px 60px rgba(0, 0, 0, 0.3)",
    subtleShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
  },
}

// Enhanced chart data generation
const generateChartData = (type: string, title: string, contentHint?: string): ChartData => {
  const datasets = {
    revenue: [
      { name: "Q1 2024", value: 850000, growth: 12 },
      { name: "Q2 2024", value: 1200000, growth: 18 },
      { name: "Q3 2024", value: 1650000, growth: 24 },
      { name: "Q4 2024", value: 2100000, growth: 28 },
    ],
    growth: [
      { name: "2021", value: 120, target: 100 },
      { name: "2022", value: 145, target: 130 },
      { name: "2023", value: 189, target: 160 },
      { name: "2024", value: 234, target: 200 },
    ],
    market: [
      { name: "North America", value: 45, share: 45 },
      { name: "Europe", value: 30, share: 30 },
      { name: "Asia Pacific", value: 15, share: 15 },
      { name: "Other", value: 10, share: 10 },
    ],
    performance: [
      { name: "Customer Satisfaction", value: 92, benchmark: 85 },
      { name: "Sales Target", value: 115, benchmark: 100 },
      { name: "Team Performance", value: 88, benchmark: 80 },
      { name: "Market Penetration", value: 78, benchmark: 70 },
    ],
    timeline: [
      { name: "Jan", value: 65, forecast: 60 },
      { name: "Feb", value: 78, forecast: 70 },
      { name: "Mar", value: 92, forecast: 85 },
      { name: "Apr", value: 108, forecast: 100 },
      { name: "May", value: 125, forecast: 115 },
      { name: "Jun", value: 142, forecast: 130 },
    ],
  }

  const titleLower = (title + " " + (contentHint || "")).toLowerCase()

  let selectedData = datasets.performance
  if (titleLower.includes("revenue") || titleLower.includes("financial") || titleLower.includes("sales")) {
    selectedData = datasets.revenue
  } else if (titleLower.includes("growth") || titleLower.includes("trend") || titleLower.includes("increase")) {
    selectedData = datasets.growth
  } else if (titleLower.includes("market") || titleLower.includes("region") || titleLower.includes("share")) {
    selectedData = datasets.market
  } else if (titleLower.includes("time") || titleLower.includes("month") || titleLower.includes("quarter")) {
    selectedData = datasets.timeline
  }

  return {
    type: type as ChartData["type"],
    data: selectedData,
    config: {
      showGrid: true,
      gradient: type === "area",
      responsive: true,
      animation: true,
    },
    style: "modern",
  }
}

// Enhanced table data generation
const generateTableData = (title: string, contentHint?: string): TableData => {
  const tableTemplates = {
    financial: {
      headers: ["Metric", "Q3 2024", "Q4 2024", "Growth", "Target"],
      rows: [
        ["Revenue", "$1.2M", "$1.8M", "+50%", "$1.6M"],
        ["New Customers", "1,200", "1,850", "+54%", "1,500"],
        ["Market Share", "12%", "15%", "+25%", "14%"],
        ["Customer LTV", "$2,400", "$2,850", "+19%", "$2,600"],
      ],
    },
    performance: {
      headers: ["KPI", "Current", "Previous", "Change", "Benchmark"],
      rows: [
        ["Customer Satisfaction", "4.6/5", "4.2/5", "+9%", "4.0/5"],
        ["Response Time", "2.1s", "3.2s", "-34%", "3.0s"],
        ["Conversion Rate", "3.8%", "3.1%", "+23%", "3.5%"],
        ["Retention Rate", "94%", "89%", "+6%", "90%"],
      ],
    },
    comparison: {
      headers: ["Feature", "Our Solution", "Competitor A", "Competitor B"],
      rows: [
        ["Price", "$99/month", "$149/month", "$129/month"],
        ["Features", "50+", "35", "42"],
        ["Support", "24/7", "Business hours", "Email only"],
        ["Integration", "200+", "50", "75"],
      ],
    },
  }

  const titleLower = (title + " " + (contentHint || "")).toLowerCase()

  if (titleLower.includes("revenue") || titleLower.includes("financial") || titleLower.includes("sales")) {
    return { ...tableTemplates.financial, style: "modern", interactive: false }
  } else if (titleLower.includes("vs") || titleLower.includes("compare") || titleLower.includes("competitor")) {
    return { ...tableTemplates.comparison, style: "modern", interactive: false }
  } else {
    return { ...tableTemplates.performance, style: "modern", interactive: false }
  }
}

// Enhanced AI prompting system with design variety
const createEnhancedPrompt = (request: SlideGenerationRequest, fileContent?: string): string => {
  const {
    prompt,
    slideCount = "auto",
    presentationType = "business",
    audience = "team",
    tone = "professional",
    editMode = "all",
    selectedSlideId,
    selectedSlideTitle,
  } = request

  if (editMode === "selected" && selectedSlideId && selectedSlideTitle) {
    return `You are SlydPRO AI, the world's premier presentation design expert with the creative power of v0.dev.

MISSION: Transform the slide "${selectedSlideTitle}" into a stunning, professional masterpiece with VARIED DESIGN.

USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}

CRITICAL DESIGN REQUIREMENTS:
🎨 Use DIFFERENT color themes for variety (business, creative, minimal, vibrant, nature, ocean, sunset)
📊 Add intelligent data visualizations when content mentions metrics
🎯 Include relevant premium icons that enhance meaning
✨ Apply modern glassmorphism and shadow effects
🔤 Use typography hierarchy that guides the eye
📐 Balance whitespace and content for optimal readability
⚡ ENSURE text fits within slide boundaries - use concise, impactful content

REQUIRED JSON FORMAT:
{
  "slides": [
    {
      "id": "${selectedSlideId}",
      "title": "Enhanced Professional Title (max 60 chars)",
      "content": "Compelling content with clear value proposition\\n• Key insight with supporting data\\n• Important metric or achievement\\n• Clear action item or next step",
      "layout": "content|chart|table|two-column",
      "contentType": "problem|solution|data|conclusion",
      "visualElements": {
        "suggestedChart": "bar|line|pie|area|donut|none",
        "suggestedIcon": "trending-up|target|lightbulb|chart-bar|users|dollar-sign",
        "emphasis": "highlight key metrics or important quotes",
        "dataPoints": ["key", "metrics", "to", "highlight"]
      }
    }
  ],
  "designTheme": "business|creative|minimal|vibrant|nature|ocean|sunset",
  "message": "Brief explanation of the enhancement",
  "keyMetrics": ["important", "numbers", "or", "stats"]
}`
  }

  return `You are SlydPRO AI, an expert presentation designer with the creative intelligence of v0.dev and Lovable.ai.

USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}
SLIDE COUNT: ${slideCount === "auto" ? "6-8 slides" : slideCount}
${
  fileContent
    ? `
SOURCE MATERIAL:
${fileContent.substring(0, 1000)}...`
    : ""
}

DESIGN EXCELLENCE MANDATE (Like v0.dev for presentations):
1. Create VARIED slide designs - each slide should have unique visual appeal
2. Use DIFFERENT color themes across slides for visual interest
3. Apply intelligent layout selection based on content type
4. Ensure ALL text fits within slide boundaries - be concise and impactful
5. Use data visualization strategically to support key points
6. Include relevant icons and visual elements that enhance comprehension
7. Apply modern design trends: gradients, glassmorphism, premium shadows
8. Create slides that would win design awards and close Fortune 500 deals

SLIDE STRUCTURE GUIDELINES:
• Opening: Hook with compelling value proposition (title layout)
• Problem: Clearly articulate challenge (content layout)
• Solution: Present approach with confidence (two-column layout)
• Data: Use charts and metrics to build credibility (chart layout)
• Conclusion: End with strong call-to-action (content layout)

CRITICAL: Keep titles under 60 characters and bullet points under 80 characters to prevent overflow.

REQUIRED JSON FORMAT:
{
  "slides": [
    {
      "id": "slide-1",
      "title": "Compelling Title That Grabs Attention",
      "content": "Opening statement that immediately engages\\n• Powerful benefit statement with impact\\n• Key differentiator that sets you apart\\n• Clear promise of value delivery",
      "layout": "title|content|chart|table|two-column",
      "contentType": "opening|problem|solution|data|conclusion",
      "visualElements": {
        "suggestedChart": "bar|line|pie|area|donut|none",
        "suggestedIcon": "trending-up|target|lightbulb|chart-bar|users|dollar-sign|rocket|star|award",
        "emphasis": "highlight key metrics, quotes, or important statements",
        "dataPoints": ["specific", "numbers", "percentages", "or", "metrics"]
      }
    }
  ],
  "designTheme": "business|creative|minimal|vibrant|nature|ocean|sunset",
  "message": "Brief explanation of the presentation flow and key insights",
  "keyMetrics": ["list", "of", "important", "numbers", "stats", "or", "achievements"]
}

Create slides with the design intelligence of v0.dev - varied, professional, and strategically crafted for maximum impact.`
}

// Enhanced slide processing with intelligent design application and variety
const enhanceSlides = (slides: AISlideResponse[], designTheme = "business"): EnhancedSlide[] => {
  const availableThemes = ["business", "creative", "minimal", "vibrant", "nature", "ocean", "sunset"]

  return slides.map((slide, index) => {
    // Rotate through different themes for variety (like v0.dev does)
    const themeIndex = index % availableThemes.length
    const currentTheme = availableThemes[themeIndex]
    const palette = DESIGN_SYSTEM.colorPalettes[currentTheme] || DESIGN_SYSTEM.colorPalettes.business

    const isTitle = slide.layout === "title" || index === 0
    const isClosing = index === slides.length - 1

    // Smart background selection with variety
    let background = palette.primary
    if (isTitle) {
      background = palette.primary // Hero slide
    } else if (isClosing) {
      background = palette.secondary // Closing slide
    } else if (index % 3 === 0) {
      background = palette.secondary // Variation every 3rd slide
    } else if (slide.contentType === "data") {
      background = palette.background // Data slides get special treatment
    }

    // Responsive typography with proper sizing to prevent overflow
    const titleSize = isTitle
      ? "clamp(1.75rem, 3.5vw, 3rem)" // Reduced from 4.5rem to prevent overflow
      : "clamp(1.25rem, 2.2vw, 2rem)" // Reduced from 2.75rem

    const contentSize = isTitle
      ? "clamp(1rem, 1.4vw, 1.25rem)" // Reduced from 1.75rem
      : "clamp(0.875rem, 1.1vw, 1rem)" // Reduced from 1.25rem

    // Generate enhanced chart data if needed
    let chartData: ChartData | undefined
    if (slide.layout === "chart" || slide.visualElements?.suggestedChart !== "none") {
      const chartType = slide.visualElements?.suggestedChart || "bar"
      chartData = generateChartData(chartType, slide.title, slide.content)
    }

    // Generate table data if needed
    let tableData: TableData | undefined
    if (slide.layout === "table") {
      tableData = generateTableData(slide.title, slide.content)
    }

    // Enhanced professional icon mapping
    const iconMapping: Record<string, string> = {
      "trending-up": "📈",
      target: "🎯",
      lightbulb: "💡",
      "chart-bar": "📊",
      users: "👥",
      "dollar-sign": "💰",
      rocket: "🚀",
      star: "⭐",
      award: "🏆",
      globe: "🌍",
      shield: "🛡️",
      zap: "⚡",
    }

    // Convert to icons array format for compatibility
    const icons = slide.visualElements?.suggestedIcon
      ? [
          {
            icon: iconMapping[slide.visualElements.suggestedIcon] || "🎯",
            position: "top-right",
            color: palette.accent,
            size: isTitle ? 32 : 24,
          },
        ]
      : []

    return {
      id: slide.id || `slide-${Date.now()}-${index}`,
      title: slide.title,
      content: slide.content,
      background,
      textColor: palette.text,
      titleColor: palette.text,
      accentColor: palette.accent,
      layout: slide.layout as EnhancedSlide["layout"],

      // Enhanced typography with proper sizing
      titleFont: DESIGN_SYSTEM.typography.title.fontFamily,
      contentFont: DESIGN_SYSTEM.typography.body.fontFamily,
      titleSize,
      contentSize,

      // Visual effects based on content type
      shadowEffect:
        slide.contentType === "data" ? DESIGN_SYSTEM.effects.premiumShadow : DESIGN_SYSTEM.effects.modernShadow,
      borderRadius: "24px",
      glassmorphism: slide.contentType === "data" || slide.contentType === "conclusion",

      // Enhanced spacing and alignment
      spacing: isTitle ? "generous" : "comfortable",
      alignment: isTitle ? "center" : "left",

      // Data visualization
      chartData,
      tableData,
      icons,

      // Content classification
      contentType: slide.contentType as EnhancedSlide["contentType"],
      designTheme: currentTheme, // Use the varied theme, not the original
    }
  })
}

// Enhanced file parsing with better error handling
const parseFileContent = async (file: File): Promise<string> => {
  try {
    const text = await file.text()

    // Basic content validation
    if (!text || text.trim().length === 0) {
      throw new Error("File appears to be empty")
    }

    // Limit content size and clean it
    const cleanedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim()

    return cleanedText.substring(0, 3000) // Increased limit for better context
  } catch (error) {
    throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Enhanced validation
const validateRequest = (requestData: any): SlideGenerationRequest => {
  if (!requestData.prompt || typeof requestData.prompt !== "string") {
    throw new Error("Prompt is required and must be a string")
  }

  if (requestData.prompt.length < 10) {
    throw new Error("Prompt must be at least 10 characters long")
  }

  if (requestData.prompt.length > 2000) {
    throw new Error("Prompt must be less than 2000 characters")
  }

  const validPresentationTypes = ["business", "academic", "creative", "technical", "marketing"]
  const validAudiences = ["executive", "team", "public", "students", "clients"]
  const validTones = ["professional", "casual", "persuasive", "educational", "inspiring"]

  return {
    prompt: requestData.prompt,
    slideCount: requestData.slideCount || "auto",
    presentationType: validPresentationTypes.includes(requestData.presentationType)
      ? requestData.presentationType
      : "business",
    audience: validAudiences.includes(requestData.audience) ? requestData.audience : "team",
    tone: validTones.includes(requestData.tone) ? requestData.tone : "professional",
    editMode: requestData.editMode || "all",
    selectedSlideId: requestData.selectedSlideId,
    selectedSlideTitle: requestData.selectedSlideTitle,
    existingSlides: requestData.existingSlides || [],
    hasFile: requestData.hasFile || false,
  }
}

export async function POST(request: NextRequest) {
  try {
    // Enhanced request parsing with validation
    const formData = await request.formData()
    const dataField = formData.get("data") as string

    if (!dataField) {
      return NextResponse.json({ error: "Missing request data", type: "validation_error" }, { status: 400 })
    }

    let requestData: SlideGenerationRequest
    try {
      const rawData = JSON.parse(dataField)
      requestData = validateRequest(rawData)
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON data", type: "validation_error" }, { status: 400 })
    }

    // Enhanced file handling
    const uploadedFile = formData.get("file") as File | null
    let fileContent = ""

    if (uploadedFile) {
      try {
        // Validate file size (5MB limit)
        if (uploadedFile.size > 5 * 1024 * 1024) {
          return NextResponse.json({ error: "File size must be less than 5MB", type: "file_error" }, { status: 400 })
        }

        // Validate file type
        const allowedTypes = [
          "text/plain",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]

        if (!allowedTypes.includes(uploadedFile.type)) {
          return NextResponse.json(
            { error: "Unsupported file type. Please use TXT, PDF, DOC, or DOCX files.", type: "file_error" },
            { status: 400 },
          )
        }

        fileContent = await parseFileContent(uploadedFile)
        requestData.hasFile = true
      } catch (fileError) {
        return NextResponse.json(
          {
            error: fileError instanceof Error ? fileError.message : "File processing failed",
            type: "file_error",
          },
          { status: 400 },
        )
      }
    }

    // Create enhanced prompt
    const prompt = createEnhancedPrompt(requestData, fileContent)

    console.log("🎨 Generating varied slides with v0.dev-level design intelligence")
    console.log(`📊 Request: ${requestData.presentationType} presentation for ${requestData.audience}`)

    // Enhanced AI generation with better error handling
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8000,
      temperature: 0.9, // Higher temperature for more creative variety
      system: `You are SlydPRO AI, the world's most sophisticated presentation design system with the creative intelligence of v0.dev.

CORE MISSION: Create visually stunning, Fortune 500-caliber presentations with DESIGN VARIETY like v0.dev creates for websites.

DESIGN EXCELLENCE MANDATE:
• Each slide must be a visual masterpiece with UNIQUE styling
• Use DIFFERENT color themes across slides for visual interest
• Automatically suggest charts when content mentions data, metrics, or numbers
• Include meaningful business icons that reinforce the message
• Apply cutting-edge design effects: glassmorphism, premium shadows, gradients
• Perfect typography hierarchy with responsive scaling that FITS within slide boundaries
• Masterful composition with optimal white space and visual flow
• CRITICAL: Keep text concise - titles under 60 chars, bullets under 80 chars

VARIETY REQUIREMENT: Like v0.dev creates diverse website designs, create slides with varied themes, layouts, and visual styles.

CRITICAL: Always return valid JSON with no markdown formatting. Never compromise on visual excellence or text fitting.`,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const responseText = message.content[0].type === "text" ? message.content[0].text : ""

    // Enhanced JSON extraction with better error handling
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("Claude response without JSON:", responseText.substring(0, 500))
      return NextResponse.json({ error: "AI did not return valid JSON format", type: "ai_error" }, { status: 500 })
    }

    let result: GenerationResult
    try {
      result = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      return NextResponse.json({ error: "Invalid JSON structure from AI", type: "ai_error" }, { status: 500 })
    }

    // Enhanced validation of AI response
    if (!result.slides || !Array.isArray(result.slides)) {
      return NextResponse.json({ error: "Invalid slides data structure from AI", type: "ai_error" }, { status: 500 })
    }

    if (result.slides.length === 0) {
      return NextResponse.json({ error: "AI generated no slides", type: "ai_error" }, { status: 500 })
    }

    // Apply enhanced design system with variety
    const enhancedSlides = enhanceSlides(result.slides, result.designTheme)

    console.log(
      `✅ Generated ${enhancedSlides.length} varied slides with themes: ${enhancedSlides.map((s) => s.designTheme).join(", ")}`,
    )
    console.log(`🎯 Key metrics identified: ${result.keyMetrics?.join(", ") || "None"}`)

    return NextResponse.json({
      slides: enhancedSlides,
      message:
        result.message ||
        `Generated ${enhancedSlides.length} professionally designed slides with v0.dev-level variety and intelligence.`,
      designNotes: `Applied varied themes (${[...new Set(enhancedSlides.map((s) => s.designTheme))].join(", ")}) with modern design principles, intelligent visual enhancements, and Fortune 500-level quality standards.`,
      overallTheme: result.designTheme,
      keyMetrics: result.keyMetrics || [],
      generationStats: {
        slideCount: enhancedSlides.length,
        hasCharts: enhancedSlides.some((s) => s.chartData),
        hasTables: enhancedSlides.some((s) => s.tableData),
        hasIcons: enhancedSlides.some((s) => s.icons && s.icons.length > 0),
        designTheme: result.designTheme,
        processingTime: Date.now(),
        themeVariety: [...new Set(enhancedSlides.map((s) => s.designTheme))].length,
      },
    })
  } catch (error) {
    console.error("❌ Enhanced SlydPRO API Error:", error)

    // Enhanced error handling with specific error types
    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return NextResponse.json(
          {
            error: "Too many requests. Please wait a moment and try again.",
            type: "rate_limit",
            retryAfter: 60,
          },
          { status: 429 },
        )
      }

      if (error.message.includes("invalid_api_key")) {
        return NextResponse.json(
          {
            error: "API configuration error. Please check your Claude API key.",
            type: "auth_error",
          },
          { status: 401 },
        )
      }

      if (error.message.includes("context_length")) {
        return NextResponse.json(
          {
            error: "Content too long. Please reduce the prompt or file size.",
            type: "content_error",
          },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          error: `Enhanced generation failed: ${error.message}`,
          type: "generation_error",
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "An unexpected error occurred in the enhanced design system.",
        type: "unknown_error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
