import { EditorWrapper } from "./editor-wrapper"

interface PageProps {
  params: {
    id: string
    slug: string
  }
  searchParams: {
    file?: string
  }
}

export default function EditorPage({ params, searchParams }: PageProps) {
  return <EditorWrapper presentationId={params.id} slug={params.slug} file={searchParams.file} />
}
