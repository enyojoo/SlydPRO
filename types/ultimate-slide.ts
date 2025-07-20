import type React from "react"
export interface UltimateSlide {
  id: string
  title: string
  content: string | React.ReactNode
  background?: string
  textColor?: string
  layout?: "title" | "content" | "chart" | "table" | "two-column" | "image"

  // Advanced design properties
  titleFont?: string
  contentFont?: string
  titleSize?: string
  contentSize?: string
  spacing?: "tight" | "comfortable" | "relaxed" | "generous"
  alignment?: "left" | "center" | "right"
  titleColor?: string
  accentColor?: string
  shadowEffect?: string
  borderRadius?: string
  glassmorphism?: boolean

  // Professional React Icon
  professionalIcon?: {
    name: string
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
    style: "outline" | "filled" | "material"
    color: string
  }

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
    style?: "modern" | "minimal" | "corporate"
  }

  tableData?: {
    headers: string[]
    rows: string[][]
    style?: "modern" | "minimal" | "corporate"
    interactive?: boolean
  }

  // Legacy icon support
  icons?: Array<{
    icon: string
    position: string
    color?: string
    size?: number | string
  }>

  // Animation and effects
  animations?: {
    entrance: string
    emphasis: string[]
  }

  customCSS?: string
}
