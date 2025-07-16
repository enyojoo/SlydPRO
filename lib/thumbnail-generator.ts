export function generateSlideThumbnail(slide: any): string {
  // Create a simple SVG thumbnail representation
  const svg = `
    <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${slide.background}"/>
      <text x="20" y="40" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${slide.textColor}" text-anchor="start">
        ${slide.title.substring(0, 30)}${slide.title.length > 30 ? "..." : ""}
      </text>
      <text x="20" y="70" font-family="Arial, sans-serif" font-size="12" fill="${slide.textColor}" opacity="0.8" text-anchor="start">
        ${slide.content.substring(0, 50)}${slide.content.length > 50 ? "..." : ""}
      </text>
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export function generatePresentationThumbnail(slides: any[]): string {
  if (slides.length === 0) return ""

  const firstSlide = slides[0]
  return generateSlideThumbnail(firstSlide)
}
