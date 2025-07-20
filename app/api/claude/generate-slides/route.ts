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

// Load design context from environment variable (PRESERVED)
const getUltimateDesignContext = () => {
  if (process.env.SLYDPRO_DESIGN_CONTEXT) {
    try {
      return JSON.parse(process.env.SLYDPRO_DESIGN_CONTEXT)
    } catch (error) {
      console.warn("Failed to parse design context")
    }
  }

  return {
    version: "1.0.0",
    designPhilosophy: "Create pixel-perfect, modern presentations with advanced visual capabilities",
    visualContentCapabilities: {
      charts: { types: ["bar", "line", "pie", "area", "donut"] },
      tables: { styles: ["modern", "minimal"] },
      icons: { business: ["📊", "💼", "🎯", "📈", "🚀", "💡", "⚡", "🌟", "💰", "🌍"] },
    },
  }
}

// Content analysis for intelligent visual suggestions (PRESERVED)
const analyzeContentForVisuals = (content: string) => {
  const analysis = {
    hasData: /\d+%|\$\d+|(\d+,?\d*\s*(increase|decrease|growth|revenue|profit|sales))/i.test(content),
    hasComparisons: /(vs|versus|compared|compare|against|better|worse|metrics)/i.test(content),
    hasTimeline: /(q1|q2|q3|q4|quarter|month|year|2024|2025)/i.test(content),
    hasProcess: /(step|phase|stage|process|workflow)/i.test(content),
  }

  return {
    ...analysis,
    needsChart: analysis.hasData || analysis.hasTimeline,
    needsTable: analysis.hasComparisons,
    needsInfographic: analysis.hasProcess,
  }
}

// Enhanced sample data generators
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
  
  return patterns.performance
}

const createAdvancedSlidePrompt = (request: SlideGenerationRequest, fileContent?: string): string => {
  const designContext = getUltimateDesignContext()
  const contentAnalysis = analyzeContentForVisuals(request.prompt + " " + (fileContent || ""))

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
    return `You are SlydPRO AI, the world's most advanced presentation design system with ultimate visual intelligence.

DESIGN PHILOSOPHY: ${designContext.designPhilosophy}

CONTEXT: Editing slide "${selectedSlideTitle}" (ID: ${selectedSlideId})
USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}

CONTENT ANALYSIS: ${JSON.stringify(contentAnalysis)}

TASK: Update ONLY this slide with ultimate visual enhancements based on content analysis.

CRITICAL: If content has data/numbers, include chartData. If comparisons, include tableData. Always add relevant icons.

OUTPUT FORMAT (JSON):
{
  "slides": [
    {
      "id": "${selectedSlideId}",
      "title": "Enhanced title",
      "content": "Professional content\\n• Key insight\\n• Important metric\\n• Action item",
      "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "textColor": "#ffffff",
      "layout": "chart",
      "titleFont": "SF Pro Display, Inter, sans-serif",
      "contentFont": "SF Pro Text, Inter, sans-serif",
      "titleSize": "2.5rem",
      "contentSize": "1.125rem",
      "spacing": "comfortable",
      "alignment": "left",
      "titleColor": "#ffffff",
      "accentColor": "#fbbf24",
      "shadowEffect": "0 15px 35px rgba(0,0,0,0.1)",
      "borderRadius": "20px",
      "glassmorphism": true,
      "chartData": {
        "type": "bar",
        "data": [
          {"name": "Q1", "value": 65},
          {"name": "Q2", "value": 78},
          {"name": "Q3", "value": 90},
          {"name": "Q4", "value": 95}
        ],
        "config": {"showGrid": true},
        "style": "modern"
      },
      "icons": [
        {
          "icon": "📊",
          "position": "top-right",
          "color": "#fbbf24",
          "size": "24"
        }
      ],
      "animations": {
        "entrance": "fadeIn",
        "emphasis": []
      },
      "customCSS": ""
    }
  ],
  "message": "Enhanced slide with ultimate visual capabilities."
}`
  }

  return `You are SlydPRO AI, the world's most advanced presentation design system with ultimate visual intelligence.

DESIGN PHILOSOPHY: ${designContext.designPhilosophy}

USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}
SLIDE COUNT: ${slideCount === "auto" ? "5-8 slides optimal" : slideCount}
${fileContent ? `\nSOURCE CONTENT:\n${fileContent.substring(0, 1000)}...` : ""}

CONTENT ANALYSIS: ${JSON.stringify(contentAnalysis)}

ULTIMATE DESIGN CAPABILITIES:
- Chart Types: ${Array.isArray(designContext.visualContentCapabilities?.charts?.types) ? designContext.visualContentCapabilities.charts.types.join(", ") : "bar, line, pie, area, donut"}
- Table Styles: ${Array.isArray(designContext.visualContentCapabilities?.tables?.styles) ? designContext.visualContentCapabilities.tables.styles.join(", ") : "modern, minimal"} 
- Business Icons: ${Array.isArray(designContext.visualContentCapabilities?.icons?.business) ? designContext.visualContentCapabilities.icons.business.join(", ") : "📊💼🎯📈🚀💡"}

CRITICAL INSTRUCTIONS:
1. When content has data/numbers → ALWAYS include chartData with realistic sample data
2. When content has comparisons → ALWAYS include tableData with proper formatting
3. ALWAYS add relevant business icons to enhance visual appeal
4. Apply modern gradients, glassmorphism, and professional typography
5. Use appropriate layouts based on content type

DESIGN SYSTEM:
- Layouts: title, content, two-column, chart, table, infographic
- Backgrounds: Use modern gradients like "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)"
- Typography: SF Pro Display/Inter for titles, SF Pro Text/Inter for content
- Effects: glassmorphism, shadows, rounded corners, accent colors
- Spacing: generous, comfortable, relaxed
- Icons: 📊 📈 💼 🎯 🚀 💡 ⚡ 🌟 💰 🌍 (use relevant ones)

OUTPUT FORMAT (JSON):
{
  "slides": [
    {
      "id": "slide-1",
      "title": "Compelling Business Title",
      "content": "Strategic opening statement\\n• Key performance metric\\n• Growth achievement\\n• Future opportunity",
      "background": "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
      "textColor": "#ffffff",
      "layout": "title",
      "titleFont": "SF Pro Display, Inter, sans-serif",
      "contentFont": "SF Pro Text, Inter, sans-serif",
      "titleSize": "clamp(2.5rem, 5vw, 4rem)",
      "contentSize": "clamp(1rem, 1.5vw, 1.125rem)",
      "spacing": "generous",
      "alignment": "center",
      "titleColor": "#ffffff",
      "accentColor": "#fbbf24",
      "shadowEffect": "0 20px 40px rgba(0,0,0,0.15)",
      "borderRadius": "24px",
      "glassmorphism": true,
      "icons": [
        {
          "icon": "🚀",
          "position": "top-right",
          "color": "#fbbf24",
          "size": "32"
        }
      ],
      "animations": {
        "entrance": "fadeIn",
        "emphasis": []
      },
      "customCSS": ""
    },
    {
      "id": "slide-2",
      "title": "Performance Metrics",
      "content": "Quarterly growth showing strong upward trend",
      "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "textColor": "#ffffff",
      "layout": "chart",
      "titleFont": "SF Pro Display, Inter, sans-serif",
      "contentFont": "SF Pro Text, Inter, sans-serif",
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
        "config": {"showGrid": true, "title": "Revenue Growth"},
        "style": "modern"
      },
      "tableData": null,
      "icons": [
        {
          "icon": "📊",
          "position": "top-right",
          "color": "#34d399",
          "size": "24"
        }
      ],
      "animations": {
        "entrance": "fadeIn",
        "emphasis": []
      },
      "customCSS": ""
    }
  ],
  "message": "Created ultimate presentation with sophisticated visual intelligence and modern design.",
  "designNotes": "Applied design context intelligence with automatic chart/table generation based on content analysis."
}

Generate pixel-perfect slides with ultimate visual capabilities:
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

    console.log("🎨 Generating ultimate presentation with design context for:", requestData.prompt)

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8000, // PRESERVED
      temperature: 0.85, // PRESERVED - Higher creativity for design
      system: `You are SlydPRO AI, the ultimate presentation design system with advanced visual intelligence.

CRITICAL INSTRUCTIONS:
- Always respond with valid JSON matching the exact structure requested
- Use the design context to make intelligent design decisions
- When data is detected, ALWAYS include chartData with realistic sample data
- When comparisons are found, ALWAYS include tableData with proper formatting
- ALWAYS add relevant icons and visual elements
- Apply modern design trends: gradients, shadows, glassmorphism, proper typography
- Ensure every slide looks like it was designed by Apple's keynote team`,
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

    // COMPLETE validation with ALL advanced properties (PRESERVED & ENHANCED)
    const designContext = getUltimateDesignContext()
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

        // Advanced design properties with design context defaults (PRESERVED)
        titleFont: slide.titleFont || "SF Pro Display, Inter, sans-serif",
        contentFont: slide.contentFont || "SF Pro Text, Inter, sans-serif",
        titleSize: slide.titleSize || (index === 0 ? "clamp(2.5rem, 5vw, 4rem)" : "clamp(1.75rem, 3vw, 2.5rem)"),
        contentSize: slide.contentSize || "clamp(1rem, 1.5vw, 1.125rem)",
        spacing: slide.spacing || "comfortable",
        alignment: slide.alignment || (index === 0 ? "center" : "left"),
        titleColor: slide.titleColor || "#ffffff",
        accentColor: slide.accentColor || "#fbbf24",
        shadowEffect: slide.shadowEffect || "0 15px 35px rgba(0,0,0,0.1)",
        borderRadius: slide.borderRadius || "20px",
        glassmorphism: slide.glassmorphism || false,

        // Visual content with validation (PRESERVED & ENHANCED)
        chartData: slide.chartData
          ? {
              type: slide.chartData.type || "bar",
              data: slide.chartData.data || [],
              config: slide.chartData.config || {},
              style: slide.chartData.style || "modern",
            }
          : null,

        tableData: slide.tableData
          ? {
              headers: slide.tableData.headers || [],
              rows: slide.tableData.rows || [],
              style: slide.tableData.style || "modern",
              interactive: slide.tableData.interactive || false,
            }
          : null,

        icons: slide.icons || [],

        // Animation and effects (PRESERVED)
        animations: slide.animations || {
          entrance: "fadeIn",
          emphasis: [],
        },
        customCSS: slide.customCSS || "",
      }

      // Intelligent enhancement based on content analysis (ENHANCED)
      const content = (enhancedSlide.title + " " + enhancedSlide.content).toLowerCase()
      const contentAnalysis = analyzeContentForVisuals(content)
      
      // Auto-generate chart data if needed and not provided
      if (contentAnalysis.needsChart && !enhancedSlide.chartData && enhancedSlide.layout !== "table") {
        enhancedSlide.layout = "chart"
        enhancedSlide.chartData = {
          type: content.includes('market') || content.includes('region') ? "pie" : "bar",
          data: generateSampleData(
            content.includes('revenue') ? "revenue" :
            content.includes('growth') ? "growth" :
            content.includes('market') ? "market" : "performance",
            enhancedSlide.title
          ),
          config: { showGrid: true },
          style: "modern"
        }
      }

      // Auto-generate table data if needed and not provided
      if (contentAnalysis.needsTable && !enhancedSlide.tableData && enhancedSlide.layout !== "chart") {
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

      // Auto-add relevant icons if missing
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
            size: "32"
          })
        }
      }

      return enhancedSlide
    })

    console.log(`✅ Generated ${validatedSlides.length} ultimate slides with visual content`)

    return NextResponse.json({
      slides: validatedSlides,
      message:
        result.message || `Generated ${validatedSlides.length} pixel-perfect slides with ultimate design intelligence.`,
      designNotes: result.designNotes || "Applied ultimate design context intelligence with modern visual effects.",
      overallTheme: result.overallTheme, // PRESERVED
    })
  } catch (error) {
    console.error("❌ Ultimate SlydPRO API Error:", error)

    // PRESERVED error handling
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
          error: `Ultimate generation failed: ${error.message}`,
          type: "generation_error",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "An unexpected error occurred in the ultimate design system.",
        type: "unknown_error",
      },
      { status: 500 },
    )
  }
}
