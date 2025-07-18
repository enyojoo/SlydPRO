import type { Metadata } from "next"
import EditorWrapper from "./editor-wrapper"

export const metadata: Metadata = {
  title: "Editor - SlydPRO",
  description:
    "SlydPRO is a platform that lets you design pitch decks and presentation slides by chatting with AI to save time and create something presentable.",
}

interface EditorPageProps {
  params: {
    id: string
    slug: string
  }
}

export default function EditorPage({ params }: EditorPageProps) {
  return <EditorWrapper params={params} />
}
