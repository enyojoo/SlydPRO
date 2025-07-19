"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
import type { UltimateSlide } from "@/lib/types"

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
  const [isAnimated, setIsAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [slide.id])

  // Chart Renderer
  const renderChart = () => {
    if (!slide.chartData) return null

    const { type, data, config } = slide.chartData
    const chartColors = ["#3182ce", "#38a169", "#ed8936", "#e53e3e", "#805ad5", "#d69e2e"]

    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={isPresentationMode ? 400 : 300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="label" stroke="#ffffff" fontSize={12} />
              <YAxis stroke="#ffffff" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#ffffff",
                }}
              />
              <Bar dataKey="value" fill={slide.accentColor || "#fbbf24"} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )

      case "line":
        return (
          <ResponsiveContainer width="100%" height={isPresentationMode ? 400 : 300}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="label" stroke="#ffffff" fontSize={12} />
              <YAxis stroke="#ffffff" fontSize={12} />
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
                stroke={slide.accentColor || "#fbbf24"}
                strokeWidth={3}
                dot={{ fill: slide.accentColor || "#fbbf24", strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={isPresentationMode ? 400 : 300}>
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
        return <div className="text-center text-white">Chart type not supported</div>
    }
  }

  // Table Renderer
  const renderTable = () => {
    if (!slide.tableData) return null

    const { headers, rows, style } = slide.tableData

    return (
      <div className="rounded-xl overflow-hidden backdrop-blur-sm bg-white/10 border border-white/20">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-white/20 to-white/10">
              {headers.map((header, index) => (
                <th key={index} className="px-6 py-4 text-left font-semibold text-white border-b border-white/20">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? "bg-white/5" : "bg-transparent"}`}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4 text-white border-b border-white/10">
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

  // Icon Renderer
  const renderIcons = () => {
    if (!slide.icons || slide.icons.length === 0) return null

    return (
      <>
        {slide.icons.map((iconData, index) => {
          const positionClasses = {
            "top-left": "top-4 left-4",
            "top-right": "top-4 right-4",
            "bottom-left": "bottom-4 left-4",
            "bottom-right": "bottom-4 right-4",
            center: "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
          }

          return (
            <div
              key={index}
              className={`absolute ${positionClasses[iconData.position as keyof typeof positionClasses] || positionClasses["top-right"]} opacity-80`}
              style={{
                color: iconData.color,
                fontSize: iconData.size,
              }}
            >
              {iconData.icon}
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
    fontFamily: slide.contentFont,
    borderRadius: slide.borderRadius,
    boxShadow: slide.shadowEffect,
    position: "relative",
    overflow: "hidden",
    ...(slide.glassmorphism && {
      backdropFilter: "blur(10px)",
      background: `${slide.background}dd`,
    }),
  }

  const titleStyle: React.CSSProperties = {
    fontSize: slide.titleSize,
    fontFamily: slide.titleFont,
    color: slide.titleColor || slide.textColor,
    fontWeight: "700",
    lineHeight: "1.2",
    marginBottom: slide.layout === "title" ? "1rem" : "1.5rem",
  }

  const contentStyle: React.CSSProperties = {
    fontSize: slide.contentSize,
    lineHeight: "1.6",
    fontFamily: slide.contentFont,
  }

  const getSpacingClass = () => {
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

  const getAlignmentClass = () => {
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
      className={`
        relative w-full h-full cursor-pointer transition-all duration-500
        ${isSelected ? "ring-4 ring-blue-400 ring-opacity-60" : ""}
        ${className}
      `}
      style={slideStyle}
      onClick={onClick}
    >
      {/* Background effects */}
      {slide.glassmorphism && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      )}

      {/* Icons overlay */}
      {renderIcons()}

      {/* Main content container */}
      <div
        className={`
        relative z-10 h-full flex flex-col
        ${getSpacingClass()}
        ${getAlignmentClass()}
      `}
      >
        {/* Layout-specific rendering */}
        {slide.layout === "title" && (
          <div className="flex flex-col justify-center h-full">
            <h1 style={titleStyle} className="mb-6">
              {slide.title}
            </h1>
            <p style={contentStyle} className="opacity-90 max-w-4xl mx-auto">
              {slide.content}
            </p>
          </div>
        )}

        {slide.layout === "chart" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle} className="mb-6">
              {slide.title}
            </h2>
            <div className="flex-1 flex items-center justify-center">{renderChart()}</div>
            {slide.content && (
              <p style={contentStyle} className="mt-4 opacity-90">
                {slide.content}
              </p>
            )}
          </div>
        )}

        {slide.layout === "table" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle} className="mb-6">
              {slide.title}
            </h2>
            <div className="flex-1">{renderTable()}</div>
            {slide.content && (
              <p style={contentStyle} className="mt-4 opacity-90">
                {slide.content}
              </p>
            )}
          </div>
        )}

        {(slide.layout === "content" || !slide.layout) && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 flex flex-col justify-center">
              <div style={contentStyle} className="space-y-4">
                {slide.content.split("\n").map((line, index) => {
                  if (line.startsWith("•")) {
                    return (
                      <div key={index} className="flex items-start space-x-4">
                        <div
                          className="inline-block w-3 h-3 rounded-full mt-2 flex-shrink-0 shadow-lg"
                          style={{ backgroundColor: slide.accentColor }}
                        />
                        <span className="flex-1">{line.substring(1).trim()}</span>
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

      {/* Accent border */}
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
