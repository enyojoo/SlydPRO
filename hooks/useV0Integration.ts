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
    const totalCredits = user.monthlyCredits + user.purchasedCredits
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

      // Rough estimation for credit check (will be refined after actual generation)
      const estimatedCost = 0.1
      if (!checkCredits(estimatedCost)) {
        setError("Insufficient credits. Please purchase more credits to continue.")
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await v0SlideGenerator.generateSlides(prompt, uploadedFile)

        // Deduct actual credits used
        await deductCredits(result.tokenUsage)

        setCurrentChatId(result.chatId)
        return result
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

      const estimatedCost = 0.05
      if (!checkCredits(estimatedCost)) {
        setError("Insufficient credits. Please purchase more credits to continue.")
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await v0SlideGenerator.editSlide(currentChatId, slideTitle, editPrompt)

        // Deduct actual credits used
        await deductCredits(result.tokenUsage)

        return result
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

      const estimatedCost = 0.08
      if (!checkCredits(estimatedCost)) {
        setError("Insufficient credits. Please purchase more credits to continue.")
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await v0SlideGenerator.regenerateAllSlides(currentChatId, prompt)

        // Deduct actual credits used
        await deductCredits(result.tokenUsage)

        return result
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

  return {
    generateSlides,
    editSlide,
    regenerateAllSlides,
    isLoading,
    error,
    currentChatId,
    isConfigured: v0SlideGenerator.isConfigured(),
  }
}
