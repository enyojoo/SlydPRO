"use client"

import { useState, useCallback } from "react"
import { v0SlideGenerator, type SlideGenerationResult, type TokenUsage } from "@/lib/v0-integration"
import { useAuth } from "@/lib/auth-context"

export function useV0Integration() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const { user, updateCredits } = useAuth()

  const checkCredits = (estimatedCost: number): boolean => {
    if (!user) return false
    const totalCredits = user.monthly_credits + user.purchased_credits
    return totalCredits >= estimatedCost
  }

  const deductCredits = async (tokenUsage: TokenUsage) => {
    try {
      // Update credits in backend
      const response = await fetch("/api/credits/deduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputTokens: tokenUsage.inputTokens,
          outputTokens: tokenUsage.outputTokens,
          totalCost: tokenUsage.totalCost,
        }),
      })

      if (response.ok) {
        // Update local state
        updateCredits(-tokenUsage.totalCost)
      }
    } catch (error) {
      console.error("Failed to deduct credits:", error)
    }
  }

  const generateSlides = useCallback(
    async (prompt: string, uploadedFile?: File): Promise<SlideGenerationResult | null> => {
      if (!user) {
        setError("Please sign in to generate slides")
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        // Make the API call first, then handle credits based on actual usage
        const result = await v0SlideGenerator.generateSlides(prompt, uploadedFile)

        if (result) {
          // Check if user has enough credits for the actual cost
          const totalCredits = user.monthly_credits + user.purchased_credits
          if (totalCredits < result.tokenUsage.totalCost) {
            setError("Insufficient credits for this generation. Please purchase more credits to continue.")
            return null
          }

          // Deduct actual credits used
          await deductCredits(result.tokenUsage)
          setCurrentChatId(result.chatId)
          return result
        }

        return null
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to generate slides"
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [user, updateCredits],
  )

  const editSlide = useCallback(
    async (slideId: string, slideTitle: string, editPrompt: string): Promise<SlideGenerationResult | null> => {
      if (!user || !currentChatId) {
        setError("No active session")
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await v0SlideGenerator.editSlide(currentChatId, slideTitle, editPrompt)

        if (result) {
          // Check credits after getting actual usage
          const totalCredits = user.monthly_credits + user.purchased_credits
          if (totalCredits < result.tokenUsage.totalCost) {
            setError("Insufficient credits for this edit. Please purchase more credits to continue.")
            return null
          }

          // Deduct actual credits used
          await deductCredits(result.tokenUsage)
          return result
        }

        return null
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to edit slide"
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [user, currentChatId, updateCredits],
  )

  const regenerateAllSlides = useCallback(
    async (prompt: string): Promise<SlideGenerationResult | null> => {
      if (!user || !currentChatId) {
        setError("No active session")
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await v0SlideGenerator.regenerateAllSlides(currentChatId, prompt)

        if (result) {
          // Check credits after getting actual usage
          const totalCredits = user.monthly_credits + user.purchased_credits
          if (totalCredits < result.tokenUsage.totalCost) {
            setError("Insufficient credits for this regeneration. Please purchase more credits to continue.")
            return null
          }

          // Deduct actual credits used
          await deductCredits(result.tokenUsage)
          return result
        }

        return null
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to regenerate slides"
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [user, currentChatId, updateCredits],
  )

  const generateSlidesStreaming = useCallback(
    async (
      prompt: string,
      uploadedFile?: File,
      onChunk?: (chunk: string) => void,
      onComplete?: (result: SlideGenerationResult) => void,
      onError?: (error: Error) => void,
    ): Promise<void> => {
      if (!user) {
        onError?.(new Error("Please sign in to generate slides"))
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        await v0SlideGenerator.generateSlidesStreaming(
          prompt,
          uploadedFile,
          onChunk,
          async (result) => {
            // Check credits after getting actual usage
            const totalCredits = user.monthly_credits + user.purchased_credits
            if (totalCredits < result.tokenUsage.totalCost) {
              onError?.(
                new Error("Insufficient credits for this generation. Please purchase more credits to continue."),
              )
              return
            }

            // Deduct actual credits used
            await deductCredits(result.tokenUsage)
            setCurrentChatId(result.chatId)
            onComplete?.(result)
          },
          onError,
        )
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to generate slides"
        setError(errorMessage)
        onError?.(new Error(errorMessage))
      } finally {
        setIsLoading(false)
      }
    },
    [user, updateCredits],
  )

  return {
    generateSlides,
    generateSlidesStreaming,
    editSlide,
    regenerateAllSlides,
    isLoading,
    error,
    currentChatId,
    isConfigured: v0SlideGenerator.isConfigured(),
  }
}
