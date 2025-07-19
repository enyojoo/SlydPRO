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
  // Icon mapping
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    "trending-up": TrendingUp,
    users: Users,
    "dollar-sign": DollarSign,
    target: Target,
    zap: Zap,
    star: Star,
    award: Award,
    globe: Globe,
  }

  // Chart renderer
  const renderChart = () => {
    if (!slide.chartData) return null
    const { type, data } = slide.chartData
    const chartColors = ["#3182ce", "#38a169", "#ed8936", "#e53e3e", "#805ad5"]

    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={isPresentationMode ? 400 : 250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="label" stroke="#ffffff" fontSize={10} />
              <YAxis stroke="#ffffff" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "none", borderRadius: "8px" }} />
              <Bar dataKey="value" fill={slide.accentColor || "#fbbf24"} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )
      case "line":
        return (
          <ResponsiveContainer width="100%" height={isPresentationMode ? 400 : 250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="label" stroke="#ffffff" fontSize={10} />
              <YAxis stroke="#ffffff" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "none", borderRadius: "8px" }} />
              <Line type="monotone" dataKey="value" stroke={slide.accentColor || "#fbbf24"} strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        )
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={isPresentationMode ? 400 : 250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={isPresentationMode ? 120 : 80}
                dataKey="value"
                label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )
      default:
        return null
    }
  }

  // Table renderer
  const renderTable = () => {
    if (!slide.tableData) return null
    const { headers, rows } = slide.tableData

    return (
      <div className="rounded-xl overflow-hidden bg-white/10 border border-white/20">
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

  // Icon renderer
  const renderIcons = () => {
    if (!slide.icons || slide.icons.length === 0) return null

    return (
      <>
        {slide.icons.map((iconData, index) => {
          const IconComponent = iconMap[iconData.icon]
          if (!IconComponent) return null

          return (
            <div
              key={index}
              className={`absolute ${iconData.position === "top-right" ? "top-4 right-4" : "top-4 left-4"} opacity-80`}
              style={{ color: iconData.color }}
            >
              <IconComponent size={iconData.size || 24} />
            </div>
          )
        })}
      </>
    )
  }

  // Main slide styles
  const slideStyle: React.CSSProperties = {
    background: slide.background,
    color: slide.textColor,
    fontFamily: slide.contentFont || "Inter, sans-serif",
    borderRadius: slide.borderRadius || "16px",
    boxShadow: slide.shadowEffect || "0 10px 25px rgba(0,0,0,0.1)",
    position: "relative",
    overflow: "hidden",
    ...(slide.glassmorphism && {
      backdropFilter: "blur(10px)",
      background: `${slide.background}dd`,
    }),
  }

  const titleStyle: React.CSSProperties = {
    fontSize: slide.titleSize || (slide.layout === "title" ? "3rem" : "2rem"),
    fontFamily: slide.titleFont || "Inter, sans-serif",
    color: slide.titleColor || slide.textColor,
    fontWeight: "700",
    lineHeight: "1.2",
    marginBottom: "1rem",
  }

  const getSpacing = () => {
    switch (slide.spacing) {
      case "generous":
        return "p-12"
      case "comfortable":
        return "p-8"
      case "relaxed":
        return "p-6"
      default:
        return "p-8"
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
      className={`relative w-full h-full cursor-pointer transition-all duration-300 ${isSelected ? "ring-4 ring-blue-400 ring-opacity-60" : ""} ${className}`}
      style={slideStyle}
      onClick={onClick}
    >
      {slide.glassmorphism && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      )}

      {renderIcons()}

      <div className={`relative z-10 h-full flex flex-col ${getSpacing()} ${getAlignment()}`}>
        {slide.layout === "title" && (
          <div className="flex flex-col justify-center h-full">
            <h1 style={titleStyle}>{slide.title}</h1>
            <p className="text-lg opacity-90 max-w-4xl mx-auto">{slide.content}</p>
          </div>
        )}

        {slide.layout === "chart" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 flex items-center justify-center">{renderChart()}</div>
            {slide.content && <p className="mt-4 opacity-90">{slide.content}</p>}
          </div>
        )}

        {slide.layout === "table" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 overflow-auto">{renderTable()}</div>
            {slide.content && <p className="mt-4 opacity-90">{slide.content}</p>}
          </div>
        )}

        {slide.layout === "infographic" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 grid grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                {slide.content
                  .split("\n")
                  .slice(0, 3)
                  .map((line, index) => {
                    if (line.startsWith("•")) {
                      return (
                        <div key={index} className="flex items-center space-x-4 p-4 rounded-lg bg-white/10">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: slide.accentColor || "#fbbf24" }}
                          />
                          <span className="text-lg">{line.substring(1).trim()}</span>
                        </div>
                      )
                    }
                    return line ? (
                      <p key={index} className="text-lg">
                        {line}
                      </p>
                    ) : null
                  })}
              </div>
              <div className="flex items-center justify-center">
                {slide.chartData ? (
                  renderChart()
                ) : (
                  <div className="w-48 h-48 rounded-full bg-white/20 flex items-center justify-center">
                    <div className="text-6xl opacity-60">📊</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {slide.layout === "two-column" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 grid grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                {slide.content
                  .split("\n")
                  .slice(0, Math.ceil(slide.content.split("\n").length / 2))
                  .map((line, index) => {
                    if (line.startsWith("•")) {
                      return (
                        <div key={index} className="flex items-start space-x-3">
                          <div
                            className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                            style={{ backgroundColor: slide.accentColor || "#fbbf24" }}
                          />
                          <span>{line.substring(1).trim()}</span>
                        </div>
                      )
                    }
                    return line ? <p key={index}>{line}</p> : <div key={index} className="mb-2" />
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
                            className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                            style={{ backgroundColor: slide.accentColor || "#fbbf24" }}
                          />
                          <span>{line.substring(1).trim()}</span>
                        </div>
                      )
                    }
                    return line ? <p key={index}>{line}</p> : <div key={index} className="mb-2" />
                  })}
              </div>
            </div>
          </div>
        )}

        {(slide.layout === "content" || !slide.layout) && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 flex flex-col justify-center">
              <div className="space-y-4">
                {slide.content.split("\n").map((line, index) => {
                  if (line.startsWith("•")) {
                    return (
                      <div key={index} className="flex items-start space-x-3">
                        <div
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                          style={{ backgroundColor: slide.accentColor || "#fbbf24" }}
                        />
                        <span>{line.substring(1).trim()}</span>
                      </div>
                    )
                  }
                  return line ? (
                    <p key={index} className="mb-4">
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
