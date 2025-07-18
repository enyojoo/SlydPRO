import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, chatId } = body

    // Get V0 API key from environment
    const v0ApiKey = process.env.V0_API_KEY
    if (!v0ApiKey) {
      return NextResponse.json({ error: "V0 API key not configured" }, { status: 500 })
    }

    // Make request to V0 API
    const response = await fetch("https://api.v0.dev/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${v0ApiKey}`,
      },
      body: JSON.stringify({
        messages,
        model: "v0-1",
        stream: true,
      }),
    })

    if (!response.ok) {
      console.error("V0 API error:", response.status, response.statusText)
      return NextResponse.json({ error: "V0 API request failed" }, { status: response.status })
    }

    // Return the streaming response
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Stream error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
