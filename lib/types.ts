export interface UltimateSlide {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  layout: "title" | "content" | "two-column" | "image" | "chart" | "table" | "infographic"

  // Advanced Design Properties
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

  // Visual Content
  chartData?: {
    type: "bar" | "line" | "pie" | "donut" | "area" | "scatter" | "bubble"
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
  imageData?: {
    src: string
    alt: string
    position: string
    style: string
  }
  icons?: Array<{
    icon: string
    position: string
    color: string
    size: string
  }>

  // Animation and Effects
  animations?: {
    entrance: string
    emphasis: string[]
  }
  glassmorphism?: boolean
  customCSS?: string
}
