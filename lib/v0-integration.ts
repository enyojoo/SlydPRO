"use client"

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
  messages?: Array<{
    id: string
    role: string
    content: string
  }>
}

class V0SlideGenerator {
  private apiKey: string | null = null

  constructor() {
    // API key will be provided by server-side calls
    this.apiKey = null
  }

  private async makeV0Request(endpoint: string, data: any): Promise<V0ChatResponse> {
    console.log("Making V0 API request to:", endpoint, "with data keys:", Object.keys(data))

    // Use server-side API route instead of direct API calls
    const response = await fetch(`/api/v0${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    console.log("V0 API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("V0 API error:", response.status, errorText)
      throw new Error(`V0 API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log("V0 API response received:", { id: result.id, hasMessages: !!result.messages })
    return result
  }

  private calculateTokenUsage(message: string, response: string): TokenUsage {
    // More realistic token estimation
    const inputTokens = Math.ceil(message.length / 3.5) // ~3.5 chars per token
    const outputTokens = Math.ceil(response.length / 3.5)

    // Use much smaller costs for testing - these are very low costs
    const totalCost = inputTokens * 0.000001 + outputTokens * 0.000002 // Very small amounts

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

    // Check different response formats
    if (response.messages && response.messages.length > 0) {
      // Get the assistant's response
      const assistantMessage = response.messages.find((m) => m.role === "assistant")
      content = assistantMessage?.content || ""
    } else if (response.files && response.files.length > 0) {
      // Use the generated files content
      content = response.files.map((file: any) => file.content).join("\n")
    } else if (response.message) {
      // Fallback to message content
      content = response.message
    }

    console.log("Parsing content length:", content.length)

    // Parse slide markers like "## Slide 1: Title" or "### Problem Statement"
    const slideMatches = content.match(/(?:##|###)\s*(?:Slide\s*\d+:?\s*)?(.+?)(?=(?:##|###)|$)/gs)

    if (slideMatches && slideMatches.length > 0) {
      console.log("Found slide matches:", slideMatches.length)
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
      console.log("No slide matches found, creating fallback slides")
      // Create fallback slides from unstructured content
      const fallbackSlides = this.createFallbackSlides(content)
      slides.push(...fallbackSlides)
    }

    console.log("Generated slides:", slides.length)
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
    if (!content || content.trim().length === 0) {
      return this.getDefaultSlides()
    }

    // Create slides from the content we have
    const slides = [
      {
        id: "slide-1",
        title: "AI Generated Presentation",
        content: "Based on your request, here's your presentation content.",
        background: "#027659",
        textColor: "#ffffff",
        layout: "title" as const,
      },
      {
        id: "slide-2",
        title: "Content Overview",
        content: content.substring(0, 500) + (content.length > 500 ? "..." : ""),
        background: "#10b981",
        textColor: "#ffffff",
        layout: "content" as const,
      },
    ]

    return slides
  }

  private getDefaultSlides(): ParsedSlide[] {
    return [
      {
        id: "slide-1",
        title: "Welcome to Your Presentation",
        content: "Your AI-generated slides will appear here. Try describing what you want to create!",
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

      const slidePrompt = `You are an expert pitch deck and presentation designer with deep knowledge of modern design principles, visual hierarchy, and effective storytelling through slides.

Create a professional, visually stunning presentation with multiple slides based on the following:

${prompt}

${fileContent ? `Document content: ${fileContent}` : ""}

DESIGN REQUIREMENTS:
- Use modern, clean design principles with proper visual hierarchy
- Include relevant icons, charts, and visual elements where appropriate
- Apply color psychology and brand-appropriate color schemes
- Ensure each slide has a clear purpose and visual focus
- Use typography effectively with proper contrast and readability
- Include data visualizations (charts, graphs) when presenting statistics or comparisons
- Add icons and visual elements that support the content narrative
- Design for impact and memorability

CONTENT ANALYSIS:
- Analyze the content to determine the best visual representation
- For data/statistics: suggest charts, graphs, or infographics
- For processes: suggest flowcharts or step-by-step visuals
- For comparisons: suggest side-by-side layouts or comparison tables
- For team/about sections: suggest profile layouts with photos
- For product features: suggest feature highlight layouts with icons

SLIDE STRUCTURE:
Please structure the response with clear slide sections using ## headers. Each slide should have:
- A compelling title that captures attention
- Content optimized for visual presentation
- Suggestions for visual elements (icons, charts, images)
- Logical flow for a pitch presentation

Include slides for: Problem/Opportunity, Solution, Market Size, Business Model, Competition Analysis, Team, Traction/Metrics, Financial Projections, and Funding Ask (adjust based on content).

Format each slide as:
## Slide 1: [Compelling Title]
[Visual-optimized content with design suggestions]
[Icons: suggest relevant icons]
[Visual elements: charts/graphs if applicable]

## Slide 2: [Next Title]
[Content optimized for presentation]
[Design elements and visual suggestions]

Focus on creating slides that tell a compelling story and are visually engaging for investors, stakeholders, or audiences.`

      console.log("Generating slides with enhanced design prompt length:", slidePrompt.length)

      // Use server-side API route
      const response = await this.makeV0Request("/chats", {
        message: slidePrompt,
      })

      // Calculate token usage
      const responseContent =
        (response.messages && response.messages.length > 0
          ? response.messages.find((m: any) => m.role === "assistant")?.content
          : response.message) || ""

      const tokenUsage = this.calculateTokenUsage(slidePrompt, responseContent)

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

      const slidePrompt = `You are an expert pitch deck and presentation designer with deep knowledge of modern design principles, visual hierarchy, and effective storytelling through slides.

Create a professional, visually stunning presentation with multiple slides based on the following:

${prompt}

${fileContent ? `Document content: ${fileContent}` : ""}

DESIGN REQUIREMENTS:
- Use modern, clean design principles with proper visual hierarchy
- Include relevant icons, charts, and visual elements where appropriate
- Apply color psychology and brand-appropriate color schemes
- Ensure each slide has a clear purpose and visual focus
- Use typography effectively with proper contrast and readability
- Include data visualizations (charts, graphs) when presenting statistics or comparisons
- Add icons and visual elements that support the content narrative
- Design for impact and memorability

CONTENT ANALYSIS:
- Analyze the content to determine the best visual representation
- For data/statistics: suggest charts, graphs, or infographics
- For processes: suggest flowcharts or step-by-step visuals
- For comparisons: suggest side-by-side layouts or comparison tables
- For team/about sections: suggest profile layouts with photos
- For product features: suggest feature highlight layouts with icons

SLIDE STRUCTURE:
Please structure the response with clear slide sections using ## headers. Each slide should have:
- A compelling title that captures attention
- Content optimized for visual presentation
- Suggestions for visual elements (icons, charts, images)
- Logical flow for a pitch presentation

Include slides for: Problem/Opportunity, Solution, Market Size, Business Model, Competition Analysis, Team, Traction/Metrics, Financial Projections, and Funding Ask (adjust based on content).

Format each slide as:
## Slide 1: [Compelling Title]
[Visual-optimized content with design suggestions]
[Icons: suggest relevant icons]
[Visual elements: charts/graphs if applicable]

## Slide 2: [Next Title]
[Content optimized for presentation]
[Design elements and visual suggestions]

Focus on creating slides that tell a compelling story and are visually engaging for investors, stakeholders, or audiences.`

      await this.createStreamingChat(
        slidePrompt,
        onChunk || (() => {}),
        (response) => {
          const responseContent =
            (response.messages && response.messages.length > 0
              ? response.messages.find((m: any) => m.role === "assistant")?.content
              : response.message) || ""

          const tokenUsage = this.calculateTokenUsage(slidePrompt, responseContent)
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
      const responseContent =
        (response.messages && response.messages.length > 0
          ? response.messages.find((m: any) => m.role === "assistant")?.content
          : response.message) || ""

      const tokenUsage = this.calculateTokenUsage(message, responseContent)

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
      const responseContent =
        (response.messages && response.messages.length > 0
          ? response.messages.find((m: any) => m.role === "assistant")?.content
          : response.message) || ""

      const tokenUsage = this.calculateTokenUsage(message, responseContent)

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
