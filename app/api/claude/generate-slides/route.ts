import { type NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface SlideGenerationRequest {
  prompt: string
  slideCount?: number
  presentationType?: "business" | "academic" | "creative" | "technical" | "marketing"
  audience?: "executive" | "team" | "public" | "students" | "clients"
  tone?: "professional" | "casual" | "persuasive" | "educational" | "inspiring"
  editMode?: "all" | "selected"
  selectedSlideId?: string
  selectedSlideTitle?: string
  existingSlides?: any[]
  hasFile?: boolean
}

// Sample data generators for different chart types
const generateSampleData = (type: string, title: string) => {
  const patterns = {
    revenue: [
      { name: "Q1", value: 850000 },
      { name: "Q2", value: 920000 },
      { name: "Q3", value: 1100000 },
      { name: "Q4", value: 1400000 }
    ],
    growth: [
      { name: "2021", value: 120 },
      { name: "2022", value: 145 },
      { name: "2023", value: 189 },
      { name: "2024", value: 234 }
    ],
    market: [
      { name: "North America", value: 45 },
      { name: "Europe", value: 30 },
      { name: "Asia Pacific", value: 15 },
      { name: "Other", value: 10 }
    ],
    performance: [
      { name: "Customer Satisfaction", value: 92 },
      { name: "Sales Target", value: 115 },
      { name: "Team Performance", value: 88 },
      { name: "Market Penetration", value: 78 }
    ]
  }

  // Determine which pattern to use based on slide title/content
  const titleLower = title.toLowerCase()
  if (titleLower.includes('revenue') || titleLower.includes('financial')) {
    return patterns.revenue
  } else if (titleLower.includes('growth') || titleLower.includes('trend')) {
    return patterns.growth
  } else if (titleLower.includes('market') || titleLower.includes('region')) {
    return patterns.market
  } else if (titleLower.includes('performance') || titleLower.includes('kpi') || titleLower.includes('metric')) {
    return patterns.performance
  }
  
  // Default data
  return patterns.performance
}

const createAdvancedSlidePrompt = (request: SlideGenerationRequest, fileContent?: string): string => {
  const {
    prompt,
    slideCount = "auto",
    presentationType = "business",
    audience = "team",
    tone = "professional",
    editMode = "all",
    selectedSlideId,
    selectedSlideTitle,
    hasFile = false,
  } = request

  if (editMode === "selected" && selectedSlideId && selectedSlideTitle) {
    return `You are SlydPRO AI, an expert presentation designer with advanced visual capabilities.

TASK: Update ONLY the slide titled "${selectedSlideTitle}" based on this request: "${prompt}"

DESIGN REQUIREMENTS:
- Create a visually stunning slide with modern design
- Use appropriate layout: title, content, chart, table, or two-column
- Include relevant visual elements (charts/tables) when data is mentioned
- Apply modern color schemes and typography
- Add business icons when appropriate

OUTPUT FORMAT (JSON):
{
  "slides": [
    {
      "id": "${selectedSlideId}",
      "title": "Enhanced Slide Title",
      "content": "Professional content with bullet points\\n• Key insight\\n• Important metric\\n• Action item",
      "background": "linear-gradient(135deg, #027659 0%, #065f46 100%)",
      "textColor": "#ffffff",
      "layout": "content",
      "titleFont": "Inter, system-ui, sans-serif",
      "contentFont": "Inter, system-ui, sans-serif", 
      "titleSize": "2.5rem",
      "contentSize": "1.125rem",
      "spacing": "comfortable",
      "alignment": "left",
      "titleColor": "#ffffff",
      "accentColor": "#10b981",
      "shadowEffect": "0 20px 40px rgba(0,0,0,0.15)",
      "borderRadius": "20px",
      "glassmorphism": true,
      "icons": [
        {
          "icon": "📊",
          "position": "top-right",
          "color": "#10b981",
          "size": "24"
        }
      ]
    }
  ],
  "message": "Enhanced slide with modern visual design."
}`
  }

  return `You are SlydPRO AI, the world's most advanced presentation design system.

USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}
SLIDE COUNT: ${slideCount === "auto" ? "5-8 slides optimal" : slideCount}
${fileContent ? `\nSOURCE CONTENT:\n${fileContent.substring(0, 1000)}...` : ""}

DESIGN PRINCIPLES:
1. Create visually stunning slides with modern gradients and typography
2. Use appropriate layouts based on content type
3. Include charts/tables when data is mentioned
4. Add relevant business icons for visual appeal
5. Apply glassmorphism and shadow effects for premium look
6. Use professional color schemes

AVAILABLE LAYOUTS:
- "title": Opening/closing slides with large typography
- "content": Main information with bullet points and icons
- "chart": Data visualization with charts
- "table": Structured data presentation
- "two-column": Side-by-side content comparison

VISUAL GUIDELINES:
- Use gradient backgrounds: "linear-gradient(135deg, #027659 0%, #065f46 100%)"
- Apply glassmorphism for modern look
- Include business icons: 📊, 📈, 💼, 🎯, 🚀, 💡, ⚡, 🌟
- Use accent colors for highlights: #10b981, #34d399
- Modern typography: Inter, system-ui, sans-serif

OUTPUT FORMAT (JSON):
{
  "slides": [
    {
      "id": "slide-1",
      "title": "Compelling Business Title",
      "content": "Strategic opening statement\\n• Key performance metric\\n• Growth achievement\\n• Future opportunity",
      "background": "linear-gradient(135deg, #027659 0%, #065f46 100%)",
      "textColor": "#ffffff",
      "layout": "title",
      "titleFont": "Inter, system-ui, sans-serif",
      "contentFont": "Inter, system-ui, sans-serif",
      "titleSize": "3.5rem",
      "contentSize": "1.125rem",
      "spacing": "generous",
      "alignment": "center",
      "titleColor": "#ffffff",
      "accentColor": "#10b981",
      "shadowEffect": "0 20px 40px rgba(0,0,0,0.15)",
      "borderRadius": "24px",
      "glassmorphism": true,
      "icons": [
        {
          "icon": "🚀",
          "position": "top-right",
          "color": "#10b981",
          "size": "24"
        }
      ]
    },
    {
      "id": "slide-2", 
      "title": "Performance Metrics",
      "content": "Quarterly growth showing strong upward trend",
      "background": "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
      "textColor": "#ffffff",
      "layout": "chart",
      "titleFont": "Inter, system-ui, sans-serif",
      "contentFont": "Inter, system-ui, sans-serif",
      "titleSize": "2.5rem", 
      "contentSize": "1.125rem",
      "spacing": "comfortable",
      "alignment": "left",
      "titleColor": "#ffffff",
      "accentColor": "#34d399",
      "shadowEffect": "0 15px 35px rgba(0,0,0,0.1)",
      "borderRadius": "20px",
      "glassmorphism": false,
      "chartData": {
        "type": "bar",
        "data": [
          {"name": "Q1 2024", "value": 125000},
          {"name": "Q2 2024", "value": 180000},
          {"name": "Q3 2024", "value": 245000},
          {"name": "Q4 2024", "value": 320000}
        ],
        "config": {"showGrid": true},
        "style": "modern"
      },
      "icons": [
        {
          "icon": "📊", 
          "position": "top-right",
          "color": "#34d399",
          "size": "24"
        }
      ]
    }
  ],
  "message": "Created stunning presentation with advanced visual design.",
  "designNotes": "Applied modern gradients, glassmorphism, and intelligent chart generation."
}

Generate pixel-perfect slides with premium visual design:
`
}

const parseFileContent = async (file: File): Promise<string> => {
  const text = await file.text()
  return text.substring(0, 2000) // Limit file content
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const dataField = formData.get("data") as string
    const requestData = JSON.parse(dataField || "{}") as SlideGenerationRequest
    const uploadedFile = formData.get("file") as File | null

    let fileContent = ""
    if (uploadedFile) {
      fileContent = await parseFileContent(uploadedFile)
    }

    const prompt = createAdvancedSlidePrompt(
      {
        ...requestData,
        hasFile: !!uploadedFile,
      },
      fileContent,
    )

    console.log("🎨 Generating enhanced presentation for:", requestData.prompt)

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8000,
      temperature: 0.85,
      system: `You are SlydPRO AI, the ultimate presentation design system.

CRITICAL INSTRUCTIONS:
- Always respond with valid JSON matching the exact structure requested
- Create visually stunning slides with modern design elements
- When data/metrics are mentioned, ALWAYS include chartData with realistic sample data
- When comparisons are found, ALWAYS include tableData with proper formatting
- ALWAYS add relevant icons and visual elements
- Apply modern design: gradients, glassmorphism, shadows, premium typography
- Use professional color schemes and spacing
- Every slide should look like it was designed by a premium design agency`,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const responseText = message.content[0].type === "text" ? message.content[0].text : ""

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("Claude response without JSON:", responseText.substring(0, 1000))
      throw new Error("Claude did not return valid JSON format")
    }

    let result
    try {
      result = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      throw new Error("Invalid JSON structure from Claude")
    }

    if (!result.slides || !Array.isArray(result.slides)) {
      throw new Error("Invalid slides data structure from Claude")
    }

    // Enhanced validation and data enrichment
    const validatedSlides = result.slides.map((slide: any, index: number) => {
      // Create beautiful gradient backgrounds
      const gradients = [
        "linear-gradient(135deg, #027659 0%, #065f46 100%)",
        "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
        "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
        "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
        "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
        "linear-gradient(135deg, #059669 0%, #047857 100%)"
      ]

      const enhancedSlide = {
        id: slide.id || `slide-${Date.now()}-${index}`,
        title: slide.title || `Slide ${index + 1}`,
        content: slide.content || "",
        background: slide.background || gradients[index % gradients.length],
        textColor: slide.textColor || "#ffffff",
        layout: slide.layout || (index === 0 ? "title" : "content"),

        // Advanced design properties
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

        // Enhanced visual content
        chartData: null,
        tableData: null,
        icons: slide.icons || [],

        // Animation and effects
        animations: slide.animations || {
          entrance: "fadeIn",
          emphasis: [],
        },
        customCSS: slide.customCSS || "",
      }

      // Intelligent chart/table generation based on content
      const content = (slide.title + " " + slide.content).toLowerCase()
      
      // Auto-generate chart data if slide mentions data/metrics
      if ((content.includes('revenue') || content.includes('growth') || content.includes('performance') || 
           content.includes('metric') || content.includes('data') || content.includes('chart') ||
           content.includes('quarter') || content.includes('sales') || content.includes('market')) &&
          !slide.chartData && enhancedSlide.layout !== "table") {
        
        enhancedSlide.layout = "chart"
        enhancedSlide.chartData = {
          type: content.includes('market') || content.includes('region') ? "pie" : "bar",
          data: generateSampleData(
            content.includes('revenue') ? "revenue" :
            content.includes('growth') ? "growth" :
            content.includes('market') ? "market" : "performance",
            slide.title
          ),
          config: { showGrid: true },
          style: "modern"
        }
      }

      // Auto-generate table data if slide mentions comparisons
      if ((content.includes('compare') || content.includes('vs') || content.includes('metrics') ||
           content.includes('table') || content.includes('benchmark')) && 
          !slide.tableData && enhancedSlide.layout !== "chart") {
        
        enhancedSlide.layout = "table"
        enhancedSlide.tableData = {
          headers: ["Metric", "Q3", "Q4", "Growth"],
          rows: [
            ["New Customers", "1,200", "1,850", "+54%"],
            ["Revenue", "$1.2M", "$1.8M", "+50%"],
            ["Market Share", "12%", "15%", "+25%"],
            ["Customer Satisfaction", "4.2", "4.6", "+9%"]
          ],
          style: "modern",
          interactive: false
        }
      }

      // Auto-add relevant icons based on content
      if (enhancedSlide.icons.length === 0) {
        if (content.includes('revenue') || content.includes('financial')) {
          enhancedSlide.icons.push({
            icon: "💰",
            position: "top-right",
            color: enhancedSlide.accentColor,
            size: "24"
          })
        } else if (content.includes('growth') || content.includes('trend')) {
          enhancedSlide.icons.push({
            icon: "📈",
            position: "top-right", 
            color: enhancedSlide.accentColor,
            size: "24"
          })
        } else if (content.includes('performance') || content.includes('metric')) {
          enhancedSlide.icons.push({
            icon: "📊",
            position: "top-right",
            color: enhancedSlide.accentColor,
            size: "24"
          })
        } else if (content.includes('target') || content.includes('goal')) {
          enhancedSlide.icons.push({
            icon: "🎯",
            position: "top-right",
            color: enhancedSlide.accentColor,
            size: "24"
          })
        } else if (index === 0) {
          enhancedSlide.icons.push({
            icon: "🚀",
            position: "top-right",
            color: enhancedSlide.accentColor,
            size: "24"
          })
        }
      }

      return enhancedSlide
    })

    console.log(`✅ Generated ${validatedSlides.length} enhanced slides with premium design`)

    return NextResponse.json({
      slides: validatedSlides,
      message: result.message || `Generated ${validatedSlides.length} stunning slides with premium visual design.`,
      designNotes: result.designNotes || "Applied advanced design intelligence with modern visual effects.",
      overallTheme: result.overallTheme,
    })
  } catch (error) {
    console.error("❌ SlydPRO API Error:", error)

    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return NextResponse.json(
          {
            error: "Too many requests. Please wait a moment and try again.",
            type: "rate_limit",
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

      return NextResponse.json(
        {
          error: `Generation failed: ${error.message}`,
          type: "generation_error",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "An unexpected error occurred in the design system.",
        type: "unknown_error",
      },
      { status: 500 },
    )
  }
}
