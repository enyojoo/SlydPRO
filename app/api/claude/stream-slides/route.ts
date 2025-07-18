import type { NextRequest } from "next/server"
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
}

const createStreamingPrompt = (request: SlideGenerationRequest): string => {
  const {
    prompt,
    slideCount = "auto",
    presentationType = "business",
    audience = "team",
    tone = "professional",
  } = request

  return `You are SlydPRO AI, an expert presentation designer.

USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}
SLIDE COUNT: ${slideCount === "auto" ? "5-10 slides" : slideCount}

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

Please create a professional presentation and return the result as JSON at the end:
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

export async function POST(request: NextRequest) {
  try {
    const requestData = (await request.json()) as SlideGenerationRequest

    const prompt = createStreamingPrompt(requestData)

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const stream = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 8000,
            temperature: 0.7,
            system:
              "You are SlydPRO AI. Think through the presentation design process step by step, then provide the final JSON result.",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            stream: true,
          })

          let accumulatedContent = ""

          for await (const chunk of stream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              const content = chunk.delta.text
              accumulatedContent += content

              // Send chunk to client
              const chunkData = `data: ${JSON.stringify({
                type: "chunk",
                content: content,
              })}\n\n`

              controller.enqueue(new TextEncoder().encode(chunkData))
            }
          }

          // Try to extract JSON from the accumulated content
          const jsonMatch = accumulatedContent.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            try {
              const result = JSON.parse(jsonMatch[0])

              // Validate and format slides
              if (result.slides && Array.isArray(result.slides)) {
                const validatedSlides = result.slides.map((slide: any, index: number) => ({
                  id: slide.id || `slide-${Date.now()}-${index}`,
                  title: slide.title || `Slide ${index + 1}`,
                  content: slide.content || "",
                  background: slide.background || "#1e40af",
                  textColor: slide.textColor || "#ffffff",
                  layout: slide.layout || "content",
                }))

                const finalResult = {
                  slides: validatedSlides,
                  message: result.message || `Generated ${validatedSlides.length} slides successfully.`,
                  designNotes: result.designNotes || "",
                }

                // Send completion signal
                const completeData = `data: ${JSON.stringify({
                  type: "complete",
                  content: JSON.stringify(finalResult),
                })}\n\n`

                controller.enqueue(new TextEncoder().encode(completeData))
              }
            } catch (parseError) {
              console.error("Failed to parse final JSON:", parseError)

              const errorData = `data: ${JSON.stringify({
                type: "error",
                error: "Failed to parse generated slides",
              })}\n\n`

              controller.enqueue(new TextEncoder().encode(errorData))
            }
          }

          controller.close()
        } catch (error) {
          console.error("Claude streaming error:", error)

          const errorData = `data: ${JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Streaming failed",
          })}\n\n`

          controller.enqueue(new TextEncoder().encode(errorData))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Stream setup error:", error)
    return new Response(JSON.stringify({ error: "Failed to start streaming" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
