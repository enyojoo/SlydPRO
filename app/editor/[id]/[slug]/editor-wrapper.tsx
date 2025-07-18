"use client"

import { useAuth } from "@/lib/auth-context"
import { ChatProvider } from "@/lib/chat-context"
import EditorContent from "./editor-content"

export default function EditorWrapper() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#027659] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    )
  }

  return (
    <ChatProvider>
      <EditorContent />
    </ChatProvider>
  )
}
