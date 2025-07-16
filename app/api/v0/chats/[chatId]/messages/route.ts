import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { chatId: string } }) {
  try {
    const { message } = await request.json()
    const { chatId } = params

    console.log("V0 API message request:", { chatId, message: message?.substring(0, 100) + "..." })

    // Use server-side environment variable (not NEXT_PUBLIC_)
    const apiKey = process.env.V0_API_KEY
    if (!apiKey) {
      console.error("V0 API key not configured")
      return NextResponse.json({ error: "V0 API key not configured" }, { status: 500 })
    }

    console.log("Making message request to V0 API...")

    const response = await fetch(`https://api.v0.dev/v1/chats/${chatId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    })

    console.log("V0 API message response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("V0 API message error:", response.status, errorText)
      return NextResponse.json(
        { error: `V0 API error: ${response.status} - ${errorText}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("V0 API message response received:", { id: data.id, hasMessages: !!data.messages })
    return NextResponse.json(data)
  } catch (error) {
    console.error("V0 API Error:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
