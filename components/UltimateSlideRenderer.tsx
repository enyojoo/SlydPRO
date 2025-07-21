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
    users: Users,
    "dollar-sign": DollarSign,
    target: Target,
    zap: Zap,
    star: Star,
    award: Award,
    globe: Globe,
  }

  // Enhanced chart colors based on theme
  const getChartColors = (theme: string) => {
    const colorSets = {
      business: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"],
      creative: ["#a855f7", "#ec4899", "#f97316", "#84cc16", "#06b6d4", "#f59e0b"],
      minimal: ["#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f472b6", "#fb7185"],
      vibrant: ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#10b981"],
      nature: ["#10b981", "#059669", "#047857", "#065f46", "#064e3b", "#022c22"],
      ocean: ["#06b6d4", "#0891b2", "#0e7490", "#155e75", "#164e63", "#0c4a6e"],
      sunset: ["#f97316", "#ea580c", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d"],
    }
    return colorSets[theme as keyof typeof colorSets] || colorSets.business
  }

  const chartColors = getChartColors(slide.designTheme || "business")

  // Chart renderer with better styling and proper sizing
  const renderChart = () => {
    if (!slide.chartData || !slide.chartData.data || slide.chartData.data.length === 0) return null

    const { type, data, config = {} } = slide.chartData
    const height = isPresentationMode ? 350 : 280 // Reduced height to prevent overflow

    // Ensure data has proper structure
    const chartData = data.map((item, index) => ({
      name: item.name || item.label || item.month || item.metric || item.region || `Item ${index + 1}`,
      value:
        typeof item.value === "number"
          ? item.value
          : typeof item.sales === "number"
            ? item.sales
            : typeof item.score === "number"
              ? item.score
              : typeof item.revenue === "number"
                ? item.revenue
                : 0,
      ...item,
    }))

    const commonProps = {
      margin: { top: 10, right: 20, left: 10, bottom: 10 }, // Reduced margins
    }

    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
              <XAxis
                dataKey="name"
                stroke="#ffffff"
                fontSize={isPresentationMode ? 12 : 10}
                tick={{ fill: "#ffffff" }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#ffffff" fontSize={isPresentationMode ? 12 : 10} tick={{ fill: "#ffffff" }} width={40} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="value" fill={slide.accentColor || chartColors[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )

      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
              <XAxis
                dataKey="name"
                stroke="#ffffff"
                fontSize={isPresentationMode ? 12 : 10}
                tick={{ fill: "#ffffff" }}
              />
              <YAxis stroke="#ffffff" fontSize={isPresentationMode ? 12 : 10} tick={{ fill: "#ffffff" }} width={40} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={slide.accentColor || chartColors[0]}
                strokeWidth={3}
                dot={{ fill: slide.accentColor || chartColors[0], strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case "area":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
              <XAxis
                dataKey="name"
                stroke="#ffffff"
                fontSize={isPresentationMode ? 12 : 10}
                tick={{ fill: "#ffffff" }}
              />
              <YAxis stroke="#ffffff" fontSize={isPresentationMode ? 12 : 10} tick={{ fill: "#ffffff" }} width={40} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={slide.accentColor || chartColors[0]}
                fill={slide.accentColor || chartColors[0]}
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
                innerRadius={type === "donut" ? 50 : 0}
                outerRadius={isPresentationMode ? 120 : 90}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                fontSize={10}
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
                  color: "#ffffff",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  // Enhanced table renderer with proper sizing
  const renderTable = () => {
    if (!slide.tableData || !slide.tableData.headers || !slide.tableData.rows) return null

    const { headers, rows } = slide.tableData

    return (
      <div className="rounded-xl overflow-hidden bg-white/10 border border-white/20 backdrop-blur-sm mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            {" "}
            {/* Reduced font size */}
            <thead>
              <tr className="bg-white/20">
                {headers.map((header, index) => (
                  <th key={index} className="px-3 py-2 text-left font-semibold text-white text-xs">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white/5" : "bg-transparent"}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 text-white border-b border-white/10 text-xs">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                  iconData.position === "top-right"
                    ? "top-4 right-4"
                    : iconData.position === "top-left"
                      ? "top-4 left-4"
                      : iconData.position === "bottom-right"
                        ? "bottom-4 right-4"
                        : iconData.position === "bottom-left"
                          ? "bottom-4 left-4"
                          : "top-4 right-4"
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
                iconData.position === "top-right"
                  ? "top-4 right-4"
                  : iconData.position === "top-left"
                    ? "top-4 left-4"
                    : iconData.position === "bottom-right"
                      ? "bottom-4 right-4"
                      : iconData.position === "bottom-left"
                        ? "bottom-4 left-4"
                        : "top-4 right-4"
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
      if (slide.background.includes("gradient")) {
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
    const num = Number.parseInt(col, 16)
    let r = (num >> 16) + amount
    let g = ((num >> 8) & 0x00ff) + amount
    let b = (num & 0x0000ff) + amount
    r = r > 255 ? 255 : r < 0 ? 0 : r
    g = g > 255 ? 255 : g < 0 ? 0 : g
    b = b > 255 ? 255 : b < 0 ? 0 : b
    return (usePound ? "#" : "") + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")
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
    fontSize:
      slide.titleSize || (slide.layout === "title" ? "clamp(1.75rem, 3.5vw, 3rem)" : "clamp(1.25rem, 2.2vw, 2rem)"),
    fontFamily: slide.titleFont || "Inter, system-ui, sans-serif",
    color: slide.titleColor || slide.textColor || "#ffffff",
    fontWeight: "700",
    lineHeight: "1.2",
    marginBottom: "1rem", // Reduced margin
    wordWrap: "break-word",
    hyphens: "auto",
  }

  const contentStyle: React.CSSProperties = {
    fontSize: slide.contentSize || "clamp(0.875rem, 1.1vw, 1rem)",
    fontFamily: slide.contentFont || "Inter, system-ui, sans-serif",
    color: slide.textColor || "#ffffff",
    lineHeight: "1.6",
    wordWrap: "break-word",
    hyphens: "auto",
  }

  const getSpacing = () => {
    switch (slide.spacing) {
      case "generous":
        return isPresentationMode ? "p-12" : "p-8" // Reduced padding
      case "comfortable":
        return isPresentationMode ? "p-8" : "p-6"
      case "compact":
        return isPresentationMode ? "p-6" : "p-4"
      default:
        return isPresentationMode ? "p-8" : "p-6"
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

  // Enhanced content renderer with proper text wrapping
  const renderContent = () => {
    if (typeof slide.content === "string") {
      const lines = slide.content.split("\n").filter((line) => line.trim())

      return (
        <div className="space-y-3">
          {" "}
          {/* Reduced spacing */}
          {lines.map((line, index) => {
            const trimmedLine = line.trim()

            if (trimmedLine.startsWith("•") || trimmedLine.startsWith("-")) {
              const content = trimmedLine.substring(1).trim()
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div
                    className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: slide.accentColor }}
                  />
                  <p style={contentStyle} className="flex-1">
                    {content}
                  </p>
                </div>
              )
            }

            return (
              <p key={index} style={contentStyle} className="mb-2">
                {trimmedLine}
              </p>
            )
          })}
        </div>
      )
    }

    return <div style={contentStyle}>{slide.content}</div>
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
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
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
            {slide.content && <div className="opacity-90 max-w-4xl mx-auto">{renderContent()}</div>}
          </div>
        )}

        {slide.layout === "chart" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">{renderChart()}</div>
            {slide.content && <div className="mt-4 opacity-90">{renderContent()}</div>}
          </div>
        )}

        {slide.layout === "table" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 overflow-auto min-h-0">{renderTable()}</div>
            {slide.content && <div className="mt-4 opacity-90">{renderContent()}</div>}
          </div>
        )}

        {slide.layout === "two-column" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                {typeof slide.content === "string" &&
                  slide.content
                    .split("\n")
                    .slice(0, Math.ceil(slide.content.split("\n").length / 2))
                    .map((line, index) => {
                      if (line.startsWith("•")) {
                        return (
                          <div key={index} className="flex items-start space-x-3">
                            <div
                              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                              style={{ backgroundColor: slide.accentColor || "#10b981" }}
                            />
                            <span style={contentStyle}>{line.substring(1).trim()}</span>
                          </div>
                        )
                      }
                      return line ? (
                        <p key={index} style={contentStyle}>
                          {line}
                        </p>
                      ) : (
                        <div key={index} className="mb-1" />
                      )
                    })}
              </div>
              <div className="space-y-3">
                {typeof slide.content === "string" &&
                  slide.content
                    .split("\n")
                    .slice(Math.ceil(slide.content.split("\n").length / 2))
                    .map((line, index) => {
                      if (line.startsWith("•")) {
                        return (
                          <div key={index} className="flex items-start space-x-3">
                            <div
                              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                              style={{ backgroundColor: slide.accentColor || "#10b981" }}
                            />
                            <span style={contentStyle}>{line.substring(1).trim()}</span>
                          </div>
                        )
                      }
                      return line ? (
                        <p key={index} style={contentStyle}>
                          {line}
                        </p>
                      ) : (
                        <div key={index} className="mb-1" />
                      )
                    })}
              </div>
            </div>
          </div>
        )}

        {(slide.layout === "content" || !slide.layout) && (
          <div className="h-full flex flex-col justify-center">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 flex flex-col justify-center">{renderContent()}</div>
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
