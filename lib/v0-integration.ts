"use client"

import { PLATFORM_CONFIG } from "./constants"

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalCost: number
}

export interface SlideGenerationResult {
  slides: ParsedSlide[]
  chatId: string
  tokenUsage: TokenUsage
  demoUrl?: string
  files?: Array<{
    name: string
    content: string
  }>
}

export interface ParsedSlide {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  layout: "title" | "content" | "two-column" | "image"
}

interface V0ChatResponse {
  id: string
  message?: string
  demo?: string
  files?: Array<{
    name: string
    content: string
  }>
}

// Add these interfaces at the top
interface StreamingResponse {
  reader: ReadableStreamDefaultReader<Uint8Array>
  onChunk: (chunk: string) => void
  onComplete: (fullResponse: string) => void
  onError: (error: Error) => void
}

class V0SlideGenerator {
  private apiKey: string | null = null

  constructor() {
    // API key will be provided by server-side calls
    this.apiKey = null
  }

  private async makeV0Request(endpoint: string, data: any): Promise<V0ChatResponse> {
    // Use server-side API route instead of direct API calls
    const response = await fetch(`/api/v0${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`V0 API error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  private calculateTokenUsage(message: string, response: string): TokenUsage {
    // Rough estimation - in production, you'd get this from the API response
    const inputTokens = Math.ceil(message.length / 4) // ~4 chars per token
    const outputTokens = Math.ceil(response.length / 4)

    const totalCost =
      inputTokens * PLATFORM_CONFIG.credits.inputTokenCost + outputTokens * PLATFORM_CONFIG.credits.outputTokenCost

    return {
      inputTokens,
      outputTokens,
      totalCost,
    }
  }

  private parseResponseToSlides(response: V0ChatResponse): ParsedSlide[] {
    const slides: ParsedSlide[] = []

    // Extract content from v0 response
    let content = ""
    if (response.files && response.files.length > 0) {
      // Use the generated files content
      content = response.files.map((file: any) => file.content).join("\n")
    } else if (response.message) {
      // Fallback to message content
      content = response.message
    }

    // Parse slide markers like "## Slide 1: Title" or "### Problem Statement"
    const slideMatches = content.match(/(?:##|###)\s*(?:Slide\s*\d+:?\s*)?(.+?)(?=(?:##|###)|$)/gs)

    if (slideMatches) {
      slideMatches.forEach((match, index) => {
        const lines = match.split("\n").filter((line) => line.trim())
        const titleLine = lines[0].replace(/^#+\s*(?:Slide\s*\d+:?\s*)?/, "").trim()
        const contentLines = lines
          .slice(1)
          .filter((line) => !line.startsWith("#"))
          .join("\n")
          .trim()

        const slideType = this.determineSlideType(titleLine, contentLines)
        const colors = this.getSlideColors(slideType, index)

        slides.push({
          id: `slide-${index + 1}`,
          title: titleLine,
          content: contentLines || "Content will be generated...",
          background: colors.background,
          textColor: colors.textColor,
          layout: slideType,
        })
      })
    } else {
      // Create fallback slides from unstructured content
      const fallbackSlides = this.createFallbackSlides(content)
      slides.push(...fallbackSlides)
    }

    return slides.length > 0 ? slides : this.getDefaultSlides()
  }

  private determineSlideType(title: string, content: string): "title" | "content" | "two-column" | "image" {
    const titleLower = title.toLowerCase()

    if (titleLower.includes("welcome") || titleLower.includes("introduction") || titleLower.includes("title")) {
      return "title"
    }

    if (content.includes("|") || content.includes("vs") || content.includes("before/after")) {
      return "two-column"
    }

    if (titleLower.includes("demo") || titleLower.includes("screenshot") || titleLower.includes("image")) {
      return "image"
    }

    return "content"
  }

  private getSlideColors(slideType: string, index: number) {
    const colorSchemes = [
      { background: "#027659", textColor: "#ffffff" }, // Primary
      { background: "#10b981", textColor: "#ffffff" }, // Secondary
      { background: "#059669", textColor: "#ffffff" }, // Primary Light
      { background: "#065f46", textColor: "#ffffff" }, // Primary Dark
      { background: "#34d399", textColor: "#ffffff" }, // Accent
      { background: "#047857", textColor: "#ffffff" }, // Variant
    ]

    if (slideType === "title") {
      return { background: "#027659", textColor: "#ffffff" }
    }

    return colorSchemes[index % colorSchemes.length]
  }

  private createFallbackSlides(content: string): ParsedSlide[] {
    const paragraphs = content.split("\n\n").filter((p) => p.trim().length > 20)

    return paragraphs.slice(0, 5).map((paragraph, index) => {
      const sentences = paragraph.split(".").filter((s) => s.trim())
      const title = sentences[0]?.trim() || `Slide ${index + 1}`
      const content = sentences.slice(1).join(".").trim() || paragraph

      const colors = this.getSlideColors("content", index)

      return {
        id: `slide-${index + 1}`,
        title,
        content,
        background: colors.background,
        textColor: colors.textColor,
        layout: "content" as const,
      }
    })
  }

  private getDefaultSlides(): ParsedSlide[] {
    return [
      {
        id: "slide-1",
        title: "Welcome to Your Presentation",
        content: "Start by describing your business idea or uploading a document.",
        background: "#027659",
        textColor: "#ffffff",
        layout: "title",
      },
    ]
  }

  async generateSlides(prompt: string, uploadedFile?: File): Promise<SlideGenerationResult> {
    try {
      let fileContent = ""
      if (uploadedFile) {
        fileContent = await uploadedFile.text()
      }

      const slidePrompt = `Create a professional pitch deck presentation with multiple slides based on the following:

${prompt}

${fileContent ? `Document content: ${fileContent}` : ""}

Please structure the response with clear slide sections using ## headers. Each slide should have:
- A clear title
- Relevant content for that slide
- Logical flow for a pitch presentation

Include slides for: Problem, Solution, Market, Business Model, Competition, Team, Financials, and Ask.

Format each slide as:
## Slide 1: Title Here
Content for this slide...

## Slide 2: Next Title
Content for next slide...`

      // Use server-side API route
      const response = await this.makeV0Request("/chats", {
        message: slidePrompt,
      })

      // Calculate token usage
      const tokenUsage = this.calculateTokenUsage(slidePrompt, response.message || "")

      // Parse response to slides
      const slides = this.parseResponseToSlides(response)

      return {
        slides,
        chatId: response.id,
        tokenUsage,
        demoUrl: response.demo,
        files: response.files,
      }
    } catch (error) {
      console.error("V0 API Error:", error)
      throw new Error("Failed to generate slides. Please try again.")
    }
  }

  // Add this method to the V0SlideGenerator class
  async createStreamingChat(
    prompt: string,
    onChunk: (chunk: string) => void,
    onComplete: (response: V0ChatResponse) => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    try {
      const response = await fetch("/api/v0/chats/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: prompt }),
      })

      if (!response.ok) {
        throw new Error(`V0 API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      let fullResponse = ""
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.chunk) {
                fullResponse += data.chunk
                onChunk(data.chunk)
              }
              if (data.complete) {
                onComplete(data.response)
                return
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Streaming failed"))
    }
  }

  // Add streaming version of generateSlides
  async generateSlidesStreaming(
    prompt: string,
    uploadedFile?: File,
    onChunk?: (chunk: string) => void,
    onComplete?: (result: SlideGenerationResult) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    try {
      let fileContent = ""
      if (uploadedFile) {
        fileContent = await uploadedFile.text()
      }

      const slidePrompt = `Create a professional pitch deck presentation with multiple slides based on the following:

${prompt}

${fileContent ? `Document content: ${fileContent}` : ""}

Please structure the response with clear slide sections using ## headers. Each slide should have:
- A clear title
- Relevant content for that slide
- Logical flow for a pitch presentation

Include slides for: Problem, Solution, Market, Business Model, Competition, Team, Financials, and Ask.

Format each slide as:
## Slide 1: Title Here
Content for this slide...

## Slide 2: Next Title
Content for next slide...`

      await this.createStreamingChat(
        slidePrompt,
        onChunk || (() => {}),
        (response) => {
          const tokenUsage = this.calculateTokenUsage(slidePrompt, response.message || "")
          const slides = this.parseResponseToSlides(response)

          const result: SlideGenerationResult = {
            slides,
            chatId: response.id,
            tokenUsage,
            demoUrl: response.demo,
            files: response.files,
          }

          onComplete?.(result)
        },
        onError || (() => {}),
      )
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Failed to generate slides"))
    }
  }

  async editSlide(chatId: string, slideTitle: string, editPrompt: string): Promise<SlideGenerationResult> {
    try {
      const message = `Edit the slide titled "${slideTitle}". ${editPrompt}

Please provide the updated slide content with the same structure using ## headers.`

      // Use server-side API route
      const response = await this.makeV0Request(`/chats/${chatId}/messages`, {
        message,
      })

      // Calculate token usage
      const tokenUsage = this.calculateTokenUsage(message, response.message || "")

      // Parse response to slides
      const slides = this.parseResponseToSlides(response)

      return {
        slides,
        chatId,
        tokenUsage,
        demoUrl: response.demo,
        files: response.files,
      }
    } catch (error) {
      console.error("V0 API Error:", error)
      throw new Error("Failed to edit slide. Please try again.")
    }
  }

  async regenerateAllSlides(chatId: string, prompt: string): Promise<SlideGenerationResult> {
    try {
      const message = `Regenerate all slides with the following changes: ${prompt}

Please provide a complete updated presentation with all slides using ## headers for each slide.`

      // Use server-side API route
      const response = await this.makeV0Request(`/chats/${chatId}/messages`, {
        message,
      })

      // Calculate token usage
      const tokenUsage = this.calculateTokenUsage(message, response.message || "")

      // Parse response to slides
      const slides = this.parseResponseToSlides(response)

      return {
        slides,
        chatId,
        tokenUsage,
        demoUrl: response.demo,
        files: response.files,
      }
    } catch (error) {
      console.error("V0 API Error:", error)
      throw new Error("Failed to regenerate slides. Please try again.")
    }
  }

  isConfigured(): boolean {
    // Always return true since we're using server-side API routes
    return true
  }
}

export const v0SlideGenerator = new V0SlideGenerator()
