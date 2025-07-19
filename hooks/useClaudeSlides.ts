"use client"

import { useState, useCallback } from "react"

interface Slide {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  layout: "title" | "content" | "two-column" | "image"
}

interface GenerationResult {
  slides: Slide[]
  message?: string
  designNotes?: string
}

interface UseClaudeSlidesReturn {
  generateSlides: (prompt: string, file?: File) => Promise<GenerationResult | null>
  generateSlidesStreaming: (
    prompt: string,
    file?: File,
    onChunk?: (chunk: string) => void,
    onComplete?: (result: GenerationResult) => void,
    onError?: (error: Error) => void,
  ) => Promise<void>
  editSlide: (slideId: string, slideTitle: string, prompt: string) => Promise<GenerationResult | null>
  regenerateAllSlides: (prompt: string) => Promise<GenerationResult | null>
  isLoading: boolean
  error: string | null
}

export function useClaudeSlides(): UseClaudeSlidesReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSlides = useCallback(async (prompt: string, file?: File): Promise<GenerationResult | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()

      const requestData = {
        prompt,
        slideCount: "auto",
        presentationType: "business",
        audience: "team",
        tone: "professional",
        editMode: "all",
      }

      formData.append("data", JSON.stringify(requestData))

      if (file) {
        formData.append("file", file)
      }

      const response = await fetch("/api/claude/generate-slides", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate slides")
      }

      const result = await response.json()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(errorMessage)
      console.error("Claude generation error:", err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const generateSlidesStreaming = useCallback(
    async (
      prompt: string,
      file?: File,
      onChunk?: (chunk: string) => void,
      onComplete?: (result: GenerationResult) => void,
      onError?: (error: Error) => void,
    ): Promise<void> => {
      setIsLoading(true)
      setError(null)

      try {
        const requestData = {
          prompt,
          slideCount: "auto",
          presentationType: "business",
          audience: "team",
          tone: "professional",
          editMode: "all",
        }

        const response = await fetch("/api/claude/stream-slides", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        })

        if (!response.ok) {
          throw new Error("Failed to start streaming generation")
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("No response stream available")
        }

        let accumulatedContent = ""

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))

                switch (data.type) {
                  case "chunk":
                    accumulatedContent += data.content
                    onChunk?.(data.content)
                    break

                  case "progress":
                    console.log("Claude progress:", data)
                    break

                  case "complete":
                    const jsonMatch = data.content.match(/\{[\s\S]*\}/)
                    if (jsonMatch) {
                      const result = JSON.parse(jsonMatch[0])
                      onComplete?.(result)
                    }
                    break

                  case "error":
                    throw new Error(data.error)
                }
              } catch (parseError) {
                console.warn("Failed to parse Claude streaming data:", parseError)
              }
            }
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Claude streaming failed")
        setError(error.message)
        onError?.(error)
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const editSlide = useCallback(
    async (slideId: string, slideTitle: string, prompt: string): Promise<GenerationResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const formData = new FormData()

        const requestData = {
          prompt,
          editMode: "selected",
          selectedSlideId: slideId,
          selectedSlideTitle: slideTitle,
          presentationType: "business",
          audience: "team",
          tone: "professional",
        }

        formData.append("data", JSON.stringify(requestData))

        const response = await fetch("/api/claude/generate-slides", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to edit slide")
        }

        const result = await response.json()
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to edit slide"
        setError(errorMessage)
        console.error("Claude edit error:", err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const regenerateAllSlides = useCallback(
    async (prompt: string): Promise<GenerationResult | null> => {
      return generateSlides(prompt)
    },
    [generateSlides],
  )

  return {
    generateSlides,
    generateSlidesStreaming,
    editSlide,
    regenerateAllSlides,
    isLoading,
    error,
  }
}
