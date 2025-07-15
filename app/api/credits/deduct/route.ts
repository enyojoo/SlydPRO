import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { inputTokens, outputTokens, totalCost } = await request.json()

    // Get current user session
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Get user's current credits
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("monthly_credits, purchased_credits")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 })
    }

    const totalCredits = userProfile.monthly_credits + userProfile.purchased_credits

    if (totalCredits < totalCost) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 400 })
    }

    // Deduct credits (first from purchased, then monthly)
    let newPurchasedCredits = userProfile.purchased_credits
    let newMonthlyCredits = userProfile.monthly_credits

    if (newPurchasedCredits >= totalCost) {
      newPurchasedCredits -= totalCost
    } else {
      const remainingCost = totalCost - newPurchasedCredits
      newPurchasedCredits = 0
      newMonthlyCredits -= remainingCost
    }

    // Update user credits
    const { error: updateError } = await supabase
      .from("users")
      .update({
        monthly_credits: newMonthlyCredits,
        purchased_credits: newPurchasedCredits,
      })
      .eq("id", user.id)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update credits" }, { status: 500 })
    }

    // Log the transaction
    const { error: transactionError } = await supabase.from("credit_transactions").insert([
      {
        user_id: user.id,
        amount: -totalCost,
        type: "deduct",
        description: `AI generation - ${inputTokens} input tokens, ${outputTokens} output tokens`,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    ])

    if (transactionError) {
      console.error("Error logging transaction:", transactionError)
    }

    return NextResponse.json({
      success: true,
      remainingCredits: newMonthlyCredits + newPurchasedCredits,
    })
  } catch (error) {
    console.error("Credit deduction error:", error)
    return NextResponse.json({ error: "Failed to deduct credits" }, { status: 500 })
  }
}
