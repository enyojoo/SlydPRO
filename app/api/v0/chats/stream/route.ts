import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    const apiKey = process.env.V0_API_KEY
    if (!apiKey) {
      return new Response("V0 API key not configured", { status: 500 })
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch("https://api.v0.dev/chats", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
          })

          if (!response.ok) {
            controller.error(new Error(`V0 API error: ${response.status}`))
            return
          }

          const data = await response.json()

          // Simulate streaming by sending the response in chunks
          const content = data.message || ""
          const chunks = content.match(/.{1,50}/g) || [content]

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]
            const streamData = `data: ${JSON.stringify({ chunk })}\n\n`
            controller.enqueue(new TextEncoder().encode(streamData))

            // Add small delay to simulate streaming
            await new Promise((resolve) => setTimeout(resolve, 100))
          }

          // Send completion signal
          const completeData = `data: ${JSON.stringify({ complete: true, response: data })}\n\n`
          controller.enqueue(new TextEncoder().encode(completeData))

          controller.close()
        } catch (error) {
          controller.error(error)
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
    console.error("Streaming error:", error)
    return new Response("Streaming failed", { status: 500 })
  }
}
