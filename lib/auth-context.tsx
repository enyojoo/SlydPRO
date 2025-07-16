"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase, type User } from "./supabase"
import type { Session } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateCredits: (amount: number) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
        } else {
          setSession(session)
          if (session?.user) {
            await fetchUserProfile(session.user.id)
          }
        }
      } catch (error) {
        console.error("Error in getInitialSession:", error)
      } finally {
        setIsLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email)
      setSession(session)

      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        setUser(null)
      }

      if (event === "SIGNED_OUT") {
        setUser(null)
      }

      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

      if (error) {
        console.error("Error fetching user profile:", error)
        return
      }

      console.log("User profile fetched:", data)
      // Ensure we have the correct field names and give users more credits for testing
      const userProfile = {
        ...data,
        avatar_url: data.avatar_url || null,
        monthly_credits: data.monthly_credits || 100.0, // Increased for testing
        purchased_credits: data.purchased_credits || 100.0, // Increased for testing
      }
      setUser(userProfile)
    } catch (error) {
      console.error("Error fetching user profile:", error)
    }
  }

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }
  }

  const signup = async (name: string, email: string, password: string) => {
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
      throw error
    }

    // Create user profile
    if (data.user) {
      const { error: profileError } = await supabase.from("users").insert([
        {
          id: data.user.id,
          email: data.user.email!,
          name,
          monthly_credits: 100.0, // Increased for testing
          purchased_credits: 100.0, // Increased for testing
          plan: "free",
        },
      ])

      if (profileError) {
        console.error("Error creating user profile:", profileError)
        throw profileError
      }
    }
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
    setUser(null)
    setSession(null)
  }

  const updateCredits = (amount: number) => {
    if (user) {
      setUser({
        ...user,
        purchased_credits: Math.max(0, user.purchased_credits + amount),
      })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!session && !!user,
        isLoading,
        login,
        signup,
        logout,
        updateCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
