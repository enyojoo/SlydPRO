"use client"

import type React from "react"
import type { UltimateSlide } from "@/types/ultimate-slide"

interface StaticSlideThumbnailProps {
  slide: UltimateSlide
  className?: string
}

export const StaticSlideThumbnail: React.FC<StaticSlideThumbnailProps> = ({ slide, className = "" }) => {
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

  // Get slide background
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

  const slideStyle: React.CSSProperties = {
    background: getSlideBackground(),
    color: slide.textColor || "#ffffff",
    fontFamily: slide.contentFont || "Inter, system-ui, sans-serif",
    borderRadius: "8px",
    position: "relative",
    overflow: "hidden",
    width: "100%",
    height: "100%",
  }

  const titleStyle: React.CSSProperties = {
    fontSize: "14px",
    fontFamily: slide.titleFont || "Inter, system-ui, sans-serif",
    color: slide.titleColor || slide.textColor || "#ffffff",
    fontWeight: "700",
    lineHeight: "1.2",
    marginBottom: "8px",
  }

  return (
    <div className={`${className}`} style={slideStyle}>
      {/* Glassmorphism overlay */}
      {slide.glassmorphism && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      )}

      {/* Background pattern (optional) */}
      <div className="absolute inset-0 opacity-5">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id={`grid-${slide.id}`} width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${slide.id})`} />
        </svg>
      </div>

      {/* Icons - Static display only */}
      {slide.icons &&
        slide.icons.map((iconData, index) => (
          <div
            key={index}
            className={`absolute ${
              iconData.position === "top-right"
                ? "top-2 right-2"
                : iconData.position === "top-left"
                  ? "top-2 left-2"
                  : iconData.position === "bottom-right"
                    ? "bottom-2 right-2"
                    : iconData.position === "bottom-left"
                      ? "bottom-2 left-2"
                      : "top-2 right-2"
            } opacity-80 text-sm`}
          >
            {iconData.icon}
          </div>
        ))}

      <div className="relative z-10 h-full flex flex-col p-3">
        {slide.layout === "title" && (
          <div className="flex flex-col justify-center h-full text-center">
            <h1 style={titleStyle}>{slide.title}</h1>
            {slide.content && (
              <p className="text-xs opacity-90 leading-relaxed">
                {(slide.content || "").toString().substring(0, 60)}...
              </p>
            )}
          </div>
        )}

        {slide.layout === "chart" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 flex items-center justify-center min-h-0">
              {/* Static chart representation */}
              <div className="w-full h-16 bg-white/10 rounded flex items-end justify-center space-x-1 p-2">
                <div className="w-2 h-8 bg-white/60 rounded-sm"></div>
                <div className="w-2 h-12 bg-white/80 rounded-sm"></div>
                <div className="w-2 h-6 bg-white/60 rounded-sm"></div>
                <div className="w-2 h-10 bg-white/70 rounded-sm"></div>
              </div>
            </div>
          </div>
        )}

        {slide.layout === "table" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 overflow-hidden">
              {/* Static table representation */}
              <div className="bg-white/10 rounded p-2 space-y-1">
                <div className="flex space-x-1">
                  <div className="flex-1 h-2 bg-white/60 rounded-sm"></div>
                  <div className="flex-1 h-2 bg-white/60 rounded-sm"></div>
                </div>
                <div className="flex space-x-1">
                  <div className="flex-1 h-1 bg-white/40 rounded-sm"></div>
                  <div className="flex-1 h-1 bg-white/40 rounded-sm"></div>
                </div>
                <div className="flex space-x-1">
                  <div className="flex-1 h-1 bg-white/40 rounded-sm"></div>
                  <div className="flex-1 h-1 bg-white/40 rounded-sm"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {slide.layout === "two-column" && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 grid grid-cols-2 gap-2 items-start">
              <div className="space-y-1">
                <div className="h-1 bg-white/60 rounded-sm w-full"></div>
                <div className="h-1 bg-white/40 rounded-sm w-3/4"></div>
                <div className="h-1 bg-white/40 rounded-sm w-1/2"></div>
              </div>
              <div className="space-y-1">
                <div className="h-1 bg-white/60 rounded-sm w-full"></div>
                <div className="h-1 bg-white/40 rounded-sm w-2/3"></div>
                <div className="h-1 bg-white/40 rounded-sm w-3/4"></div>
              </div>
            </div>
          </div>
        )}

        {(slide.layout === "content" || !slide.layout) && (
          <div className="h-full flex flex-col">
            <h2 style={titleStyle}>{slide.title}</h2>
            <div className="flex-1 flex flex-col justify-start">
              <div className="space-y-2">
                {(slide.content || "")
                  .toString()
                  .split("\n")
                  .slice(0, 3)
                  .map((line, index) => {
                    if (line.startsWith("•")) {
                      return (
                        <div key={index} className="flex items-start space-x-2">
                          <div
                            className="w-1 h-1 rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor: slide.accentColor || "#10b981" }}
                          />
                          <span className="text-xs leading-relaxed opacity-90">
                            {line.substring(1).trim().substring(0, 30)}...
                          </span>
                        </div>
                      )
                    }
                    return line ? (
                      <p key={index} className="text-xs leading-relaxed opacity-90">
                        {line.substring(0, 40)}...
                      </p>
                    ) : null
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Accent bar at bottom */}
      {slide.accentColor && (
        <div
          className="absolute bottom-0 left-0 h-0.5 w-full opacity-80"
          style={{ backgroundColor: slide.accentColor }}
        />
      )}
    </div>
  )
}

export default StaticSlideThumbnail
