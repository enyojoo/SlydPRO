import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Sign up user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create user profile in database
    if (data.user) {
      const { error: profileError } = await supabase.from("users").insert([
        {
          id: data.user.id,
          email: data.user.email!,
          name,
          monthly_credits: 10.0, // Free tier credits
          purchased_credits: 0.0,
          plan: "free",
        },
      ])

      if (profileError) {
        console.error("Error creating user profile:", profileError)
        return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 })
      }
    }

    return NextResponse.json({
      message: "User created successfully",
      user: data.user,
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Signup failed" }, { status: 500 })
  }
}
