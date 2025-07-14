"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Settings, DollarSign, BookOpen, Users, LogOut, Sun, Moon, Monitor, ChevronDown } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function UserDropdown() {
  const { user, logout } = useAuth()
  const [theme, setTheme] = useState("system")

  if (!user) return null

  const totalCredits = user.monthlyCredits + user.purchasedCredits
  const isPayAsYouGo = user.monthlyCredits <= 0 && user.purchasedCredits > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center h-auto p-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback className="bg-[#027659] text-white">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <ChevronDown className="h-4 w-4 text-gray-500 ml-1" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Feedback Button */}
        <div className="flex justify-between items-center p-4 border-b">
          <Button variant="outline" size="sm" className="text-gray-600 border-gray-300 bg-transparent">
            Feedback
          </Button>
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b">
          <div className="font-semibold text-gray-900">{user.name}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <DropdownMenuItem className="px-4 py-3 cursor-pointer">
            <User className="h-4 w-4 mr-3 text-gray-500" />
            <span>Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="px-4 py-3 cursor-pointer">
            <Settings className="h-4 w-4 mr-3 text-gray-500" />
            <span>Settings</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="px-4 py-3 cursor-pointer">
            <DollarSign className="h-4 w-4 mr-3 text-gray-500" />
            <span>Pricing</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="px-4 py-3 cursor-pointer">
            <BookOpen className="h-4 w-4 mr-3 text-gray-500" />
            <span>Documentation</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="px-4 py-3 cursor-pointer">
            <Users className="h-4 w-4 mr-3 text-gray-500" />
            <span>Community Forum</span>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        {/* Credit Balance */}
        <div className="p-4">
          <div className="text-sm font-medium text-gray-500 mb-3">Credit Balance</div>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Monthly credits</span>
              <span className="text-sm font-medium">{user.monthlyCredits.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Purchased credits</span>
              <span className="text-sm font-medium">{user.purchasedCredits.toFixed(2)}</span>
            </div>
          </div>

          {isPayAsYouGo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <p className="text-sm text-blue-700">
                You're now using your pay as you go credits.{" "}
                <button className="text-blue-600 underline hover:text-blue-800">Buy more credits</button>
              </p>
            </div>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Preferences */}
        <div className="p-4">
          <div className="text-sm font-medium text-gray-500 mb-3">Preferences</div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Theme</span>
              <div className="flex items-center space-x-1">
                <Button
                  variant={theme === "light" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-4 w-4" />
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setTheme("system")}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Language</span>
              <Select defaultValue="english">
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="spanish">Spanish</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <div className="p-2">
          <DropdownMenuItem className="px-4 py-3 cursor-pointer text-red-600 focus:text-red-600" onClick={logout}>
            <LogOut className="h-4 w-4 mr-3" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
