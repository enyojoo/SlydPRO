import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    console.log("V0 streaming request:", { message: message?.substring(0, 100) + "..." })

    const apiKey = process.env.V0_API_KEY
    if (!apiKey) {
      console.error("V0 API key not configured")
      return new Response("V0 API key not configured", { status: 500 })
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log("Starting V0 streaming request...")

          const response = await fetch("https://api.v0.dev/v1/chats", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
          })

          console.log("V0 streaming response status:", response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.error("V0 streaming error:", response.status, errorText)
            controller.error(new Error(`V0 API error: ${response.status} - ${errorText}`))
            return
          }

          const data = await response.json()
          console.log("V0 streaming data received:", { id: data.id, hasMessages: !!data.messages })

          // Extract content from response
          let content = ""
          if (data.messages && data.messages.length > 0) {
            const assistantMessage = data.messages.find((m: any) => m.role === "assistant")
            content = assistantMessage?.content || ""
          } else if (data.message) {
            content = data.message
          }

          // Simulate streaming by sending the response in chunks
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
          console.error("V0 streaming error:", error)
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
