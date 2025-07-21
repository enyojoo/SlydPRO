"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"

export interface Presentation {
  id: string
  title: string
  description?: string
  slides: any[]
  created_at: string
  updated_at: string
  user_id: string
  thumbnail_url?: string
  is_public: boolean
  tags?: string[]
}

export interface CreatePresentationData {
  title: string
  description?: string
  slides: any[]
  is_public?: boolean
  tags?: string[]
}

export interface UpdatePresentationData {
  title?: string
  description?: string
  slides?: any[]
  is_public?: boolean
  tags?: string[]
}

class PresentationsAPI {
  private baseUrl = "/api/presentations"

  async getAll(token: string): Promise<Presentation[]> {
    const response = await fetch(this.baseUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch presentations: ${response.statusText}`)
    }

    return response.json()
  }

  async getById(id: string, token: string): Promise<Presentation> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch presentation: ${response.statusText}`)
    }

    return response.json()
  }

  async create(data: CreatePresentationData, token: string): Promise<Presentation> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Failed to create presentation: ${response.statusText}`)
    }

    return response.json()
  }

  async update(id: string, data: UpdatePresentationData, token: string): Promise<Presentation> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Failed to update presentation: ${response.statusText}`)
    }

    return response.json()
  }

  async delete(id: string, token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to delete presentation: ${response.statusText}`)
    }
  }

  async duplicate(id: string, token: string): Promise<Presentation> {
    const response = await fetch(`${this.baseUrl}/${id}/duplicate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to duplicate presentation: ${response.statusText}`)
    }

    return response.json()
  }
}

const presentationsAPI = new PresentationsAPI()

export function usePresentationsApi() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { session } = useAuth()

  const getAll = useCallback(async (): Promise<Presentation[]> => {
    if (!session?.access_token) {
      throw new Error("Authentication required")
    }

    setIsLoading(true)
    setError(null)

    try {
      const presentations = await presentationsAPI.getAll(session.access_token)
      return presentations
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch presentations"
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [session])

  const getById = useCallback(
    async (id: string): Promise<Presentation> => {
      if (!session?.access_token) {
        throw new Error("Authentication required")
      }

      setIsLoading(true)
      setError(null)

      try {
        const presentation = await presentationsAPI.getById(id, session.access_token)
        return presentation
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch presentation"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [session],
  )

  const create = useCallback(
    async (data: CreatePresentationData): Promise<Presentation> => {
      if (!session?.access_token) {
        throw new Error("Authentication required")
      }

      setIsLoading(true)
      setError(null)

      try {
        const presentation = await presentationsAPI.create(data, session.access_token)
        return presentation
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create presentation"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [session],
  )

  const update = useCallback(
    async (id: string, data: UpdatePresentationData): Promise<Presentation> => {
      if (!session?.access_token) {
        throw new Error("Authentication required")
      }

      setIsLoading(true)
      setError(null)

      try {
        const presentation = await presentationsAPI.update(id, data, session.access_token)
        return presentation
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update presentation"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [session],
  )

  const deletePresentation = useCallback(
    async (id: string): Promise<void> => {
      if (!session?.access_token) {
        throw new Error("Authentication required")
      }

      setIsLoading(true)
      setError(null)

      try {
        await presentationsAPI.delete(id, session.access_token)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete presentation"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [session],
  )

  const duplicate = useCallback(
    async (id: string): Promise<Presentation> => {
      if (!session?.access_token) {
        throw new Error("Authentication required")
      }

      setIsLoading(true)
      setError(null)

      try {
        const presentation = await presentationsAPI.duplicate(id, session.access_token)
        return presentation
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to duplicate presentation"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [session],
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    getAll,
    getById,
    create,
    update,
    delete: deletePresentation,
    duplicate,
    clearError,
  }
}

export default presentationsAPI
