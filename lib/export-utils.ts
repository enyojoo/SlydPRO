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
}

export interface ExportProgress {
  stage: "preparing" | "rendering" | "generating" | "finalizing" | "complete"
  progress: number
  currentSlide?: number
  totalSlides?: number
  message: string
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
      currentSlide,
      totalSlides,
      message,
    })
  }

  async exportToPDF(slides: ExportSlide[], title = "SlydPRO Presentation"): Promise<Blob> {
    this.updateProgress("preparing", 10, "Preparing PDF export...", 0, slides.length)

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

    this.updateProgress("rendering", 20, "Rendering slides...", 0, slides.length)

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]

      this.updateProgress(
        "rendering",
        20 + (i / slides.length) * 60,
        `Rendering slide ${i + 1}...`,
        i + 1,
        slides.length,
      )

      // Create temporary DOM element for rendering
      const slideElement = this.createSlideElement(slide)
      document.body.appendChild(slideElement)

      try {
        // Render slide to canvas
        const canvas = await html2canvas(slideElement, {
          width: 1920,
          height: 1080,
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
        })

        // Add page if not first slide
        if (i > 0) {
          pdf.addPage()
        }

        // Add canvas to PDF
        const imgData = canvas.toDataURL("image/png")
        pdf.addImage(imgData, "PNG", 0, 0, 1920, 1080)
      } finally {
        // Clean up DOM
        document.body.removeChild(slideElement)
      }
    }

    this.updateProgress("finalizing", 90, "Finalizing PDF...", slides.length, slides.length)

    const pdfBlob = pdf.output("blob")

    this.updateProgress("complete", 100, "PDF export complete!", slides.length, slides.length)

    return pdfBlob
  }

  async exportToPowerPoint(slides: ExportSlide[], title = "SlydPRO Presentation"): Promise<Blob> {
    this.updateProgress("preparing", 10, "Preparing PowerPoint export...", 0, slides.length)

    const pptx = new PptxGenJS()

    // Set presentation properties
    pptx.author = "SlydPRO"
    pptx.company = "SlydPRO AI"
    pptx.subject = "AI Generated Presentation"
    pptx.title = title

    // Set slide size to 16:9
    pptx.defineLayout({ name: "LAYOUT_16x9", width: 13.33, height: 7.5 })
    pptx.layout = "LAYOUT_16x9"

    this.updateProgress("generating", 20, "Generating PowerPoint slides...", 0, slides.length)

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]

      this.updateProgress(
        "generating",
        20 + (i / slides.length) * 60,
        `Creating slide ${i + 1}...`,
        i + 1,
        slides.length,
      )

      const pptxSlide = pptx.addSlide()

      // Set background
      if (slide.background.includes("gradient")) {
        // Convert CSS gradient to PowerPoint gradient
        const gradientColors = this.extractGradientColors(slide.background)
        pptxSlide.background = {
          fill: {
            type: "gradient",
            colors: gradientColors,
          },
        }
      } else {
        pptxSlide.background = { fill: slide.background }
      }

      // Add title
      if (slide.title) {
        pptxSlide.addText(slide.title, {
          x: 0.5,
          y: 0.5,
          w: 12.33,
          h: 1.5,
          fontSize: slide.layout === "title" ? 48 : 36,
          color: slide.titleColor || slide.textColor,
          bold: true,
          align: slide.layout === "title" ? "center" : "left",
          fontFace: "SF Pro Display",
        })
      }

      // Add content based on layout
      if (slide.layout === "chart" && slide.chartData) {
        this.addChartToSlide(pptxSlide, slide.chartData, slide)
      } else if (slide.layout === "table" && slide.tableData) {
        this.addTableToSlide(pptxSlide, slide.tableData, slide)
      } else {
        // Add text content
        const contentText = typeof slide.content === "string" ? slide.content : ""
        if (contentText) {
          pptxSlide.addText(contentText, {
            x: 0.5,
            y: slide.layout === "title" ? 3 : 2.5,
            w: 12.33,
            h: slide.layout === "title" ? 3 : 4,
            fontSize: slide.layout === "title" ? 24 : 20,
            color: slide.textColor,
            align: slide.layout === "title" ? "center" : "left",
            fontFace: "SF Pro Text",
            bullet: contentText.includes("•") || contentText.includes("-"),
          })
        }
      }
    }

    this.updateProgress("finalizing", 90, "Finalizing PowerPoint...", slides.length, slides.length)

    const pptxBlob = (await pptx.write("blob")) as Blob

    this.updateProgress("complete", 100, "PowerPoint export complete!", slides.length, slides.length)

    return pptxBlob
  }

  private createSlideElement(slide: ExportSlide): HTMLElement {
    const slideDiv = document.createElement("div")
    slideDiv.style.width = "1920px"
    slideDiv.style.height = "1080px"
    slideDiv.style.background = slide.background
    slideDiv.style.color = slide.textColor
    slideDiv.style.padding = "80px"
    slideDiv.style.boxSizing = "border-box"
    slideDiv.style.fontFamily = "SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif"
    slideDiv.style.position = "absolute"
    slideDiv.style.top = "-10000px"
    slideDiv.style.left = "-10000px"

    // Add title
    if (slide.title) {
      const titleEl = document.createElement("h1")
      titleEl.textContent = slide.title
      titleEl.style.fontSize = slide.layout === "title" ? "72px" : "54px"
      titleEl.style.color = slide.titleColor || slide.textColor
      titleEl.style.fontWeight = "bold"
      titleEl.style.marginBottom = "40px"
      titleEl.style.textAlign = slide.layout === "title" ? "center" : "left"
      slideDiv.appendChild(titleEl)
    }

    // Add content
    if (typeof slide.content === "string" && slide.content) {
      const contentEl = document.createElement("div")
      contentEl.innerHTML = slide.content.replace(/\n/g, "<br>")
      contentEl.style.fontSize = "32px"
      contentEl.style.lineHeight = "1.6"
      contentEl.style.color = slide.textColor
      slideDiv.appendChild(contentEl)
    }

    return slideDiv
  }

  private extractGradientColors(gradient: string): Array<{ color: string; position: number }> {
    // Simple gradient color extraction - can be enhanced
    const colors = ["#3b82f6", "#1d4ed8"] // Default blue gradient
    return colors.map((color, index) => ({
      color,
      position: index * 100,
    }))
  }

  private addChartToSlide(slide: any, chartData: ExportSlide["chartData"], slideData: ExportSlide) {
    if (!chartData) return

    // Add chart data as a PowerPoint chart
    slide.addChart(PptxGenJS.ChartType.bar, chartData.data, {
      x: 1,
      y: 3,
      w: 11,
      h: 4,
      chartColors: [slideData.accentColor || "#3b82f6"],
      showTitle: false,
      showLegend: false,
    })
  }

  private addTableToSlide(slide: any, tableData: ExportSlide["tableData"], slideData: ExportSlide) {
    if (!tableData) return

    const tableRows = [tableData.headers, ...tableData.rows]

    slide.addTable(tableRows, {
      x: 0.5,
      y: 2.5,
      w: 12.33,
      h: 4,
      fontSize: 16,
      color: slideData.textColor,
      fill: { color: "F7F7F7" },
      border: { pt: 1, color: "CFCFCF" },
    })
  }
}

export async function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
