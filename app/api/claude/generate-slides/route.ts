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

// Load design context from environment variable (MANDATORY - NO FALLBACKS)
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

// Build design instructions from context
const buildDesignInstructions = (designContext: any) => {
  const iconSystems = designContext.iconSystems || {}
  const colorIntelligence = designContext.colorIntelligence || {}
  const typographyMastery = designContext.typographyMastery || {}
  const layoutMastery = designContext.layoutMastery || {}

  return `
DESIGN CONTEXT INSTRUCTIONS (Use these sophisticated rules):

PROFESSIONAL REACT ICONS:
Business Icons: ${iconSystems.businessIcons?.join(", ") || "trending-up, briefcase, target, lightning, star, dollar, award, trophy, gem, rocket, lightbulb, shield"}
Data Icons: ${iconSystems.dataIcons?.join(", ") || "bar-chart, pie-chart, analytics, dashboard, insights, assessment, chart, timeline, activity"}
Tech Icons: ${iconSystems.techIcons?.join(", ") || "monitor, smartphone, database, server, cpu, settings, tool, code"}
Team Icons: ${iconSystems.teamIcons?.join(", ") || "users, group, business"}

ICON USAGE RULES from Design Context:
${
  iconSystems.contextualMapping
    ? Object.entries(iconSystems.contextualMapping)
        .map(([context, icons]) => `${context}: ${Array.isArray(icons) ? icons.join(", ") : icons}`)
        .join("\n")
    : ""
}

COLOR INTELLIGENCE from Design Context:
Advanced Palettes: ${colorIntelligence.advancedPalettes?.map((p) => `${p.name} (${p.primary}, ${p.secondary})`).join(", ") || ""}
Psychology Mapping: ${
    colorIntelligence.psychologyMapping
      ? Object.entries(colorIntelligence.psychologyMapping)
          .map(([mood, colors]) => `${mood}: ${colors}`)
          .join(", ")
      : ""
  }

TYPOGRAPHY MASTERY from Design Context:
Professional Fonts: ${typographyMastery.fontStacks?.map((f) => f.name).join(", ") || ""}
Hierarchy Rules: ${typographyMastery.hierarchy ? Object.keys(typographyMastery.hierarchy).join(", ") : ""}

LAYOUT INTELLIGENCE from Design Context:
${layoutMastery.gridSystems ? `Grid Systems: ${layoutMastery.gridSystems.join(", ")}` : ""}
${layoutMastery.spacingRules ? `Spacing Rules: ${Object.keys(layoutMastery.spacingRules).join(", ")}` : ""}

CRITICAL: Apply these design intelligence rules from the environment context, not basic defaults.
`
}

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

// Get contextual icon based on content
const getContextualIcon = (content: string, title: string, designContext: any) => {
  const combinedText = (title + " " + content).toLowerCase()
  const contextualMapping = designContext.iconSystems?.contextualMapping || {}

  // Financial content
  if (
    combinedText.includes("revenue") ||
    combinedText.includes("profit") ||
    combinedText.includes("financial") ||
    combinedText.includes("investment") ||
    combinedText.includes("funding") ||
    combinedText.includes("cost") ||
    /\$\d+/.test(combinedText)
  ) {
    const financialIcons = contextualMapping.financial || ["dollar", "bar-chart", "pie-chart", "trending-up"]
    return { name: financialIcons[0], style: "outline", shouldShow: true }
  }

  // Strategy content
  if (
    combinedText.includes("strategy") ||
    combinedText.includes("goal") ||
    combinedText.includes("target") ||
    combinedText.includes("objective") ||
    combinedText.includes("plan") ||
    combinedText.includes("roadmap")
  ) {
    const strategyIcons = contextualMapping.strategy || ["target", "lightbulb", "rocket", "shield"]
    return { name: strategyIcons[0], style: "outline", shouldShow: true }
  }

  // Performance content
  if (
    combinedText.includes("performance") ||
    combinedText.includes("results") ||
    combinedText.includes("achievement") ||
    combinedText.includes("success") ||
    combinedText.includes("metrics") ||
    combinedText.includes("kpi")
  ) {
    const performanceIcons = contextualMapping.performance || ["trophy", "award", "star", "analytics"]
    return { name: performanceIcons[0], style: "outline", shouldShow: true }
  }

  // Technology content
  if (
    combinedText.includes("technology") ||
    combinedText.includes("digital") ||
    combinedText.includes("software") ||
    combinedText.includes("system") ||
    combinedText.includes("platform") ||
    combinedText.includes("data")
  ) {
    const technologyIcons = contextualMapping.technology || ["monitor", "database", "cpu", "settings"]
    return { name: technologyIcons[0], style: "outline", shouldShow: true }
  }

  // Growth content
  if (
    combinedText.includes("growth") ||
    combinedText.includes("increase") ||
    combinedText.includes("expansion") ||
    combinedText.includes("scale") ||
    combinedText.includes("launch") ||
    combinedText.includes("innovation")
  ) {
    return { name: "trending-up", style: "outline", shouldShow: true }
  }

  // Team content
  if (
    combinedText.includes("team") ||
    combinedText.includes("people") ||
    combinedText.includes("employee") ||
    combinedText.includes("staff") ||
    combinedText.includes("culture") ||
    combinedText.includes("talent")
  ) {
    return { name: "users", style: "outline", shouldShow: true }
  }

  return { name: "", style: "outline", shouldShow: false }
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

    // GET DESIGN CONTEXT (not hardcoded rules)
    const designContext = getUltimateDesignContext()
    const designInstructions = buildDesignInstructions(designContext)

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

    // Build the complete prompt using design context
    const systemPrompt = `You are SlydPRO's design AI. Create professional presentations using the sophisticated design context provided.

${designInstructions}

SLIDE STRUCTURE with React Icons:
{
  "id": "slide-1",
  "title": "Professional Title",
  "content": "Content here...",
  "layout": "title" | "content" | "chart" | "table" | "two-column",
  "background": "linear-gradient(135deg, #color1, #color2)",
  "textColor": "#ffffff",
  "professionalIcon": {
    "name": "trending-up", // React Icons name from design context
    "position": "top-right",
    "style": "outline" | "filled" | "material",
    "color": "#059669"
  },
  "chartData": {
    "type": "bar" | "line" | "pie" | "area",
    "data": [{"name": "Q1", "value": 100}],
    "config": {"showGrid": true}
  }
}

Use the design context intelligence to create sophisticated, professional presentations.`

    const userPrompt =
      editMode === "selected" && selectedSlideId && selectedSlideTitle
        ? `Transform the slide "${selectedSlideTitle}" based on: "${prompt}"`
        : `Create a ${slideCount === "auto" ? "6-8 slide" : slideCount} presentation for: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}
${fileContent ? `\nSOURCE MATERIAL:\n${fileContent.substring(0, 800)}...` : ""}`

    console.log("🎨 Generating premium presentation with design context for:", requestData.prompt)

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

    // Validate and enhance slides using design context
    const validatedSlides = result.slides.map((slide: any, index: number) => {
      // Use design context color palettes
      const contextPalettes = designContext.colorIntelligence?.advancedPalettes || []
      const fallbackGradients = [
        "linear-gradient(135deg, #027659 0%, #065f46 100%)",
        "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
        "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
        "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
        "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
        "linear-gradient(135deg, #059669 0%, #047857 100%)",
      ]

      const gradients =
        contextPalettes.length > 0
          ? contextPalettes.map((palette: any) => palette.primary || palette.gradient)
          : fallbackGradients

      const enhancedSlide = {
        id: slide.id || `slide-${Date.now()}-${index}`,
        title: slide.title || `Slide ${index + 1}`,
        content: slide.content || "",
        background: slide.background || gradients[index % gradients.length],
        textColor: slide.textColor || "#ffffff",
        layout: slide.layout || (index === 0 ? "title" : "content"),

        // Advanced design properties using design context
        titleFont:
          slide.titleFont ||
          designContext.typographyMastery?.fontStacks?.[0]?.name ||
          "SF Pro Display, Inter, sans-serif",
        contentFont:
          slide.contentFont ||
          designContext.typographyMastery?.fontStacks?.[1]?.name ||
          "SF Pro Text, Inter, sans-serif",
        titleSize: slide.titleSize || (index === 0 ? "clamp(2.5rem, 5vw, 4rem)" : "clamp(1.75rem, 3vw, 2.5rem)"),
        contentSize: slide.contentSize || "clamp(1rem, 1.5vw, 1.125rem)",
        spacing: slide.spacing || designContext.layoutMastery?.spacingRules?.comfortable || "comfortable",
        alignment: slide.alignment || (index === 0 ? "center" : "left"),
        titleColor: slide.titleColor || "#ffffff",
        accentColor: slide.accentColor || designContext.colorIntelligence?.accentColors?.[0] || "#fbbf24",
        shadowEffect:
          slide.shadowEffect || designContext.visualEffects?.shadows?.elegant || "0 15px 35px rgba(0,0,0,0.1)",
        borderRadius: slide.borderRadius || designContext.visualEffects?.borderRadius?.modern || "20px",
        glassmorphism: slide.glassmorphism || false,

        // Professional icon from design context
        professionalIcon: slide.professionalIcon || null,

        // Visual content with validation
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

        // Legacy icon support (empty for now)
        icons: [],

        // Animation and effects using design context
        animations: slide.animations || {
          entrance: "fadeIn",
          emphasis: [],
        },
        customCSS: slide.customCSS || "",
      }

      // Intelligent enhancement based on content analysis
      const content = (enhancedSlide.title + " " + enhancedSlide.content).toLowerCase()
      const contentAnalysis = analyzeContentForVisuals(content)

      // Auto-generate chart data if needed and not provided
      if (contentAnalysis.needsChart && !enhancedSlide.chartData && enhancedSlide.layout !== "table") {
        enhancedSlide.layout = "chart"
        enhancedSlide.chartData = {
          type: content.includes("market") || content.includes("region") ? "pie" : "bar",
          data: generateSampleData(
            content.includes("revenue")
              ? "revenue"
              : content.includes("growth")
                ? "growth"
                : content.includes("market")
                  ? "market"
                  : "performance",
            enhancedSlide.title,
          ),
          config: { showGrid: true },
          style: "modern",
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
            ["Customer Satisfaction", "4.2", "4.6", "+9%"],
          ],
          style: "modern",
          interactive: false,
        }
      }

      // Add contextual professional icon if not provided
      if (!enhancedSlide.professionalIcon) {
        const contextualIcon = getContextualIcon(enhancedSlide.content, enhancedSlide.title, designContext)

        if (contextualIcon.shouldShow) {
          enhancedSlide.professionalIcon = {
            name: contextualIcon.name,
            position: "top-right",
            style: contextualIcon.style,
            color: enhancedSlide.accentColor,
          }
        }
      }

      return enhancedSlide
    })

    console.log(`✅ Generated ${validatedSlides.length} premium slides with design context intelligence`)

    return NextResponse.json({
      slides: validatedSlides,
      message:
        result.message || `Generated ${validatedSlides.length} pixel-perfect slides with design context intelligence.`,
      designNotes:
        result.designNotes ||
        "Applied complete design context intelligence with React Icons and sophisticated visual effects.",
      overallTheme: result.overallTheme,
    })
  } catch (error) {
    console.error("❌ Premium SlydPRO API Error:", error)

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
          error: `Premium generation failed: ${error.message}`,
          type: "generation_error",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "An unexpected error occurred in the premium design system.",
        type: "unknown_error",
      },
      { status: 500 },
    )
  }
}
