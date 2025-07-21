export interface UltimateSlide {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  layout: "title" | "content" | "two-column" | "image" | "chart" | "table"

  // Advanced design properties
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
  glassmorphism?: boolean

  // Professional icon
  professionalIcon?: {
    name: string
    position: string
    style: "outline" | "filled" | "material"
    color: string
  }

  // Visual content
  chartData?: {
    type: "bar" | "line" | "pie" | "area"
    data: Array<{ name: string; value: number }>
    config: { showGrid?: boolean; gradient?: boolean }
    style: string
  }

  tableData?: {
    headers: string[]
    rows: string[][]
    style: string
    interactive: boolean
  }

  // Legacy support
  icons?: any[]

  // Animation and effects
  animations?: {
    entrance: string
    emphasis: any[]
  }

  customCSS?: string
}
