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
      "background": "#1e40af",
      "textColor": "#ffffff",
      "layout": "content"
    }
  ],
  "message": "Updated the slide successfully."
}`
  }

  return `You are SlydPRO AI, an expert presentation designer.

USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}
SLIDE COUNT: ${slideCount === "auto" ? "5-10 slides" : slideCount}
${fileContent ? `FILE CONTENT: ${fileContent}` : ""}

DESIGN PRINCIPLES:
1. Create compelling narrative structure
2. Use professional formatting
3. Balance information with clarity
4. Ensure slides are presentation-ready

SLIDE LAYOUTS:
- "title": Opening/closing slides
- "content": Main information with bullet points
- "two-column": Comparisons
- "image": Visual focus

OUTPUT FORMAT (JSON):
{
  "slides": [
    {
      "id": "slide-1",
      "title": "Compelling Title",
      "content": "Opening statement\\n• Key point 1\\n• Key point 2\\n• Key point 3",
      "background": "#1e40af",
      "textColor": "#ffffff",
      "layout": "title"
    }
  ],
  "message": "Created professional presentation successfully.",
  "designNotes": "Optimized for ${audience} audience with ${tone} tone."
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
