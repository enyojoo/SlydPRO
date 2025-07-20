import { type NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface SlideGenerationRequest {
  prompt: string
  slideCount?: string | number
  presentationType?: string
  audience?: string
  tone?: string
  editMode?: "all" | "selected"
  selectedSlideId?: string
  selectedSlideTitle?: string
  hasFile?: boolean
}

// Get sophisticated design context from environment variable
function getUltimateDesignContext() {
  const designContextEnv = process.env.SLYDPRO_DESIGN_CONTEXT

  if (!designContextEnv) {
    throw new Error("SLYDPRO_DESIGN_CONTEXT environment variable is required but not found")
  }

  try {
    const designContext = JSON.parse(designContextEnv)
    return designContext
  } catch (error) {
    throw new Error(`Invalid JSON in SLYDPRO_DESIGN_CONTEXT: ${error.message}`)
  }
}

// Contextual icon selection based on content analysis
function getContextualIcon(
  content: string,
  title: string,
): { icon: string; position: string; color: string; size: string } | null {
  const combinedText = (title + " " + content).toLowerCase()

  // Data and Analytics
  if (combinedText.match(/\b(data|analytics|metrics|statistics|numbers|chart|graph|report|analysis|kpi|dashboard)\b/)) {
    return { icon: "📊", position: "top-right", color: "#3b82f6", size: "24" }
  }

  // Strategy and Goals
  if (combinedText.match(/\b(strategy|goal|target|objective|mission|vision|plan|roadmap|focus)\b/)) {
    return { icon: "🎯", position: "top-right", color: "#10b981", size: "24" }
  }

  // Growth and Success
  if (combinedText.match(/\b(growth|success|launch|scale|expand|increase|boost|accelerate|momentum)\b/)) {
    return { icon: "🚀", position: "top-right", color: "#f59e0b", size: "24" }
  }

  // Financial
  if (combinedText.match(/\b(revenue|profit|financial|money|cost|budget|investment|roi|funding)\b/)) {
    return { icon: "💰", position: "top-right", color: "#059669", size: "24" }
  }

  // Trends and Progress
  if (combinedText.match(/\b(trend|progress|improvement|performance|results|outcome|achievement)\b/)) {
    return { icon: "📈", position: "top-right", color: "#8b5cf6", size: "24" }
  }

  // Innovation and Ideas
  if (combinedText.match(/\b(innovation|idea|creative|solution|breakthrough|invention|new|novel)\b/)) {
    return { icon: "💡", position: "top-right", color: "#f97316", size: "24" }
  }

  // Team and People
  if (combinedText.match(/\b(team|people|staff|employee|human|talent|culture|collaboration)\b/)) {
    return { icon: "👥", position: "top-right", color: "#6366f1", size: "24" }
  }

  // Global and Market
  if (combinedText.match(/\b(global|market|world|international|expansion|reach|scale)\b/)) {
    return { icon: "🌍", position: "top-right", color: "#0ea5e9", size: "24" }
  }

  // Awards and Recognition
  if (combinedText.match(/\b(award|recognition|achievement|winner|best|top|leader|excellence)\b/)) {
    return { icon: "🏆", position: "top-right", color: "#eab308", size: "24" }
  }

  // No contextual match - return null for no icon
  return null
}

// Create premium slide prompt using actual design context
const createPremiumSlidePrompt = (request: SlideGenerationRequest, fileContent?: string): string => {
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
  } = request

  // Use actual color palettes from design context
  const advancedPalettes = designContext.colorIntelligence?.advancedPalettes || []
  const fontStacks = designContext.typographyMastery?.fontStacks || {}
  const businessIcons = designContext.visualContentCapabilities?.businessIcons || []

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
🎯 Include ONE relevant icon ONLY if contextually meaningful
✨ Apply modern glassmorphism and shadow effects
🔤 Use typography hierarchy that guides the eye
📐 Balance whitespace and content for optimal readability

PREMIUM VISUAL GUIDELINES:
• Colors: Choose from sophisticated palettes: ${JSON.stringify(advancedPalettes)}
• Typography: ${JSON.stringify(fontStacks)}
• Icons: Use contextually - ONE per slide maximum, only if truly relevant
• Effects: Subtle glassmorphism, elegant shadows, rounded corners

ICON USAGE RULES:
- Maximum ONE icon per slide
- Only use if contextually relevant to content
- 📊 for data/analytics, 🎯 for strategy, 🚀 for growth, 💰 for financial
- If no clear context match, use NO icon

CRITICAL OUTPUT REQUIREMENTS:
- Return ONLY valid JSON with the exact structure shown below
- Choose a DIFFERENT color palette from available options
- Include chartData if content mentions data/metrics/numbers
- Include tableData if content mentions comparisons/vs/metrics
- Add maximum ONE relevant icon, or none if not contextual

{
  "slides": [
    {
      "id": "${selectedSlideId}",
      "title": "Compelling Enhanced Title",
      "content": "Professional content with clear value proposition\\n• Key insight with supporting data\\n• Important metric or achievement\\n• Clear action item or next step",
      "background": "linear-gradient(135deg, #0077be 0%, #004d7a 100%)",
      "textColor": "#ffffff",
      "layout": "content",
      "titleFont": "${fontStacks.heading || "SF Pro Display, Inter, system-ui, sans-serif"}",
      "contentFont": "${fontStacks.body || "SF Pro Text, Inter, system-ui, sans-serif"}",
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
          "size": "24"
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
🎯 Include maximum ONE meaningful icon per slide, only if contextually relevant
✨ Apply cutting-edge design trends: glassmorphism, premium shadows, modern gradients
🔤 Perfect typography hierarchy with responsive scaling
📐 Masterful composition with optimal white space and visual flow

PREMIUM COLOR PALETTES TO CHOOSE FROM:
${JSON.stringify(advancedPalettes, null, 2)}

TYPOGRAPHY SYSTEM:
${JSON.stringify(fontStacks, null, 2)}

INTELLIGENT LAYOUT SELECTION:
• "title": Opening/closing slides with maximum visual impact
• "chart": Data-driven slides with beautiful visualizations  
• "table": Structured comparison slides with elegant formatting
• "content": Information slides with perfect visual hierarchy
• "two-column": Side-by-side content with balanced composition

CONTEXTUAL ICON USAGE (MAXIMUM ONE PER SLIDE):
- 📊 for data/analytics/metrics content
- 🎯 for strategy/goals/targets content
- 🚀 for growth/success/launch content
- 💰 for financial/revenue content
- 📈 for trends/progress content
- 💡 for innovation/ideas content
- 👥 for team/people content
- 🌍 for global/market content
- 🏆 for awards/recognition content
- NO ICON if content doesn't clearly match any category

AUTOMATIC VISUAL INTELLIGENCE:
- If content mentions revenue/growth/metrics → Add relevant chart
- If content mentions comparisons/vs/benchmarks → Add elegant table
- Add maximum ONE contextually relevant icon per slide
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
      "titleFont": "${fontStacks.heading || "SF Pro Display, Inter, system-ui, sans-serif"}",
      "contentFont": "${fontStacks.body || "SF Pro Text, Inter, system-ui, sans-serif"}",
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
          "size": "24"
        }
      ]
    }
  ],
  "message": "Created a stunning presentation with premium visual design and sophisticated color palettes.",
  "designNotes": "Applied Fortune 500-level design standards with intelligent visual content generation and contextual icon usage."
}

EXCELLENCE REQUIREMENTS:
✅ Use DIFFERENT color palettes for each slide to create visual variety
✅ Include charts when content mentions data, metrics, revenue, growth, or numbers
✅ Include tables when content mentions comparisons, benchmarks, or vs scenarios  
✅ Add maximum ONE contextually relevant icon per slide (or none if not relevant)
✅ Apply premium visual effects: gradients, shadows, glassmorphism, rounded corners
✅ Ensure perfect typography hierarchy with responsive font scaling
✅ Create Fortune 500-caliber visual design that impresses any audience

Generate slides that would make Apple's design team proud:`
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const prompt = formData.get("prompt") as string
    const slideCount = formData.get("slideCount") as string
    const presentationType = formData.get("presentationType") as string
    const audience = formData.get("audience") as string
    const tone = formData.get("tone") as string
    const editMode = formData.get("editMode") as string
    const selectedSlideId = formData.get("selectedSlideId") as string
    const selectedSlideTitle = formData.get("selectedSlideTitle") as string
    const uploadedFile = formData.get("file") as File

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const requestData: SlideGenerationRequest = {
      prompt,
      slideCount,
      presentationType,
      audience,
      tone,
      editMode,
      selectedSlideId,
      selectedSlideTitle,
      hasFile: !!uploadedFile,
    }

    let fileContent = ""
    if (uploadedFile) {
      fileContent = await uploadedFile.text()
    }

    const promptText = createPremiumSlidePrompt(requestData, fileContent)

    console.log("🎨 Generating premium presentation for:", requestData.prompt)

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 12000,
      temperature: 0.95,
      system: `You are SlydPRO AI, the ultimate presentation design genius.

CORE MISSION: Create visually stunning, Fortune 500-caliber presentations that exceed all expectations.

DESIGN MANDATES:
• NEVER use the same color palette twice - each slide must have a unique, sophisticated color scheme
• AUTOMATICALLY add charts when content mentions any data, metrics, numbers, revenue, or growth
• AUTOMATICALLY add tables when content mentions comparisons, benchmarks, metrics, or "vs" scenarios
• Use maximum ONE contextually relevant icon per slide (or none if not relevant)
• APPLY premium visual effects: gradients, glassmorphism, shadows, perfect typography
• CREATE presentations that would impress Apple, Google, or Tesla executives

CONTEXTUAL ICON RULES:
- Maximum ONE icon per slide
- Only use if genuinely relevant to slide content
- 📊 for data/analytics, 🎯 for strategy, 🚀 for growth, 💰 for financial
- 📈 for trends, 💡 for innovation, 👥 for team, 🌍 for global, 🏆 for awards
- If content doesn't clearly match any category, use NO icon

QUALITY STANDARDS:
- Each slide is a visual masterpiece worthy of a $50K design agency
- Colors are sophisticated and varied across slides  
- Typography is perfect with proper hierarchy
- Visual content (charts/tables) appears automatically when appropriate
- Icons are minimal, contextual, and meaningful
- Overall composition follows premium design principles

CRITICAL: Always return valid JSON. Never compromise on visual excellence.`,
      messages: [
        {
          role: "user",
          content: promptText,
        },
      ],
    })

    const responseText = message.content[0].type === "text" ? message.content[0].text : ""

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response")
    }

    const result = JSON.parse(jsonMatch[0])

    // Process slides to add contextual icons
    if (result.slides) {
      result.slides = result.slides.map((slide: any) => {
        const contextualIcon = getContextualIcon(slide.content || "", slide.title || "")

        return {
          ...slide,
          icons: contextualIcon ? [contextualIcon] : [],
        }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error generating slides:", error)
    return NextResponse.json({ error: "Failed to generate slides", details: error.message }, { status: 500 })
  }
}
