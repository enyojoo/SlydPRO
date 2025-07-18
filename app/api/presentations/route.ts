import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { generateSVGThumbnail } from "@/lib/thumbnail-generator"

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
    const { name, slides } = await request.json()

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
    let thumbnail = ""
    if (slides && slides.length > 0) {
      thumbnail = generateSVGThumbnail(slides[0])
    }

    // Create new presentation
    const { data: presentation, error } = await supabase
      .from("presentations")
      .insert([
        {
          user_id: user.id,
          name,
          slides: slides || [],
          thumbnail,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating presentation:", error)
      return NextResponse.json({ error: "Failed to create presentation" }, { status: 500 })
    }

    return NextResponse.json(presentation)
  } catch (error) {
    console.error("Presentation creation error:", error)
    return NextResponse.json({ error: "Failed to create presentation" }, { status: 500 })
  }
}
