import type React from "react"
export interface ChartData {
  type: "bar" | "line" | "pie" | "donut" | "area"
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

export interface TableData {
  headers: string[]
  rows: string[][]
  style?: string
  interactive?: boolean
}

export interface ProfessionalIcon {
  name: string
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
  style: "outline" | "filled" | "material"
  color: string
}

export interface IconData {
  icon: string
  position: string
  color?: string
  size?: number
}

export interface AnimationData {
  entrance: string
  emphasis: string[]
}

export interface UltimateSlide {
  id: string
  title: string
  content: string | React.ReactNode
  contentType?: "financial" | "growth" | "team" | "strategy" | "data" | "business"
  layout: "title" | "content" | "chart" | "table" | "two-column" | "image"
  background: string
  textColor: string
  titleColor?: string
  accentColor?: string

  // Typography
  titleFont?: string
  contentFont?: string
  titleSize?: string
  contentSize?: string

  // Layout
  spacing?: "compact" | "relaxed" | "comfortable" | "generous"
  alignment?: "left" | "center" | "right"

  // Visual Effects
  shadowEffect?: string
  borderRadius?: string
  glassmorphism?: boolean

  // Icons
  professionalIcon?: ProfessionalIcon
  icons?: IconData[]

  // Visual Content
  chartData?: ChartData
  tableData?: TableData

  // Animation
  animations?: AnimationData
  customCSS?: string
}
