interface V0ChatResponse {
  id: string
  messages: Array<{
    id: string
    role: "user" | "assistant"
    content: string
    createdAt: string
  }>
  blocks?: Array<{
    id: string
    type: string
    content: string
    files?: Array<{
      path: string
      content: string
    }>
  }>
}

interface V0CreateChatRequest {
  message: string
  files?: Array<{
    name: string
    content: string
    type: string
  }>
}

class V0ApiClient {
  private baseUrl = "https://api.v0.dev"
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async createChat(request: V0CreateChatRequest): Promise<V0ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chats`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`V0 API error: ${response.statusText}`)
    }

    return response.json()
  }

  async sendMessage(chatId: string, message: string): Promise<V0ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chats/${chatId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    })

    if (!response.ok) {
      throw new Error(`V0 API error: ${response.statusText}`)
    }

    return response.json()
  }

  async getChat(chatId: string): Promise<V0ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chats/${chatId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`V0 API error: ${response.statusText}`)
    }

    return response.json()
  }
}

export { V0ApiClient, type V0ChatResponse, type V0CreateChatRequest }
