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

  // Professional icon renderer
  const renderProfessionalIcon = () => {
    if (!slide.professionalIcon) return null

    return (
      <div
        className={`absolute ${getIconPosition(slide.professionalIcon.position)} z-20 transition-all duration-500 ${
          isHovered ? "scale-110 rotate-3" : ""
        }`}
        role="img"
        aria-label={`${slide.professionalIcon.name} icon`}
      >
        <div
          className="group relative"
          style={{
            filter: `drop-shadow(0 8px 25px ${slide.professionalIcon.color}20)`,
          }}
        >
          <div
            className="relative w-12 h-12 rounded-2xl backdrop-blur-md flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
            style={{
              background: slide.glassmorphism
                ? `linear-gradient(135deg, ${slide.professionalIcon.color}15, ${slide.professionalIcon.color}25)`
                : `${slide.professionalIcon.color}20`,
              border: `1px solid ${slide.professionalIcon.color}30`,
              color: slide.professionalIcon.color,
            }}
          >
            <IconRenderer
              name={slide.professionalIcon.name}
              size={slide.professionalIcon.size || 24}
              style={slide.professionalIcon.style}
              className="transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        </div>
      </div>
    )
  }

  // Enhanced chart renderer with all types
  const renderEnhancedChart = () => {
    if (!slide.chartData) return null

    const colors = CHART_COLORS[slide.designTheme as keyof typeof CHART_COLORS] || CHART_COLORS.business
    const { type, data, config = {} } = slide.chartData

    const commonProps = {
      width: "100%",
      height: "100%",
    }

    const renderChart = () => {
      switch (type) {
        case "bar":
          return (
            <BarChart data={data} {...commonProps}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />}
              <XAxis
                dataKey="name"
                stroke={slide.textColor}
                fontSize={12}
                fontFamily={slide.contentFont}
                tick={{ fill: slide.textColor }}
              />
              <YAxis
                stroke={slide.textColor}
                fontSize={12}
                fontFamily={slide.contentFont}
                tick={{ fill: slide.textColor }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.9)",
                  border: "none",
                  borderRadius: "12px",
                  color: "#ffffff",
                  fontFamily: slide.contentFont,
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                }}
                cursor={{ fill: "rgba(255,255,255,0.1)" }}
              />
              <Bar
                dataKey="value"
                fill={`url(#barGradient-${slide.id})`}
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
              />
              <defs>
                <linearGradient id={`barGradient-${slide.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors[0]} stopOpacity={1} />
                  <stop offset="100%" stopColor={colors[0]} stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          )

        case "line":
          return (
            <LineChart data={data} {...commonProps}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />}
              <XAxis
                dataKey="name"
                stroke={slide.textColor}
                fontSize={12}
                fontFamily={slide.contentFont}
                tick={{ fill: slide.textColor }}
              />
              <YAxis
                stroke={slide.textColor}
                fontSize={12}
                fontFamily={slide.contentFont}
                tick={{ fill: slide.textColor }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.9)",
                  border: "none",
                  borderRadius: "12px",
                  color: "#ffffff",
                  fontFamily: slide.contentFont,
                  backdropFilter: "blur(12px)",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={colors[0]}
                strokeWidth={3}
                dot={{ fill: colors[0], strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: colors[0], strokeWidth: 2, fill: "#ffffff" }}
                animationDuration={1500}
              />
            </LineChart>
          )

        case "area":
          return (
            <AreaChart data={data} {...commonProps}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />}
              <XAxis
                dataKey="name"
                stroke={slide.textColor}
                fontSize={12}
                fontFamily={slide.contentFont}
                tick={{ fill: slide.textColor }}
              />
              <YAxis
                stroke={slide.textColor}
                fontSize={12}
                fontFamily={slide.contentFont}
                tick={{ fill: slide.textColor }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.9)",
                  border: "none",
                  borderRadius: "12px",
                  color: "#ffffff",
                  fontFamily: slide.contentFont,
                  backdropFilter: "blur(12px)",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors[0]}
                strokeWidth={2}
                fill={`url(#areaGradient-${slide.id})`}
                animationDuration={1500}
              />
              <defs>
                <linearGradient id={`areaGradient-${slide.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={colors[0]} stopOpacity={0.1} />
                </linearGradient>
              </defs>
            </AreaChart>
          )

        case "pie":
        case "donut":
          const innerRadius = type === "donut" ? 60 : 0
          return (
            <PieChart {...commonProps}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                animationDuration={1000}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              {config.showLegend && (
                <Legend
                  wrapperStyle={{
                    color: slide.textColor,
                    fontFamily: slide.contentFont,
                    fontSize: "12px",
                  }}
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.9)",
                  border: "none",
                  borderRadius: "12px",
                  color: "#ffffff",
                  fontFamily: slide.contentFont,
                  backdropFilter: "blur(12px)",
                }}
              />
            </PieChart>
          )

        default:
          return null
      }
    }

    return (
      <div className="w-full h-80 mt-8 relative group">
        <div
          className="absolute inset-0 rounded-2xl backdrop-blur-sm border transition-all duration-500 group-hover:scale-[1.02]"
          style={{
            background: slide.glassmorphism
              ? "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)"
              : "rgba(255,255,255,0.05)",
            borderColor: "rgba(255,255,255,0.2)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        />
        <div className="relative z-10 p-6 h-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  // Enhanced table renderer with glassmorphism
  const renderEnhancedTable = () => {
    if (!slide.tableData) return null

    const { headers, rows, interactive = false } = slide.tableData

    return (
      <div className="w-full mt-8 relative group">
        <div
          className="rounded-2xl backdrop-blur-sm border overflow-hidden transition-all duration-500 group-hover:scale-[1.01]"
          style={{
            background: slide.glassmorphism
              ? "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)"
              : "rgba(255,255,255,0.05)",
            borderColor: "rgba(255,255,255,0.2)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-6 py-4 text-left font-semibold transition-colors duration-300"
                      style={{
                        color: slide.titleColor || slide.textColor,
                        fontFamily: slide.titleFont,
                        fontSize: "0.875rem",
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={`border-b border-white/10 transition-all duration-300 ${
                      interactive ? "hover:bg-white/5 cursor-pointer" : ""
                    }`}
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-6 py-4 transition-all duration-300"
                        style={{
                          color: slide.textColor,
                          fontFamily: slide.contentFont,
                          fontSize: "0.875rem",
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // Enhanced content renderer with animations
  const renderEnhancedContent = () => {
    if (typeof slide.content === "string") {
      const lines = slide.content.split("\n").filter((line) => line.trim())

      return (
        <div className="space-y-4">
          {lines.map((line, index) => {
            const trimmedLine = line.trim()

            if (trimmedLine.startsWith("•") || trimmedLine.startsWith("-")) {
              const content = trimmedLine.substring(1).trim()
              return (
                <div
                  key={index}
                  className={`flex items-start space-x-4 group transition-all duration-500 ${
                    isAnimating ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
                  }`}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: isAnimating ? `slideInLeft 0.6s ease-out ${index * 100}ms forwards` : undefined,
                  }}
                >
                  <div
                    className="mt-2 w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 group-hover:scale-125 group-hover:shadow-lg"
                    style={{
                      backgroundColor: slide.accentColor,
                      boxShadow: `0 0 10px ${slide.accentColor}40`,
                    }}
                  />
                  <p
                    className="leading-relaxed transition-all duration-300 group-hover:translate-x-1"
                    style={{
                      color: slide.textColor,
                      fontFamily: slide.contentFont,
                      fontSize: slide.contentSize || "1.125rem",
                      lineHeight: "1.7",
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
                className={`leading-relaxed transition-all duration-500 ${
                  isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
                }`}
                style={{
                  color: slide.textColor,
                  fontFamily: slide.contentFont,
                  fontSize: slide.contentSize || "1.125rem",
                  lineHeight: "1.7",
                  animationDelay: `${index * 150}ms`,
                  animation: isAnimating ? `fadeInUp 0.6s ease-out ${index * 150}ms forwards` : undefined,
                }}
              >
                {trimmedLine}
              </p>
            )
          })}
        </div>
      )
    }

    return <div className="leading-relaxed">{slide.content}</div>
  }

  // Slide controls for editing
  const renderSlideControls = () => {
    if (!showControls || isPresentationMode) return null

    return (
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
              <IconRenderer name="Copy" size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-2 rounded-lg bg-red-500/50 backdrop-blur-sm border border-red-300/20 text-white hover:bg-red-500/70 transition-all duration-200"
              aria-label="Delete slide"
            >
              <IconRenderer name="Trash2" size={16} />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Main slide styling
  const backgroundStyle = {
    background: slide.background,
    color: slide.textColor,
    fontFamily: slide.titleFont,
    borderRadius: slide.borderRadius || "20px",
    boxShadow: slide.shadowEffect || "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
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
          isSelected ? "ring-4 ring-blue-400/50 ring-opacity-60 scale-[1.02]" : ""
        } ${className} ${isAnimating ? "animate-scaleIn" : ""}`}
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
        {renderProfessionalIcon()}

        {/* Slide controls */}
        {renderSlideControls()}

        {/* Main content */}
        <div className="relative z-10 p-12 h-full flex flex-col justify-center">
          {slide.layout === "title" ? (
            <div className="text-center max-w-4xl mx-auto">
              <h1
                className="font-bold mb-8 leading-tight tracking-tight transition-all duration-500"
                style={{
                  fontSize: slide.titleSize || "clamp(2.5rem, 4vw, 4rem)",
                  color: slide.titleColor || slide.textColor,
                  fontFamily: slide.titleFont,
                  textShadow: "0 2px 20px rgba(0,0,0,0.3)",
                }}
              >
                {slide.title}
              </h1>
              <div
                className="opacity-90 leading-relaxed max-w-2xl mx-auto"
                style={{
                  fontSize: slide.contentSize || "clamp(1.125rem, 1.5vw, 1.5rem)",
                  color: slide.textColor,
                  fontFamily: slide.contentFont,
                }}
              >
                {renderEnhancedContent()}
              </div>
            </div>
          ) : slide.layout === "chart" ? (
            <div>
              <h1
                className="font-bold mb-6 leading-tight tracking-tight"
                style={{
                  fontSize: slide.titleSize || "clamp(1.75rem, 2.5vw, 2.5rem)",
                  color: slide.titleColor || slide.textColor,
                  fontFamily: slide.titleFont,
                  textShadow: "0 2px 15px rgba(0,0,0,0.2)",
                }}
              >
                {slide.title}
              </h1>
              <div
                className="leading-relaxed opacity-90 mb-6"
                style={{
                  fontSize: slide.contentSize || "1.125rem",
                  color: slide.textColor,
                  fontFamily: slide.contentFont,
                }}
              >
                {renderEnhancedContent()}
              </div>
              {renderEnhancedChart()}
            </div>
          ) : slide.layout === "table" ? (
            <div>
              <h1
                className="font-bold mb-6 leading-tight tracking-tight"
                style={{
                  fontSize: slide.titleSize || "clamp(1.75rem, 2.5vw, 2.5rem)",
                  color: slide.titleColor || slide.textColor,
                  fontFamily: slide.titleFont,
                  textShadow: "0 2px 15px rgba(0,0,0,0.2)",
                }}
              >
                {slide.title}
              </h1>
              <div
                className="leading-relaxed opacity-90 mb-6"
                style={{
                  fontSize: slide.contentSize || "1.125rem",
                  color: slide.textColor,
                  fontFamily: slide.contentFont,
                }}
              >
                {renderEnhancedContent()}
              </div>
              {renderEnhancedTable()}
            </div>
          ) : slide.layout === "two-column" || slide.layout === "split" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1
                  className="font-bold mb-6 leading-tight tracking-tight"
                  style={{
                    fontSize: slide.titleSize || "clamp(1.75rem, 2.5vw, 2.5rem)",
                    color: slide.titleColor || slide.textColor,
                    fontFamily: slide.titleFont,
                    textShadow: "0 2px 15px rgba(0,0,0,0.2)",
                  }}
                >
                  {slide.title}
                </h1>
                <div
                  className="leading-relaxed"
                  style={{
                    fontSize: slide.contentSize || "1.125rem",
                    color: slide.textColor,
                    fontFamily: slide.contentFont,
                  }}
                >
                  {renderEnhancedContent()}
                </div>
              </div>
              <div className="flex justify-center">
                {slide.chartData ? (
                  renderEnhancedChart()
                ) : slide.tableData ? (
                  renderEnhancedTable()
                ) : (
                  <div
                    className="w-full h-64 rounded-2xl backdrop-blur-sm border border-white/20 flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                    }}
                  >
                    <IconRenderer name="Image" size={48} className="opacity-50" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h1
                className="font-bold mb-8 leading-tight tracking-tight"
                style={{
                  fontSize: slide.titleSize || "clamp(1.75rem, 2.5vw, 2.5rem)",
                  color: slide.titleColor || slide.textColor,
                  fontFamily: slide.titleFont,
                  textShadow: "0 2px 15px rgba(0,0,0,0.2)",
                }}
              >
                {slide.title}
              </h1>
              <div
                className="leading-relaxed"
                style={{
                  fontSize: slide.contentSize || "1.125rem",
                  color: slide.textColor,
                  fontFamily: slide.contentFont,
                }}
              >
                {renderEnhancedContent()}
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
