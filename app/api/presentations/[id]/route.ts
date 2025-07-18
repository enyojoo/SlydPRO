import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { generateSVGThumbnail } from "@/lib/thumbnail-generator"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Get the session from the request headers
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    // Get current user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Fetch specific presentation with all fields including chat_history
    const { data: presentation, error } = await supabase
      .from("presentations")
      .select("id, user_id, name, slides, thumbnail, chat_history, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching presentation:", error)
      return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
    }

    // Ensure slides is parsed as JSON if it's stored as text
    if (presentation.slides && typeof presentation.slides === "string") {
      try {
        presentation.slides = JSON.parse(presentation.slides)
      } catch (parseError) {
        console.error("Error parsing slides JSON:", parseError)
        presentation.slides = []
      }
    }

    // Ensure chat_history is parsed as JSON if it's stored as text
    if (presentation.chat_history && typeof presentation.chat_history === "string") {
      try {
        presentation.chat_history = JSON.parse(presentation.chat_history)
      } catch (parseError) {
        console.error("Error parsing chat_history JSON:", parseError)
        presentation.chat_history = []
      }
    }

    // Ensure chat_history exists
    if (!presentation.chat_history) {
      presentation.chat_history = []
    }

    return NextResponse.json(presentation)
  } catch (error) {
    console.error("Presentation fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch presentation" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { name, slides, chat_history } = await request.json()

    // Get the session from the request headers
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    // Get current user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Generate new thumbnail if slides are provided
    let thumbnail = undefined
    if (slides && slides.length > 0) {
      thumbnail = generateSVGThumbnail(slides[0])
    }

    // Update presentation
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slides !== undefined) updateData.slides = slides
    if (chat_history !== undefined) updateData.chat_history = chat_history
    if (thumbnail) updateData.thumbnail = thumbnail

    const { data: presentation, error } = await supabase
      .from("presentations")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating presentation:", error)
      return NextResponse.json({ error: "Failed to update presentation" }, { status: 500 })
    }

    return NextResponse.json(presentation)
  } catch (error) {
    console.error("Presentation update error:", error)
    return NextResponse.json({ error: "Failed to update presentation" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Get the session from the request headers
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    // Get current user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Delete presentation
    const { error } = await supabase.from("presentations").delete().eq("id", id).eq("user_id", user.id)

    if (error) {
      console.error("Error deleting presentation:", error)
      return NextResponse.json({ error: "Failed to delete presentation" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Presentation deletion error:", error)
    return NextResponse.json({ error: "Failed to delete presentation" }, { status: 500 })
  }
}
