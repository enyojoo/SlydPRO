import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
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

    // Create new empty presentation
    const { data: presentation, error } = await supabase
      .from("presentations")
      .insert([
        {
          user_id: user.id,
          name: "Untitled Presentation",
          slides: [],
          thumbnail: "",
          category: "draft",
          is_starred: false,
          views: 0,
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
