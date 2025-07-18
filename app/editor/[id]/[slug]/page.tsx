import type { Metadata } from "next"
import EditorWrapper from "./editor-wrapper"

interface Props {
  params: {
    id: string
    slug: string
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Editor - SlydPRO`,
    description: "SlydPRO presentation editor",
  }
}

export default function EditorPage({ params }: Props) {
  return <EditorWrapper id={params.id} slug={params.slug} />
}
