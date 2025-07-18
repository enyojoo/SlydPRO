import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { generateSVGThumbnail } from "@/lib/thumbnail-generator"

export async function POST(request: NextRequest) {
  try {
    const { name, slides, category, chat_history } = await request.json()

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

    // Generate thumbnail from first slide
    const thumbnail = slides && slides.length > 0 ? generateSVGThumbnail(slides[0]) : null

    // Create presentation
    const { data: presentation, error } = await supabase
      .from("presentations")
      .insert({
        user_id: user.id,
        name,
        slides: JSON.stringify(slides),
        thumbnail,
        chat_history: JSON.stringify(chat_history || []),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating presentation:", error)
      return NextResponse.json({ error: "Failed to create presentation" }, { status: 500 })
    }

    // Parse the JSON fields back for the response
    const responsePresentation = {
      ...presentation,
      slides: typeof presentation.slides === "string" ? JSON.parse(presentation.slides) : presentation.slides,
      chat_history:
        typeof presentation.chat_history === "string"
          ? JSON.parse(presentation.chat_history)
          : presentation.chat_history,
    }

    return NextResponse.json(responsePresentation)
  } catch (error) {
    console.error("Presentation creation error:", error)
    return NextResponse.json({ error: "Failed to create presentation" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
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

    // Fetch user's presentations
    const { data: presentations, error } = await supabase
      .from("presentations")
      .select("id, name, slides, thumbnail, chat_history, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error fetching presentations:", error)
      return NextResponse.json({ error: "Failed to fetch presentations" }, { status: 500 })
    }

    // Parse JSON fields for all presentations
    const parsedPresentations = presentations.map((presentation) => ({
      ...presentation,
      slides: typeof presentation.slides === "string" ? JSON.parse(presentation.slides) : presentation.slides,
      chat_history:
        typeof presentation.chat_history === "string"
          ? JSON.parse(presentation.chat_history)
          : presentation.chat_history,
    }))

    return NextResponse.json(parsedPresentations)
  } catch (error) {
    console.error("Presentations fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch presentations" }, { status: 500 })
  }
}
