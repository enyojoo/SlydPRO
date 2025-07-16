"use client"

import { supabase, type Presentation } from "./supabase"

export class PresentationsAPI {
  private async getAuthHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error("No valid session found")
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    }
  }

  async createPresentation(data: {
    name: string
    description?: string
    slides: any[]
    thumbnail?: string
    category?: string
  }): Promise<Presentation> {
    try {
      const headers = await this.getAuthHeaders()

      const response = await fetch("/api/presentations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: data.name,
          description: data.description || "",
          slides: data.slides,
          thumbnail: data.thumbnail || data.slides[0]?.background || "#027659",
          category: data.category || "ai-generated",
          is_starred: false,
          views: 0,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Create presentation error:", errorText)
        throw new Error(`Failed to create presentation: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log("Presentation created:", result)
      return result
    } catch (error) {
      console.error("Presentation creation error:", error)
      throw error
    }
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
