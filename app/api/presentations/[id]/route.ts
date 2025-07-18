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

    // Fetch specific presentation
    const { data: presentation, error } = await supabase
      .from("presentations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching presentation:", error)
      return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
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

    // Generate new thumbnail if slides are provided
    let thumbnail = undefined
    if (slides && slides.length > 0) {
      thumbnail = generateSVGThumbnail(slides[0])
    }

    // Update presentation - only use columns that exist in the table
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slides !== undefined) updateData.slides = slides
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail

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
