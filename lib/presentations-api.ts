"use client"

import { supabase, type Presentation } from "./supabase"

export class PresentationsAPI {
  private getAuthHeaders() {
    const session = supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session}` } : {}
  }

  async createPresentation(data: {
    name: string
    description?: string
    slides: any[]
    thumbnail?: string
    category?: string
  }): Promise<Presentation> {
    const response = await fetch("/api/presentations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
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
        ...this.getAuthHeaders(),
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
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to delete presentation")
    }
  }

  async getPresentation(id: string): Promise<Presentation> {
    const response = await fetch(`/api/presentations/${id}`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch presentation")
    }

    return response.json()
  }

  async getUserPresentations(): Promise<Presentation[]> {
    const response = await fetch("/api/presentations", {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch presentations")
    }

    return response.json()
  }
}

export const presentationsAPI = new PresentationsAPI()
