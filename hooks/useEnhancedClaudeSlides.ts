"use client"

import { useState, useCallback, useRef } from "react"
import { useAuth } from "@/lib/auth-context"

// Enhanced TypeScript interfaces
interface SlideGenerationOptions {
  slideCount?: number | string
  presentationType?: "business" | "academic" | "creative" | "technical" | "marketing"
  audience?: "executive" | "team" | "public" | "students" | "clients"
  tone?: "professional" | "casual" | "persuasive" | "educational" | "inspiring"
  includeCharts?: boolean
  includeTables?: boolean
  designTheme?: "business" | "creative" | "minimal" | "vibrant" | "nature" | "ocean" | "sunset"
}

interface EnhancedSlide {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  titleColor?: string
  accentColor?: string
  layout: "title" | "content" | "chart" | "table" | "two-column" | "split"
  titleFont?: string
  contentFont?: string
  titleSize?: string
  contentSize?: string
  shadowEffect?: string
  borderRadius?: string
  glassmorphism?: boolean
  chartData?: any
  tableData?: any
  icons?: any[]
  contentType?: "opening" | "problem" | "solution" | "data" | "conclusion" | "transition"
  designTheme: string
  spacing?: "compact" | "comfortable" | "generous"
  alignment?: "left" | "center" | "right"
}

interface GenerationResult {
  slides: EnhancedSlide[]
  message: string
  designNotes: string
  overallTheme: string
  keyMetrics?: string[]
  generationStats: {
    slideCount: number
    processingTime: number
    hasCharts: boolean
    hasTables: boolean
  }
}

interface GenerationProgress {
  stage: "analyzing" | "structuring" | "designing" | "enhancing" | "complete" | "error"
  progress: number
  currentSlide?: string
  totalSlides?: number
  message: string
  estimatedTimeRemaining?: number
  tokensUsed?: number
  creditsDeducted?: number
}

interface ContentAnalysis {
  wordCount: number
  complexity: "simple" | "moderate" | "complex"
  suggestedSlideCount: number
  keyTopics: string[]
  recommendedCharts: string[]
  estimatedCredits: number
}

interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

interface CreditUsage {
  inputTokens: number
  outputTokens: number
  totalCost: number
  remainingCredits: number
}

interface StreamingChunk {
  type: "progress" | "chunk" | "complete" | "error" | "credit_update"
  content?: string
  progress?: number
  stage?: string
  message?: string
  result?: GenerationResult
  error?: string
  credits?: CreditUsage
}

export function useEnhancedClaudeSlides() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [creditUsage, setCreditUsage] = useState<CreditUsage | null>(null)

  const { session, user, updateCredits } = useAuth()
  const abortControllerRef = useRef<AbortController | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Default retry configuration
  const defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  }

  // Content analysis function
  const analyzeContent = useCallback((prompt: string, file?: File): ContentAnalysis => {
    const wordCount = prompt.split(/\s+/).length
    let complexity: ContentAnalysis["complexity"] = "simple"

    if (wordCount > 100) complexity = "moderate"
    if (wordCount > 300) complexity = "complex"

    // Analyze for key topics and chart suggestions
    const keyTopics = extractKeyTopics(prompt)
    const recommendedCharts = suggestCharts(prompt)

    // Estimate slide count based on content
    const suggestedSlideCount = Math.max(4, Math.min(12, Math.ceil(wordCount / 50)))

    // Estimate credit cost (simplified calculation)
    const baseCredits = 5
    const complexityMultiplier = complexity === "complex" ? 2 : complexity === "moderate" ? 1.5 : 1
    const fileMultiplier = file ? 1.3 : 1
    const estimatedCredits = Math.ceil(baseCredits * complexityMultiplier * fileMultiplier)

    return {
      wordCount,
      complexity,
      suggestedSlideCount,
      keyTopics,
      recommendedCharts,
      estimatedCredits,
    }
  }, [])

  // Helper function to extract key topics
  const extractKeyTopics = (text: string): string[] => {
    const commonWords = new Set([
      "the",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "must",
      "shall",
      "a",
      "an",
    ])

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !commonWords.has(word))

    const wordFreq = words.reduce(
      (acc, word) => {
        acc[word] = (acc[word] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word)
  }

  // Helper function to suggest charts
  const suggestCharts = (text: string): string[] => {
    const chartKeywords = {
      bar: ["revenue", "sales", "growth", "comparison", "performance", "metrics"],
      line: ["trend", "time", "progress", "timeline", "over time", "monthly", "quarterly"],
      pie: ["distribution", "share", "percentage", "breakdown", "allocation", "market share"],
      area: ["cumulative", "total", "accumulation", "stacked", "volume"],
    }

    const textLower = text.toLowerCase()
    const suggestions: string[] = []

    Object.entries(chartKeywords).forEach(([chartType, keywords]) => {
      if (keywords.some((keyword) => textLower.includes(keyword))) {
        suggestions.push(chartType)
      }
    })

    return suggestions.length > 0 ? suggestions : ["bar"] // Default to bar chart
  }

  // Enhanced retry logic with exponential backoff
  const retryWithBackoff = async (
    operation: () => Promise<any>,
    config: RetryConfig = defaultRetryConfig,
  ): Promise<any> => {
    let lastError: Error

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        setRetryCount(attempt)
        return await operation()
      } catch (error) {
        lastError = error as Error

        if (attempt === config.maxRetries) {
          throw lastError
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(config.baseDelay * Math.pow(config.backoffMultiplier, attempt), config.maxDelay)

        setProgress((prev) =>
          prev
            ? {
                ...prev,
                message: `Retrying in ${Math.ceil(delay / 1000)}s... (Attempt ${attempt + 1}/${config.maxRetries + 1})`,
              }
            : null,
        )

        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  // Credit deduction function
  const deductCredits = async (inputTokens: number, outputTokens: number): Promise<CreditUsage> => {
    if (!session?.access_token) {
      throw new Error("Authentication required for credit deduction")
    }

    // Calculate cost (simplified - adjust based on your pricing model)
    const inputCost = inputTokens * 0.001 // $0.001 per input token
    const outputCost = outputTokens * 0.002 // $0.002 per output token
    const totalCost = Math.ceil((inputCost + outputCost) * 100) / 100 // Round to 2 decimal places

    const response = await fetch("/api/credits/deduct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        inputTokens,
        outputTokens,
        totalCost,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to deduct credits")
    }

    const result = await response.json()

    const creditUsage: CreditUsage = {
      inputTokens,
      outputTokens,
      totalCost,
      remainingCredits: result.remainingCredits,
    }

    setCreditUsage(creditUsage)
    updateCredits(-totalCost) // Update local auth context

    return creditUsage
  }

  // Main slide generation function
  const generateSlides = useCallback(
    async (prompt: string, file?: File | null, options?: SlideGenerationOptions): Promise<GenerationResult | null> => {
      if (!session?.access_token) {
        setError("Authentication required. Please log in to generate slides.")
        return null
      }

      // Check if user has sufficient credits
      if (user && user.monthly_credits + user.purchased_credits < 5) {
        setError("Insufficient credits. Please purchase more credits to continue.")
        return null
      }

      setIsLoading(true)
      setError(null)
      setRetryCount(0)
      setCreditUsage(null)

      // Analyze content first
      const analysis = analyzeContent(prompt, file || undefined)
      setContentAnalysis(analysis)

      // Check if user has enough credits for estimated cost
      if (user && user.monthly_credits + user.purchased_credits < analysis.estimatedCredits) {
        setError(
          `Insufficient credits. This generation requires approximately ${analysis.estimatedCredits} credits, but you only have ${user.monthly_credits + user.purchased_credits} remaining.`,
        )
        setIsLoading(false)
        return null
      }

      setProgress({
        stage: "analyzing",
        progress: 10,
        message: "Analyzing your request and understanding the context...",
        estimatedTimeRemaining: 45,
      })

      try {
        const result = await retryWithBackoff(async () => {
          // Create abort controller for this request
          abortControllerRef.current = new AbortController()

          const formData = new FormData()
          formData.append(
            "data",
            JSON.stringify({
              prompt,
              slideCount: options?.slideCount || analysis.suggestedSlideCount,
              presentationType: options?.presentationType || "business",
              audience: options?.audience || "team",
              tone: options?.tone || "professional",
              includeCharts: options?.includeCharts ?? true,
              includeTables: options?.includeTables ?? false,
              designTheme: options?.designTheme || "business",
              editMode: "all",
              hasFile: !!file,
            }),
          )

          if (file) {
            formData.append("file", file)
          }

          setProgress((prev) =>
            prev
              ? {
                  ...prev,
                  stage: "structuring",
                  progress: 30,
                  message: "Creating presentation structure and narrative flow...",
                  estimatedTimeRemaining: 30,
                }
              : null,
          )

          const response = await fetch("/api/claude/generate-slides", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
            signal: abortControllerRef.current.signal,
          })

          setProgress((prev) =>
            prev
              ? {
                  ...prev,
                  stage: "designing",
                  progress: 60,
                  message: "Applying professional design and visual elements...",
                  estimatedTimeRemaining: 15,
                }
              : null,
          )

          if (!response.ok) {
            const errorData = await response.json()

            // Handle specific error types
            if (response.status === 429) {
              throw new Error("Rate limit exceeded. Please wait a moment before trying again.")
            } else if (response.status === 401) {
              throw new Error("Authentication failed. Please log in again.")
            } else if (response.status === 400 && errorData.type === "file_error") {
              throw new Error(`File error: ${errorData.error}`)
            }

            throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate slides`)
          }

          const result = await response.json()

          setProgress((prev) =>
            prev
              ? {
                  ...prev,
                  stage: "enhancing",
                  progress: 90,
                  message: "Adding final touches and optimizations...",
                  estimatedTimeRemaining: 5,
                }
              : null,
          )

          // Simulate final processing time
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // Deduct credits based on actual usage (if provided in response)
          if (result.generationStats?.tokensUsed) {
            try {
              await deductCredits(
                result.generationStats.inputTokens || 1000,
                result.generationStats.outputTokens || 2000,
              )
            } catch (creditError) {
              console.warn("Credit deduction failed:", creditError)
              // Don't fail the entire operation for credit issues
            }
          }

          setProgress({
            stage: "complete",
            progress: 100,
            message: `Successfully created ${result.slides.length} professional slides!`,
            estimatedTimeRemaining: 0,
            tokensUsed: result.generationStats?.tokensUsed,
            creditsDeducted: analysis.estimatedCredits,
          })

          return result
        })

        return result
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setError("Generation was cancelled")
        } else {
          const errorMessage =
            err instanceof Error ? err.message : "An unexpected error occurred during slide generation"
          setError(errorMessage)
          setProgress({
            stage: "error",
            progress: 0,
            message: errorMessage,
          })
        }
        console.error("Slide generation error:", err)
        return null
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
        // Clear progress after 3 seconds
        setTimeout(() => setProgress(null), 3000)
      }
    },
    [session, user, analyzeContent, updateCredits],
  )

  // Enhanced streaming generation
  const generateSlidesStreaming = useCallback(
    async (
      prompt: string,
      file?: File | null,
      onChunk?: (chunk: string) => void,
      onComplete?: (result: GenerationResult) => void,
      onError?: (error: Error) => void,
      options?: SlideGenerationOptions,
    ) => {
      if (!session?.access_token) {
        const error = new Error("Authentication required. Please log in to generate slides.")
        setError(error.message)
        onError?.(error)
        return
      }

      setIsLoading(true)
      setError(null)
      setRetryCount(0)

      // Analyze content
      const analysis = analyzeContent(prompt, file || undefined)
      setContentAnalysis(analysis)

      try {
        await retryWithBackoff(async () => {
          abortControllerRef.current = new AbortController()

          setProgress({
            stage: "analyzing",
            progress: 5,
            message: "Starting AI analysis and content structuring...",
            estimatedTimeRemaining: 60,
          })

          // Start progress simulation
          let currentProgress = 5
          progressIntervalRef.current = setInterval(() => {
            currentProgress = Math.min(currentProgress + 2, 85)
            setProgress((prev) => {
              if (!prev || prev.progress >= 85) return prev

              let stage: GenerationProgress["stage"] = "analyzing"
              let message = "Analyzing content requirements..."

              if (currentProgress > 60) {
                stage = "designing"
                message = "Applying professional design themes and visual elements..."
              } else if (currentProgress > 30) {
                stage = "structuring"
                message = "Structuring content flow and slide organization..."
              }

              return {
                ...prev,
                progress: currentProgress,
                stage,
                message,
                estimatedTimeRemaining: Math.max(0, Math.ceil((85 - currentProgress) * 0.8)),
              }
            })
          }, 800)

          const requestData = {
            prompt,
            slideCount: options?.slideCount || analysis.suggestedSlideCount,
            presentationType: options?.presentationType || "business",
            audience: options?.audience || "team",
            tone: options?.tone || "professional",
            includeCharts: options?.includeCharts ?? true,
            includeTables: options?.includeTables ?? false,
            designTheme: options?.designTheme || "business",
          }

          const response = await fetch("/api/claude/stream-slides", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(requestData),
            signal: abortControllerRef.current.signal,
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to start streaming generation`)
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
                  const data: StreamingChunk = JSON.parse(line.slice(6))

                  switch (data.type) {
                    case "chunk":
                      if (data.content) {
                        accumulatedContent += data.content
                        onChunk?.(data.content)
                      }
                      break

                    case "progress":
                      if (data.progress !== undefined) {
                        setProgress((prev) =>
                          prev
                            ? {
                                ...prev,
                                progress: data.progress!,
                                stage: (data.stage as GenerationProgress["stage"]) || prev.stage,
                                message: data.message || prev.message,
                              }
                            : null,
                        )
                      }
                      break

                    case "complete":
                      if (progressIntervalRef.current) {
                        clearInterval(progressIntervalRef.current)
                        progressIntervalRef.current = null
                      }

                      setProgress({
                        stage: "complete",
                        progress: 100,
                        message: "Generation completed successfully!",
                        estimatedTimeRemaining: 0,
                      })

                      if (data.result) {
                        // Deduct credits
                        try {
                          await deductCredits(1000, 2000) // Estimate - should come from API
                        } catch (creditError) {
                          console.warn("Credit deduction failed:", creditError)
                        }

                        onComplete?.(data.result)
                      }
                      break

                    case "credit_update":
                      if (data.credits) {
                        setCreditUsage(data.credits)
                        updateCredits(-data.credits.totalCost)
                      }
                      break

                    case "error":
                      throw new Error(data.error || "Streaming generation failed")
                  }
                } catch (parseError) {
                  console.warn("Failed to parse streaming data:", parseError)
                }
              }
            }
          }
        })
      } catch (err) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }

        const error = err instanceof Error ? err : new Error("Streaming generation failed")
        setError(error.message)
        setProgress({
          stage: "error",
          progress: 0,
          message: error.message,
        })
        onError?.(error)
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        // Clear progress after 3 seconds
        setTimeout(() => setProgress(null), 3000)
      }
    },
    [session, analyzeContent, updateCredits],
  )

  // Enhanced slide editing function
  const editSlide = useCallback(
    async (
      slideId: string,
      slideTitle: string,
      editPrompt: string,
      existingSlides?: EnhancedSlide[],
    ): Promise<GenerationResult | null> => {
      if (!session?.access_token) {
        setError("Authentication required for slide editing")
        return null
      }

      setIsLoading(true)
      setError(null)

      setProgress({
        stage: "analyzing",
        progress: 20,
        message: `Analyzing edit request for "${slideTitle}"...`,
      })

      try {
        const result = await retryWithBackoff(async () => {
          const formData = new FormData()
          formData.append(
            "data",
            JSON.stringify({
              prompt: editPrompt,
              editMode: "selected",
              selectedSlideId: slideId,
              selectedSlideTitle: slideTitle,
              existingSlides: existingSlides || [],
              presentationType: "business",
              audience: "team",
              tone: "professional",
            }),
          )

          setProgress((prev) =>
            prev
              ? {
                  ...prev,
                  progress: 60,
                  message: "Applying edits and maintaining design consistency...",
                }
              : null,
          )

          const response = await fetch("/api/claude/generate-slides", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || "Failed to edit slide")
          }

          const result = await response.json()

          setProgress({
            stage: "complete",
            progress: 100,
            message: "Slide edited successfully!",
          })

          // Deduct credits for edit operation (smaller amount)
          try {
            await deductCredits(500, 800) // Smaller cost for editing
          } catch (creditError) {
            console.warn("Credit deduction failed:", creditError)
          }

          return result
        })

        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to edit slide"
        setError(errorMessage)
        console.error("Slide edit error:", err)
        return null
      } finally {
        setIsLoading(false)
        setTimeout(() => setProgress(null), 2000)
      }
    },
    [session, updateCredits],
  )

  // Cancel current operation
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    setIsLoading(false)
    setProgress(null)
    setError("Generation cancelled by user")
  }, [])

  // Clear error state
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Clear all states
  const reset = useCallback(() => {
    setError(null)
    setProgress(null)
    setContentAnalysis(null)
    setRetryCount(0)
    setCreditUsage(null)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    setIsLoading(false)
  }, [])

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
  }, [])

  return {
    // State
    isLoading,
    error,
    progress,
    contentAnalysis,
    retryCount,
    creditUsage,

    // Actions
    generateSlides,
    generateSlidesStreaming,
    editSlide,
    cancelGeneration,
    clearError,
    reset,
    cleanup,

    // Utilities
    analyzeContent,
  }
}
