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
            body: JSON.stringify({
              message,
              stream: true,
            }),
          })

          console.log("V0 streaming response status:", response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.error("V0 streaming error:", response.status, errorText)
            controller.error(new Error(`V0 API error: ${response.status} - ${errorText}`))
            return
          }

          if (!response.body) {
            controller.error(new Error("No response body"))
            return
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()

          try {
            while (true) {
              const { done, value } = await reader.read()

              if (done) {
                break
              }

              const chunk = decoder.decode(value, { stream: true })
              const lines = chunk.split("\n")

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6)
                  if (data === "[DONE]") {
                    controller.close()
                    return
                  }

                  try {
                    const parsed = JSON.parse(data)
                    const streamData = `data: ${JSON.stringify({ chunk: parsed.content || parsed.delta?.content || "" })}\n\n`
                    controller.enqueue(new TextEncoder().encode(streamData))
                  } catch (parseError) {
                    // Skip invalid JSON
                    continue
                  }
                }
              }
            }
          } finally {
            reader.releaseLock()
          }

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
