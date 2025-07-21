import { type NextRequest, NextResponse } from "next/server"
import PptxGenJS from "pptxgenjs"

interface SlideData {
  id: string
  title: string
  content: string
  background: string
  textColor: string
  titleColor?: string
  accentColor?: string
  layout: string
  chartData?: {
    type: "bar" | "line" | "pie" | "area"
    data: Array<{ name: string; value: number }>
  }
  tableData?: {
    headers: string[]
    rows: string[][]
  }
}

interface ExportRequest {
  slides: SlideData[]
  projectName: string
}

// Helper function to extract hex color from CSS string
function extractHexColor(cssColor: string): string {
  if (cssColor.startsWith("#")) {
    return cssColor.replace("#", "")
  }

  if (cssColor.startsWith("rgb")) {
    const matches = cssColor.match(/\d+/g)
    if (matches && matches.length >= 3) {
      const r = Number.parseInt(matches[0])
      const g = Number.parseInt(matches[1])
      const b = Number.parseInt(matches[2])
      return `${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
    }
  }

  if (cssColor.includes("gradient")) {
    // Extract first color from gradient
    const colorMatch = cssColor.match(/#[0-9a-fA-F]{6}|rgb$$[^)]+$$/)
    if (colorMatch) {
      return extractHexColor(colorMatch[0])
    }
  }

  // Default colors
  const colorMap: { [key: string]: string } = {
    white: "FFFFFF",
    black: "000000",
    red: "FF0000",
    green: "008000",
    blue: "0000FF",
    yellow: "FFFF00",
    purple: "800080",
    orange: "FFA500",
    gray: "808080",
    grey: "808080",
  }

  return colorMap[cssColor.toLowerCase()] || "000000"
}

export async function POST(request: NextRequest) {
  try {
    const { slides, projectName }: ExportRequest = await request.json()

    if (!slides || slides.length === 0) {
      return NextResponse.json({ error: "No slides provided" }, { status: 400 })
    }

    // Create new presentation
    const pptx = new PptxGenJS()

    // Set presentation properties
    pptx.author = "SlydPRO"
    pptx.company = "SlydPRO"
    pptx.title = projectName || "Presentation"
    pptx.subject = "AI Generated Presentation"

    slides.forEach((slide, index) => {
      const pptxSlide = pptx.addSlide()

      // Set background
      const bgColor = extractHexColor(slide.background)
      if (slide.background.includes("gradient")) {
        // For gradients, use the primary color as solid background
        pptxSlide.background = { color: bgColor }
      } else {
        pptxSlide.background = { color: bgColor }
      }

      // Add title
      const titleColor = extractHexColor(slide.titleColor || slide.textColor || "#000000")
      pptxSlide.addText(slide.title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 1.5,
        fontSize: slide.layout === "title" ? 36 : 28,
        color: titleColor,
        bold: true,
        align: slide.layout === "title" ? "center" : "left",
        fontFace: "Arial",
      })

      // Add content
      if (slide.content) {
        const textColor = extractHexColor(slide.textColor || "#000000")
        const contentLines = slide.content.split("\n").filter((line) => line.trim())

        if (slide.layout === "title") {
          // Center content for title slides
          const contentText = contentLines.join("\n")
          pptxSlide.addText(contentText, {
            x: 1,
            y: 2.5,
            w: 8,
            h: 3,
            fontSize: 18,
            color: textColor,
            align: "center",
            fontFace: "Arial",
          })
        } else {
          // Regular content layout
          const bulletPoints: string[] = []
          const regularText: string[] = []

          contentLines.forEach((line) => {
            const trimmedLine = line.trim()
            if (trimmedLine.startsWith("•") || trimmedLine.startsWith("-")) {
              bulletPoints.push(trimmedLine.substring(1).trim())
            } else {
              regularText.push(trimmedLine)
            }
          })

          let yPosition = 2

          // Add regular text first
          if (regularText.length > 0) {
            pptxSlide.addText(regularText.join("\n"), {
              x: 0.5,
              y: yPosition,
              w: 9,
              h: 1.5,
              fontSize: 16,
              color: textColor,
              fontFace: "Arial",
            })
            yPosition += 1.8
          }

          // Add bullet points
          if (bulletPoints.length > 0) {
            pptxSlide.addText(bulletPoints, {
              x: 0.5,
              y: yPosition,
              w: 9,
              h: 4,
              fontSize: 14,
              color: textColor,
              bullet: true,
              fontFace: "Arial",
            })
          }
        }
      }

      // Add chart if present
      if (slide.chartData && slide.chartData.data && slide.chartData.data.length > 0) {
        const chartData = slide.chartData.data.map((item) => ({
          name: item.name,
          labels: [item.name],
          values: [item.value],
        }))

        const accentColor = extractHexColor(slide.accentColor || "#3b82f6")

        try {
          if (slide.chartData.type === "pie") {
            pptxSlide.addChart(PptxGenJS.ChartType.pie, chartData, {
              x: 5.5,
              y: 2,
              w: 4,
              h: 3,
              showTitle: false,
              chartColors: [accentColor, "10b981", "f59e0b", "ef4444", "8b5cf6"],
            })
          } else if (slide.chartData.type === "line") {
            pptxSlide.addChart(PptxGenJS.ChartType.line, chartData, {
              x: 5.5,
              y: 2,
              w: 4,
              h: 3,
              showTitle: false,
              chartColors: [accentColor],
            })
          } else if (slide.chartData.type === "area") {
            pptxSlide.addChart(PptxGenJS.ChartType.area, chartData, {
              x: 5.5,
              y: 2,
              w: 4,
              h: 3,
              showTitle: false,
              chartColors: [accentColor],
            })
          } else {
            // Default to bar chart
            pptxSlide.addChart(PptxGenJS.ChartType.bar, chartData, {
              x: 5.5,
              y: 2,
              w: 4,
              h: 3,
              showTitle: false,
              chartColors: [accentColor],
            })
          }
        } catch (chartError) {
          console.warn("Chart creation failed, skipping:", chartError)
        }
      }

      // Add table if present
      if (slide.tableData && slide.tableData.headers && slide.tableData.rows) {
        const tableData = [slide.tableData.headers, ...slide.tableData.rows]

        const textColor = extractHexColor(slide.textColor || "#000000")
        const accentColor = extractHexColor(slide.accentColor || "#3b82f6")

        pptxSlide.addTable(tableData, {
          x: 0.5,
          y: slide.content ? 4 : 2,
          w: 9,
          h: 2.5,
          fontSize: 12,
          color: textColor,
          fill: { color: "FFFFFF" },
          border: { pt: 1, color: accentColor },
          rowH: 0.4,
          colW: [2, 2, 2, 2, 1],
        })
      }

      // Add slide number
      pptxSlide.addText(`${index + 1}`, {
        x: 9.5,
        y: 6.8,
        w: 0.5,
        h: 0.3,
        fontSize: 10,
        color: "666666",
        align: "center",
      })
    })

    // Generate PPTX buffer
    const pptxBuffer = await pptx.write({ outputType: "arraybuffer" })

    return new NextResponse(pptxBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${projectName || "presentation"}.pptx"`,
        "Content-Length": pptxBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("PPTX export error:", error)
    return NextResponse.json({ error: "Failed to generate PowerPoint presentation" }, { status: 500 })
  }
}
