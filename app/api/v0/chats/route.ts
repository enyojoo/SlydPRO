import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    // Use server-side environment variable (not NEXT_PUBLIC_)
    const apiKey = process.env.V0_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "V0 API key not configured" }, { status: 500 })
    }

    const response = await fetch("https://api.v0.dev/chats", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `V0 API error: ${response.status} - ${errorText}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("V0 API Error:", error)
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 })
  }
}
