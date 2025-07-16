export function generateSlideThumbnail(slide: any): string {
  // Extract design elements for better thumbnail
  const icons = slide.designElements?.icons || []
  const hasChart = slide.layout === "chart" || (slide.designElements?.charts && slide.designElements.charts.length > 0)

  // Create a more detailed SVG thumbnail representation
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
      <text x="20" y="35" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${slide.textColor || "#ffffff"}" text-anchor="start">
        ${(slide.title || "Untitled Slide").substring(0, 25)}${(slide.title || "").length > 25 ? "..." : ""}
      </text>
      
      <!-- Content preview -->
      <text x="20" y="60" font-family="Arial, sans-serif" font-size="10" fill="${slide.textColor || "#ffffff"}" opacity="0.8" text-anchor="start">
        ${(slide.content || "").substring(0, 40)}${(slide.content || "").length > 40 ? "..." : ""}
      </text>
      <text x="20" y="75" font-family="Arial, sans-serif" font-size="10" fill="${slide.textColor || "#ffffff"}" opacity="0.8" text-anchor="start">
        ${(slide.content || "").substring(40, 80)}${(slide.content || "").length > 80 ? "..." : ""}
      </text>
      
      <!-- Icon if available -->
      ${icons[0] ? `<text x="280" y="35" font-size="20" text-anchor="middle">${icons[0]}</text>` : ""}
      
      <!-- Chart indicator if it's a chart slide -->
      ${
        hasChart
          ? `
        <rect x="20" y="90" width="50" height="30" fill="none" stroke="${slide.textColor || "#ffffff"}" stroke-width="1.5" opacity="0.6" rx="3"/>
        <rect x="25" y="110" width="8" height="8" fill="${slide.textColor || "#ffffff"}" opacity="0.6"/>
        <rect x="35" y="105" width="8" height="13" fill="${slide.textColor || "#ffffff"}" opacity="0.6"/>
        <rect x="45" y="100" width="8" height="18" fill="${slide.textColor || "#ffffff"}" opacity="0.6"/>
        <rect x="55" y="107" width="8" height="11" fill="${slide.textColor || "#ffffff"}" opacity="0.6"/>
      `
          : ""
      }
      
      <!-- Layout indicator -->
      ${
        slide.layout === "two-column"
          ? `
        <line x1="160" y1="90" x2="160" y2="130" stroke="${slide.textColor || "#ffffff"}" stroke-width="1" opacity="0.4"/>
        <rect x="140" y="95" width="15" height="3" fill="${slide.textColor || "#ffffff"}" opacity="0.4"/>
        <rect x="140" y="105" width="15" height="3" fill="${slide.textColor || "#ffffff"}" opacity="0.4"/>
        <rect x="165" y="95" width="15" height="3" fill="${slide.textColor || "#ffffff"}" opacity="0.4"/>
        <rect x="165" y="105" width="15" height="3" fill="${slide.textColor || "#ffffff"}" opacity="0.4"/>
      `
          : ""
      }
      
      <!-- Additional icons for visual richness -->
      ${icons[1] ? `<text x="250" y="35" font-size="16" text-anchor="middle" opacity="0.7">${icons[1]}</text>` : ""}
      ${icons[2] ? `<text x="220" y="35" font-size="16" text-anchor="middle" opacity="0.5">${icons[2]}</text>` : ""}
      
      <!-- Slide type indicator -->
      <circle cx="300" cy="160" r="3" fill="${slide.textColor || "#ffffff"}" opacity="0.3"/>
      <text x="300" y="165" font-family="Arial, sans-serif" font-size="8" fill="${slide.textColor || "#ffffff"}" opacity="0.5" text-anchor="middle">
        ${slide.layout === "title" ? "T" : slide.layout === "chart" ? "C" : slide.layout === "two-column" ? "2" : "S"}
      </text>
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export function generatePresentationThumbnail(slides: any[]): string {
  if (slides.length === 0) return "#027659"

  const firstSlide = slides[0]
  return generateSlideThumbnail(firstSlide)
}
