import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

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
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error fetching presentations:", error)
      return NextResponse.json({ error: "Failed to fetch presentations" }, { status: 500 })
    }

    return NextResponse.json(presentations || [])
  } catch (error) {
    console.error("Presentations fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch presentations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, slides, thumbnail, is_starred, views } = await request.json()

    console.log("Creating presentation with data:", { name, slidesCount: slides?.length })

    // Get the session from the request headers
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      console.error("No authorization header provided")
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    console.log("Auth token received:", token.substring(0, 20) + "...")

    // Get current user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    console.log("User authenticated:", user.id)

    // Create new presentation
    const { data: presentation, error } = await supabase
      .from("presentations")
      .insert([
        {
          user_id: user.id,
          name: name || "Untitled Presentation",
          description: description || "",
          slides: slides || [],
          thumbnail: thumbnail || "#027659",
          is_starred: is_starred || false,
          views: views || 0,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Database error creating presentation:", error)
      return NextResponse.json({ error: "Database error: " + error.message }, { status: 500 })
    }

    console.log("Presentation created successfully:", presentation.id)
    return NextResponse.json(presentation)
  } catch (error) {
    console.error("Presentation creation error:", error)
    return NextResponse.json(
      {
        error: "Failed to create presentation: " + (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 },
    )
  }
}
