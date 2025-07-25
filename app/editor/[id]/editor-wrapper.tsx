"use client"

import dynamic from "next/dynamic"

const EditorContent = dynamic(() => import("./editor-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-4 border-[#027659] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-muted-foreground">Loading editor...</p>
      </div>
    </div>
  ),
})

interface EditorWrapperProps {
  params: {
    id: string
  }
}

export default function EditorWrapper({ params }: EditorWrapperProps) {
  return <EditorContent params={params} />
}
