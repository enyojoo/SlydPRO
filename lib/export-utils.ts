import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import PptxGenJS from "pptxgenjs"
import type { ReactNode } from "react"

export interface ExportSlide {
  id: string
  title: string
  content: string | ReactNode
  background: string
  textColor: string
  titleColor?: string
  accentColor?: string
  layout: "title" | "content" | "two-column" | "image" | "chart" | "table" | "split"
  chartData?: {
    type: "bar" | "line" | "pie" | "area"
    data: Array<{ name: string; value: number }>
    config: { showGrid?: boolean; gradient?: boolean }
    style: string
  }
  tableData?: {
    headers: string[]
    rows: string[][]
  }
  professionalIcon?: {
    name: string
    position: string
    style: "outline" | "filled" | "material"
    color: string
    size?: number
  }
}

export interface ExportProgress {
  stage: "preparing" | "rendering" | "generating" | "finalizing" | "complete"
  progress: number
  message: string
  currentSlide?: number
  totalSlides?: number
}

export class SlideExporter {
  private onProgress?: (progress: ExportProgress) => void

  constructor(onProgress?: (progress: ExportProgress) => void) {
    this.onProgress = onProgress
  }

  private updateProgress(
    stage: ExportProgress["stage"],
    progress: number,
    message: string,
    currentSlide?: number,
    totalSlides?: number,
  ) {
    this.onProgress?.({
      stage,
      progress,
      message,
      currentSlide,
      totalSlides,
    })
  }

  async exportToPDF(slides: ExportSlide[], title = "SlydPRO Presentation"): Promise<Blob> {
    this.updateProgress("preparing", 5, "Preparing PDF export...", 0, slides.length)

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [1920, 1080],
    })

    // Add metadata
    pdf.setProperties({
      title: title,
      subject: "SlydPRO Generated Presentation",
      author: "SlydPRO",
      creator: "SlydPRO AI Presentation Generator",
    })

    this.updateProgress("rendering", 10, "Rendering slides for PDF...", 0, slides.length)

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]

      this.updateProgress(
        "rendering",
        10 + (i / slides.length) * 70,
        `Rendering slide ${i + 1}...`,
        i + 1,
        slides.length,
      )

      // Create temporary DOM element for rendering
      const slideElement = this.createSlideElement(slide)
      document.body.appendChild(slideElement)

      try {
        const canvas = await html2canvas(slideElement, {
          width: 1920,
          height: 1080,
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
        })

        if (i > 0) {
          pdf.addPage()
        }

        const imgData = canvas.toDataURL("image/png")
        pdf.addImage(imgData, "PNG", 0, 0, 1920, 1080)
      } finally {
        document.body.removeChild(slideElement)
      }
    }

    this.updateProgress("finalizing", 90, "Finalizing PDF...", slides.length, slides.length)

    const pdfBlob = pdf.output("blob")

    this.updateProgress("complete", 100, "PDF export complete!", slides.length, slides.length)

    return pdfBlob
  }

  async exportToPowerPoint(slides: ExportSlide[], title = "SlydPRO Presentation"): Promise<Blob> {
    this.updateProgress("preparing", 5, "Preparing PowerPoint export...", 0, slides.length)

    const pptx = new PptxGenJS()

    // Set presentation properties
    pptx.author = "SlydPRO"
    pptx.company = "SlydPRO AI"
    pptx.subject = "AI Generated Presentation"
    pptx.title = title

    // Set slide size to 16:9
    pptx.defineLayout({ name: "LAYOUT_16x9", width: 13.33, height: 7.5 })
    pptx.layout = "LAYOUT_16x9"

    this.updateProgress("generating", 10, "Generating PowerPoint slides...", 0, slides.length)

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]

      this.updateProgress(
        "generating",
        10 + (i / slides.length) * 80,
        `Creating slide ${i + 1}...`,
        i + 1,
        slides.length,
      )

      const pptxSlide = pptx.addSlide()

      // Add background
      if (slide.background.includes("gradient")) {
        const gradientMatch = slide.background.match(/linear-gradient$$([^)]+)$$/)
        if (gradientMatch) {
          const gradientParts = gradientMatch[1].split(",").map((s) => s.trim())
          const angle = gradientParts[0].replace("deg", "")
          const colors = gradientParts.slice(1).map((color) => {
            const colorMatch = color.match(/#[0-9a-fA-F]{6}/)
            return colorMatch ? colorMatch[0] : "#ffffff"
          })

          if (colors.length >= 2) {
            pptxSlide.background = {
              fill: {
                type: "gradient",
                angle: Number.parseInt(angle) || 45,
                colors: colors.map((color, idx) => ({
                  color: color,
                  position: idx * (100 / (colors.length - 1)),
                })),
              },
            }
          }
        }
      } else if (slide.background.startsWith("#")) {
        pptxSlide.background = { fill: slide.background }
      }

      // Add title
      if (slide.title) {
        pptxSlide.addText(slide.title, {
          x: 0.5,
          y: slide.layout === "title" ? 2.5 : 0.5,
          w: 12.33,
          h: slide.layout === "title" ? 2 : 1.5,
          fontSize: slide.layout === "title" ? 48 : 36,
          fontFace: "SF Pro Display",
          color: slide.titleColor || slide.textColor,
          bold: true,
          align: slide.layout === "title" ? "center" : "left",
          valign: "middle",
        })
      }

      // Add content
      if (typeof slide.content === "string" && slide.content.trim()) {
        const contentY = slide.layout === "title" ? 4.5 : 2.2
        const contentH = slide.layout === "title" ? 2 : 4.5

        // Handle bullet points
        const lines = slide.content.split("\n").filter((line) => line.trim())
        const bulletPoints = lines.filter((line) => line.trim().startsWith("•") || line.trim().startsWith("-"))

        if (bulletPoints.length > 0) {
          const bulletText = bulletPoints.map((point) => point.replace(/^[•-]\s*/, "").trim()).join("\n")

          pptxSlide.addText(bulletText, {
            x: 0.5,
            y: contentY,
            w: 12.33,
            h: contentH,
            fontSize: 24,
            fontFace: "SF Pro Text",
            color: slide.textColor,
            bullet: { type: "bullet", style: "•" },
            lineSpacing: 32,
            valign: "top",
          })
        } else {
          pptxSlide.addText(slide.content, {
            x: 0.5,
            y: contentY,
            w: 12.33,
            h: contentH,
            fontSize: 24,
            fontFace: "SF Pro Text",
            color: slide.textColor,
            align: slide.layout === "title" ? "center" : "left",
            valign: slide.layout === "title" ? "middle" : "top",
            lineSpacing: 32,
          })
        }
      }

      // Add charts
      if (slide.chartData) {
        const chartData = slide.chartData.data.map((item) => ({
          name: item.name,
          labels: [item.name],
          values: [item.value],
        }))

        let chartType: any = "bar"
        switch (slide.chartData.type) {
          case "line":
            chartType = "line"
            break
          case "pie":
            chartType = "pie"
            break
          case "area":
            chartType = "area"
            break
          default:
            chartType = "bar"
        }

        pptxSlide.addChart(chartType, chartData, {
          x: 1,
          y: 3,
          w: 11.33,
          h: 4,
          showTitle: false,
          showLegend: true,
          legendPos: "r",
        })
      }

      // Add tables
      if (slide.tableData) {
        const tableData = [slide.tableData.headers, ...slide.tableData.rows]

        pptxSlide.addTable(tableData, {
          x: 0.5,
          y: 2.5,
          w: 12.33,
          h: 4,
          fontSize: 18,
          fontFace: "SF Pro Text",
          color: slide.textColor,
          fill: { color: "F7F7F7" },
          border: { pt: 1, color: "CFCFCF" },
        })
      }
    }

    this.updateProgress("finalizing", 90, "Finalizing PowerPoint file...", slides.length, slides.length)

    const pptxBlob = (await pptx.write("blob")) as Blob

    this.updateProgress("complete", 100, "PowerPoint export complete!", slides.length, slides.length)

    return pptxBlob
  }

  private createSlideElement(slide: ExportSlide): HTMLElement {
    const slideElement = document.createElement("div")
    slideElement.style.width = "1920px"
    slideElement.style.height = "1080px"
    slideElement.style.background = slide.background
    slideElement.style.color = slide.textColor
    slideElement.style.padding = "80px"
    slideElement.style.boxSizing = "border-box"
    slideElement.style.fontFamily = "SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif"
    slideElement.style.position = "absolute"
    slideElement.style.top = "-10000px"
    slideElement.style.left = "-10000px"

    // Add title
    if (slide.title) {
      const titleElement = document.createElement("h1")
      titleElement.textContent = slide.title
      titleElement.style.fontSize = slide.layout === "title" ? "72px" : "54px"
      titleElement.style.fontWeight = "bold"
      titleElement.style.color = slide.titleColor || slide.textColor
      titleElement.style.marginBottom = "40px"
      titleElement.style.lineHeight = "1.2"
      titleElement.style.textAlign = slide.layout === "title" ? "center" : "left"
      slideElement.appendChild(titleElement)
    }

    // Add content
    if (typeof slide.content === "string" && slide.content.trim()) {
      const contentElement = document.createElement("div")
      contentElement.style.fontSize = "36px"
      contentElement.style.lineHeight = "1.6"
      contentElement.style.color = slide.textColor

      const lines = slide.content.split("\n").filter((line) => line.trim())
      lines.forEach((line) => {
        const lineElement = document.createElement("p")
        lineElement.style.marginBottom = "20px"

        if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
          lineElement.style.paddingLeft = "40px"
          lineElement.style.position = "relative"
          lineElement.textContent = line.replace(/^[•-]\s*/, "").trim()

          const bullet = document.createElement("span")
          bullet.textContent = "•"
          bullet.style.position = "absolute"
          bullet.style.left = "0"
          bullet.style.color = slide.accentColor || slide.textColor
          lineElement.appendChild(bullet)
        } else {
          lineElement.textContent = line.trim()
        }

        contentElement.appendChild(lineElement)
      })

      slideElement.appendChild(contentElement)
    }

    return slideElement
  }

  static async downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}
