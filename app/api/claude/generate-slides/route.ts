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

// Load design context from environment variable
const getUltimateDesignContext = () => {
  if (!process.env.SLYDPRO_DESIGN_CONTEXT) {
    throw new Error("SLYDPRO_DESIGN_CONTEXT environment variable is required and missing")
  }

  try {
    return JSON.parse(process.env.SLYDPRO_DESIGN_CONTEXT)
  } catch (error) {
    throw new Error("SLYDPRO_DESIGN_CONTEXT contains invalid JSON format")
  }
}

// Apply design context intelligence to slides
const applyDesignContext = (slides: any[], designContext: any) => {
  // DEBUG: Log the actual design context structure
  console.log("🔍 Design Context Structure:", JSON.stringify(designContext, null, 2))

  return slides.map((slide, index) => {
    const contentType = slide.contentType || "business"

    // DEBUG: Log what we're looking for
    console.log("🎨 Looking for colors for contentType:", contentType)
    console.log("🎨 Available colorIntelligence:", designContext.colorIntelligence)

    // Try multiple ways to get colors from design context
    let colorRules = null

    // Method 1: Psychology mapping
    if (designContext.colorIntelligence?.psychologyMapping?.[contentType]) {
      colorRules = designContext.colorIntelligence.psychologyMapping[contentType]
      console.log("✅ Found psychology mapping colors:", colorRules)
    }

    // Method 2: Advanced palettes array
    else if (
      Array.isArray(designContext.colorIntelligence?.advancedPalettes) &&
      designContext.colorIntelligence.advancedPalettes.length > 0
    ) {
      colorRules =
        designContext.colorIntelligence.advancedPalettes[
          index % designContext.colorIntelligence.advancedPalettes.length
        ]
      console.log("✅ Found palette colors:", colorRules)
    }

    // Method 3: First palette if available
    else if (designContext.colorIntelligence?.advancedPalettes?.[0]) {
      colorRules = designContext.colorIntelligence.advancedPalettes[0]
      console.log("✅ Using first palette:", colorRules)
    }

    // Enhanced fallback gradients (always works)
    const fallbackGradients = [
      "linear-gradient(135deg, #027659 0%, #065f46 100%)", // Green
      "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)", // Blue
      "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)", // Purple
      "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)", // Red
      "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", // Orange
      "linear-gradient(135deg, #059669 0%, #047857 100%)", // Emerald
    ]

    const iconRules = designContext.iconSystems?.contextualMapping?.[contentType] || []
    const layoutRules =
      designContext.layoutMastery?.slideTemplates?.find((template: any) => template.name === slide.layout) || {}

    // Apply colors with multiple fallback levels
    const finalSlide = {
      ...slide,
      // Background - try multiple sources
      background: colorRules?.gradient || colorRules?.primary || fallbackGradients[index % fallbackGradients.length],

      // Text color - ensure it's always readable
      textColor: colorRules?.text || "#ffffff",
      titleColor: colorRules?.accent || "#ffffff",
      accentColor: colorRules?.accent || "#fbbf24",

      // Icon from design context
      professionalIcon:
        Array.isArray(iconRules) && iconRules.length > 0
          ? {
              name: iconRules[0],
              position: layoutRules.iconPlacement || "top-right",
              style: "outline",
              color: colorRules?.accent || "#fbbf24",
            }
          : null,

      // Typography with fallbacks
      titleFont: designContext.typographyMastery?.fontStacks?.[0]?.name || "Inter, sans-serif",
      contentFont: designContext.typographyMastery?.fontStacks?.[1]?.name || "Inter, sans-serif",

      // Layout properties with fallbacks
      spacing: designContext.layoutMastery?.spacingRules?.comfortable || "comfortable",
      alignment: slide.layout === "title" ? "center" : "left",
      titleSize: slide.layout === "title" ? "clamp(2.5rem, 5vw, 4rem)" : "clamp(1.75rem, 3vw, 2.5rem)",
      contentSize: "clamp(1rem, 1.5vw, 1.125rem)",

      // Visual effects with fallbacks
      shadowEffect: designContext.visualEffects?.shadows?.elegant || "0 15px 35px rgba(0,0,0,0.1)",
      borderRadius: designContext.visualEffects?.borderRadius?.modern || "20px",
      glassmorphism: designContext.visualEffects?.glassmorphism || false,
    }

    console.log("🎨 Final slide colors:", {
      background: finalSlide.background,
      textColor: finalSlide.textColor,
    })

    return finalSlide
  })
}

// Build simplified instructions using design context
const buildInstructions = (designContext: any) => `
Generate SIMPLE slides with just content. The design context will handle ALL styling.

SIMPLE SLIDE STRUCTURE:
{
  "id": "slide-1",
  "title": "Clear Title",
  "content": "Slide content here",
  "contentType": "financial" | "growth" | "team" | "strategy" | "data",
  "layout": "title" | "content" | "chart" | "table"
}

CONTENT TYPES for design context mapping:
- "financial": Revenue, profit, money-related content
- "growth": Metrics, trends, increases
- "team": People, collaboration, users
- "strategy": Plans, goals, objectives
- "data": Analytics, charts, insights

The design context will automatically apply:
✅ Appropriate colors based on psychology mapping
✅ Contextual icons based on content type
✅ Professional typography from font stacks
✅ Optimal spacing and layout rules
✅ Icon positioning based on layout templates

DON'T specify colors, icons, or styling - let design context handle it!
`

// Content analysis for intelligent visual suggestions
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
      { name: "Q4", value: 1400000 },
    ],
    growth: [
      { name: "2021", value: 120 },
      { name: "2022", value: 145 },
      { name: "2023", value: 189 },
      { name: "2024", value: 234 },
    ],
    market: [
      { name: "North America", value: 45 },
      { name: "Europe", value: 30 },
      { name: "Asia Pacific", value: 15 },
      { name: "Other", value: 10 },
    ],
    performance: [
      { name: "Customer Satisfaction", value: 92 },
      { name: "Sales Target", value: 115 },
      { name: "Team Performance", value: 88 },
      { name: "Market Penetration", value: 78 },
    ],
  }

  const titleLower = title.toLowerCase()
  if (titleLower.includes("revenue") || titleLower.includes("financial")) {
    return patterns.revenue
  } else if (titleLower.includes("growth") || titleLower.includes("trend")) {
    return patterns.growth
  } else if (titleLower.includes("market") || titleLower.includes("region")) {
    return patterns.market
  } else if (titleLower.includes("performance") || titleLower.includes("kpi") || titleLower.includes("metric")) {
    return patterns.performance
  }

  return patterns.performance
}

const parseFileContent = async (file: File): Promise<string> => {
  const text = await file.text()
  return text.substring(0, 2000)
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

    // Temporary debug: Check your design context
    console.log("📋 Raw SLYDPRO_DESIGN_CONTEXT:", process.env.SLYDPRO_DESIGN_CONTEXT?.substring(0, 500))

    // Get design context
    const designContext = getUltimateDesignContext()
    const instructions = buildInstructions(designContext)

    const {
      prompt,
      slideCount = "auto",
      presentationType = "business",
      audience = "team",
      tone = "professional",
      editMode = "all",
      selectedSlideId,
      selectedSlideTitle,
    } = requestData

    const systemPrompt = `You are SlydPRO's design AI. Create simple slide content - the design context handles all styling.

${instructions}

Return only clean JSON with slides array. No styling properties needed.`

    const userPrompt =
      editMode === "selected" && selectedSlideId && selectedSlideTitle
        ? `Transform the slide "${selectedSlideTitle}" based on: "${prompt}"`
        : `Create a ${slideCount === "auto" ? "6-8 slide" : slideCount} presentation for: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}
${fileContent ? `\nSOURCE MATERIAL:\n${fileContent.substring(0, 800)}...` : ""}`

    console.log("🎨 Generating slides with design context intelligence for:", requestData.prompt)

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      temperature: 0.95,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
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

    // Apply design context intelligence to raw slides
    let enhancedSlides = applyDesignContext(result.slides, designContext)

    // Add visual content based on content analysis
    enhancedSlides = enhancedSlides.map((slide) => {
      const content = (slide.title + " " + slide.content).toLowerCase()
      const contentAnalysis = analyzeContentForVisuals(content)

      // Auto-generate chart data if needed
      if (contentAnalysis.needsChart && slide.layout !== "table") {
        slide.layout = "chart"
        slide.chartData = {
          type: content.includes("market") || content.includes("region") ? "pie" : "bar",
          data: generateSampleData(
            content.includes("revenue")
              ? "revenue"
              : content.includes("growth")
                ? "growth"
                : content.includes("market")
                  ? "market"
                  : "performance",
            slide.title,
          ),
          config: { showGrid: true },
          style: "modern",
        }
      }

      // Auto-generate table data if needed
      if (contentAnalysis.needsTable && slide.layout !== "chart") {
        slide.layout = "table"
        slide.tableData = {
          headers: ["Metric", "Q3", "Q4", "Growth"],
          rows: [
            ["New Customers", "1,200", "1,850", "+54%"],
            ["Revenue", "$1.2M", "$1.8M", "+50%"],
            ["Market Share", "12%", "15%", "+25%"],
            ["Customer Satisfaction", "4.2", "4.6", "+9%"],
          ],
          style: "modern",
          interactive: false,
        }
      }

      return slide
    })

    console.log(`✅ Generated ${enhancedSlides.length} slides with design context intelligence`)

    return NextResponse.json({
      slides: enhancedSlides,
      message: result.message || `Generated ${enhancedSlides.length} slides with design context intelligence.`,
      designNotes: "Applied complete design context intelligence with automatic styling and contextual icons.",
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
