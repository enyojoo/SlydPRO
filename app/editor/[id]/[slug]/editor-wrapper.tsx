"use client"

import { useAuth } from "@/lib/auth-context"
import { ChatProvider } from "@/lib/chat-context"
import { EditorContent } from "./editor-content"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface EditorWrapperProps {
  presentationId: string
  slug: string
  file?: string
}

export function EditorWrapper({ presentationId, slug, file }: EditorWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#027659] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <ChatProvider>
      <EditorContent presentationId={presentationId} slug={slug} file={file} />
    </ChatProvider>
  )
}
