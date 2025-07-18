"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { ChatProvider } from "@/lib/chat-context"
import { EditorContent } from "./editor-content"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface EditorWrapperProps {
  presentationId: string
}

export function EditorWrapper({ presentationId }: EditorWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setIsRedirecting(true)
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#027659]" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <ChatProvider>
      <EditorContent presentationId={presentationId} />
    </ChatProvider>
  )
}
