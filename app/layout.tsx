import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ChatProvider } from "@/lib/chat-context"
import { AuthProvider } from "@/lib/auth-context"
import { PLATFORM_CONFIG } from "@/lib/constants"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: `${PLATFORM_CONFIG.name} - AI-Powered Presentation Builder`,
  description: "Create professional pitch decks and presentations with AI assistance",
  viewport: "width=device-width, initial-scale=1",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ChatProvider>{children}</ChatProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
