"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface ChatMessage {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatContextType {
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
  setMessages: (messages: ChatMessage[]) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message])
  }

  const clearMessages = () => {
    setMessages([])
  }

  return (
    <ChatContext.Provider value={{ messages, addMessage, clearMessages, setMessages }}>{children}</ChatContext.Provider>
  )
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider")
  }
  return context
}
