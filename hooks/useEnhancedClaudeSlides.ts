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
    input: number
    output: number
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
  tokenUsage?: number
  estimatedCredits?: number
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
  type: "auth" | "rate_limit" | "file_error" | "generation_error" | "network_error" | "unknown"
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
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)
  const [contentAnalysis, setContentAnalysis] = useState(null)
  const [creditBalance, setCreditBalance] = useState(null)
  const abortControllerRef = useRef(null)

  const { session } = useAuth()

  // Analyze content before generation
  const analyzeContent = useCallback(async (prompt, file) => {
    const words = prompt.split(/\s+/).length
    const hasFile = !!file

    // Extract topics using simple keyword analysis
    const topics = extractTopics(prompt)

    // Determine complexity
    const complexity = determineComplexity(prompt, hasFile)

    // Suggest chart types based on content
    const suggestedCharts = suggestChartTypes(prompt)

    // Estimate slides and tokens
    const estimatedSlides = Math.max(3, Math.min(15, Math.ceil(words / 50) + (hasFile ? 2 : 0)))
    const estimatedTokens = words * 4 + (hasFile ? 1000 : 0) + estimatedSlides * 200
    const estimatedCredits = Math.ceil(estimatedTokens / 1000)

    return {
      topics,
      complexity,
      suggestedCharts,
      estimatedSlides,
      estimatedTokens,
      estimatedCredits,
    }
  }, [])

  // Enhanced error handling with specific error types
  const handleError = useCallback((error) => {
    if (error.name === "AbortError") {
      return {
        type: "unknown",
        message: "Generation was cancelled",
        retryable: false,
      }
    }

    if (error.status === 401) {
      return {
        type: "auth",
        message: "Authentication required. Please log in again.",
        retryable: false,
      }
    }

    if (error.status === 429) {
      const retryAfter = error.headers?.get("retry-after")
      return {
        type: "rate_limit",
        message: "Rate limit exceeded. Please try again later.",
        retryable: true,
        retryAfter: retryAfter ? Number.parseInt(retryAfter) * 1000 : 60000,
      }
    }

    if (error.status >= 500) {
      return {
        type: "network_error",
        message: "Server error. Please try again.",
        retryable: true,
      }
    }

    if (error.message?.includes("file")) {
      return {
        type: "file_error",
        message: "File processing failed. Please check your file and try again.",
        retryable: false,
      }
    }

    return {
      type: "generation_error",
      message: error.message || "Generation failed. Please try again.",
      retryable: true,
    }
  }, [])

  // Generic retry function with exponential backoff
  const retryWithBackoff = useCallback(
    (operation, config = DEFAULT_RETRY_CONFIG) => {
      let lastError

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          return operation()
        } catch (error) {
          lastError = error
          const errorDetails = handleError(error)

          if (!errorDetails.retryable || attempt === config.maxRetries) {
            throw error
          }

          // Calculate delay with exponential backoff
          const delay = Math.min(config.baseDelay * Math.pow(config.backoffFactor, attempt), config.maxDelay)

          // Use retry-after header if available
          const actualDelay = errorDetails.retryAfter || delay

          setProgress((prev) =>
            prev
              ? {
                  ...prev,
                  message: `Retrying in ${Math.ceil(actualDelay / 1000)} seconds... (Attempt ${attempt + 1}/${config.maxRetries + 1})`,
                }
              : null,
          )

          return new Promise((resolve) => setTimeout(resolve, actualDelay))
        }
      }

      throw lastError
    },
    [handleError],
  )

  // Credit tracking and deduction
  const trackCredits = useCallback(
    async (tokenUsage) => {
      try {
        const response = await fetch("/api/credits/deduct", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            tokens: tokenUsage,
            operation: "slide_generation",
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setCreditBalance(data.remainingCredits)
          return data.remainingCredits
        }
      } catch (error) {
        console.error("Credit tracking failed:", error)
      }
      return null
    },
    [session],
  )

  // Main slide generation function
  const generateSlides = useCallback(
    async (prompt, file, options) => {
      if (!session?.access_token) {
        setError({
          type: "auth",
          message: "Authentication required",
          retryable: false,
        })
        return null
      }

      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      setIsLoading(true)
      setError(null)
      setProgress({
        stage: "analyzing",
        progress: 5,
        message: "Analyzing your request and understanding the context...",
      })

      try {
        // Analyze content first
        const analysis = await analyzeContent(prompt, file)
        setContentAnalysis(analysis)

        setProgress({
          stage: "analyzing",
          progress: 10,
          message: `Identified ${analysis.topics.length} key topics. Estimated ${analysis.estimatedSlides} slides.`,
          estimatedCredits: analysis.estimatedCredits,
        })

        // Check credit balance
        if (creditBalance !== null && creditBalance < analysis.estimatedCredits) {
          throw new Error(`Insufficient credits. Need ${analysis.estimatedCredits}, have ${creditBalance}`)
        }

        const operation = () => {
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

          setProgress({
            stage: "structuring",
            progress: 30,
            message: "Creating presentation structure and flow...",
          })

          return fetch("/api/claude/generate-slides", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
            signal: abortControllerRef.current?.signal,
          }).then((response) => {
            setProgress({
              stage: "designing",
              progress: 60,
              message: "Applying professional design and visual elements...",
            })

            if (!response.ok) {
              throw response.json().then((data) => {
                const error = new Error(data.error || "Failed to generate slides")
                ;(error as any).status = response.status
                ;(error as any).headers = response.headers
                return error
              })
            }

            return response.json()
          })
        }

        const result = await retryWithBackoff(operation)

        setProgress({
          stage: "enhancing",
          progress: 90,
          message: "Adding final touches and optimizations...",
        })

        // Track credit usage
        if (result.tokenUsage) {
          await trackCredits(result.tokenUsage.total)
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))

        setProgress({
          stage: "complete",
          progress: 100,
          message: `Successfully created ${result.slides.length} professional slides!`,
          tokenUsage: result.tokenUsage?.total,
        })

        return result
      } catch (err) {
        if (err.name === "AbortError") {
          return null
        }

        const errorDetails = handleError(err)
        setError(errorDetails)
        console.error("Slide generation error:", err)
        return null
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
        setTimeout(() => setProgress(null), 3000)
      }
    },
    [session, analyzeContent, contentAnalysis, creditBalance, retryWithBackoff, trackCredits],
  )

  // Streaming generation with real-time updates
  const generateSlidesStreaming = useCallback(
    async (prompt, file, onChunk, onComplete, onError) => {
      if (!session?.access_token) {
        const authError = {
          type: "auth",
          message: "Authentication required",
          retryable: false,
        }
        onError?.(authError)
        return
      }

      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      setIsLoading(true)
      setError(null)

      try {
        setProgress({
          stage: "analyzing",
          progress: 5,
          message: "Starting AI analysis...",
        })

        // Simulate progressive updates
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

        const operation = () => {
          const formData = new FormData()
          formData.append(
            "data",
            JSON.stringify({
              prompt,
              streaming: true,
              hasFile: !!file,
            }),
          )

          if (file) {
            formData.append("file", file)
          }

          return fetch("/api/claude/stream-slides", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
            signal: abortControllerRef.current?.signal,
          }).then((response) => {
            if (!response.ok) {
              throw response.json().then((data) => {
                const error = new Error(data.error || "Streaming failed")
                ;(error as any).status = response.status
                return error
              })
            }

            const reader = response.body?.getReader()
            if (!reader) throw new Error("No response stream")

            const decoder = new TextDecoder()
            let buffer = ""
            let result = null

            return new Promise((resolve, reject) => {
              const readStream = () => {
                reader
                  .read()
                  .then(({ done, value }) => {
                    if (done) {
                      clearInterval(progressInterval)
                      setProgress({
                        stage: "complete",
                        progress: 100,
                        message: "Streaming complete!",
                      })
                      if (result) onComplete?.(result)
                      resolve(result)
                    } else {
                      buffer += decoder.decode(value, { stream: true })
                      const lines = buffer.split("\n")
                      buffer = lines.pop() || ""

                      for (const line of lines) {
                        if (line.startsWith("data: ")) {
                          const data = line.slice(6)
                          if (data === "[DONE]") {
                            clearInterval(progressInterval)
                            setProgress({
                              stage: "complete",
                              progress: 100,
                              message: "Streaming complete!",
                            })
                            if (result) onComplete?.(result)
                            resolve(result)
                          }

                          try {
                            const parsed = JSON.parse(data)
                            if (parsed.type === "chunk") {
                              onChunk?.(parsed.content)
                            } else if (parsed.type === "result") {
                              result = parsed.data
                            }
                          } catch (e) {
                            console.warn("Failed to parse streaming data:", data)
                          }
                        }
                      }

                      readStream()
                    }
                  })
                  .catch(reject)
              }

              readStream()
            })
          })
        }

        await retryWithBackoff(operation)
      } catch (err) {
        if (err.name === "AbortError") {
          return
        }

        const errorDetails = handleError(err)
        setError(errorDetails)
        onError?.(errorDetails)
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
        setTimeout(() => setProgress(null), 3000)
      }
    },
    [session, retryWithBackoff],
  )

  // Edit individual slides
  const editSlide = useCallback(
    async (slideId, slideTitle, editPrompt) => {
      if (!session?.access_token) {
        setError({
          type: "auth",
          message: "Authentication required",
          retryable: false,
        })
        return null
      }

      setIsLoading(true)
      setError(null)
      setProgress({
        stage: "analyzing",
        progress: 20,
        message: "Analyzing slide edit request...",
      })

      try {
        const operation = () => {
          return fetch("/api/claude/edit-slide", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              slideId,
              slideTitle,
              editPrompt,
              editMode: "single",
            }),
            signal: abortControllerRef.current?.signal,
          }).then((response) => {
            setProgress({
              stage: "designing",
              progress: 70,
              message: "Applying changes to slide...",
            })

            if (!response.ok) {
              throw response.json().then((data) => {
                const error = new Error(data.error || "Failed to edit slide")
                ;(error as any).status = response.status
                return error
              })
            }

            return response.json()
          })
        }

        const result = await retryWithBackoff(operation)

        setProgress({
          stage: "complete",
          progress: 100,
          message: "Slide updated successfully!",
        })

        return result
      } catch (err) {
        if (err.name === "AbortError") {
          return null
        }

        const errorDetails = handleError(err)
        setError(errorDetails)
        console.error("Slide edit error:", err)
        return null
      } finally {
        setIsLoading(false)
        setTimeout(() => setProgress(null), 2000)
      }
    },
    [session, retryWithBackoff],
  )

  // Cancel ongoing generation
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
      setProgress(null)
      setError(null)
    }
  }, [])

  // Clear error state
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Get credit balance
  const getCreditBalance = useCallback(async () => {
    if (!session?.access_token) return null

    try {
      const response = await fetch("/api/credits/balance", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCreditBalance(data.balance)
        return data.balance
      }
    } catch (error) {
      console.error("Failed to fetch credit balance:", error)
    }
    return null
  }, [session])

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsLoading(false)
    setProgress(null)
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    progress,
    contentAnalysis,
    creditBalance,
    generateSlides,
    generateSlidesStreaming,
    editSlide,
    cancelGeneration,
    clearError,
    getCreditBalance,
    cleanup,
  }
}

// Helper functions
function extractTopics(prompt) {
  const keywords = prompt.toLowerCase().match(/\b\w{4,}\b/g) || []
  const commonWords = new Set([
    "this",
    "that",
    "with",
    "have",
    "will",
    "from",
    "they",
    "been",
    "were",
    "said",
    "each",
    "which",
    "their",
    "time",
    "about",
  ])
  return [...new Set(keywords.filter((word) => !commonWords.has(word)))].slice(0, 5)
}

function determineComplexity(prompt, hasFile) {
  const wordCount = prompt.split(/\s+/).length
  const hasComplexTerms = /\b(analysis|strategy|framework|methodology|implementation|optimization)\b/i.test(prompt)

  if (hasFile || wordCount > 100 || hasComplexTerms) return "complex"
  if (wordCount > 50) return "moderate"
  return "simple"
}

function suggestChartTypes(prompt) {
  const suggestions = []

  if (/\b(data|statistics|numbers|metrics|performance|results)\b/i.test(prompt)) {
    suggestions.push("bar", "line")
  }
  if (/\b(comparison|versus|compare|different|options)\b/i.test(prompt)) {
    suggestions.push("bar", "pie")
  }
  if (/\b(trend|growth|over time|timeline|progress)\b/i.test(prompt)) {
    suggestions.push("line", "area")
  }
  if (/\b(distribution|breakdown|percentage|share|portion)\b/i.test(prompt)) {
    suggestions.push("pie", "donut")
  }

  return [...new Set(suggestions)]
}
