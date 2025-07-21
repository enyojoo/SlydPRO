import { type NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Enhanced TypeScript interfaces
interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

interface ChartConfig {
  type: "bar" | "line" | "pie" | "area" | "donut"
  data: ChartDataPoint[]
  config?: {
    showGrid?: boolean
    gradient?: boolean
    colors?: string[]
    showLegend?: boolean
  }
}

interface TableData {
  headers: string[]
  rows: string[][]
}

interface IconData {
  icon: string
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
  color?: string
  size?: number
}

interface SlideRequest {
  prompt: string
  slideCount?: string | number
  presentationType?: "business" | "creative" | "minimal" | "vibrant" | "nature" | "ocean" | "sunset"
  audience?: string
  tone?: "professional" | "casual" | "inspiring" | "technical"
  includeCharts?: boolean
  includeTables?: boolean
}

interface GeneratedSlide {
  id: string
  title: string
  content: string
  layout: "title" | "content" | "chart" | "table" | "two-column" | "split"
  contentType: "opening" | "problem" | "solution" | "data" | "conclusion" | "transition"
  visualElements?: {
    suggestedChart?: string
    suggestedIcon?: string
    emphasis?: string
    tableData?: TableData
  }
}

interface EnhancedSlide extends GeneratedSlide {
  background: string
  textColor: string
  titleColor?: string
  accentColor?: string
  titleFont?: string
  contentFont?: string
  titleSize?: string
  contentSize?: string
  shadowEffect?: string
  borderRadius?: string
  glassmorphism?: boolean
  chartData?: ChartConfig
  tableData?: TableData
  icons?: IconData[]
  designTheme: string
  spacing?: "compact" | "comfortable" | "generous"
  alignment?: "left" | "center" | "right"
}

interface APIResponse {
  slides: EnhancedSlide[]
  message: string
  designNotes: string
  overallTheme: string
  keyMetrics: string[]
  generationStats: {
    slideCount: number
    processingTime: number
    hasCharts: boolean
    hasTables: boolean
  }
}

interface APIError {
  error: string
  type: "validation_error" | "file_error" | "ai_error" | "rate_limit_error" | "auth_error"
  details?: string
  retryAfter?: number
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
  },
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
    glassmorphism: "backdrop-blur-xl bg-white/10 border border-white/20",
    premiumShadow: "0 32px 64px -12px rgba(0, 0, 0, 0.35)",
    softGlow: "0 0 60px rgba(59, 130, 246, 0.2)",
    modernGradient: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
  },
  spacing: {
    compact: { padding: "2rem", gap: "1rem" },
    comfortable: { padding: "3rem", gap: "1.5rem" },
    generous: { padding: "4rem", gap: "2rem" },
  },
}

// Enhanced AI Prompting System
const createEnhancedPrompt = (request: SlideRequest): string => {
  const {
    prompt,
    slideCount = "auto",
    presentationType = "business",
    audience = "team",
    tone = "professional",
    includeCharts = true,
    includeTables = false,
  } = request

  return `You are SlydPRO AI, an expert presentation designer who creates Fortune 500-caliber slides that would impress any boardroom.

USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}
SLIDE COUNT: ${slideCount === "auto" ? "6-8 slides" : slideCount}
INCLUDE CHARTS: ${includeCharts}
INCLUDE TABLES: ${includeTables}

DESIGN PRINCIPLES FOR WORLD-CLASS PRESENTATIONS:
1. Create slides with powerful visual hierarchy and compelling headlines
2. Use data-driven insights with professional visualizations
3. Break complex information into digestible, impactful chunks
4. Ensure each slide advances the narrative with clear purpose
5. Include relevant metrics, charts, and professional icons
6. Design for executive-level audiences with premium aesthetics

REQUIRED JSON FORMAT (return ONLY valid JSON, no markdown):
{
  "slides": [
    {
      "id": "slide-1",
      "title": "Compelling, Executive-Level Title",
      "content": "• Concise, impactful bullet point\\n• Supporting detail with measurable outcome\\n• Clear value proposition or insight",
      "layout": "title|content|chart|table|two-column",
      "contentType": "opening|problem|solution|data|conclusion|transition",
      "visualElements": {
        "suggestedChart": "${includeCharts ? "bar|line|pie|area|donut" : "none"}",
        "suggestedIcon": "trending-up|target|lightbulb|users|dollar-sign|zap|star|award|globe",
        "emphasis": "key metrics, quotes, or call-to-action",
        ${includeTables ? '"tableData": { "headers": ["Column 1", "Column 2"], "rows": [["Data 1", "Data 2"]] },' : ""}
      }
    }
  ],
  "designTheme": "business|creative|minimal|vibrant|nature|ocean|sunset",
  "message": "Brief explanation of presentation flow and key insights",
  "keyMetrics": ["important", "numbers", "or", "statistics", "from", "content"]
}

Create slides that would win design awards and close million-dollar deals. Make them visually stunning and strategically structured.`
}

// Intelligent chart data generation
const generateChartData = (chartType: string, title: string, context?: string): ChartConfig | null => {
  const chartTemplates = {
    bar: {
      revenue: [
        { name: "Q1", value: 2400000 },
        { name: "Q2", value: 3200000 },
        { name: "Q3", value: 2800000 },
        { name: "Q4", value: 4100000 },
      ],
      growth: [
        { name: "2021", value: 45 },
        { name: "2022", value: 67 },
        { name: "2023", value: 89 },
        { name: "2024", value: 112 },
      ],
      market: [
        { name: "North America", value: 45 },
        { name: "Europe", value: 32 },
        { name: "Asia Pacific", value: 28 },
        { name: "Other", value: 15 },
      ],
    },
    line: {
      performance: [
        { name: "Jan", value: 85 },
        { name: "Feb", value: 88 },
        { name: "Mar", value: 92 },
        { name: "Apr", value: 89 },
        { name: "May", value: 95 },
        { name: "Jun", value: 98 },
      ],
      users: [
        { name: "Week 1", value: 1200 },
        { name: "Week 2", value: 1800 },
        { name: "Week 3", value: 2400 },
        { name: "Week 4", value: 3200 },
      ],
    },
    pie: {
      distribution: [
        { name: "Product A", value: 35 },
        { name: "Product B", value: 28 },
        { name: "Product C", value: 22 },
        { name: "Product D", value: 15 },
      ],
      demographics: [
        { name: "18-25", value: 25 },
        { name: "26-35", value: 35 },
        { name: "36-45", value: 25 },
        { name: "46+", value: 15 },
      ],
    },
  }

  // Intelligent selection based on title and context
  const titleLower = title.toLowerCase()
  const contextLower = (context || "").toLowerCase()

  let selectedData
  if (titleLower.includes("revenue") || titleLower.includes("sales")) {
    selectedData = chartTemplates.bar.revenue
  } else if (titleLower.includes("growth") || titleLower.includes("performance")) {
    selectedData = chartType === "line" ? chartTemplates.line.performance : chartTemplates.bar.growth
  } else if (titleLower.includes("market") || titleLower.includes("region")) {
    selectedData = chartType === "pie" ? chartTemplates.pie.distribution : chartTemplates.bar.market
  } else if (titleLower.includes("user") || titleLower.includes("customer")) {
    selectedData = chartType === "line" ? chartTemplates.line.users : chartTemplates.pie.demographics
  } else {
    // Default selection based on chart type
    selectedData =
      chartTemplates[chartType as keyof typeof chartTemplates]?.revenue ||
      chartTemplates[chartType as keyof typeof chartTemplates]?.performance ||
      chartTemplates[chartType as keyof typeof chartTemplates]?.distribution ||
      chartTemplates.bar.revenue
  }

  return {
    type: chartType as ChartConfig["type"],
    data: selectedData,
    config: {
      showGrid: chartType !== "pie" && chartType !== "donut",
      gradient: true,
      showLegend: chartType === "pie" || chartType === "donut",
    },
  }
}

// Professional table templates
const generateTableData = (context: string): TableData => {
  const tableTemplates = {
    financial: {
      headers: ["Metric", "Q3 2023", "Q4 2023", "Growth"],
      rows: [
        ["Revenue", "$2.4M", "$3.2M", "+33%"],
        ["Profit Margin", "18%", "22%", "+4pp"],
        ["Customer Count", "1,250", "1,680", "+34%"],
        ["ARPU", "$1,920", "$1,905", "-1%"],
      ],
    },
    comparison: {
      headers: ["Feature", "Basic", "Pro", "Enterprise"],
      rows: [
        ["Users", "5", "25", "Unlimited"],
        ["Storage", "10GB", "100GB", "1TB"],
        ["Support", "Email", "Priority", "Dedicated"],
        ["Price", "$9/mo", "$29/mo", "$99/mo"],
      ],
    },
    roadmap: {
      headers: ["Phase", "Timeline", "Key Features", "Status"],
      rows: [
        ["Phase 1", "Q1 2024", "Core Platform", "✅ Complete"],
        ["Phase 2", "Q2 2024", "Advanced Analytics", "🚧 In Progress"],
        ["Phase 3", "Q3 2024", "AI Integration", "📋 Planned"],
        ["Phase 4", "Q4 2024", "Mobile App", "📋 Planned"],
      ],
    },
  }

  const contextLower = context.toLowerCase()
  if (contextLower.includes("financial") || contextLower.includes("revenue") || contextLower.includes("profit")) {
    return tableTemplates.financial
  } else if (contextLower.includes("comparison") || contextLower.includes("pricing") || contextLower.includes("plan")) {
    return tableTemplates.comparison
  } else if (contextLower.includes("roadmap") || contextLower.includes("timeline") || contextLower.includes("phase")) {
    return tableTemplates.roadmap
  }

  return tableTemplates.comparison // Default
}

// Enhanced slide processing with intelligent design application
const enhanceSlides = (slides: GeneratedSlide[], designTheme = "business"): EnhancedSlide[] => {
  const palette =
    DESIGN_SYSTEM.colorPalettes[designTheme as keyof typeof DESIGN_SYSTEM.colorPalettes] ||
    DESIGN_SYSTEM.colorPalettes.business

  return slides.map((slide, index) => {
    const isTitle = slide.layout === "title" || index === 0
    const isClosing = index === slides.length - 1

    // Smart background selection with variation
    let background = palette.primary
    if (isTitle) {
      background = palette.primary // Hero slide
    } else if (isClosing) {
      background = palette.secondary // Closing slide
    } else if (index % 3 === 0) {
      background = palette.secondary // Variation every 3rd slide
    }

    // Responsive typography with clamp()
    const titleSize = isTitle ? "clamp(2.5rem, 4vw, 4.5rem)" : "clamp(1.75rem, 2.5vw, 2.75rem)"
    const contentSize = isTitle ? "clamp(1.25rem, 1.8vw, 1.75rem)" : "clamp(1rem, 1.4vw, 1.25rem)"

    // Generate chart data if suggested
    let chartData: ChartConfig | null = null
    if (
      slide.layout === "chart" ||
      (slide.visualElements?.suggestedChart && slide.visualElements.suggestedChart !== "none")
    ) {
      chartData = generateChartData(slide.visualElements?.suggestedChart || "bar", slide.title, slide.content)
    }

    // Generate table data if needed
    let tableData: TableData | undefined
    if (slide.layout === "table" || slide.visualElements?.tableData) {
      tableData = slide.visualElements?.tableData || generateTableData(slide.title + " " + slide.content)
    }

    // Professional icon mapping
    const iconMapping: { [key: string]: string } = {
      "trending-up": "TrendingUp",
      users: "Users",
      "dollar-sign": "DollarSign",
      target: "Target",
      zap: "Zap",
      star: "Star",
      award: "Award",
      globe: "Globe",
      lightbulb: "Lightbulb",
      chart: "BarChart3",
      growth: "TrendingUp",
      team: "Users",
    }

    const icons: IconData[] = []
    if (slide.visualElements?.suggestedIcon) {
      icons.push({
        icon: iconMapping[slide.visualElements.suggestedIcon] || slide.visualElements.suggestedIcon,
        position: "top-right",
        color: palette.accent,
        size: 28,
      })
    }

    return {
      ...slide,
      background,
      textColor: palette.text,
      titleColor: palette.text,
      accentColor: palette.accent,

      // Enhanced typography
      titleFont: DESIGN_SYSTEM.typography.title.fontFamily,
      contentFont: DESIGN_SYSTEM.typography.body.fontFamily,
      titleSize,
      contentSize,

      // Visual effects
      shadowEffect: DESIGN_SYSTEM.effects.premiumShadow,
      borderRadius: "24px",
      glassmorphism: slide.contentType === "data" || slide.contentType === "conclusion",

      // Data visualization
      chartData: chartData || undefined,
      tableData,
      icons,

      // Layout enhancements
      designTheme,
      spacing: "comfortable" as const,
      alignment: isTitle ? ("center" as const) : ("left" as const),
    }
  })
}

// File validation and processing
const validateAndProcessFile = async (file: File): Promise<string> => {
  // File size validation (5MB limit)
  const MAX_FILE_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
  }

  // File type validation
  const allowedTypes = [
    "text/plain",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Supported types: TXT, PDF, DOC, DOCX`)
  }

  try {
    const content = await file.text()

    // Content length validation (increased to 3000 chars for better context)
    const MAX_CONTENT_LENGTH = 3000
    if (content.length > MAX_CONTENT_LENGTH) {
      return content.substring(0, MAX_CONTENT_LENGTH) + "\n\n[Content truncated for processing...]"
    }

    return content
  } catch (error) {
    throw new Error(`Failed to read file content: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Main API route handler
export async function POST(request: NextRequest): Promise<NextResponse<APIResponse | APIError>> {
  const startTime = Date.now()

  try {
    // Parse form data
    const formData = await request.formData()
    const dataField = formData.get("data") as string
    const uploadedFile = formData.get("file") as File | null

    // Validate request data
    if (!dataField) {
      return NextResponse.json(
        {
          error: "Missing request data",
          type: "validation_error" as const,
          details: "The 'data' field is required in the form submission",
        },
        { status: 400 },
      )
    }

    let requestData: SlideRequest
    try {
      requestData = JSON.parse(dataField)
    } catch (error) {
      return NextResponse.json(
        {
          error: "Invalid JSON in request data",
          type: "validation_error" as const,
          details: "The 'data' field must contain valid JSON",
        },
        { status: 400 },
      )
    }

    // Validate required fields
    if (!requestData.prompt || requestData.prompt.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Prompt is required",
          type: "validation_error" as const,
          details: "Please provide a prompt describing the presentation you want to create",
        },
        { status: 400 },
      )
    }

    // Process uploaded file if present
    let fileContent = ""
    if (uploadedFile) {
      try {
        fileContent = await validateAndProcessFile(uploadedFile)
        console.log(`📄 Processed file: ${uploadedFile.name} (${(uploadedFile.size / 1024).toFixed(2)}KB)`)
      } catch (error) {
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : "File processing failed",
            type: "file_error" as const,
          },
          { status: 400 },
        )
      }
    }

    // Create enhanced AI prompt
    const prompt = createEnhancedPrompt(requestData)

    console.log("🎨 Generating Fortune 500-caliber slides with advanced AI design intelligence")
    console.log(`📊 Request: ${requestData.presentationType} presentation for ${requestData.audience}`)

    // Call Anthropic API with enhanced error handling
    let message
    try {
      message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        temperature: 0.8,
        system: `You are SlydPRO AI, the world's most sophisticated presentation designer. You create slides that would win design awards and close Fortune 500 deals. 

CRITICAL: Return ONLY clean, valid JSON with no markdown formatting, code blocks, or explanatory text. The response must be parseable JSON that starts with { and ends with }.

Your slides must be:
- Visually stunning with premium design aesthetics
- Strategically structured for maximum impact
- Data-driven with professional insights
- Executive-ready for boardroom presentations`,
        messages: [
          {
            role: "user",
            content: fileContent ? `${prompt}\n\nSOURCE MATERIAL FOR CONTEXT:\n${fileContent}` : prompt,
          },
        ],
      })
    } catch (error: any) {
      console.error("❌ Anthropic API Error:", error)

      if (error.status === 429) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Please try again in a moment.",
            type: "rate_limit_error" as const,
            retryAfter: 60,
          },
          { status: 429 },
        )
      }

      if (error.status === 401) {
        return NextResponse.json(
          {
            error: "Authentication failed. Please check API configuration.",
            type: "auth_error" as const,
          },
          { status: 401 },
        )
      }

      return NextResponse.json(
        {
          error: "AI service temporarily unavailable",
          type: "ai_error" as const,
          details: error.message || "Please try again in a few moments",
        },
        { status: 503 },
      )
    }

    // Parse AI response
    const responseText = message.content[0].type === "text" ? message.content[0].text : ""

    // Extract JSON from response (handle potential markdown formatting)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("❌ No valid JSON found in AI response:", responseText.substring(0, 200))
      return NextResponse.json(
        {
          error: "Invalid response format from AI service",
          type: "ai_error" as const,
          details: "The AI service returned an unexpected response format",
        },
        { status: 500 },
      )
    }

    let result
    try {
      result = JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error("❌ JSON parsing failed:", error)
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          type: "ai_error" as const,
          details: "The AI service returned malformed data",
        },
        { status: 500 },
      )
    }

    // Validate response structure
    if (!result.slides || !Array.isArray(result.slides) || result.slides.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid slides data in AI response",
          type: "ai_error" as const,
          details: "The AI service did not return valid slide data",
        },
        { status: 500 },
      )
    }

    // Apply enhanced design system
    const enhancedSlides = enhanceSlides(result.slides, result.designTheme)
    const processingTime = Date.now() - startTime

    // Generate response with comprehensive metadata
    const response: APIResponse = {
      slides: enhancedSlides,
      message: result.message || `Generated ${enhancedSlides.length} professionally designed slides.`,
      designNotes: `Applied ${result.designTheme || "business"} theme with Fortune 500-caliber design principles, intelligent visual enhancements, and premium typography.`,
      overallTheme: result.designTheme || "business",
      keyMetrics: result.keyMetrics || [],
      generationStats: {
        slideCount: enhancedSlides.length,
        processingTime,
        hasCharts: enhancedSlides.some((slide) => slide.chartData),
        hasTables: enhancedSlides.some((slide) => slide.tableData),
      },
    }

    console.log(`✅ Generated ${enhancedSlides.length} premium slides in ${processingTime}ms`)
    console.log(
      `🎯 Theme: ${result.designTheme}, Charts: ${response.generationStats.hasCharts}, Tables: ${response.generationStats.hasTables}`,
    )

    return NextResponse.json(response)
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error("❌ SlydPRO API Critical Error:", error)
    console.error(`⏱️ Failed after ${processingTime}ms`)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unexpected error occurred during slide generation",
        type: "ai_error" as const,
        details: "Please try again. If the problem persists, contact support.",
      },
      { status: 500 },
    )
  }
}
