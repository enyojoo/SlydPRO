"use client"

import type React from "react"
import {
  TrendingUp,
  Briefcase,
  Target,
  Zap,
  Star,
  DollarSign,
  FileText,
  Users,
  Activity,
  Award,
  BarChart2,
  Monitor,
  Smartphone,
  Database,
  Server,
  Cpu,
  Settings,
  PenToolIcon as Tool,
  Code,
  PieChart,
  TrendingDown,
  Shield,
  Lightbulb,
  Rocket,
  Globe,
} from "lucide-react"

interface IconRendererProps {
  name: string
  size?: number
  className?: string
  style?: "outline" | "filled" | "material"
}

export const IconRenderer: React.FC<IconRendererProps> = ({ name, size = 24, className = "", style = "outline" }) => {
  // Outline style icons (Feather/Lucide Icons)
  const outlineIcons: Record<string, React.ComponentType<any>> = {
    "trending-up": TrendingUp,
    briefcase: Briefcase,
    target: Target,
    lightning: Zap,
    star: Star,
    dollar: DollarSign,
    document: FileText,
    users: Users,
    activity: Activity,
    award: Award,
    "bar-chart": BarChart2,
    monitor: Monitor,
    smartphone: Smartphone,
    database: Database,
    server: Server,
    cpu: Cpu,
    settings: Settings,
    tool: Tool,
    code: Code,
    "pie-chart": PieChart,
    "trending-down": TrendingDown,
    shield: Shield,
    lightbulb: Lightbulb,
    rocket: Rocket,
    globe: Globe,
  }

  // For now, we'll use the same icons for all styles since we're using Lucide
  // In a real implementation, you'd import different icon sets for filled/material
  const filledIcons = outlineIcons
  const materialIcons = outlineIcons

  let IconComponent

  if (style === "filled") {
    IconComponent = filledIcons[name]
  } else if (style === "material") {
    IconComponent = materialIcons[name]
  } else {
    IconComponent = outlineIcons[name]
  }

  if (!IconComponent) {
    // Fallback to a default icon if the requested one isn't found
    IconComponent = outlineIcons["star"]
  }

  return <IconComponent size={size} className={className} />
}

export default IconRenderer
