export interface UltimateSlide {
  // Keep existing properties (CRITICAL - don't break existing slides)
  id: string
  title: string
  content: string
  background: string
  textColor: string
  layout: "title" | "content" | "two-column" | "image" | "chart" | "table" | "infographic"

  // Add new optional properties (won't break existing slides)
  titleFont?: string
  contentFont?: string
  titleSize?: string
  contentSize?: string
  spacing?: string
  alignment?: string
  titleColor?: string
  accentColor?: string
  shadowEffect?: string
  borderRadius?: string

  // Visual content (optional - existing slides won't have these)
  chartData?: {
    type: "bar" | "line" | "pie" | "donut" | "area"
    data: any[]
    config: any
    style: string
  }
  tableData?: {
    headers: string[]
    rows: any[][]
    style: string
    interactive: boolean
  }
  icons?: Array<{
    icon: string
    position: string
    color: string
    size: string
  }>

  glassmorphism?: boolean
}
