"use client"

import { useState, useCallback, useRef } from "react"
import { useAuth } from "@/lib/auth-context"

interface SlideGenerationOptions {
  slideCount?: number | string
  presentationType?: "business" | "academic" | "creative" | "technical" | "marketing"
  audience?: "executive" | "team" | "public" | "students" | "clients"
  tone?: "professional" | "casual" | "persuasive" | "educational" | "inspiring"
}

interface GenerationResult {
  slides: any[]
  message: string
  designNotes: string
  overallTheme: string
  keyMetrics?: string[]
  tokenUsage?: {
    prompt: number
    completion: number
    total: number
  }
  creditCost?: number
}

interface GenerationProgress {
  stage: "analyzing" | "structuring" | "designing" | "enhancing" | "complete"
  progress: number
  currentSlide?: string
  totalSlides?: number
  message: string
  estimatedTimeRemaining?: number
  tokenUsage?: number
}

interface ContentAnalysis {
  topics: string[]
  complexity: "simple" | "moderate" | "complex"
  suggestedCharts: string[]
  estimatedSlides: number
  estimatedTokens: number
  estimatedCredits: number
}

interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
}

interface ErrorDetails {
  type: "auth" | "rate_limit" | "file_error" | "network" | "server" | "unknown"
  message: string
  retryable: boolean
  retryAfter?: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
}

export function useEnhancedClaudeSlides() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { session } = useAuth()

  // Content analysis function
  const analyzeContent = useCallback((prompt: string, file?: File): ContentAnalysis => {
    const words = prompt.toLowerCase().split(/\s+/)
    const wordCount = words.length

    // Extract topics using keyword analysis
    const businessKeywords = ["revenue", "profit", "market", "strategy", "growth", "sales"]
    const techKeywords = ["technology", "software", "data", "algorithm", "system", "platform"]
    const academicKeywords = ["research", "study", "analysis", "methodology", "findings", "conclusion"]

    const topics: string[] = []
    if (businessKeywords.some((keyword) => words.includes(keyword))) topics.push("business")
    if (techKeywords.some((keyword) => words.includes(keyword))) topics.push("technology")
    if (academicKeywords.some((keyword) => words.includes(keyword))) topics.push("academic")

    // Determine complexity
    let complexity: "simple" | "moderate" | "complex" = "simple"
    if (wordCount > 100) complexity = "moderate"
    if (wordCount > 300 || file) complexity = "complex"

    // Suggest chart types based on content
    const suggestedCharts: string[] = []
    if (words.some((w) => ["data", "numbers", "statistics", "metrics"].includes(w))) {
      suggestedCharts.push("bar", "line")
    }
    if (words.some((w) => ["comparison", "versus", "compare"].includes(w))) {
      suggestedCharts.push("pie", "bar")
    }
    if (words.some((w) => ["trend", "growth", "over time", "timeline"].includes(w))) {
      suggestedCharts.push("line", "area")
    }

    // Estimate slides and tokens
    const estimatedSlides = Math.max(3, Math.min(15, Math.ceil(wordCount / 50)))
    const estimatedTokens = wordCount * 4 + (file ? 1000 : 0) // Rough estimation
    const estimatedCredits = Math.ceil(estimatedTokens / 1000) * 2 // 2 credits per 1k tokens

    return {
      topics,
      complexity,
      suggestedCharts,
      estimatedSlides,
      estimatedTokens,
      estimatedCredits,
    }
  }, [])

  // Enhanced error categorization
  const categorizeError = useCallback((error: any): ErrorDetails => {
    const message = error?.message || error?.toString() || "Unknown error"

    if (message.includes("401") || message.includes("unauthorized")) {
      return {
        type: "auth",
        message: "Authentication failed. Please log in again.",
        retryable: false,
      }
    }

    if (message.includes("429") || message.includes("rate limit")) {
      const retryAfter = error?.retryAfter || 60
      return {
        type: "rate_limit",
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryable: true,
        retryAfter,
      }
    }

    if (message.includes("file") || message.includes("upload")) {
      return {
        type: "file_error",
        message: "File processing failed. Please check your file and try again.",
        retryable: true,
      }
    }

    if (message.includes("network") || message.includes("fetch")) {
      return {
        type: "network",
        message: "Network error. Please check your connection and try again.",
        retryable: true,
      }
    }

    if (message.includes("500") || message.includes("server")) {
      return {
        type: "server",
        message: "Server error. Please try again in a moment.",
        retryable: true,
      }
    }

    return {
      type: "unknown",
      message: message,
      retryable: true,
    }
  }, [])

  // Generic retry function with exponential backoff
  const retryWithBackoff = useCallback(
    async (operation: () => Promise<any>, config: RetryConfig = DEFAULT_RETRY_CONFIG): Promise<any> => {
      let lastError: any

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          setRetryCount(attempt)
          return await operation()
        } catch (error) {
          lastError = error
          const errorDetails = categorizeError(error)

          if (!errorDetails.retryable || attempt === config.maxRetries) {
            throw error
          }

          // Calculate delay with exponential backoff
          const delay = Math.min(config.baseDelay * Math.pow(config.backoffFactor, attempt), config.maxDelay)

          // Add jitter to prevent thundering herd
          const jitteredDelay = delay + Math.random() * 1000

          setProgress((prev) =>
            prev
              ? {
                  ...prev,
                  message: `Retrying in ${Math.ceil(jitteredDelay / 1000)} seconds... (Attempt ${attempt + 1}/${config.maxRetries + 1})`,
                }
              : null,
          )

          await new Promise((resolve) => setTimeout(resolve, jitteredDelay))
        }
      }

      throw lastError
    },
    [categorizeError],
  )

  // Credit tracking and deduction
  const trackCredits = useCallback(
    async (operation: "estimate" | "deduct", amount: number) => {
      if (!session?.access_token) return

      try {
        const response = await fetch("/api/credits/deduct", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            operation,
            amount,
            description: operation === "estimate" ? "Slide generation estimate" : "Slide generation",
          }),
        })

        if (!response.ok) {
          throw new Error("Credit tracking failed")
        }

        return await response.json()
      } catch (error) {
        console.error("Credit tracking error:", error)
      }
    },
    [session],
  )

  const generateSlides = useCallback(
    async (prompt: string, file?: File | null, options?: SlideGenerationOptions): Promise<GenerationResult | null> => {
      if (!session?.access_token) {
        setError("Authentication required")
        return null
      }

      // Analyze content first
      const analysis = analyzeContent(prompt, file || undefined)
      setContentAnalysis(analysis)

      // Check credits
      try {
        await trackCredits("estimate", analysis.estimatedCredits)
      } catch (error) {
        setError("Insufficient credits for this operation")
        return null
      }

      setIsLoading(true)
      setError(null)
      setRetryCount(0)

      // Create abort controller
      abortControllerRef.current = new AbortController()

      const startTime = Date.now()

      const updateProgressWithTime = (stage: GenerationProgress["stage"], progress: number, message: string) => {
        const elapsed = Date.now() - startTime
        const estimatedTotal = (elapsed / progress) * 100
        const remaining = Math.max(0, estimatedTotal - elapsed)

        setProgress({
          stage,
          progress,
          message,
          estimatedTimeRemaining: Math.ceil(remaining / 1000),
          tokenUsage: Math.floor((progress / 100) * analysis.estimatedTokens),
        })
      }

      try {
        return await retryWithBackoff(async () => {
          updateProgressWithTime("analyzing", 10, "Analyzing your request and understanding the context...")

          const formData = new FormData()
          formData.append(
            "data",
            JSON.stringify({
              prompt,
              slideCount: options?.slideCount || "auto",
              presentationType: options?.presentationType || "business",
              audience: options?.audience || "team",
              tone: options?.tone || "professional",
              editMode: "all",
              hasFile: !!file,
              contentAnalysis: analysis,
            }),
          )

          if (file) {
            formData.append("file", file)
          }

          updateProgressWithTime("structuring", 30, "Creating presentation structure and flow...")

          const response = await fetch("/api/claude/generate-slides", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
            signal: abortControllerRef.current?.signal,
          })

          updateProgressWithTime("designing", 60, "Applying professional design and visual elements...")

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || "Failed to generate slides")
          }

          const result = await response.json()

          updateProgressWithTime("enhancing", 90, "Adding final touches and optimizations...")

          // Deduct credits for successful generation
          await trackCredits("deduct", analysis.estimatedCredits)

          await new Promise((resolve) => setTimeout(resolve, 1000))

          updateProgressWithTime("complete", 100, `Successfully created ${result.slides.length} professional slides!`)

          return {
            ...result,
            tokenUsage: {
              prompt: analysis.estimatedTokens,
              completion: result.slides.length * 100, // Rough estimate
              total: analysis.estimatedTokens + result.slides.length * 100,
            },
            creditCost: analysis.estimatedCredits,
          }
        })
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setError("Generation cancelled")
        } else {
          const errorDetails = categorizeError(err)
          setError(errorDetails.message)
          console.error("Slide generation error:", err)
        }
        return null
      } finally {
        setIsLoading(false)
        setTimeout(() => {
          setProgress(null)
          setRetryCount(0)
        }, 3000)
      }
    },
    [session, analyzeContent, trackCredits, retryWithBackoff, categorizeError],
  )

  const generateSlidesStreaming = useCallback(
    async (
      prompt: string,
      file?: File | null,
      onChunk?: (chunk: string) => void,
      onComplete?: (result: GenerationResult) => void,
      onError?: (error: Error) => void,
    ) => {
      if (!session?.access_token) {
        onError?.(new Error("Authentication required"))
        return
      }

      setIsLoading(true)
      setError(null)
      abortControllerRef.current = new AbortController()

      try {
        const analysis = analyzeContent(prompt, file || undefined)
        setContentAnalysis(analysis)

        setProgress({
          stage: "analyzing",
          progress: 5,
          message: "Starting AI analysis...",
        })

        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (!prev || prev.progress >= 90) return prev
            return {
              ...prev,
              progress: Math.min(prev.progress + 5, 90),
              stage: prev.progress > 60 ? "designing" : prev.progress > 30 ? "structuring" : "analyzing",
              message:
                prev.progress > 60
                  ? "Applying professional design themes..."
                  : prev.progress > 30
                    ? "Structuring content flow..."
                    : "Analyzing content requirements...",
            }
          })
        }, 800)

        const formData = new FormData()
        formData.append(
          "data",
          JSON.stringify({
            prompt,
            slideCount: "auto",
            presentationType: "business",
            audience: "team",
            tone: "professional",
            streaming: true,
            contentAnalysis: analysis,
          }),
        )

        if (file) {
          formData.append("file", file)
        }

        const response = await fetch("/api/claude/stream-slides", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("No response body")
        }

        let buffer = ""
        let result: GenerationResult | null = null

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += new TextDecoder().decode(value)
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6))

                  if (data.type === "chunk") {
                    onChunk?.(data.content)
                  } else if (data.type === "complete") {
                    result = data.result
                    clearInterval(progressInterval)
                    setProgress({
                      stage: "complete",
                      progress: 100,
                      message: "Generation complete!",
                    })
                  } else if (data.type === "error") {
                    throw new Error(data.error)
                  }
                } catch (parseError) {
                  console.warn("Failed to parse SSE data:", parseError)
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
          clearInterval(progressInterval)
        }

        if (result) {
          await trackCredits("deduct", analysis.estimatedCredits)
          onComplete?.(result)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Generation failed")
        setError(error.message)
        onError?.(error)
      } finally {
        setIsLoading(false)
        setTimeout(() => setProgress(null), 3000)
      }
    },
    [session, analyzeContent, trackCredits],
  )

  const editSlide = useCallback(
    async (slideId: string, slideTitle: string, editPrompt: string): Promise<GenerationResult | null> => {
      if (!session?.access_token) {
        setError("Authentication required")
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/claude/edit-slide", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slideId,
            slideTitle,
            editPrompt,
          }),
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
        console.error("Slide editing error:", err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [session],
  )

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
      setProgress(null)
      setError("Generation cancelled")
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearProgress = useCallback(() => {
    setProgress(null)
  }, [])

  return {
    isLoading,
    error,
    progress,
    contentAnalysis,
    retryCount,
    generateSlides,
    generateSlidesStreaming,
    editSlide,
    cancelGeneration,
    clearError,
    clearProgress,
  }
}
