"use client"

import type React from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { TrendingUp, Users, DollarSign, Target, Zap, Star, Award, Globe } from "lucide-react"
import type { UltimateSlide } from "@/types/ultimate-slide"

interface UltimateSlideRendererProps {
  slide: UltimateSlide
  isSelected?: boolean
  onClick?: () => void
  className?: string
  isPresentationMode?: boolean
}

export const UltimateSlideRenderer: React.FC<UltimateSlideRendererProps> = ({
  slide,
  isSelected = false,
  onClick,
  className = "",
  isPresentationMode = false,
}) => {
  // Icon mapping with better icons
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    "📈": TrendingUp,
    "👥": Users,
    "💰": DollarSign,
    "🎯": Target,
    "⚡": Zap,
    "⭐": Star,
    "🏆": Award,
    "🌍": Globe,
    "trending-up": TrendingUp,
    "users": Users,
    "dollar-sign": DollarSign,
    "target": Target,
    "zap": Zap,
    "star": Star,
    "award": Award,
    "globe": Globe,
  }

  // Enhanced chart colors
  const chartColors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

  // Chart renderer with better styling
  const renderChart = () => {
    if (!slide.chartData || !slide.chartData.data || slide.chartData.data.length === 0) return null
    
    const { type, data, config = {} } = slide.chartData
    const height = isPresentationMode ? 400 : 280

    // Ensure data has proper structure
    const chartData = data.map((item, index) => ({
      name: item.name || item.label || item.month || item.metric || item.region || `Item ${index + 1}`,
      value: typeof item.value === 'number' ? item.value : typeof item.sales === 'number' ? item.sales : typeof item.score === 'number' ? item.score : typeof item.revenue === 'number' ? item.revenue : 0,
      ...item
    }))

    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
              <XAxis 
                dataKey="name" 
                stroke="#ffffff" 
                fontSize={isPresentationMode ? 14 : 12}
                tick={{ fill: '#ffffff' }}
              />
              <YAxis 
                stroke="#ffffff" 
                fontSize={isPresentationMode ? 14 : 12}
                tick={{ fill: '#ffffff' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "rgba(0,0,0,0.8)", 
                  border: "none", 
                  borderRadius: "8px",
                  color: '#ffffff'
                }} 
              />
              <Bar 
                dataKey="value" 
                fill={slide.accentColor || "#10b981"} 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )
      
      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
              <XAxis 
                dataKey="name" 
                stroke="#ffffff" 
                fontSize={isPresentationMode ? 14 : 12}
                tick={{ fill: '#ffffff' }}
              />
              <YAxis 
                stroke="#ffffff" 
                fontSize={isPresentationMode ? 14 : 12}
                tick={{ fill: '#ffffff' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "rgba(0,0,0,0.8)", 
                  border: "none", 
                  borderRadius: "8px",
                  color: '#ffffff'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={slide.accentColor || "#10b981"} 
                strokeWidth={3}
                dot={{ fill: slide.accentColor || "#10b981", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )
      
      case "area":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
              <XAxis 
                dataKey="name" 
                stroke="#ffffff" 
                fontSize={isPresentationMode ? 14 : 12}
                tick={{ fill: '#ffffff' }}
              />
              <YAxis 
                stroke="#ffffff" 
                fontSize={isPresentationMode ? 14 : 12}
                tick={{ fill: '#ffffff' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "rgba(0,0,0,0.8)", 
                  border: "none", 
                  borderRadius: "8px",
                  color: '#ffffff'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={slide.accentColor || "#10b981"} 
                fill={slide.accentColor || "#10b981"}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        )
      
      case "pie":
      case "donut":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={type === "donut" ? 60 : 0}
                outerRadius={isPresentationMode ? 140 : 100}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "rgba(0,0,0,0.8)", 
                  border: "none", 
                  borderRadius: "8px",
                  color: '#ffffff'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        )
      
      default:
        return null
    }
  }

  // Enhanced table renderer
  const renderTable = () => {
    if (!slide.tableData || !slide.tableData.headers || !slide.tableData.rows) return null
    
    const { headers, rows } = slide.tableData

    return (
      <div className="rounded-xl overflow-hidden bg-white/10 border border-white/20 backdrop-blur-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/20">
              {headers.map((header, index) => (
                <th key={index} className="px-4 py-3 text-left font-semibold text-white">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white/5" : "bg-transparent"}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-white border-b border-white/10">
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

  // Enhanced icon renderer
  const renderIcons = () => {
    if (!slide.icons || slide.icons.length === 0) return null

    return (
      <>
        {slide.icons.map((iconData, index) => {
          // Try to get React icon first
          const IconComponent = iconMap[iconData.icon]
          
          if (IconComponent) {
            return (
              <div
                key={index}
                className={`absolute ${
                  iconData.position === "top-right" ? "top-4 right-4" : 
                  iconData.position === "top-left" ? "top-4 left-4" : 
                  iconData.position === "bottom-right" ? "bottom-4 right-4" : 
                  iconData.position === "bottom-left" ? "bottom-4 left-4" : 
                  "top-4 right-4"
                } opacity-80`}
                style={{ color: iconData.color || slide.accentColor || "#ffffff" }}
              >
                <IconComponent size={iconData.size || 24} />
              </div>
            )
          }
          
          // Fallback to emoji
          return (
            <div
              key={index}
              className={`absolute ${
                iconData.position === "top-right" ? "top-4 right-4" : 
                iconData.position === "top-left" ? "top-4 left-4" : 
                iconData.position === "bottom-right" ? "bottom-4 right-4" : 
                iconData.position === "bottom-left" ? "bottom-4 left-4" : 
                "top-4 right-4"
              } opacity-80 text-2xl`}
            >
              {iconData.icon}
            </div>
          )
        })}
      </>
    )
  }

  // Enhanced slide styles with modern gradients
  const getSlideBackground = () => {
    if (slide.background) {
      // Check if it's already a gradient
      if (slide.background.includes('gradient')) {
        return slide.background
      }
      // Create a beautiful gradient from the base color
      return `linear-gradient(135deg, ${slide.background} 0%, ${adjustBrightness(slide.background, -20)} 100%)`
    }
    return "linear-gradient(135deg, #027659 0%, #065f46 100%)"
  }

  // Helper function to adjust color brightness
  const adjustBrightness = (color: string, amount: number) => {
    const usePound = color[0] === "#"
    const col = usePound ? color.slice(1) : color
    const num = parseInt(col, 16)
    let r = (num >> 16) + amount
    let g = ((num >> 8) & 0x00ff) + amount
    let b = (num & 0x0000ff) + amount
    r = r > 255 ? 255 : r < 0 ? 0 : r
    g = g > 255 ? 255 : g < 0 ? 0 : g
    b = b > 255 ? 255 : b < 0 ? 0 : b
    return (usePound ? "#" : "") + (r << 16 | g << 8 | b).toString(16).padStart(6, '0')
  }

  const slideStyle: React.CSSProperties = {
    background: getSlideBackground(),
    color: slide.textColor || "#ffffff",
    fontFamily: slide.contentFont || "Inter, system-ui, sans-serif",
    borderRadius: slide.borderRadius || "16px",
    boxShadow: slide.shadowEffect || "0 20px 40px rgba(0,0,0,0.15)",
    position: "relative",
    overflow: "hidden",
    minHeight: isPresentationMode ? "100vh" : "400px",
    ...(slide.glassmorphism && {
      backdropFilter: "blur(10px)",
      background: `${getSlideBackground()}dd`,
    }),
  }

  const titleStyle: React.CSSProperties = {
    fontSize: slide.titleSize || (slide.layout === "title" ? "3.5rem" : "2.5rem"),
    fontFamily: slide.titleFont || "Inter, system-ui, sans-serif",
    color: slide.titleColor || slide.textColor || "#ffffff",
    fontWeight: "700",
    lineHeight: "1.2",
    marginBottom: "1.5rem",
  }

  const getSpacing = () => {
    switch (slide.spacing) {
      case "generous":
        return isPresentationMode ? "p-16" : "p-12"
      case "comfortable":
        return isPresentationMode ? "p-12" : "p-8"
      case "relaxed":
        return isPresentationMode ? "p-8" : "p-6"
      default:
        return isPresentationMode ? "p-12" : "p-8"
    }
  }

  const getAlignment = () => {
    switch (slide.alignment) {
      case "center":
        return "text-center items-center justify-center"
      case "right":
        return "text-right items-end"
      default:
        return "text-left items-start justify-start"
    }
  }

  return (
    <div
      className={`relative w-full h-full cursor-pointer transition-all duration-300 ${
        isSelected ? "ring-4 ring-blue-400 ring-opacity-60" : ""
      } ${className}`}
      style={slideStyle}
      onClick={onClick}
    >
      {/* Glassmorphism overlay */}
      {slide.glassmorphism && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      )}

      {/* Background pattern (optional) */}
      <div className="absolute inset-0 opacity-5">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {renderIcons()}

      <div className={`relative z-10 h-full flex flex-col ${getSpacing()} ${getAlignment()}`}>
        {slide.layout === "title" && (
          <div className="flex flex-col justify-center h-full">
            <h1 style={titleStyle}>{slide.title}</h1>
            {slide.content && (
              <p className="text-xl opacity-90 max-w-4xl mx-auto leading-relaxed">
                {slide.content}
              </p>
            )}
          </div>
        )}

        {slide.layout === "chart" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 flex items-center justify-center min-h-0">
              {renderChart()}
            </div>
            {slide.content && (
              <p className="mt-6 opacity-90 text-lg leading-relaxed">{slide.content}</p>
            )}
          </div>
        )}

        {slide.layout === "table" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 overflow-auto min-h-0">
              {renderTable()}
            </div>
            {slide.content && (
              <p className="mt-6 opacity-90 text-lg leading-relaxed">{slide.content}</p>
            )}
          </div>
        )}

        {slide.layout === "two-column" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                {slide.content
                  .split("\n")
                  .slice(0, Math.ceil(slide.content.split("\n").length / 2))
                  .map((line, index) => {
                    if (line.startsWith("•")) {
                      return (
                        <div key={index} className="flex items-start space-x-3">
                          <div
                            className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                            style={{ backgroundColor: slide.accentColor || "#10b981" }}
                          />
                          <span className="text-lg leading-relaxed">{line.substring(1).trim()}</span>
                        </div>
                      )
                    }
                    return line ? (
                      <p key={index} className="text-lg leading-relaxed">{line}</p>
                    ) : (
                      <div key={index} className="mb-2" />
                    )
                  })}
              </div>
              <div className="space-y-4">
                {slide.content
                  .split("\n")
                  .slice(Math.ceil(slide.content.split("\n").length / 2))
                  .map((line, index) => {
                    if (line.startsWith("•")) {
                      return (
                        <div key={index} className="flex items-start space-x-3">
                          <div
                            className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                            style={{ backgroundColor: slide.accentColor || "#10b981" }}
                          />
                          <span className="text-lg leading-relaxed">{line.substring(1).trim()}</span>
                        </div>
                      )
                    }
                    return line ? (
                      <p key={index} className="text-lg leading-relaxed">{line}</p>
                    ) : (
                      <div key={index} className="mb-2" />
                    )
                  })}
              </div>
            </div>
          </div>
        )}

        {(slide.layout === "content" || !slide.layout) && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 flex flex-col justify-center">
              <div className="space-y-6">
                {slide.content.split("\n").map((line, index) => {
                  if (line.startsWith("•")) {
                    return (
                      <div key={index} className="flex items-start space-x-4">
                        <div
                          className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                          style={{ backgroundColor: slide.accentColor || "#10b981" }}
                        />
                        <span className="text-lg leading-relaxed">{line.substring(1).trim()}</span>
                      </div>
                    )
                  }
                  return line ? (
                    <p key={index} className="text-lg leading-relaxed mb-4">
                      {line}
                    </p>
                  ) : (
                    <div key={index} className="mb-2" />
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Accent bar at bottom */}
      {slide.accentColor && (
        <div
          className="absolute bottom-0 left-0 h-1 w-full opacity-80"
          style={{ backgroundColor: slide.accentColor }}
        />
      )}
    </div>
  )
}

export default UltimateSlideRenderer
