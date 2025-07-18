"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { EditorContent } from "./editor-content"

interface EditorWrapperProps {
  presentationId: string
  slug: string
  file?: string
}

export function EditorWrapper({ presentationId, slug, file }: EditorWrapperProps) {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/")
      return
    }

    setIsReady(true)
  }, [user, authLoading, router])

  if (authLoading || !isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#027659]" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    )
  }

  return <EditorContent presentationId={presentationId} slug={slug} file={file} />
}
