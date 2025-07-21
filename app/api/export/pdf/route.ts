import { type NextRequest, NextResponse } from "next/server"
import jsPDF from "jspdf"

export async function POST(request: NextRequest) {
  try {
    const { slides, projectName } = await request.json()

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: "Invalid slides data" }, { status: 400 })
    }

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    })

    // Remove the first page that's automatically created
    pdf.deletePage(1)

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]

      // Add a new page for each slide
      pdf.addPage("a4", "landscape")

      // Set background
      if (slide.background) {
        if (slide.background.includes("gradient")) {
          // Handle gradient backgrounds
          const gradientMatch = slide.background.match(/linear-gradient$$([^)]+)$$/)
          if (gradientMatch) {
            const gradientColors = gradientMatch[1].split(",").map((c) => c.trim())
            const startColor = extractColor(gradientColors[1]) || "#ffffff"
            const endColor = extractColor(gradientColors[2]) || "#f0f0f0"

            pdf.setFillColor(startColor)
            pdf.rect(0, 0, 297, 210, "F")
          }
        } else {
          // Solid color background
          const bgColor = extractColor(slide.background) || "#ffffff"
          pdf.setFillColor(bgColor)
          pdf.rect(0, 0, 297, 210, "F")
        }
      }

      // Add title
      if (slide.title) {
        pdf.setFontSize(24)
        pdf.setTextColor(slide.titleColor || slide.textColor || "#000000")

        const titleLines = pdf.splitTextToSize(slide.title, 250)
        const yPosition = slide.layout === "title" ? 80 : 40

        titleLines.forEach((line: string, index: number) => {
          const textWidth = pdf.getTextWidth(line)
          const xPosition = slide.layout === "title" ? (297 - textWidth) / 2 : 20
          pdf.text(line, xPosition, yPosition + index * 12)
        })
      }

      // Add content
      if (slide.content && typeof slide.content === "string") {
        pdf.setFontSize(14)
        pdf.setTextColor(slide.textColor || "#000000")

        const contentLines = slide.content.split("\n").filter((line) => line.trim())
        const yPosition = slide.layout === "title" ? 120 : 70

        contentLines.forEach((line: string, index: number) => {
          const cleanLine = line.replace(/^[•-]\s*/, "")
          const wrappedLines = pdf.splitTextToSize(cleanLine, 250)

          wrappedLines.forEach((wrappedLine: string, wrapIndex: number) => {
            const xPosition =
              slide.layout === "title"
                ? (297 - pdf.getTextWidth(wrappedLine)) / 2
                : line.startsWith("•") || line.startsWith("-")
                  ? 30
                  : 20

            pdf.text(wrappedLine, xPosition, yPosition + index * 8 + wrapIndex * 6)
          })
        })
      }

      // Add chart data as text if present
      if (slide.chartData) {
        pdf.setFontSize(12)
        pdf.setTextColor(slide.textColor || "#000000")

        const chartY = 140
        pdf.text("Chart Data:", 20, chartY)

        slide.chartData.data.forEach((item: any, index: number) => {
          pdf.text(`${item.name}: ${item.value}`, 20, chartY + 10 + index * 6)
        })
      }
    }

    const pdfBuffer = pdf.output("arraybuffer")

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${projectName || "presentation"}.pdf"`,
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}

function extractColor(colorString: string): string {
  if (!colorString) return "#ffffff"

  // Handle hex colors
  const hexMatch = colorString.match(/#[0-9a-fA-F]{6}/)
  if (hexMatch) return hexMatch[0]

  // Handle rgb colors
  const rgbMatch = colorString.match(/rgb$$(\d+),\s*(\d+),\s*(\d+)$$/)
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1])
    const g = Number.parseInt(rgbMatch[2])
    const b = Number.parseInt(rgbMatch[3])
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
  }

  // Default colors for common names
  const colorMap: { [key: string]: string } = {
    white: "#ffffff",
    black: "#000000",
    red: "#ff0000",
    blue: "#0000ff",
    green: "#008000",
    gray: "#808080",
    grey: "#808080",
  }

  return colorMap[colorString.toLowerCase()] || "#ffffff"
}
