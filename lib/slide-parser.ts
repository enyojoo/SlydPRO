import type { V0ChatResponse } from "./v0-api"

interface ParsedSlide {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  layout?: "title" | "content" | "two-column" | "image"
}

export function parseV0ResponseToSlides(response: V0ChatResponse): ParsedSlide[] {
  const slides: ParsedSlide[] = []

  // Look for slide content in the assistant's message
  const assistantMessage = response.messages.find((m) => m.role === "assistant")
  if (!assistantMessage) return slides

  const content = assistantMessage.content

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

      // Determine slide type and colors based on content
      const slideType = determineSlideType(titleLine, contentLines)
      const colors = getSlideColors(slideType, index)

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
    // Fallback: create slides from structured content
    const fallbackSlides = createFallbackSlides(content)
    slides.push(...fallbackSlides)
  }

  return slides.length > 0 ? slides : getDefaultSlides()
}

function determineSlideType(title: string, content: string): "title" | "content" | "two-column" | "image" {
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

function getSlideColors(slideType: string, index: number) {
  const colorSchemes = [
    { background: "#1e40af", textColor: "#ffffff" }, // Blue
    { background: "#dc2626", textColor: "#ffffff" }, // Red
    { background: "#059669", textColor: "#ffffff" }, // Green
    { background: "#7c3aed", textColor: "#ffffff" }, // Purple
    { background: "#ea580c", textColor: "#ffffff" }, // Orange
    { background: "#0891b2", textColor: "#ffffff" }, // Cyan
  ]

  if (slideType === "title") {
    return { background: "#1e1b4b", textColor: "#ffffff" }
  }

  return colorSchemes[index % colorSchemes.length]
}

function createFallbackSlides(content: string): ParsedSlide[] {
  // Create basic slides from unstructured content
  const paragraphs = content.split("\n\n").filter((p) => p.trim().length > 20)

  return paragraphs.slice(0, 5).map((paragraph, index) => {
    const sentences = paragraph.split(".").filter((s) => s.trim())
    const title = sentences[0]?.trim() || `Slide ${index + 1}`
    const content = sentences.slice(1).join(".").trim() || paragraph

    const colors = getSlideColors("content", index)

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

function getDefaultSlides(): ParsedSlide[] {
  return [
    {
      id: "slide-1",
      title: "Welcome to Your Pitch Deck",
      content: "Start by describing your business idea or uploading a document.",
      background: "#1e40af",
      textColor: "#ffffff",
      layout: "title",
    },
  ]
}
