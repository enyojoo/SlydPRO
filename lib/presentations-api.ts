"use client"

import { supabase, type Presentation } from "./supabase"
import { useState, useCallback, useEffect } from "react"

export class PresentationsAPI {
  private async getAuthHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }

  async createPresentation(data: {
    name: string
    slides: any[]
    category?: string
    chat_history?: any[]
  }): Promise<Presentation> {
    const response = await fetch("/api/presentations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await this.getAuthHeaders()),
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error("Failed to create presentation")
    }

    return response.json()
  }

  async updatePresentation(id: string, data: Partial<Presentation>): Promise<Presentation> {
    const response = await fetch(`/api/presentations/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await this.getAuthHeaders()),
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error("Failed to update presentation")
    }

    return response.json()
  }

  async deletePresentation(id: string): Promise<void> {
    const response = await fetch(`/api/presentations/${id}`, {
      method: "DELETE",
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to delete presentation")
    }
  }

  async getPresentation(id: string): Promise<Presentation> {
    const response = await fetch(`/api/presentations/${id}`, {
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch presentation")
    }

    return response.json()
  }

  async getUserPresentations(): Promise<Presentation[]> {
    const response = await fetch("/api/presentations", {
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch presentations")
    }

    return response.json()
  }
}

export const presentationsAPI = new PresentationsAPI()

// Hook for using presentations API with React state management
export function usePresentationsApi() {
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPresentations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await presentationsAPI.getUserPresentations()
      setPresentations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch presentations")
    } finally {
      setLoading(false)
    }
  }, [])

  const createPresentation = useCallback(
    async (data: {
      name: string
      slides: any[]
      category?: string
      chat_history?: any[]
    }) => {
      setLoading(true)
      setError(null)
      try {
        const newPresentation = await presentationsAPI.createPresentation(data)
        setPresentations((prev) => [newPresentation, ...prev])
        return newPresentation
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create presentation")
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const updatePresentation = useCallback(async (id: string, data: Partial<Presentation>) => {
    setLoading(true)
    setError(null)
    try {
      const updatedPresentation = await presentationsAPI.updatePresentation(id, data)
      setPresentations((prev) => prev.map((p) => (p.id === id ? updatedPresentation : p)))
      return updatedPresentation
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update presentation")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deletePresentation = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await presentationsAPI.deletePresentation(id)
      setPresentations((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete presentation")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getPresentation = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const presentation = await presentationsAPI.getPresentation(id)
      return presentation
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch presentation")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  useEffect(() => {
    fetchPresentations()
  }, [fetchPresentations])

  return {
    presentations,
    loading,
    error,
    fetchPresentations,
    createPresentation,
    updatePresentation,
    deletePresentation,
    getPresentation,
    clearError,
  }
}
