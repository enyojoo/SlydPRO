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

  return `You are SlydPRO AI, an expert presentation designer creating professional slides.

USER REQUEST: "${prompt}"
PRESENTATION TYPE: ${presentationType}
AUDIENCE: ${audience}
TONE: ${tone}
SLIDE COUNT: ${slideCount === "auto" ? "5-8 slides optimal" : slideCount}

Create a professional presentation with proper JSON structure. Stream your response naturally while building the slides.

OUTPUT FORMAT (JSON):
{
  "slides": [
    {
      "id": "slide-1",
      "title": "Title Here",
      "content": "Content with\\n• Bullet points",
      "background": "#1e40af",
      "textColor": "#ffffff",
      "layout": "title"
    }
  ],
  "message": "Generated presentation successfully."
}

Create the presentation:`
}

export async function POST(req: NextRequest) {
  try {
    const requestData = (await req.json()) as SlideGenerationRequest

    const prompt = createStreamingPrompt(requestData)

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const message = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 8000,
            temperature: 0.7,
            system: "You are SlydPRO AI. Stream your response naturally while creating valid JSON.",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            stream: true,
          })

          for await (const chunk of message) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              const data = {
                type: "chunk",
                content: chunk.delta.text,
              }

              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            }

            if (chunk.type === "message_stop") {
              const data = {
                type: "complete",
                content: "Stream completed",
              }

              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            }
          }

          controller.close()
        } catch (error) {
          const errorData = {
            type: "error",
            error: error instanceof Error ? error.message : "Streaming failed",
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`))
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
    console.error("Claude streaming error:", error)

    return new Response(
      JSON.stringify({
        error: "Failed to start streaming generation",
        type: "stream_error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
