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

// CRITICAL: Load design context from environment variable
const getUltimateDesignContext = () => {
  if (process.env.SLYDPRO_DESIGN_CONTEXT) {
    try {
      return JSON.parse(process.env.SLYDPRO_DESIGN_CONTEXT)
    } catch (error) {
      console.warn("Failed to parse ultimate design context")
    }
  }

  // Fallback to basic context if secure context not available
  return {
    version: "1.0.0",
    designPhilosophy: "Create pixel-perfect, modern presentations with advanced visual capabilities",
    visualContentCapabilities: {
      charts: { types: ["bar", "line", "pie", "area"] },
      tables: { styles: ["modern", "minimal"] },
      icons: { business: ["📊", "💼", "🎯", "📈"] },
    },
    typographyMastery: {
      fontStacks: {
        premium_corporate: {
          primary: "SF Pro Display, Inter, sans-serif",
          secondary: "SF Pro Text, Inter, sans-serif",
        },
      },
    },
    visualEffects: {
      shadows: {
        pronounced: "0 15px 35px rgba(0,0,0,0.1)",
      },
    },
  }
}

const createUltimatePrompt = (request: SlideGenerationRequest, fileContent?: string): string => {
  const designContext = getUltimateDesignContext()

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
    return `You are SlydPRO AI, an expert presentation designer.

CONTEXT: Editing slide "${selectedSlideTitle}" (ID: ${selectedSlideId})
USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}

TASK: Update ONLY this slide based on the user's request.

OUTPUT FORMAT (JSON):
{
  "slides": [
    {
      "id": "${selectedSlideId}",
      "title": "Updated title",
      "content": "Updated content\\n• Point 1\\n• Point 2\\n• Point 3",
      "background": "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
      "textColor": "#ffffff",
      "layout": "content",
      "titleFont": "SF Pro Display, Inter, sans-serif",
      "contentFont": "SF Pro Text, Inter, sans-serif",
      "titleSize": "clamp(1.75rem, 3vw, 2.5rem)",
      "contentSize": "clamp(1rem, 1.5vw, 1.125rem)",
      "spacing": "comfortable",
      "alignment": "left",
      "titleColor": "#ffffff",
      "accentColor": "#fbbf24",
      "shadowEffect": "0 15px 35px rgba(0,0,0,0.1)",
      "borderRadius": "20px",
      "glassmorphism": false
    }
  ],
  "message": "Updated the slide successfully."
}`
  }

  const ultimatePrompt = `You are SlydPRO AI, the world's most advanced presentation design system with ultimate visual intelligence.

DESIGN PHILOSOPHY: ${designContext.designPhilosophy}

ULTIMATE CAPABILITIES FROM DESIGN CONTEXT:
- Chart Types Available: ${designContext.visualContentCapabilities?.charts?.types?.join(", ") || "bar, line, pie, area"}
- Table Styles: ${designContext.visualContentCapabilities?.tables?.styles?.join(", ") || "modern, minimal"}
- Modern Typography: ${designContext.typographyMastery?.fontStacks?.premium_corporate?.primary || "SF Pro Display, Inter"}
- Color Intelligence: Use gradients from design context for backgrounds
- Visual Effects: Apply glassmorphism, shadows, and modern styling

CONTENT ANALYSIS INSTRUCTIONS:
1. Analyze the user's content for data patterns
2. Automatically detect when charts/tables are needed
3. Suggest relevant images and icons from design context
4. Choose optimal layouts based on content type
5. Apply advanced visual effects for modern appeal
6. Ensure pixel-perfect design execution

USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
${fileContent ? `FILE CONTENT: ${fileContent}` : ""}

CRITICAL: Always include chartData when numbers/data are mentioned, tableData for comparisons, and icons from the design context.

ADVANCED OUTPUT STRUCTURE - Generate slides with sophisticated visual elements:
{
  "slides": [
    {
      "id": "slide-1",
      "title": "Compelling Title with Perfect Typography",
      "content": "Strategic content that complements visuals",
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
      "animations": {
        "entrance": "fadeIn",
        "emphasis": ["pulse", "glow"]
      },
      "icons": [
        {
          "icon": "🚀",
          "position": "top-right",
          "color": "#fbbf24",
          "size": "2rem"
        }
      ],
      "chartData": {
        "type": "bar",
        "data": [
          {"label": "Q1", "value": 65},
          {"label": "Q2", "value": 78},
          {"label": "Q3", "value": 92},
          {"label": "Q4", "value": 85}
        ],
        "config": {},
        "style": "modern"
      }
    }
  ],
  "message": "Created sophisticated slides using SlydPRO's ultimate design intelligence.",
  "designNotes": "Applied design context intelligence with modern visual effects."
}

Generate pixel-perfect slides using the design context intelligence:`

  return ultimatePrompt
}

const analyzeContentForVisuals = (content: string) => {
  const analysis = {
    hasData: /\d+%|\$\d+|(\d+,?\d*\s*(increase|decrease|growth|revenue|profit))/i.test(content),
    hasComparisons: /(vs|versus|compared to|against|better than|worse than)/i.test(content),
    hasTimeline:
      /(january|february|march|april|may|june|july|august|september|october|november|december|q1|q2|q3|q4|2023|2024|2025)/i.test(
        content,
      ),
    hasProcess: /(step|phase|stage|\d+\.|first|second|third|then|next|finally)/i.test(content),
    needsChart: false,
    needsTable: false,
    needsInfographic: false,
  }

  analysis.needsChart = analysis.hasData || analysis.hasTimeline
  analysis.needsTable = analysis.hasComparisons
  analysis.needsInfographic = analysis.hasProcess

  return analysis
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

    // Analyze content for intelligent visual suggestions
    const contentAnalysis = analyzeContentForVisuals(requestData.prompt + " " + fileContent)

    const prompt = createUltimatePrompt(
      {
        ...requestData,
        contentAnalysis,
        hasFile: !!uploadedFile,
      },
      fileContent,
    )

    console.log("🎨 Generating ultimate presentation with design context for:", requestData.prompt)

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 12000,
      temperature: 0.85,
      system: `You are SlydPRO AI, the ultimate presentation design system with advanced visual intelligence powered by sophisticated design context.

CRITICAL INSTRUCTIONS:
- Always respond with valid JSON matching the exact structure requested
- Use the design context to make intelligent design decisions
- When data is detected, ALWAYS include chartData with realistic sample data
- When comparisons are found, ALWAYS include tableData with proper formatting
- ALWAYS add relevant icons and visual elements from the design context
- Apply modern design trends from the context: gradients, shadows, glassmorphism, proper typography
- Ensure every slide looks like it was designed by Apple's keynote team using the design intelligence provided`,
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

    // Enhanced validation with comprehensive defaults using design context
    const designContext = getUltimateDesignContext()
    const validatedSlides = result.slides.map((slide: any, index: number) => {
      const baseSlide = {
        id: slide.id || `slide-${Date.now()}-${index}`,
        title: slide.title || `Slide ${index + 1}`,
        content: slide.content || "",
        background: slide.background || "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
        textColor: slide.textColor || "#ffffff",
        layout: slide.layout || (index === 0 ? "title" : "content"),

        // Advanced design properties with design context defaults
        titleFont:
          slide.titleFont ||
          designContext.typographyMastery?.fontStacks?.premium_corporate?.primary ||
          "SF Pro Display, Inter, sans-serif",
        contentFont:
          slide.contentFont ||
          designContext.typographyMastery?.fontStacks?.premium_corporate?.secondary ||
          "SF Pro Text, Inter, sans-serif",
        titleSize: slide.titleSize || (index === 0 ? "clamp(2.5rem, 5vw, 4rem)" : "clamp(1.75rem, 3vw, 2.5rem)"),
        contentSize: slide.contentSize || "clamp(1rem, 1.5vw, 1.125rem)",
        spacing: slide.spacing || "comfortable",
        alignment: slide.alignment || (index === 0 ? "center" : "left"),
        titleColor: slide.titleColor || "#ffffff",
        accentColor: slide.accentColor || "#fbbf24",
        shadowEffect:
          slide.shadowEffect || designContext.visualEffects?.shadows?.pronounced || "0 15px 35px rgba(0,0,0,0.1)",
        borderRadius: slide.borderRadius || "20px",
        glassmorphism: slide.glassmorphism || false,

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

        imageData: slide.imageData
          ? {
              src: slide.imageData.src || "",
              alt: slide.imageData.alt || "",
              position: slide.imageData.position || "center",
              style: slide.imageData.style || "modern",
            }
          : null,

        icons: slide.icons || [],
        animations: slide.animations || {
          entrance: "fadeIn",
          emphasis: [],
        },
        customCSS: slide.customCSS || "",
      }

      return baseSlide
    })

    console.log(`✅ Successfully generated ${validatedSlides.length} ultimate slides using design context`)

    return NextResponse.json({
      slides: validatedSlides,
      message:
        result.message || `Generated ${validatedSlides.length} pixel-perfect slides with ultimate design intelligence.`,
      designNotes: result.designNotes || "Applied ultimate design context intelligence with modern visual effects.",
      overallTheme: result.overallTheme,
    })
  } catch (error) {
    console.error("❌ Ultimate SlydPRO API Error:", error)

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
