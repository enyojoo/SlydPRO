import type React from "react"
import {
  // Business Icons - Feather style (clean outlines)
  FiTrendingUp,
  FiBriefcase,
  FiTarget,
  FiZap,
  FiStar,
  FiDollarSign,
  FiFileText,
  FiUsers,
  FiActivity,
  FiAward,
  FiBarChart3,
  // Business Icons - Bootstrap style (filled)
  BsBriefcase,
  BsGraphUp,
  BsLightbulb,
  BsRocket,
  BsTrophy,
  BsGem,
  BsShield,
  BsPieChart,
  BsBarChart,
  // Tech Icons - Feather style
  FiMonitor,
  FiSmartphone,
  FiDatabase,
  FiServer,
  FiCpu,
  FiSettings,
  FiTool,
  FiCode,
  // Material Design Icons
  MdDashboard,
  MdAnalytics,
  MdInsights,
  MdTrendingUp,
  MdBusiness,
  MdGroup,
  MdTimeline,
  MdAssessment,
  MdShowChart,
} from "react-icons"

interface IconRendererProps {
  name: string
  size?: number
  className?: string
  style?: "outline" | "filled" | "material"
}

export const IconRenderer = ({ name, size = 24, className = "", style = "outline" }: IconRendererProps) => {
  // Outline style icons (Feather Icons)
  const outlineIcons: Record<string, React.ComponentType<any>> = {
    "trending-up": FiTrendingUp,
    briefcase: FiBriefcase,
    target: FiTarget,
    lightning: FiZap,
    star: FiStar,
    dollar: FiDollarSign,
    document: FiFileText,
    users: FiUsers,
    activity: FiActivity,
    award: FiAward,
    "bar-chart": FiBarChart3,
    monitor: FiMonitor,
    smartphone: FiSmartphone,
    database: FiDatabase,
    server: FiServer,
    cpu: FiCpu,
    settings: FiSettings,
    tool: FiTool,
    code: FiCode,
  }

  // Filled style icons (Bootstrap Icons)
  const filledIcons: Record<string, React.ComponentType<any>> = {
    briefcase: BsBriefcase,
    "graph-up": BsGraphUp,
    lightbulb: BsLightbulb,
    rocket: BsRocket,
    trophy: BsTrophy,
    gem: BsGem,
    shield: BsShield,
    "pie-chart": BsPieChart,
    "bar-chart": BsBarChart,
  }

  // Material Design style icons
  const materialIcons: Record<string, React.ComponentType<any>> = {
    dashboard: MdDashboard,
    analytics: MdAnalytics,
    insights: MdInsights,
    trending: MdTrendingUp,
    business: MdBusiness,
    group: MdGroup,
    timeline: MdTimeline,
    assessment: MdAssessment,
    chart: MdShowChart,
  }

  let IconComponent

  if (style === "filled") {
    IconComponent = filledIcons[name]
  } else if (style === "material") {
    IconComponent = materialIcons[name]
  } else {
    IconComponent = outlineIcons[name]
  }

  if (!IconComponent) {
    IconComponent = outlineIcons[name]
  }

  if (!IconComponent) {
    return null
  }

  return <IconComponent size={size} className={className} />
}
