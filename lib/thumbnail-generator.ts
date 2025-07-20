export function generateSlideThumbnail(slide: any): string {
  // Create a canvas element to generate the thumbnail
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) return ""

  // Set canvas dimensions (16:9 aspect ratio)
  canvas.width = 320
  canvas.height = 180

  // Fill background
  ctx.fillStyle = slide.background || "#027659"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Set text properties
  ctx.fillStyle = slide.textColor || "#ffffff"
  ctx.textAlign = "left"
  ctx.textBaseline = "top"

  // Draw title
  ctx.font = "bold 16px Arial, sans-serif"
  const titleText = slide.title.substring(0, 30) + (slide.title.length > 30 ? "..." : "")
  ctx.fillText(titleText, 20, 20)

  // Draw content
  ctx.font = "12px Arial, sans-serif"
  ctx.globalAlpha = 0.8
  const contentText = slide.content.substring(0, 50) + (slide.content.length > 50 ? "..." : "")

  // Wrap text for content
  const words = contentText.split(" ")
  let line = ""
  let y = 50
  const lineHeight = 16
  const maxLines = 6
  let currentLine = 0

  for (let n = 0; n < words.length && currentLine < maxLines; n++) {
    const testLine = line + words[n] + " "
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width

    if (testWidth > 280 && n > 0) {
      ctx.fillText(line, 20, y)
      line = words[n] + " "
      y += lineHeight
      currentLine++
    } else {
      line = testLine
    }
  }

  if (currentLine < maxLines && line.trim()) {
    ctx.fillText(line, 20, y)
  }

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
  const contentText = slide.content.substring(0, 100) + (slide.content.length > 100 ? "..." : "")

  // Create a more detailed thumbnail
  const svg = `
    <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${slide.background || "#027659"};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${slide.background || "#027659"};stop-opacity:0.8" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      
      <!-- Title -->
      <text x="20" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="bold" 
            fill="${slide.textColor || "#ffffff"}" text-anchor="start">
        ${titleText.split(" ").slice(0, 4).join(" ")}
      </text>
      ${
        titleText.split(" ").length > 4
          ? `
      <text x="20" y="55" font-family="Arial, sans-serif" font-size="18" font-weight="bold" 
            fill="${slide.textColor || "#ffffff"}" text-anchor="start">
        ${titleText.split(" ").slice(4).join(" ")}
      </text>`
          : ""
      }
      
      <!-- Content preview -->
      <text x="20" y="85" font-family="Arial, sans-serif" font-size="12" 
            fill="${slide.textColor || "#ffffff"}" opacity="0.9" text-anchor="start">
        ${contentText.split(" ").slice(0, 8).join(" ")}
      </text>
      <text x="20" y="105" font-family="Arial, sans-serif" font-size="12" 
            fill="${slide.textColor || "#ffffff"}" opacity="0.9" text-anchor="start">
        ${contentText.split(" ").slice(8, 16).join(" ")}
      </text>
      <text x="20" y="125" font-family="Arial, sans-serif" font-size="12" 
            fill="${slide.textColor || "#ffffff"}" opacity="0.9" text-anchor="start">
        ${contentText.split(" ").slice(16, 24).join(" ")}
      </text>
      
      <!-- Slide indicator -->
      <circle cx="290" cy="160" r="8" fill="${slide.textColor || "#ffffff"}" opacity="0.3"/>
      <text x="290" y="165" font-family="Arial, sans-serif" font-size="10" font-weight="bold"
            fill="${slide.background || "#027659"}" text-anchor="middle">1</text>
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svg)}`
}
