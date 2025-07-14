"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Github, Twitter, Linkedin, Mail, Heart } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function Footer() {
  const { isAuthenticated } = useAuth()

  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-6 py-12">
        {/* Centered Brand Section */}
        <div className="flex flex-col items-center text-center space-y-6 mb-8">
          <div className="flex items-center space-x-2">
            <img src="https://cldup.com/dAXA3nE5xd.svg" alt="SlydPRO" className="h-8 w-auto" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            Create professional presentations with AI assistance. Design pitch decks, business presentations, and more
            in minutes.
          </p>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Twitter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Github className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Linkedin className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Mail className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>© 2025 Easner, Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center space-x-6 text-sm">
            <Button variant="ghost" className="h-auto p-0 text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Button>
            <Button variant="ghost" className="h-auto p-0 text-muted-foreground hover:text-foreground">
              Terms of Service
            </Button>
            <Button variant="ghost" className="h-auto p-0 text-muted-foreground hover:text-foreground">
              Cookie Policy
            </Button>
          </div>

          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <span>Made with</span>
            <Heart className="h-4 w-4 text-red-500 fill-current" />
            <span>for YOU</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
