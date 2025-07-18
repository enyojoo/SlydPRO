interface CreatePresentationData {
  name: string
  slides: any[]
  category?: string
}

interface UpdatePresentationData {
  name?: string
  slides?: any[]
  thumbnail?: string
  category?: string
}

class PresentationsAPI {
  private getAuthHeaders() {
    // Get session from auth context or localStorage
    const session = JSON.parse(localStorage.getItem("supabase.auth.token") || "{}")
    if (!session?.access_token) {
      throw new Error("No authentication token found")
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    }
  }

  async createPresentation(data: CreatePresentationData) {
    try {
      const response = await fetch("/api/presentations", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create presentation")
      }

      return await response.json()
    } catch (error) {
      console.error("Create presentation error:", error)
      throw error
    }
  }

  async getPresentation(id: string) {
    try {
      const response = await fetch(`/api/presentations/${id}`, {
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to get presentation")
      }

      return await response.json()
    } catch (error) {
      console.error("Get presentation error:", error)
      throw error
    }
  }

  async updatePresentation(id: string, data: UpdatePresentationData) {
    try {
      const response = await fetch(`/api/presentations/${id}`, {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update presentation")
      }

      return await response.json()
    } catch (error) {
      console.error("Update presentation error:", error)
      throw error
    }
  }

  async deletePresentation(id: string) {
    try {
      const response = await fetch(`/api/presentations/${id}`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete presentation")
      }

      return true
    } catch (error) {
      console.error("Delete presentation error:", error)
      throw error
    }
  }
}

export const presentationsAPI = new PresentationsAPI()
