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

interface GeneratedSlide {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  layout: "title" | "content" | "two-column" | "image"
}

interface GenerationResult {
  slides: GeneratedSlide[]
  message?: string
  designNotes?: string
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
    return `You are SlydPRO AI, an expert presentation designer.

CONTEXT: Editing slide "${selectedSlideTitle}" (ID: ${selectedSlideId})
USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}

TASK: Update ONLY this slide based on the user's request.

IMPORTANT: Content should be a single string with bullet points using \\n for line breaks.

OUTPUT FORMAT (JSON):
{
  "slides": [
    {
      "id": "${selectedSlideId}",
      "title": "Updated title here",
      "content": "Main content here\\n• Bullet point 1\\n• Bullet point 2\\n• Bullet point 3",
      "background": "#1e40af",
      "textColor": "#ffffff", 
      "layout": "content"
    }
  ],
  "message": "I've updated the '${selectedSlideTitle}' slide based on your request."
}

Generate the updated slide:`
  }

  return `You are SlydPRO AI, an expert presentation designer creating professional slides.

USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}
SLIDE COUNT: ${slideCount === "auto" ? "5-8 slides optimal" : slideCount}
${fileContent ? `\nFILE CONTENT:\n${fileContent.substring(0, 1000)}...` : ""}

DESIGN PRINCIPLES:
1. Create compelling narrative structure
2. Use professional formatting with bullet points
3. Balance information with clarity
4. Ensure slides are presentation-ready
5. First slide should be a title slide, rest should be content slides

SLIDE LAYOUTS:
- "title": Opening/closing slides (use for slide 1)
- "content": Main information with bullet points (use for slides 2+)
- "two-column": Comparisons or dual concepts
- "image": Visual focus slides

CONTENT FORMATTING:
- Use \\n for line breaks
- Use • for bullet points
- Keep titles under 8 words
- Limit bullet points to 5-6 per slide
- Make content scannable and impactful

OUTPUT FORMAT (JSON):
{
  "slides": [
    {
      "id": "slide-1",
      "title": "Compelling Title Here",
      "content": "Engaging opening statement or subtitle",
      "background": "#1e40af",
      "textColor": "#ffffff",
      "layout": "title"
    },
    {
      "id": "slide-2", 
      "title": "Clear Section Title",
      "content": "Introduction to this section\\n• Key point 1\\n• Key point 2\\n• Key point 3\\n• Supporting detail",
      "background": "#3b82f6",
      "textColor": "#ffffff",
      "layout": "content"
    }
  ],
  "message": "I've created a professional ${slideCount === "auto" ? "" : slideCount + "-slide"} presentation perfect for your ${audience} audience. Each slide is designed with a ${tone} tone for ${presentationType} presentations.",
  "designNotes": "Uses professional blue theme with clear hierarchy and engaging content structure."
}

Create the presentation now:`
}

const parseFileContent = async (file: File): Promise<string> => {
  try {
    const content = await file.text()
    return content.substring(0, 2000)
  } catch (error) {
    console.error("Error reading file:", error)
    return `File: ${file.name}`
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

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

    console.log("Calling Claude API with prompt for:", requestData.prompt)

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8000,
      temperature: 0.7,
      system:
        "You are SlydPRO AI. Always respond with valid JSON matching the exact structure requested. Be creative but professional.",
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
      throw new Error("Claude did not return valid JSON format")
    }

    const result = JSON.parse(jsonMatch[0]) as GenerationResult

    if (!result.slides || !Array.isArray(result.slides)) {
      throw new Error("Invalid slides data structure from Claude")
    }

    const validatedSlides = result.slides.map((slide: any, index: number) => ({
      id: slide.id || `slide-${Date.now()}-${index}`,
      title: slide.title || `Slide ${index + 1}`,
      content: slide.content || "",
      background: slide.background || "#1e40af",
      textColor: slide.textColor || "#ffffff",
      layout: slide.layout || (index === 0 ? "title" : "content"),
    }))

    console.log(`Successfully generated ${validatedSlides.length} slides`)

    return NextResponse.json({
      slides: validatedSlides,
      message: result.message || `Generated ${validatedSlides.length} slides successfully.`,
      designNotes: result.designNotes || "Professional slide design applied.",
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
