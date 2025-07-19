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
    existingSlides = [],
    hasFile = false,
  } = request

  if (editMode === "selected" && selectedSlideId && selectedSlideTitle) {
    return `You are SlydPRO AI, an expert presentation designer with ultimate visual capabilities.

CONTEXT: Editing slide "${selectedSlideTitle}" (ID: ${selectedSlideId})
USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}

TASK: Update ONLY this slide with ultimate visual enhancements.

ULTIMATE VISUAL FEATURES:
- Charts: bar, line, pie, donut, area with real data
- Tables: interactive data tables with styling
- Icons: trending-up, users, dollar-sign, target, zap, star, award, globe
- Typography: custom fonts, sizes, colors
- Effects: glassmorphism, shadows, gradients
- Layouts: title, content, two-column, chart, table, infographic

OUTPUT FORMAT (JSON):
{
  "slides": [
    {
      "id": "${selectedSlideId}",
      "title": "Updated title",
      "content": "Updated content\\n• Point 1\\n• Point 2\\n• Point 3",
      "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "textColor": "#ffffff",
      "layout": "chart",
      "titleFont": "Inter",
      "titleSize": "2.5rem",
      "accentColor": "#fbbf24",
      "glassmorphism": true,
      "chartData": {
        "type": "bar",
        "data": [
          {"label": "Q1", "value": 65},
          {"label": "Q2", "value": 78},
          {"label": "Q3", "value": 90},
          {"label": "Q4", "value": 95}
        ],
        "config": {},
        "style": "modern"
      },
      "icons": [
        {
          "icon": "trending-up",
          "position": "top-right",
          "color": "#fbbf24",
          "size": "32"
        }
      ]
    }
  ],
  "message": "Enhanced slide with ultimate visual capabilities."
}`
  }

  return `You are SlydPRO AI, an expert presentation designer with ULTIMATE VISUAL CAPABILITIES.

USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}
SLIDE COUNT: ${slideCount === "auto" ? "5-10 slides" : slideCount}
${fileContent ? `FILE CONTENT: ${fileContent}` : ""}

ULTIMATE DESIGN SYSTEM:
1. VISUAL LAYOUTS: title, content, two-column, chart, table, infographic
2. CHARTS: Generate real data for bar, line, pie charts
3. TABLES: Create structured data tables
4. ICONS: Use trending-up, users, dollar-sign, target, zap, star, award, globe
5. TYPOGRAPHY: Custom fonts (Inter, Roboto, Poppins), sizes, colors
6. EFFECTS: Glassmorphism, gradients, shadows, accent colors
7. SPACING: generous, comfortable, relaxed
8. ALIGNMENT: left, center, right

CHART DATA EXAMPLES:
- Revenue: [{"label": "Q1", "value": 250000}, {"label": "Q2", "value": 320000}]
- Growth: [{"label": "2022", "value": 45}, {"label": "2023", "value": 78}]
- Market Share: [{"label": "Us", "value": 35}, {"label": "Competitor A", "value": 25}]

TABLE DATA EXAMPLES:
- Pricing: {"headers": ["Plan", "Price", "Features"], "rows": [["Basic", "$9", "5 users"], ["Pro", "$29", "50 users"]]}
- Metrics: {"headers": ["Metric", "Current", "Target"], "rows": [["Revenue", "$2M", "$5M"], ["Users", "10K", "50K"]]}

DESIGN PRINCIPLES:
1. Use gradients for backgrounds: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
2. Add glassmorphism for modern look
3. Include relevant icons for visual appeal
4. Use charts/tables for data-heavy slides
5. Apply accent colors for highlights
6. Ensure responsive typography

OUTPUT FORMAT (JSON):
{
  "slides": [
    {
      "id": "slide-1",
      "title": "Revolutionary Growth Strategy",
      "content": "Transforming market presence\\n• 300% revenue increase\\n• 50K new customers\\n• Global expansion",
      "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "textColor": "#ffffff",
      "layout": "infographic",
      "titleFont": "Inter",
      "titleSize": "3rem",
      "contentFont": "Inter",
      "spacing": "comfortable",
      "alignment": "left",
      "titleColor": "#ffffff",
      "accentColor": "#fbbf24",
      "shadowEffect": "0 20px 40px rgba(0,0,0,0.2)",
      "borderRadius": "20px",
      "glassmorphism": true,
      "chartData": {
        "type": "bar",
        "data": [
          {"label": "Q1 2023", "value": 125000},
          {"label": "Q2 2023", "value": 180000},
          {"label": "Q3 2023", "value": 245000},
          {"label": "Q4 2023", "value": 320000}
        ],
        "config": {"showGrid": true},
        "style": "modern"
      },
      "icons": [
        {
          "icon": "trending-up",
          "position": "top-right",
          "color": "#fbbf24",
          "size": "32"
        }
      ]
    },
    {
      "id": "slide-2",
      "title": "Market Analysis",
      "content": "Comprehensive market breakdown and opportunities",
      "background": "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      "textColor": "#ffffff",
      "layout": "table",
      "titleFont": "Inter",
      "titleSize": "2.5rem",
      "accentColor": "#ff6b6b",
      "glassmorphism": true,
      "tableData": {
        "headers": ["Segment", "Size ($M)", "Growth %", "Opportunity"],
        "rows": [
          ["Enterprise", "450", "15%", "High"],
          ["SMB", "280", "22%", "Medium"],
          ["Startup", "120", "35%", "High"]
        ],
        "style": "modern",
        "interactive": true
      },
      "icons": [
        {
          "icon": "target",
          "position": "top-right",
          "color": "#ff6b6b",
          "size": "28"
        }
      ]
    }
  ],
  "message": "Created ultimate visual presentation with charts, tables, and modern design.",
  "designNotes": "Enhanced with glassmorphism, gradients, and interactive elements for ${audience} audience."
}`
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

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8000,
      temperature: 0.7,
      system: "You are SlydPRO AI. Always respond with valid JSON matching the requested structure.",
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
      throw new Error("Claude did not return valid JSON")
    }

    const result = JSON.parse(jsonMatch[0])

    if (!result.slides || !Array.isArray(result.slides)) {
      throw new Error("Invalid slides data from Claude")
    }

    const validatedSlides = result.slides.map((slide: any, index: number) => ({
      id: slide.id || `slide-${Date.now()}-${index}`,
      title: slide.title || `Slide ${index + 1}`,
      content: slide.content || "",
      background: slide.background || "#1e40af",
      textColor: slide.textColor || "#ffffff",
      layout: slide.layout || "content",
    }))

    return NextResponse.json({
      slides: validatedSlides,
      message: result.message || `Generated ${validatedSlides.length} slides successfully.`,
      designNotes: result.designNotes || "",
    })
  } catch (error) {
    console.error("Claude API Error:", error)

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
            error: "API configuration error. Please check your setup.",
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
        error: "An unexpected error occurred. Please try again.",
        type: "unknown_error",
      },
      { status: 500 },
    )
  }
}
