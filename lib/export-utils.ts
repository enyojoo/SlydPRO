import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import PptxGenJS from "pptxgenjs"
import type { UltimateSlide } from "@/types/ultimate-slide"

export interface ExportOptions {
  format: "pdf" | "pptx"
  quality?: "low" | "medium" | "high"
  includeNotes?: boolean
  pageSize?: "A4" | "letter" | "16:9" | "4:3"
}

export class SlideExporter {
  private slides: UltimateSlide[]
  private projectName: string

  constructor(slides: UltimateSlide[], projectName: string) {
    this.slides = slides
    this.projectName = projectName
  }

  async exportToPDF(options: ExportOptions = { format: "pdf" }): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: options.pageSize === "A4" ? "a4" : [297, 210],
    })

    // Set up PDF dimensions
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10

    for (let i = 0; i < this.slides.length; i++) {
      const slide = this.slides[i]

      if (i > 0) {
        pdf.addPage()
      }

      // Create a temporary div to render the slide
      const slideElement = await this.createSlideElement(slide)
      document.body.appendChild(slideElement)

      try {
        // Convert slide to canvas
        const canvas = await html2canvas(slideElement, {
          width: 1920,
          height: 1080,
          scale: 2,
          backgroundColor: null,
          logging: false,
          useCORS: true,
        })

        // Add canvas to PDF
        const imgData = canvas.toDataURL("image/png")
        pdf.addImage(imgData, "PNG", margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)

        // Add slide number
        pdf.setFontSize(10)
        pdf.setTextColor(128, 128, 128)
        pdf.text(`${i + 1} / ${this.slides.length}`, pageWidth - 30, pageHeight - 5)
      } finally {
        document.body.removeChild(slideElement)
      }
    }

    // Add metadata
    pdf.setProperties({
      title: this.projectName,
      subject: "Presentation created with SlydPRO",
      author: "SlydPRO",
      creator: "SlydPRO AI Presentation Generator",
    })

    return new Blob([pdf.output("blob")], { type: "application/pdf" })
  }

  async exportToPPTX(options: ExportOptions = { format: "pptx" }): Promise<Blob> {
    const pptx = new PptxGenJS()

    // Set presentation properties
    pptx.author = "SlydPRO"
    pptx.company = "SlydPRO"
    pptx.subject = this.projectName
    pptx.title = this.projectName

    // Set slide size (16:9 aspect ratio)
    pptx.defineLayout({ name: "LAYOUT_16x9", width: 10, height: 5.625 })
    pptx.layout = "LAYOUT_16x9"

    for (const slide of this.slides) {
      const pptxSlide = pptx.addSlide()

      // Set slide background
      if (slide.background.includes("gradient")) {
        // Extract gradient colors for PowerPoint
        const gradientMatch = slide.background.match(/linear-gradient$$[^,]+,\s*([^,]+),\s*([^)]+)$$/)
        if (gradientMatch) {
          pptxSlide.background = {
            fill: {
              type: "gradient",
              colors: [
                { color: this.extractColor(gradientMatch[1]), position: 0 },
                { color: this.extractColor(gradientMatch[2]), position: 100 },
              ],
              angle: 45,
            },
          }
        }
      } else {
        pptxSlide.background = { fill: slide.background }
      }

      // Add title
      if (slide.title) {
        pptxSlide.addText(slide.title, {
          x: 0.5,
          y: slide.layout === "title" ? 2 : 0.5,
          w: 9,
          h: 1.5,
          fontSize: slide.layout === "title" ? 44 : 36,
          fontFace: slide.titleFont?.split(",")[0] || "Arial",
          color: slide.titleColor || slide.textColor,
          bold: true,
          align: slide.layout === "title" ? "center" : "left",
        })
      }

      // Add content
      if (slide.content && typeof slide.content === "string") {
        const contentY = slide.layout === "title" ? 3.5 : 2
        const lines = slide.content.split("\n").filter((line) => line.trim())

        let currentY = contentY
        for (const line of lines) {
          const trimmedLine = line.trim()
          const isBullet = trimmedLine.startsWith("•") || trimmedLine.startsWith("-")
          const text = isBullet ? trimmedLine.substring(1).trim() : trimmedLine

          pptxSlide.addText(text, {
            x: isBullet ? 1 : 0.5,
            y: currentY,
            w: 8.5,
            h: 0.6,
            fontSize: Number.parseInt(slide.contentSize?.replace("rem", "")) * 16 || 18,
            fontFace: slide.contentFont?.split(",")[0] || "Arial",
            color: slide.textColor,
            bullet: isBullet ? { type: "bullet" } : false,
          })

          currentY += 0.7
        }
      }

      // Add charts if present
      if (slide.chartData) {
        await this.addChartToPPTX(pptxSlide, slide.chartData, slide)
      }

      // Add tables if present
      if (slide.tableData) {
        this.addTableToPPTX(pptxSlide, slide.tableData, slide)
      }

      // Add icons if present
      if (slide.icons && slide.icons.length > 0) {
        for (const icon of slide.icons) {
          // Add icon as text (emoji) or shape
          pptxSlide.addText(icon.icon, {
            x: this.getIconXPosition(icon.position),
            y: this.getIconYPosition(icon.position),
            w: 0.5,
            h: 0.5,
            fontSize: Number.parseInt(icon.size) || 24,
            color: icon.color,
          })
        }
      }
    }

    const pptxBlob = await pptx.writeFile({ outputType: "blob" })
    return pptxBlob as Blob
  }

  private async createSlideElement(slide: UltimateSlide): Promise<HTMLElement> {
    const slideDiv = document.createElement("div")
    slideDiv.style.width = "1920px"
    slideDiv.style.height = "1080px"
    slideDiv.style.background = slide.background
    slideDiv.style.color = slide.textColor
    slideDiv.style.fontFamily = slide.titleFont || "Arial, sans-serif"
    slideDiv.style.padding = "80px"
    slideDiv.style.boxSizing = "border-box"
    slideDiv.style.display = "flex"
    slideDiv.style.flexDirection = "column"
    slideDiv.style.justifyContent = slide.layout === "title" ? "center" : "flex-start"
    slideDiv.style.position = "relative"
    slideDiv.style.overflow = "hidden"

    // Add glassmorphism effect if enabled
    if (slide.glassmorphism) {
      const glassDiv = document.createElement("div")
      glassDiv.style.position = "absolute"
      glassDiv.style.inset = "0"
      glassDiv.style.background = "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))"
      glassDiv.style.backdropFilter = "blur(10px)"
      slideDiv.appendChild(glassDiv)
    }

    // Add title
    if (slide.title) {
      const titleElement = document.createElement("h1")
      titleElement.textContent = slide.title
      titleElement.style.fontSize = slide.titleSize || (slide.layout === "title" ? "4rem" : "2.5rem")
      titleElement.style.color = slide.titleColor || slide.textColor
      titleElement.style.fontFamily = slide.titleFont || "Arial, sans-serif"
      titleElement.style.fontWeight = "bold"
      titleElement.style.margin = "0 0 2rem 0"
      titleElement.style.textAlign = slide.layout === "title" ? "center" : "left"
      titleElement.style.lineHeight = "1.2"
      titleElement.style.position = "relative"
      titleElement.style.zIndex = "10"
      slideDiv.appendChild(titleElement)
    }

    // Add content
    if (slide.content && typeof slide.content === "string") {
      const contentDiv = document.createElement("div")
      contentDiv.style.fontSize = slide.contentSize || "1.5rem"
      contentDiv.style.color = slide.textColor
      contentDiv.style.fontFamily = slide.contentFont || "Arial, sans-serif"
      contentDiv.style.lineHeight = "1.6"
      contentDiv.style.position = "relative"
      contentDiv.style.zIndex = "10"
      contentDiv.style.textAlign = slide.layout === "title" ? "center" : "left"

      const lines = slide.content.split("\n").filter((line) => line.trim())
      for (const line of lines) {
        const trimmedLine = line.trim()
        const isBullet = trimmedLine.startsWith("•") || trimmedLine.startsWith("-")

        if (isBullet) {
          const bulletDiv = document.createElement("div")
          bulletDiv.style.display = "flex"
          bulletDiv.style.alignItems = "flex-start"
          bulletDiv.style.marginBottom = "1rem"

          const bullet = document.createElement("span")
          bullet.textContent = "•"
          bullet.style.color = slide.accentColor || slide.textColor
          bullet.style.marginRight = "1rem"
          bullet.style.fontSize = "1.2em"

          const text = document.createElement("span")
          text.textContent = trimmedLine.substring(1).trim()

          bulletDiv.appendChild(bullet)
          bulletDiv.appendChild(text)
          contentDiv.appendChild(bulletDiv)
        } else {
          const p = document.createElement("p")
          p.textContent = trimmedLine
          p.style.margin = "0 0 1rem 0"
          contentDiv.appendChild(p)
        }
      }

      slideDiv.appendChild(contentDiv)
    }

    // Add icons
    if (slide.icons && slide.icons.length > 0) {
      for (const icon of slide.icons) {
        const iconDiv = document.createElement("div")
        iconDiv.textContent = icon.icon
        iconDiv.style.position = "absolute"
        iconDiv.style.fontSize = `${icon.size}px` || "24px"
        iconDiv.style.color = icon.color
        iconDiv.style.zIndex = "20"

        // Position the icon
        const { top, right, bottom, left } = this.getIconPosition(icon.position)
        if (top) iconDiv.style.top = top
        if (right) iconDiv.style.right = right
        if (bottom) iconDiv.style.bottom = bottom
        if (left) iconDiv.style.left = left

        slideDiv.appendChild(iconDiv)
      }
    }

    return slideDiv
  }

  private extractColor(colorString: string): string {
    // Extract hex color from various formats
    const hexMatch = colorString.match(/#[0-9a-fA-F]{6}/)
    if (hexMatch) return hexMatch[0]

    // Convert common color names to hex
    const colorMap: { [key: string]: string } = {
      white: "#FFFFFF",
      black: "#000000",
      red: "#FF0000",
      green: "#00FF00",
      blue: "#0000FF",
    }

    return colorMap[colorString.toLowerCase()] || "#000000"
  }

  private async addChartToPPTX(slide: any, chartData: any, slideData: UltimateSlide) {
    const chartOptions = {
      x: 1,
      y: 3,
      w: 8,
      h: 4,
      showTitle: false,
      showLegend: true,
      legendPos: "r",
    }

    switch (chartData.type) {
      case "bar":
        slide.addChart("bar", chartData.data, chartOptions)
        break
      case "line":
        slide.addChart("line", chartData.data, chartOptions)
        break
      case "pie":
        slide.addChart("pie", chartData.data, chartOptions)
        break
      case "area":
        slide.addChart("area", chartData.data, chartOptions)
        break
    }
  }

  private addTableToPPTX(slide: any, tableData: any, slideData: UltimateSlide) {
    const rows = [tableData.headers, ...tableData.rows]

    slide.addTable(rows, {
      x: 0.5,
      y: 3,
      w: 9,
      h: 3,
      fontSize: 12,
      fontFace: slideData.contentFont?.split(",")[0] || "Arial",
      color: slideData.textColor,
      fill: { color: "F7F7F7" },
      border: { pt: 1, color: "CFCFCF" },
    })
  }

  private getIconXPosition(position: string): number {
    if (position.includes("left")) return 0.5
    if (position.includes("right")) return 9
    return 4.75 // center
  }

  private getIconYPosition(position: string): number {
    if (position.includes("top")) return 0.5
    if (position.includes("bottom")) return 5
    return 2.75 // center
  }

  private getIconPosition(position: string) {
    const positions: { [key: string]: any } = {
      "top-left": { top: "40px", left: "40px" },
      "top-right": { top: "40px", right: "40px" },
      "top-center": { top: "40px", left: "50%", transform: "translateX(-50%)" },
      "bottom-left": { bottom: "40px", left: "40px" },
      "bottom-right": { bottom: "40px", right: "40px" },
      "bottom-center": { bottom: "40px", left: "50%", transform: "translateX(-50%)" },
      "center-left": { top: "50%", left: "40px", transform: "translateY(-50%)" },
      "center-right": { top: "50%", right: "40px", transform: "translateY(-50%)" },
      center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    }

    return positions[position] || positions["top-right"]
  }
}

export async function exportSlides(
  slides: UltimateSlide[],
  projectName: string,
  format: "pdf" | "pptx",
  options?: ExportOptions,
): Promise<Blob> {
  const exporter = new SlideExporter(slides, projectName)

  if (format === "pdf") {
    return await exporter.exportToPDF({ ...options, format })
  } else {
    return await exporter.exportToPPTX({ ...options, format })
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
