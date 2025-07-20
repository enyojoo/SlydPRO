export function generateSlideThumbnail(slide: any): string {
  // Create a canvas element to generate the thumbnail
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) return ""

  // Set canvas dimensions (16:9 aspect ratio)
  canvas.width = 320
  canvas.height = 180

  // Fill background with solid color (no gradients for thumbnails)
  const bgColor = slide.background || "#027659"
  ctx.fillStyle = bgColor.includes("gradient") ? "#027659" : bgColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Set text properties
  ctx.fillStyle = slide.textColor || "#ffffff"
  ctx.textAlign = "left"
  ctx.textBaseline = "top"

  // Draw title (static text only)
  ctx.font = "bold 14px Arial, sans-serif"
  const titleText = slide.title.substring(0, 35) + (slide.title.length > 35 ? "..." : "")
  ctx.fillText(titleText, 15, 15)

  // Draw content preview (static text only)
  ctx.font = "11px Arial, sans-serif"
  ctx.globalAlpha = 0.8
  const contentText = slide.content
    ? slide.content.toString().substring(0, 80) + (slide.content.toString().length > 80 ? "..." : "")
    : ""

  // Simple text wrapping for content
  const words = contentText.split(" ")
  let line = ""
  let y = 40
  const lineHeight = 14
  const maxLines = 4
  let currentLine = 0

  for (let n = 0; n < words.length && currentLine < maxLines; n++) {
    const testLine = line + words[n] + " "
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width

    if (testWidth > 290 && n > 0) {
      ctx.fillText(line, 15, y)
      line = words[n] + " "
      y += lineHeight
      currentLine++
    } else {
      line = testLine
    }
  }

  if (currentLine < maxLines && line.trim()) {
    ctx.fillText(line, 15, y)
  }

  // Add simple chart representation for chart slides (static rectangles)
  if (slide.layout === "chart" && slide.chartData) {
    ctx.globalAlpha = 0.6
    ctx.fillStyle = slide.accentColor || "#10b981"
    // Draw simple bars to represent chart
    const barWidth = 20
    const barSpacing = 25
    const startX = 15
    const baseY = 160

    for (let i = 0; i < Math.min(4, slide.chartData.data?.length || 3); i++) {
      const barHeight = 20 + i * 10
      ctx.fillRect(startX + i * barSpacing, baseY - barHeight, barWidth, barHeight)
    }
  }

  // Add layout indicator
  ctx.globalAlpha = 0.4
  ctx.fillStyle = "#ffffff"
  ctx.font = "8px Arial, sans-serif"
  ctx.fillText(slide.layout || "content", 280, 165)

  // Convert to data URL
  return canvas.toDataURL("image/png", 0.8)
}

export function generatePresentationThumbnail(slides: any[]): string {
  if (slides.length === 0) return ""

  const firstSlide = slides[0]
  return generateSlideThumbnail(firstSlide)
}

// Server-side thumbnail generation using SVG (for API routes)
export function generateSVGThumbnail(slide: any): string {
  const titleText = slide.title.substring(0, 40) + (slide.title.length > 40 ? "..." : "")
  const contentText = slide.content
    ? slide.content.toString().substring(0, 100) + (slide.content.toString().length > 100 ? "..." : "")
    : ""
  const bgColor = slide.background && !slide.background.includes("gradient") ? slide.background : "#027659"

  // Create a static thumbnail SVG
  const svg = `
    <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      
      <!-- Title (static text) -->
      <text x="20" y="30" font-family="Arial, sans-serif" font-size="16" font-weight="bold" 
            fill="${slide.textColor || "#ffffff"}" text-anchor="start">
        ${titleText.split(" ").slice(0, 4).join(" ")}
      </text>
      ${
        titleText.split(" ").length > 4
          ? `
      <text x="20" y="50" font-family="Arial, sans-serif" font-size="16" font-weight="bold" 
            fill="${slide.textColor || "#ffffff"}" text-anchor="start">
        ${titleText.split(" ").slice(4).join(" ")}
      </text>`
          : ""
      }
      
      <!-- Content preview (static text) -->
      <text x="20" y="75" font-family="Arial, sans-serif" font-size="11" 
            fill="${slide.textColor || "#ffffff"}" opacity="0.8" text-anchor="start">
        ${contentText.split(" ").slice(0, 8).join(" ")}
      </text>
      <text x="20" y="90" font-family="Arial, sans-serif" font-size="11" 
            fill="${slide.textColor || "#ffffff"}" opacity="0.8" text-anchor="start">
        ${contentText.split(" ").slice(8, 16).join(" ")}
      </text>
      
      <!-- Simple chart representation for chart slides -->
      ${
        slide.layout === "chart"
          ? `
      <rect x="20" y="120" width="15" height="30" fill="${slide.accentColor || "#10b981"}" opacity="0.6"/>
      <rect x="40" y="110" width="15" height="40" fill="${slide.accentColor || "#10b981"}" opacity="0.6"/>
      <rect x="60" y="125" width="15" height="25" fill="${slide.accentColor || "#10b981"}" opacity="0.6"/>
      <rect x="80" y="105" width="15" height="45" fill="${slide.accentColor || "#10b981"}" opacity="0.6"/>
      `
          : ""
      }
      
      <!-- Layout indicator -->
      <text x="280" y="170" font-family="Arial, sans-serif" font-size="8" 
            fill="${slide.textColor || "#ffffff"}" opacity="0.4" text-anchor="start">
        ${slide.layout || "content"}
      </text>
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svg)}`
}
