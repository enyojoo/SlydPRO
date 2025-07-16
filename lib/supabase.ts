import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types matching actual schema
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  monthly_credits: number
  purchased_credits: number
  plan: "free" | "pro" | "enterprise"
  created_at: string
  updated_at: string
}

export interface Presentation {
  id: string
  user_id: string
  name: string
  slides: any[]
  thumbnail?: string
  created_at: string
  updated_at: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  type: "deduct" | "add"
  description: string
  input_tokens?: number
  output_tokens?: number
  created_at: string
}
