import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ChatProvider } from "@/lib/chat-context"
import { AuthProvider } from "@/lib/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SlydPRO - Design pitch decks and slides by chatting with AI",
  description:
    "SlydPRO is a platform that lets you design pitch decks and presentation slides by chatting with AI to save time and create something presentable.",
  viewport: "width=device-width, initial-scale=1",
  keywords: "pitch deck, presentation slides, AI, design, business presentations, startup pitch, slide generator",
  authors: [{ name: "SlydPRO Team" }],
  openGraph: {
    title: "SlydPRO - Design pitch decks and slides by chatting with AI",
    description:
      "SlydPRO is a platform that lets you design pitch decks and presentation slides by chatting with AI to save time and create something presentable.",
    url: "https://slydpro.com",
    siteName: "SlydPRO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SlydPRO - Design pitch decks and slides by chatting with AI",
    description:
      "SlydPRO is a platform that lets you design pitch decks and presentation slides by chatting with AI to save time and create something presentable.",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} h-screen overflow-hidden`}>
        <AuthProvider>
          <ChatProvider>{children}</ChatProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
