"use client"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, Settings, Crown, HelpCircle, LogOut, Info, Sun, Moon, Monitor } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { SettingsModal } from "./settings-modal"

interface ModernHeaderProps {
  onAuthClick?: () => void
}

export function ModernHeader({ onAuthClick }: ModernHeaderProps) {
  const { user, isAuthenticated, logout } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const [settingsSection, setSettingsSection] = useState("profile")
  const [theme, setTheme] = useState("system")
  const [language, setLanguage] = useState("english")

  const handleSettingsClick = (section = "profile") => {
    setSettingsSection(section)
    setShowSettings(true)
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-4 sm:px-6">
          {/* Logo */}
          <div className="mr-4 sm:mr-6 flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <img src="https://cldup.com/dAXA3nE5xd.svg" alt="SlydPRO" className="h-16 w-24 sm:h-20 sm:w-32" />
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end space-x-4">
            {/* User Menu or Auth Buttons */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                      <AvatarFallback className="bg-[#027659] text-white text-sm font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 sm:w-80 p-0 mx-4 sm:mx-0" align="end" forceMount>
                  {/* User Profile Section */}
                  <div className="p-4 border-b">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                        <AvatarFallback className="bg-[#027659] text-white text-sm font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Turn Pro Section */}
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Crown className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Join PRO</span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-[#027659]/10 text-[#027659] hover:bg-[#027659]/20 h-7 px-3 text-xs"
                        onClick={() => handleSettingsClick("billing")}
                      >
                        Upgrade
                      </Button>
                    </div>
                  </div>

                  {/* Credits Section */}
                  <div className="p-4 border-b">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Credits Used</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-foreground h-auto p-0"
                          onClick={() => handleSettingsClick("billing")}
                        >
                          Manage
                        </Button>
                      </div>

                      <div className="bg-[#027659]/5 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Plan</span>
                          <span className="font-medium">
                            {Math.floor(user.monthlyCredits)}/{Math.floor(user.monthlyCredits + user.purchasedCredits)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">0 of your daily credits used</span>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 border-b">
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start h-9 bg-transparent"
                        onClick={() => handleSettingsClick("profile")}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </div>
                  </div>

                  {/* Preferences Section */}
                  <div className="p-4 border-b">
                    <div className="space-y-4">
                      {/* Theme */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Theme</span>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant={theme === "system" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setTheme("system")}
                          >
                            <Monitor className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={theme === "light" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setTheme("light")}
                          >
                            <Sun className="h-4 w-4" />
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

                      {/* Language */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Language</span>
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="english">English</SelectItem>
                            <SelectItem value="russian">Russian</SelectItem>
                            <SelectItem value="french">French</SelectItem>
                            <SelectItem value="spanish">Spanish</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <DropdownMenuItem className="px-4 py-3 cursor-pointer">
                      <HelpCircle className="h-4 w-4 mr-3 text-muted-foreground" />
                      <span>Get Help</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="px-4 py-3 cursor-pointer text-red-600 focus:text-red-600"
                      onClick={logout}
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden lg:flex items-center space-x-2">
                <Button variant="ghost" onClick={onAuthClick}>
                  Log in
                </Button>
                <Button onClick={onAuthClick} className="bg-[#027659] hover:bg-[#065f46]">
                  Get started
                </Button>
              </div>
            )}

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className="mr-2 px-2 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0 w-80">
                <div className="px-7">
                  <img src="https://cldup.com/dAXA3nE5xd.svg" alt="SlydPRO" className="h-8 w-auto" />
                </div>
                <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
                  <div className="flex flex-col space-y-3">
                    {isAuthenticated && user ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                            <AvatarFallback className="bg-[#027659] text-white text-sm font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full justify-start bg-transparent"
                          onClick={() => handleSettingsClick("profile")}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-red-600 bg-transparent"
                          onClick={logout}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign out
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Button variant="ghost" className="w-full justify-start" onClick={onAuthClick}>
                          Log in
                        </Button>
                        <Button onClick={onAuthClick} className="w-full bg-[#027659] hover:bg-[#065f46]">
                          Get started
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} initialSection={settingsSection} />
    </>
  )
}
