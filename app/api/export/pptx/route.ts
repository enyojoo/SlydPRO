import { type NextRequest, NextResponse } from "next/server"
import PptxGenJS from "pptxgenjs"

export async function POST(request: NextRequest) {
  try {
    const { slides, projectName } = await request.json()

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: "Invalid slides data" }, { status: 400 })
    }

    const pptx = new PptxGenJS()

    // Set presentation properties
    pptx.author = "SlydPRO"
    pptx.company = "SlydPRO Platform"
    pptx.title = projectName || "Presentation"
    pptx.subject = "AI Generated Presentation"

    slides.forEach((slide, index) => {
      const pptxSlide = pptx.addSlide()

      // Set slide background
      if (slide.background) {
        if (slide.background.includes("gradient")) {
          // Handle gradient backgrounds
          const gradientMatch = slide.background.match(/linear-gradient$$([^)]+)$$/)
          if (gradientMatch) {
            const gradientColors = gradientMatch[1].split(",").map((c: string) => c.trim())
            const startColor = extractPptxColor(gradientColors[1]) || "FFFFFF"
            const endColor = extractPptxColor(gradientColors[2]) || "F0F0F0"

            pptxSlide.background = {
              fill: {
                type: "gradient",
                colors: [
                  { color: startColor, position: 0 },
                  { color: endColor, position: 100 },
                ],
                angle: 45,
              },
            }
          }
        } else {
          // Solid color background
          const bgColor = extractPptxColor(slide.background) || "FFFFFF"
          pptxSlide.background = { fill: bgColor }
        }
      }

      // Add title
      if (slide.title) {
        const titleOptions: any = {
          x: slide.layout === "title" ? 1 : 0.5,
          y: slide.layout === "title" ? 2 : 0.5,
          w: slide.layout === "title" ? 8 : 9,
          h: 1.5,
          fontSize: slide.layout === "title" ? 36 : 28,
          bold: true,
          color: extractPptxColor(slide.titleColor || slide.textColor) || "000000",
          align: slide.layout === "title" ? "center" : "left",
          fontFace: slide.titleFont || "Arial",
          valign: "middle",
        }

        pptxSlide.addText(slide.title, titleOptions)
      }

      // Add content
      if (slide.content && typeof slide.content === "string") {
        const contentLines = slide.content.split("\n").filter((line) => line.trim())

        if (slide.layout === "title") {
          // Center content for title slides
          const contentText = contentLines.join("\n")
          pptxSlide.addText(contentText, {
            x: 1,
            y: 4,
            w: 8,
            h: 3,
            fontSize: 18,
            color: extractPptxColor(slide.textColor) || "000000",
            align: "center",
            fontFace: slide.contentFont || "Arial",
            valign: "top",
          })
        } else {
          // Regular content layout
          let yPosition = 2.5

          contentLines.forEach((line, lineIndex) => {
            const cleanLine = line.replace(/^[•-]\s*/, "")
            const isBullet = line.startsWith("•") || line.startsWith("-")

            pptxSlide.addText(cleanLine, {
              x: isBullet ? 1 : 0.5,
              y: yPosition,
              w: 9,
              h: 0.5,
              fontSize: 16,
              color: extractPptxColor(slide.textColor) || "000000",
              fontFace: slide.contentFont || "Arial",
              bullet: isBullet ? { type: "bullet" } : false,
            })

            yPosition += 0.6
          })
        }
      }

      // Add chart if present
      if (slide.chartData && slide.chartData.data) {
        const chartData = slide.chartData.data.map((item: any) => ({
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

        try {
          pptxSlide.addChart(chartType, chartData, {
            x: 1,
            y: slide.title ? 3 : 1,
            w: 8,
            h: 4,
            showTitle: false,
            showLegend: true,
            legendPos: "r",
            chartColors: [
              extractPptxColor(slide.accentColor) || "027659",
              "10B981",
              "F59E0B",
              "EF4444",
              "8B5CF6",
              "06B6D4",
            ],
          })
        } catch (chartError) {
          console.warn("Chart generation failed, adding as text:", chartError)
          // Fallback: add chart data as text
          let chartText = "Chart Data:\n"
          slide.chartData.data.forEach((item: any) => {
            chartText += `${item.name}: ${item.value}\n`
          })

          pptxSlide.addText(chartText, {
            x: 1,
            y: slide.title ? 3 : 1,
            w: 8,
            h: 3,
            fontSize: 14,
            color: extractPptxColor(slide.textColor) || "000000",
            fontFace: "Arial",
          })
        }
      }

      // Add table if present
      if (slide.tableData && slide.tableData.rows) {
        const tableRows = slide.tableData.rows.map((row: any[]) =>
          row.map((cell) => ({ text: String(cell), options: { fontSize: 12 } })),
        )

        pptxSlide.addTable(tableRows, {
          x: 0.5,
          y: slide.title ? 3 : 1,
          w: 9,
          h: 4,
          border: { pt: 1, color: "CCCCCC" },
          fill: { color: "F8F9FA" },
          fontSize: 12,
          color: extractPptxColor(slide.textColor) || "000000",
        })
      }
    })

    // Generate the PPTX file
    const pptxBuffer = await pptx.write("arraybuffer")

    return new NextResponse(pptxBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${projectName || "presentation"}.pptx"`,
      },
    })
  } catch (error) {
    console.error("PPTX generation error:", error)
    return NextResponse.json({ error: "Failed to generate PowerPoint presentation" }, { status: 500 })
  }
}

function extractPptxColor(colorString: string): string {
  if (!colorString) return "FFFFFF"

  // Handle hex colors (remove # and return uppercase)
  const hexMatch = colorString.match(/#([0-9a-fA-F]{6})/)
  if (hexMatch) return hexMatch[1].toUpperCase()

  // Handle rgb colors
  const rgbMatch = colorString.match(/rgb$$(\d+),\s*(\d+),\s*(\d+)$$/)
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1])
    const g = Number.parseInt(rgbMatch[2])
    const b = Number.parseInt(rgbMatch[3])
    return `${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase()
  }

  // Default colors for common names
  const colorMap: { [key: string]: string } = {
    white: "FFFFFF",
    black: "000000",
    red: "FF0000",
    blue: "0000FF",
    green: "008000",
    gray: "808080",
    grey: "808080",
  }

  return colorMap[colorString.toLowerCase()] || "FFFFFF"
}
