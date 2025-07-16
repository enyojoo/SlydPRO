export function generateSlideThumbnail(slide: any): string {
  // Create a simple SVG thumbnail representation
  const svg = `
    <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${slide.background || "#027659"};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${slide.background || "#027659"};stop-opacity:0.8" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <text x="20" y="40" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${slide.textColor || "#ffffff"}" text-anchor="start">
        ${(slide.title || "Untitled Slide").substring(0, 30)}${(slide.title || "").length > 30 ? "..." : ""}
      </text>
      <text x="20" y="70" font-family="Arial, sans-serif" font-size="12" fill="${slide.textColor || "#ffffff"}" opacity="0.8" text-anchor="start">
        ${(slide.content || "").substring(0, 50)}${(slide.content || "").length > 50 ? "..." : ""}
      </text>
      ${slide.designElements?.icons?.[0] ? `<text x="280" y="40" font-size="24" text-anchor="middle">${slide.designElements.icons[0]}</text>` : ""}
      ${slide.layout === "chart" ? '<rect x="20" y="90" width="60" height="40" fill="none" stroke="' + (slide.textColor || "#ffffff") + '" stroke-width="2" opacity="0.6"/><rect x="25" y="110" width="10" height="15" fill="' + (slide.textColor || "#ffffff") + '" opacity="0.6"/><rect x="40" y="100" width="10" height="25" fill="' + (slide.textColor || "#ffffff") + '" opacity="0.6"/><rect x="55" y="105" width="10" height="20" fill="' + (slide.textColor || "#ffffff") + '" opacity="0.6"/>' : ""}
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export function generatePresentationThumbnail(slides: any[]): string {
  if (slides.length === 0) return "#027659"

  const firstSlide = slides[0]
  return generateSlideThumbnail(firstSlide)
}
