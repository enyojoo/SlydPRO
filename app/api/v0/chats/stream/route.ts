import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { messages, chatId } = await request.json()

    // Create a mock streaming response for now
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Simulate AI response generation
        const mockResponse = `🎨 I'll help you create professional slides! Based on your request, here are some slides:

SLIDE 1: Introduction
Title: Welcome to Our Presentation
Content: This is the opening slide that introduces the main topic and sets the tone for the entire presentation.

SLIDE 2: Problem Statement
Title: The Challenge We Face
Content: • Market gap identification
• Current pain points
• Opportunity for improvement
• Why this matters now

SLIDE 3: Our Solution
Title: Introducing Our Solution
Content: • Innovative approach
• Key features and benefits
• How it addresses the problem
• Unique value proposition

SLIDE 4: Market Analysis
Title: Market Opportunity
Content: • Market size and growth
• Target audience analysis
• Competitive landscape
• Market trends and insights

SLIDE 5: Business Model
Title: How We Make Money
Content: • Revenue streams
• Pricing strategy
• Cost structure
• Scalability potential

I've created 5 professional slides with modern design principles, appropriate layouts, and compelling content structure. Each slide is designed to tell part of your story effectively!`

        // Split response into chunks and send them
        const chunks = mockResponse.split(" ")
        let currentChunk = ""

        const sendChunk = (index: number) => {
          if (index >= chunks.length) {
            controller.close()
            return
          }

          currentChunk += chunks[index] + " "
          controller.enqueue(encoder.encode(currentChunk))

          setTimeout(() => sendChunk(index + 1), 50) // Simulate streaming delay
        }

        sendChunk(0)
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (error) {
    console.error("Stream error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
