"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from "recharts"
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Zap,
  Star,
  Award,
  Globe,
  Lightbulb,
  BarChart3,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Download,
} from "lucide-react"

// Enhanced TypeScript interfaces
interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

interface ChartConfig {
  type: "bar" | "line" | "pie" | "area" | "donut"
  data: ChartDataPoint[]
  config?: {
    showGrid?: boolean
    gradient?: boolean
    colors?: string[]
    showLegend?: boolean
    responsive?: boolean
    animation?: boolean
  }
  style?: string
}

interface TableData {
  headers: string[]
  rows: string[][]
  style?: string
  interactive?: boolean
}

interface IconData {
  icon: string
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
  color?: string
  size?: string
}

interface ProfessionalIcon {
  name: string
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
  style: "outline" | "filled" | "material"
  color: string
  size?: number
}

interface EnhancedSlide {
  id: string
  title: string
  content: string | React.ReactNode
  background: string
  textColor: string
  titleColor?: string
  accentColor?: string
  layout: "title" | "content" | "two-column" | "image" | "chart" | "table" | "split"

  // Enhanced typography
  titleFont?: string
  contentFont?: string
  titleSize?: string
  contentSize?: string

  // Visual effects
  shadowEffect?: string
  borderRadius?: string
  glassmorphism?: boolean

  // Professional elements
  professionalIcon?: ProfessionalIcon

  // Data visualization
  chartData?: ChartConfig
  tableData?: TableData
  icons?: IconData[]

  // Content classification
  contentType?: "opening" | "problem" | "solution" | "data" | "conclusion" | "transition"
  designTheme?: string
  spacing?: "compact" | "comfortable" | "generous"
  alignment?: "left" | "center" | "right"
}

interface SlideRendererProps {
  slide: EnhancedSlide
  isSelected?: boolean
  onClick?: () => void
  className?: string
  isPresentationMode?: boolean
  showControls?: boolean
  onEdit?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

// Icon mapping for professional icons
const ICON_COMPONENTS = {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Zap,
  Star,
  Award,
  Globe,
  Lightbulb,
  BarChart3,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Download,
} as const

// Enhanced color palettes for charts
const CHART_COLORS = {
  business: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"],
  creative: ["#a855f7", "#ec4899", "#f97316", "#84cc16", "#06b6d4", "#f59e0b"],
  minimal: ["#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f472b6", "#fb7185"],
  vibrant: ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#10b981"],
  nature: ["#10b981", "#059669", "#047857", "#065f46", "#064e3b", "#022c22"],
  ocean: ["#06b6d4", "#0891b2", "#0e7490", "#155e75", "#164e63", "#0c4a6e"],
  sunset: ["#f97316", "#ea580c", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d"],
}

// Icon positioning helper
const getIconPosition = (position: string): string => {
  const positions = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
    center: "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
  }
  return positions[position as keyof typeof positions] || positions["top-right"]
}

// Professional icon renderer component
const IconRenderer: React.FC<{
  name: string
  size?: number
  style?: "outline" | "filled" | "material"
  className?: string
}> = ({ name, size = 24, style = "outline", className = "" }) => {
  const IconComponent = ICON_COMPONENTS[name as keyof typeof ICON_COMPONENTS]

  if (!IconComponent) {
    return <div className={`w-6 h-6 bg-current rounded ${className}`} />
  }

  return (
    <IconComponent
      size={size}
      className={`${className} ${style === "filled" ? "fill-current" : ""}`}
      strokeWidth={style === "outline" ? 2 : 1.5}
    />
  )
}

// Enhanced content renderer with proper text sizing
const renderEnhancedContent = (slide: EnhancedSlide) => {
  if (typeof slide.content === "string") {
    const lines = slide.content.split("\n").filter((line) => line.trim())

    return (
      <div className="space-y-3 max-w-full">
        {lines.map((line, index) => {
          const trimmedLine = line.trim()

          if (trimmedLine.startsWith("•") || trimmedLine.startsWith("-")) {
            const content = trimmedLine.substring(1).trim()
            return (
              <div
                key={index}
                className={`flex items-start space-x-3 group transition-all duration-500 ${
                  slide.isAnimating ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
                }`}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div
                  className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300"
                  style={{
                    backgroundColor: slide.accentColor,
                  }}
                />
                <p
                  className="leading-relaxed break-words"
                  style={{
                    color: slide.textColor,
                    fontFamily: slide.contentFont,
                    fontSize: slide.contentSize || "1.125rem",
                    lineHeight: "1.6",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {content}
                </p>
              </div>
            )
          }

          return (
            <p
              key={index}
              className={`leading-relaxed break-words transition-all duration-500 ${
                slide.isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
              }`}
              style={{
                color: slide.textColor,
                fontFamily: slide.contentFont,
                fontSize: slide.contentSize || "1.125rem",
                lineHeight: "1.6",
                animationDelay: `${index * 150}ms`,
                wordWrap: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {trimmedLine}
            </p>
          )
        })}
      </div>
    )
  }

  return <div className="leading-relaxed max-w-full break-words">{slide.content}</div>
}

// Enhanced chart renderer
const renderEnhancedChart = (slide: EnhancedSlide) => {
  if (!slide.chartData) return null

  const { type, data, config = {}, style } = slide.chartData
  const {
    showGrid = true,
    gradient = false,
    colors = CHART_COLORS.business,
    showLegend = true,
    responsive = true,
    animation = true,
  } = config

  const ChartComponent = {
    bar: BarChart,
    line: LineChart,
    pie: PieChart,
    area: AreaChart,
    donut: PieChart,
  }[type]

  const DataComponent = {
    bar: Bar,
    line: Line,
    pie: Pie,
    area: Area,
  }[type]

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent width={responsive ? "100%" : 600} height={400}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          {showLegend && <Legend />}
          <DataComponent data={data} fill={gradient ? "url(#gradient)" : colors[0]}>
            {gradient && (
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  {colors.map((color, index) => (
                    <stop key={index} offset={`${(index / colors.length) * 100}%`} stopColor={color} />
                  ))}
                </linearGradient>
              </defs>
            )}
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </DataComponent>
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  )
}

// Enhanced table renderer
const renderEnhancedTable = (slide: EnhancedSlide) => {
  if (!slide.tableData) return null

  const { headers, rows, style, interactive } = slide.tableData

  return (
    <div className="w-full h-full overflow-auto">
      <table className={`w-full table-auto ${style}`}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="px-4 py-2 bg-gray-100 text-gray-800">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={interactive ? "hover:bg-gray-50" : ""}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2 border border-gray-200">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Main slide rendering to fix text sizing and remove random icons:
const UltimateSlideRenderer: React.FC<SlideRendererProps> = ({
  slide,
  isSelected = false,
  onClick,
  className = "",
  isPresentationMode = false,
  showControls = false,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const slideRef = useRef<HTMLDivElement>(null)

  // Animation effect on mount
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 600)
    return () => clearTimeout(timer)
  }, [slide.id])

  // Main slide styling with proper text containment
  const backgroundStyle = {
    background: slide.background,
    color: slide.textColor,
    fontFamily: slide.titleFont,
    borderRadius: slide.borderRadius || "16px",
    boxShadow: slide.shadowEffect || "0 20px 40px -12px rgba(0, 0, 0, 0.25)",
    position: "relative" as const,
    overflow: "hidden" as const,
  }

  return (
    <>
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <div
        ref={slideRef}
        className={`group relative w-full h-full cursor-pointer transition-all duration-500 ${
          isSelected ? "ring-4 ring-blue-400/50 scale-[1.02]" : ""
        } ${className}`}
        style={backgroundStyle}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
        aria-label={`Slide: ${slide.title}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClick?.()
          }
        }}
      >
        {/* Glassmorphism overlay */}
        {slide.glassmorphism && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-sm" />
        )}

        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, ${slide.accentColor}20 0%, transparent 50%), radial-gradient(circle at 75% 75%, ${slide.accentColor}15 0%, transparent 50%)`,
            }}
          />
        </div>

        {/* Professional icon */}
        {slide.professionalIcon && (
          <div className={`absolute ${getIconPosition(slide.professionalIcon.position)}`}>
            <IconRenderer
              name={slide.professionalIcon.name}
              size={slide.professionalIcon.size}
              style={slide.professionalIcon.style}
              className={`text-${slide.professionalIcon.color}`}
            />
          </div>
        )}

        {/* Slide controls */}
        {showControls && !isPresentationMode && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
            <div className="flex space-x-2">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  className="p-2 rounded-lg bg-black/50 backdrop-blur-sm border border-white/20 text-white hover:bg-black/70 transition-all duration-200"
                  aria-label="Edit slide"
                >
                  <IconRenderer name="Edit" size={16} />
                </button>
              )}
              {onDuplicate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate()
                  }}
                  className="p-2 rounded-lg bg-black/50 backdrop-blur-sm border border-white/20 text-white hover:bg-black/70 transition-all duration-200"
                  aria-label="Duplicate slide"
                >
                  <IconRenderer name="Duplicate" size={16} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="p-2 rounded-lg bg-black/50 backdrop-blur-sm border border-white/20 text-white hover:bg-black/70 transition-all duration-200"
                  aria-label="Delete slide"
                >
                  <IconRenderer name="Delete" size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main content with proper padding and text containment */}
        <div className="relative z-10 p-8 h-full flex flex-col justify-center max-w-full">
          {slide.layout === "title" ? (
            <div className="text-center max-w-full mx-auto">
              <h1
                className="font-bold mb-6 leading-tight tracking-tight break-words"
                style={{
                  fontSize: slide.titleSize || "2.5rem",
                  color: slide.titleColor || slide.textColor,
                  fontFamily: slide.titleFont,
                  textShadow: "0 2px 20px rgba(0,0,0,0.3)",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {slide.title}
              </h1>
              <div
                className="opacity-90 leading-relaxed max-w-full mx-auto"
                style={{
                  fontSize: slide.contentSize || "1.125rem",
                  color: slide.textColor,
                  fontFamily: slide.contentFont,
                }}
              >
                {renderEnhancedContent(slide)}
              </div>
            </div>
          ) : slide.layout === "chart" ? (
            <div className="max-w-full">
              <h1
                className="font-bold mb-4 leading-tight tracking-tight break-words"
                style={{
                  fontSize: slide.titleSize || "1.875rem",
                  color: slide.titleColor || slide.textColor,
                  fontFamily: slide.titleFont,
                  textShadow: "0 2px 15px rgba(0,0,0,0.2)",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {slide.title}
              </h1>
              <div
                className="leading-relaxed opacity-90 mb-4 max-w-full"
                style={{
                  fontSize: slide.contentSize || "1.125rem",
                  color: slide.textColor,
                  fontFamily: slide.contentFont,
                }}
              >
                {renderEnhancedContent(slide)}
              </div>
              {renderEnhancedChart(slide)}
            </div>
          ) : slide.layout === "table" ? (
            <div className="max-w-full">
              <h1
                className="font-bold mb-4 leading-tight tracking-tight break-words"
                style={{
                  fontSize: slide.titleSize || "1.875rem",
                  color: slide.titleColor || slide.textColor,
                  fontFamily: slide.titleFont,
                  textShadow: "0 2px 15px rgba(0,0,0,0.2)",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {slide.title}
              </h1>
              <div
                className="leading-relaxed opacity-90 mb-4 max-w-full"
                style={{
                  fontSize: slide.contentSize || "1.125rem",
                  color: slide.textColor,
                  fontFamily: slide.contentFont,
                }}
              >
                {renderEnhancedContent(slide)}
              </div>
              {renderEnhancedTable(slide)}
            </div>
          ) : slide.layout === "two-column" || slide.layout === "split" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-full">
              <div className="max-w-full">
                <h1
                  className="font-bold mb-4 leading-tight tracking-tight break-words"
                  style={{
                    fontSize: slide.titleSize || "1.875rem",
                    color: slide.titleColor || slide.textColor,
                    fontFamily: slide.titleFont,
                    textShadow: "0 2px 15px rgba(0,0,0,0.2)",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {slide.title}
                </h1>
                <div
                  className="leading-relaxed max-w-full"
                  style={{
                    fontSize: slide.contentSize || "1.125rem",
                    color: slide.textColor,
                    fontFamily: slide.contentFont,
                  }}
                >
                  {renderEnhancedContent(slide)}
                </div>
              </div>
              <div className="flex justify-center max-w-full">
                {slide.chartData ? (
                  renderEnhancedChart(slide)
                ) : slide.tableData ? (
                  renderEnhancedTable(slide)
                ) : (
                  <div
                    className="w-full h-48 rounded-xl backdrop-blur-sm border border-white/20 flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                    }}
                  >
                    <span className="text-sm opacity-50">Visual Content</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-full">
              <h1
                className="font-bold mb-6 leading-tight tracking-tight break-words"
                style={{
                  fontSize: slide.titleSize || "1.875rem",
                  color: slide.titleColor || slide.textColor,
                  fontFamily: slide.titleFont,
                  textShadow: "0 2px 15px rgba(0,0,0,0.2)",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {slide.title}
              </h1>
              <div
                className="leading-relaxed max-w-full"
                style={{
                  fontSize: slide.contentSize || "1.125rem",
                  color: slide.textColor,
                  fontFamily: slide.contentFont,
                }}
              >
                {renderEnhancedContent(slide)}
              </div>
            </div>
          )}
        </div>

        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 transition-opacity duration-500 hover:opacity-100 pointer-events-none" />

        {/* Selection indicator */}
        {isSelected && <div className="absolute inset-0 border-4 border-blue-400/50 rounded-2xl pointer-events-none" />}
      </div>
    </>
  )
}

export default UltimateSlideRenderer
