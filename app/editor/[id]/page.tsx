import { EditorWrapper } from "./editor-wrapper"

interface EditorPageProps {
  params: {
    id: string
  }
}

export default function EditorPage({ params }: EditorPageProps) {
  return <EditorWrapper presentationId={params.id} />
}
