"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, CreditCard, Check, Info } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSection?: string
}

export function SettingsModal({ open, onOpenChange, initialSection = "profile" }: SettingsModalProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState(initialSection)

  useEffect(() => {
    if (open) {
      setActiveSection(initialSection)
    }
  }, [open, initialSection])

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 gap-0 mx-4 sm:mx-0">
        <div className="flex h-full">
          {/* Left Sidebar */}
          <div className="w-full sm:w-64 bg-muted/30 border-r border-b sm:border-b-0 p-4 sm:p-6">
            <div className="space-y-4 sm:space-y-6">
              {/* Account Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Account</h3>
                <div className="flex sm:flex-col space-x-2 sm:space-x-0 sm:space-y-1">
                  <Button
                    variant={activeSection === "profile" ? "secondary" : "ghost"}
                    className="flex-1 sm:w-full justify-start h-9"
                    onClick={() => handleSectionChange("profile")}
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </Button>
                  <Button
                    variant={activeSection === "billing" ? "secondary" : "ghost"}
                    className="flex-1 sm:w-full justify-start h-9"
                    onClick={() => handleSectionChange("billing")}
                  >
                    <CreditCard className="h-4 w-4 mr-3" />
                    Plans & Billing
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold">
                  {activeSection === "profile" ? "Profile Settings" : "Plans & Billing"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                  {activeSection === "profile"
                    ? "Manage your account profile and preferences"
                    : "Manage your subscription and billing information"}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-h-[calc(85vh-120px)]">
              {activeSection === "profile" && <ProfileSection user={user} />}
              {activeSection === "billing" && <BillingSection user={user} />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProfileSection({ user }: { user: any }) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
  })

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Avatar Section */}
      <div>
        <h3 className="text-lg font-medium mb-2">Your Avatar</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your avatar is automatically generated based on your account.
        </p>
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback className="bg-[#027659] text-white text-lg font-medium">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm">
            Change Avatar
          </Button>
        </div>
      </div>

      <Separator />

      {/* Email Section */}
      <div>
        <h3 className="text-lg font-medium mb-2">Email</h3>
        <p className="text-sm text-muted-foreground mb-4">Your email address associated with your account.</p>
        <Input
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Email address"
          type="email"
        />
      </div>

      <Separator />

      {/* Name Section */}
      <div>
        <h3 className="text-lg font-medium mb-2">Name</h3>
        <p className="text-sm text-muted-foreground mb-4">Your full name, as visible to others.</p>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Full name"
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button className="bg-[#027659] hover:bg-[#065f46] text-white">Save Changes</Button>
      </div>
    </div>
  )
}

function BillingSection({ user }: { user: any }) {
  return (
    <div className="space-y-8 max-w-5xl">
      {/* Current Plan Status */}
      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          You're currently on plan: <span className="font-medium text-foreground">Free</span>.{" "}
          <button className="text-blue-600 hover:text-blue-800 underline">
            Manage your payment preferences and view past invoices
          </button>
          , or change your plan below.
        </p>
      </div>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Free Plan */}
        <Card className="p-6 relative">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Free</h3>
            <div className="mb-2">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground">For getting started</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm">5 daily credits</span>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium mb-3">Get started with:</p>
            <ul className="space-y-2">
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                Public projects
              </li>
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                Up to 20 collaborators
              </li>
            </ul>
          </div>
        </Card>

        {/* Pro Plan */}
        <Card className="p-6 relative border-2 border-[#027659]/20">
          <Badge className="absolute top-4 right-4 bg-[#027659]/10 text-[#027659] hover:bg-[#027659]/10">POPULAR</Badge>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Pro</h3>
            <div className="mb-2">
              <span className="text-3xl font-bold">$25</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground">For more projects and usage</p>
          </div>

          <div className="mb-6">
            <Select defaultValue="100">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100 credits / month</SelectItem>
                <SelectItem value="250">250 credits / month</SelectItem>
                <SelectItem value="500">500 credits / month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full mb-6 bg-[#027659] hover:bg-[#065f46] text-white">Upgrade</Button>

          <div>
            <p className="text-sm font-medium mb-3">Everything in Free, plus:</p>
            <ul className="space-y-2">
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span>Up to 250 credits / month</span>
                <Info className="h-3 w-3 text-muted-foreground ml-1" />
              </li>
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                Private projects
              </li>
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                Remove the SlydPRO badge
              </li>
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                Custom domains
              </li>
            </ul>
          </div>
        </Card>

        {/* Enterprise Plan */}
        <Card className="p-6 relative">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
            <div className="mb-2">
              <span className="text-3xl font-bold">Custom</span>
            </div>
            <p className="text-sm text-muted-foreground">For custom needs</p>
          </div>

          <Button className="w-full mb-6 bg-[#027659] hover:bg-[#065f46] text-white">Contact us</Button>

          <div>
            <p className="text-sm font-medium mb-3">Everything in Pro, plus:</p>
            <ul className="space-y-2">
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                Dedicated support
              </li>
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                Custom integrations
              </li>
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                SSO
              </li>
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                Opt out of data training
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}
