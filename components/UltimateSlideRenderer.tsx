"use client"

import type React from "react"
import { IconRenderer } from "./IconRenderer"
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
} from "recharts"

interface UltimateSlide {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  layout: "title" | "content" | "two-column" | "image" | "chart" | "table"
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
  professionalIcon?: {
    name: string
    position: string
    style: "outline" | "filled" | "material"
    color: string
  }
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
  icons?: any[]
  animations?: {
    entrance: string
    emphasis: any[]
  }
  customCSS?: string
}

interface UltimateSlideRendererProps {
  slide: UltimateSlide
}

const UltimateSlideRenderer: React.FC<UltimateSlideRendererProps> = ({ slide }) => {
  // DEBUG: Log slide properties
  console.log("🖼️ Rendering slide with:", {
    background: slide.background,
    textColor: slide.textColor,
    title: slide.title,
  })

  const renderProfessionalIcon = () => {
    if (!slide.professionalIcon) return null

    return (
      <div className={`absolute ${getIconPosition(slide.professionalIcon.position)} z-10`}>
        <div
          className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20"
          style={{ color: slide.professionalIcon.color }}
        >
          <IconRenderer
            name={slide.professionalIcon.name}
            size={24}
            style={slide.professionalIcon.style || "outline"}
            className="drop-shadow-sm"
          />
        </div>
      </div>
    )
  }

  const getIconPosition = (position: string) => {
    switch (position) {
      case "top-left":
        return "top-6 left-6"
      case "top-right":
        return "top-6 right-6"
      case "bottom-left":
        return "bottom-6 left-6"
      case "bottom-right":
        return "bottom-6 right-6"
      case "center":
        return "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
      default:
        return "top-6 right-6"
    }
  }

  const renderChart = () => {
    if (!slide.chartData) return null

    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

    switch (slide.chartData.type) {
      case "bar":
        return (
          <div className="w-full h-64 mt-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slide.chartData.data}>
                {slide.chartData.config.showGrid && (
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                )}
                <XAxis dataKey="name" stroke={slide.textColor} />
                <YAxis stroke={slide.textColor} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                  }}
                />
                <Bar dataKey="value" fill={slide.accentColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )

      case "pie":
        return (
          <div className="w-full h-64 mt-8">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slide.chartData.data}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {slide.chartData.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )

      case "line":
        return (
          <div className="w-full h-64 mt-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={slide.chartData.data}>
                {slide.chartData.config.showGrid && (
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                )}
                <XAxis dataKey="name" stroke={slide.textColor} />
                <YAxis stroke={slide.textColor} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={slide.accentColor}
                  strokeWidth={3}
                  dot={{ fill: slide.accentColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )

      case "area":
        return (
          <div className="w-full h-64 mt-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={slide.chartData.data}>
                {slide.chartData.config.showGrid && (
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                )}
                <XAxis dataKey="name" stroke={slide.textColor} />
                <YAxis stroke={slide.textColor} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={slide.accentColor}
                  fill={slide.accentColor}
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )

      default:
        return null
    }
  }

  const renderTable = () => {
    if (!slide.tableData) return null

    return (
      <div className="w-full mt-8">
        <div className="overflow-hidden rounded-lg border border-white/20 backdrop-blur-sm bg-white/5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/20 bg-white/10">
                {slide.tableData.headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-6 py-3 text-left font-semibold"
                    style={{ color: slide.titleColor || slide.textColor }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slide.tableData.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4" style={{ color: slide.textColor }}>
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

  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{
        background: slide.background || "linear-gradient(135deg, #027659 0%, #065f46 100%)", // Force fallback
        color: slide.textColor || "#ffffff", // Force fallback
        fontFamily: slide.titleFont || "Inter, sans-serif",
        borderRadius: slide.borderRadius || "20px",
        boxShadow: slide.shadowEffect || "0 15px 35px rgba(0,0,0,0.1)",
      }}
    >
      {slide.glassmorphism && <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />}

      {renderProfessionalIcon()}

      <div className="p-12 h-full flex flex-col justify-center relative z-10">
        {slide.layout === "title" ? (
          <div className="text-center">
            <h1
              className="font-bold mb-8 leading-tight"
              style={{
                fontSize: slide.titleSize || "3.5rem",
                color: slide.titleColor || slide.textColor || "#ffffff",
                fontFamily: slide.titleFont || "Inter, sans-serif",
              }}
            >
              {slide.title}
            </h1>
            <p
              className="opacity-90 leading-relaxed"
              style={{
                fontSize: slide.contentSize || "1.5rem",
                color: slide.textColor || "#ffffff",
                fontFamily: slide.contentFont || "Inter, sans-serif",
              }}
            >
              {slide.content}
            </p>
          </div>
        ) : slide.layout === "chart" ? (
          <div>
            <h1
              className="font-bold mb-8 leading-tight"
              style={{
                fontSize: slide.titleSize || "2.5rem",
                color: slide.titleColor || slide.textColor || "#ffffff",
                fontFamily: slide.titleFont || "Inter, sans-serif",
              }}
            >
              {slide.title}
            </h1>
            <p
              className="leading-relaxed opacity-90 mb-4"
              style={{
                fontSize: slide.contentSize || "1.125rem",
                color: slide.textColor || "#ffffff",
                fontFamily: slide.contentFont || "Inter, sans-serif",
              }}
            >
              {slide.content}
            </p>
            {renderChart()}
          </div>
        ) : slide.layout === "table" ? (
          <div>
            <h1
              className="font-bold mb-8 leading-tight"
              style={{
                fontSize: slide.titleSize || "2.5rem",
                color: slide.titleColor || slide.textColor || "#ffffff",
                fontFamily: slide.titleFont || "Inter, sans-serif",
              }}
            >
              {slide.title}
            </h1>
            <p
              className="leading-relaxed opacity-90 mb-4"
              style={{
                fontSize: slide.contentSize || "1.125rem",
                color: slide.textColor || "#ffffff",
                fontFamily: slide.contentFont || "Inter, sans-serif",
              }}
            >
              {slide.content}
            </p>
            {renderTable()}
          </div>
        ) : (
          <div>
            <h1
              className="font-bold mb-8 leading-tight"
              style={{
                fontSize: slide.titleSize || "2.5rem",
                color: slide.titleColor || slide.textColor || "#ffffff",
                fontFamily: slide.titleFont || "Inter, sans-serif",
              }}
            >
              {slide.title}
            </h1>
            <div
              className="leading-relaxed opacity-90 whitespace-pre-line"
              style={{
                fontSize: slide.contentSize || "1.125rem",
                color: slide.textColor || "#ffffff",
                fontFamily: slide.contentFont || "Inter, sans-serif",
              }}
              dangerouslySetInnerHTML={{
                __html: slide.content.replace(/\n/g, "<br />").replace(/•/g, "•"),
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default UltimateSlideRenderer
