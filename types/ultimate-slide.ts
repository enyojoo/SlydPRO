import type React from "react"
export interface UltimateSlide {
  id: string
  title: string
  content: string | React.ReactNode
  layout: "title" | "content" | "chart" | "table" | "two-column" | "image"
  background?: string
  textColor?: string
  titleColor?: string
  accentColor?: string

  // Typography
  titleFont?: string
  contentFont?: string
  titleSize?: string
  contentSize?: string

  // Layout
  spacing?: "compact" | "comfortable" | "relaxed" | "generous"
  alignment?: "left" | "center" | "right"

  // Visual effects
  shadowEffect?: string
  borderRadius?: string
  glassmorphism?: boolean

  // Professional icon system
  professionalIcon?: {
    name: string
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
    style: "outline" | "filled" | "material"
    color: string
  }

  // Legacy icon support
  icons?: Array<{
    icon: string
    position: string
    color?: string
    size?: number
  }>

  // Visual content
  chartData?: {
    type: "bar" | "line" | "pie" | "area" | "donut"
    data: Array<{
      name: string
      value: number
      [key: string]: any
    }>
    config?: {
      showGrid?: boolean
      gradient?: boolean
      [key: string]: any
    }
    style?: string
  }

  tableData?: {
    headers: string[]
    rows: string[][]
    style?: string
    interactive?: boolean
  }

  // Animation and effects
  animations?: {
    entrance: string
    emphasis: string[]
  }

  customCSS?: string

  // Content classification for design context
  contentType?: "financial" | "growth" | "team" | "strategy" | "data" | "business"
}
