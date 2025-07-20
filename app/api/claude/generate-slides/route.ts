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

// PREMIUM: Replace the createAdvancedSlidePrompt function with this premium version
const createPremiumSlidePrompt = (request: SlideGenerationRequest, fileContent?: string): string => {
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

  // Premium color palettes for variety
  const premiumPalettes = [
    {
      name: "Ocean Depth",
      primary: "linear-gradient(135deg, #0077be 0%, #004d7a 100%)",
      secondary: "linear-gradient(135deg, #00a8ff 0%, #0077be 100%)",
      accent: "#00d4ff",
    },
    {
      name: "Forest Canopy",
      primary: "linear-gradient(135deg, #2d5016 0%, #4a7c00 100%)",
      secondary: "linear-gradient(135deg, #4a7c00 0%, #6ba300 100%)",
      accent: "#8bc34a",
    },
    {
      name: "Sunset Glow",
      primary: "linear-gradient(135deg, #ff6b35 0%, #e04a00 100%)",
      secondary: "linear-gradient(135deg, #ff8c69 0%, #ff6b35 100%)",
      accent: "#ffa726",
    },
    {
      name: "Royal Purple",
      primary: "linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%)",
      secondary: "linear-gradient(135deg, #8e24aa 0%, #6a1b9a 100%)",
      accent: "#ba68c8",
    },
    {
      name: "Deep Crimson",
      primary: "linear-gradient(135deg, #b71c1c 0%, #8b0000 100%)",
      secondary: "linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)",
      accent: "#ef5350",
    },
    {
      name: "Midnight Steel",
      primary: "linear-gradient(135deg, #263238 0%, #37474f 100%)",
      secondary: "linear-gradient(135deg, #455a64 0%, #263238 100%)",
      accent: "#78909c",
    },
  ]

  if (editMode === "selected" && selectedSlideId && selectedSlideTitle) {
    return `You are SlydPRO AI, the world's premier presentation design expert with unlimited creative vision.

MISSION: Transform the slide "${selectedSlideTitle}" into a stunning, professional masterpiece.

USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}

DESIGN EXCELLENCE STANDARDS:
🎨 Use sophisticated color palettes with rich gradients
📊 Add intelligent data visualizations when content mentions metrics
🎯 Include relevant premium icons that enhance meaning
✨ Apply modern glassmorphism and shadow effects
🔤 Use typography hierarchy that guides the eye
📐 Balance whitespace and content for optimal readability

PREMIUM VISUAL GUIDELINES:
• Colors: Choose from sophisticated palettes like deep ocean blues, rich forest greens, warm sunset oranges, royal purples, or elegant charcoals
• Gradients: Always use diagonal gradients (135deg) for depth
• Typography: SF Pro Display for headlines, SF Pro Text for content
• Icons: Select meaningful business icons (📊💼🎯📈🚀💡⚡🌟💰🌍🏆📋)
• Effects: Subtle glassmorphism, elegant shadows, rounded corners

CRITICAL OUTPUT REQUIREMENTS:
- Return ONLY valid JSON with the exact structure shown below
- Choose a DIFFERENT color palette from: ${JSON.stringify(premiumPalettes)}
- Include chartData if content mentions data/metrics/numbers
- Include tableData if content mentions comparisons/vs/metrics
- Add 1-2 relevant icons that enhance the slide's message

{
  "slides": [
    {
      "id": "${selectedSlideId}",
      "title": "Compelling Enhanced Title",
      "content": "Professional content with clear value proposition\\n• Key insight with supporting data\\n• Important metric or achievement\\n• Clear action item or next step",
      "background": "linear-gradient(135deg, #0077be 0%, #004d7a 100%)",
      "textColor": "#ffffff",
      "layout": "content",
      "titleFont": "SF Pro Display, Inter, system-ui, sans-serif",
      "contentFont": "SF Pro Text, Inter, system-ui, sans-serif",
      "titleSize": "2.5rem",
      "contentSize": "1.125rem",
      "spacing": "comfortable",
      "alignment": "left",
      "titleColor": "#ffffff",
      "accentColor": "#00d4ff",
      "shadowEffect": "0 25px 50px rgba(0,0,0,0.25)",
      "borderRadius": "24px",
      "glassmorphism": true,
      "chartData": {
        "type": "bar",
        "data": [
          {"name": "Q1", "value": 125000},
          {"name": "Q2", "value": 180000},
          {"name": "Q3", "value": 245000},
          {"name": "Q4", "value": 320000}
        ],
        "config": {"showGrid": true},
        "style": "modern"
      },
      "icons": [
        {
          "icon": "📊",
          "position": "top-right",
          "color": "#00d4ff",
          "size": "28"
        }
      ]
    }
  ],
  "message": "Transformed slide with premium professional design."
}`
  }

  // For new presentations
  return `You are SlydPRO AI, the world's most sophisticated presentation design system, capable of creating Fortune 500-level visual presentations.

MISSION: Create a breathtaking ${slideCount === "auto" ? "6-8 slide" : slideCount} presentation that exceeds Apple Keynote quality standards.

USER VISION: "${prompt}"
PRESENTATION TYPE: ${presentationType}
TARGET AUDIENCE: ${audience}
DESIRED TONE: ${tone}
${fileContent ? `\nSOURCE MATERIAL:\n${fileContent.substring(0, 800)}...` : ""}

DESIGN EXCELLENCE MANDATE:
🏆 Each slide must be a visual masterpiece worthy of a premium design agency
🎨 Use DIFFERENT sophisticated color palettes for visual variety and interest
📊 Automatically add charts/tables when content suggests data or comparisons
🎯 Include meaningful business icons that reinforce the message
✨ Apply cutting-edge design trends: glassmorphism, premium shadows, modern gradients
🔤 Perfect typography hierarchy with responsive scaling
📐 Masterful composition with optimal white space and visual flow

PREMIUM COLOR PALETTES TO CHOOSE FROM:
${JSON.stringify(premiumPalettes, null, 2)}

INTELLIGENT LAYOUT SELECTION:
• "title": Opening/closing slides with maximum visual impact
• "chart": Data-driven slides with beautiful visualizations  
• "table": Structured comparison slides with elegant formatting
• "content": Information slides with perfect visual hierarchy
• "two-column": Side-by-side content with balanced composition

AUTOMATIC VISUAL INTELLIGENCE:
- If content mentions revenue/growth/metrics → Add relevant chart
- If content mentions comparisons/vs/benchmarks → Add elegant table
- Always include 1-2 meaningful business icons per slide
- Vary color palettes across slides for visual richness
- Apply glassmorphism selectively for premium feel

MANDATORY JSON OUTPUT STRUCTURE:
{
  "slides": [
    {
      "id": "slide-1",
      "title": "Captivating Opening Statement",
      "content": "Compelling value proposition that immediately engages the audience\\n• Powerful benefit statement\\n• Key differentiator\\n• Clear promise of value",
      "background": "linear-gradient(135deg, #0077be 0%, #004d7a 100%)",
      "textColor": "#ffffff",
      "layout": "title",
      "titleFont": "SF Pro Display, Inter, system-ui, sans-serif",
      "contentFont": "SF Pro Text, Inter, system-ui, sans-serif", 
      "titleSize": "clamp(3rem, 6vw, 4.5rem)",
      "contentSize": "clamp(1.125rem, 2vw, 1.5rem)",
      "spacing": "generous",
      "alignment": "center",
      "titleColor": "#ffffff",
      "accentColor": "#00d4ff",
      "shadowEffect": "0 30px 60px rgba(0,0,0,0.3)",
      "borderRadius": "28px",
      "glassmorphism": true,
      "icons": [
        {
          "icon": "🚀",
          "position": "top-right", 
          "color": "#00d4ff",
          "size": "36"
        }
      ]
    },
    {
      "id": "slide-2",
      "title": "Performance Excellence",
      "content": "Outstanding results across all key performance indicators with sustained growth momentum",
      "background": "linear-gradient(135deg, #2d5016 0%, #4a7c00 100%)",
      "textColor": "#ffffff", 
      "layout": "chart",
      "titleFont": "SF Pro Display, Inter, system-ui, sans-serif",
      "contentFont": "SF Pro Text, Inter, system-ui, sans-serif",
      "titleSize": "2.75rem",
      "contentSize": "1.25rem",
      "spacing": "comfortable",
      "alignment": "left",
      "titleColor": "#ffffff",
      "accentColor": "#8bc34a",
      "shadowEffect": "0 25px 50px rgba(0,0,0,0.25)",
      "borderRadius": "24px",
      "glassmorphism": false,
      "chartData": {
        "type": "area",
        "data": [
          {"name": "Q1 2024", "value": 850000},
          {"name": "Q2 2024", "value": 1200000},
          {"name": "Q3 2024", "value": 1650000},
          {"name": "Q4 2024", "value": 2100000}
        ],
        "config": {"showGrid": true, "gradient": true},
        "style": "modern"
      },
      "icons": [
        {
          "icon": "📈",
          "position": "top-right",
          "color": "#8bc34a", 
          "size": "28"
        }
      ]
    }
  ],
  "message": "Created a stunning presentation with premium visual design and sophisticated color palettes.",
  "designNotes": "Applied Fortune 500-level design standards with intelligent visual content generation and diverse color schemes."
}

EXCELLENCE REQUIREMENTS:
✅ Use DIFFERENT color palettes for each slide to create visual variety
✅ Include charts when content mentions data, metrics, revenue, growth, or numbers
✅ Include tables when content mentions comparisons, benchmarks, or vs scenarios  
✅ Add meaningful business icons that reinforce the slide's core message
✅ Apply premium visual effects: gradients, shadows, glassmorphism, rounded corners
✅ Ensure perfect typography hierarchy with responsive font scaling
✅ Create Fortune 500-caliber visual design that impresses any audience

Generate slides that would make Apple's design team proud:`
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

    const prompt = createPremiumSlidePrompt(
      {
        ...requestData,
        hasFile: !!uploadedFile,
      },
      fileContent,
    )

    console.log("🎨 Generating premium presentation for:", requestData.prompt)

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000, // Increased for more detailed output
      temperature: 0.95, // Higher creativity for better design variety
      system: `You are SlydPRO AI, the ultimate presentation design genius.

CORE MISSION: Create visually stunning, Fortune 500-caliber presentations that exceed all expectations.

DESIGN MANDATES:
• NEVER use the same color palette twice - each slide must have a unique, sophisticated color scheme
• AUTOMATICALLY add charts when content mentions any data, metrics, numbers, revenue, or growth
• AUTOMATICALLY add tables when content mentions comparisons, benchmarks, metrics, or "vs" scenarios
• ALWAYS include 1-2 meaningful business icons that enhance the slide's message
• APPLY premium visual effects: gradients, glassmorphism, shadows, perfect typography
• CREATE presentations that would impress Apple, Google, or Tesla executives

QUALITY STANDARDS:
- Each slide is a visual masterpiece worthy of a $50K design agency
- Colors are sophisticated and varied across slides  
- Typography is perfect with proper hierarchy
- Visual content (charts/tables) appears automatically when appropriate
- Icons are meaningful and enhance the message
- Overall composition follows premium design principles

CRITICAL: Always return valid JSON. Never compromise on visual excellence.`,
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
        "linear-gradient(135deg, #059669 0%, #047857 100%)",
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

      // Auto-add relevant icons if missing
      if (enhancedSlide.icons.length === 0) {
        if (content.includes("revenue") || content.includes("financial")) {
          enhancedSlide.icons.push({
            icon: "💰",
            position: "top-right",
            color: enhancedSlide.accentColor,
            size: "24",
          })
        } else if (content.includes("growth") || content.includes("trend")) {
          enhancedSlide.icons.push({
            icon: "📈",
            position: "top-right",
            color: enhancedSlide.accentColor,
            size: "24",
          })
        } else if (content.includes("performance") || content.includes("metric")) {
          enhancedSlide.icons.push({
            icon: "📊",
            position: "top-right",
            color: enhancedSlide.accentColor,
            size: "24",
          })
        } else if (content.includes("target") || content.includes("goal")) {
          enhancedSlide.icons.push({
            icon: "🎯",
            position: "top-right",
            color: enhancedSlide.accentColor,
            size: "24",
          })
        } else if (index === 0) {
          enhancedSlide.icons.push({
            icon: "🚀",
            position: "top-right",
            color: enhancedSlide.accentColor,
            size: "32",
          })
        }
      }

      return enhancedSlide
    })

    console.log(`✅ Generated ${validatedSlides.length} premium slides with visual content`)

    return NextResponse.json({
      slides: validatedSlides,
      message:
        result.message || `Generated ${validatedSlides.length} pixel-perfect slides with premium design intelligence.`,
      designNotes: result.designNotes || "Applied premium design context intelligence with modern visual effects.",
      overallTheme: result.overallTheme, // PRESERVED
    })
  } catch (error) {
    console.error("❌ Premium SlydPRO API Error:", error)

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
