import { type NextRequest, NextResponse } from "next/server"
import jsPDF from "jspdf"

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
    type: string
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

// Helper function to extract color from CSS string
function extractColor(cssColor: string): string {
  if (cssColor.startsWith("#")) {
    return cssColor
  }

  if (cssColor.startsWith("rgb")) {
    const matches = cssColor.match(/\d+/g)
    if (matches && matches.length >= 3) {
      const r = Number.parseInt(matches[0])
      const g = Number.parseInt(matches[1])
      const b = Number.parseInt(matches[2])
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
    }
  }

  if (cssColor.includes("gradient")) {
    // Extract first color from gradient
    const colorMatch = cssColor.match(/#[0-9a-fA-F]{6}|rgb$$[^)]+$$/)
    if (colorMatch) {
      return extractColor(colorMatch[0])
    }
  }

  // Default colors for common CSS color names
  const colorMap: { [key: string]: string } = {
    white: "#ffffff",
    black: "#000000",
    red: "#ff0000",
    green: "#008000",
    blue: "#0000ff",
    yellow: "#ffff00",
    purple: "#800080",
    orange: "#ffa500",
    gray: "#808080",
    grey: "#808080",
  }

  return colorMap[cssColor.toLowerCase()] || "#000000"
}

// Helper function to wrap text
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let currentLine = ""

  const avgCharWidth = fontSize * 0.6 // Approximate character width
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth)

  for (const word of words) {
    if ((currentLine + word).length <= maxCharsPerLine) {
      currentLine += (currentLine ? " " : "") + word
    } else {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        lines.push(word)
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

export async function POST(request: NextRequest) {
  try {
    const { slides, projectName }: ExportRequest = await request.json()

    if (!slides || slides.length === 0) {
      return NextResponse.json({ error: "No slides provided" }, { status: 400 })
    }

    // Create PDF document in landscape mode
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20

    slides.forEach((slide, index) => {
      if (index > 0) {
        pdf.addPage()
      }

      // Set background color
      const bgColor = extractColor(slide.background)
      pdf.setFillColor(bgColor)
      pdf.rect(0, 0, pageWidth, pageHeight, "F")

      // Set text color
      const textColor = extractColor(slide.textColor || "#000000")
      pdf.setTextColor(textColor)

      // Title
      const titleColor = extractColor(slide.titleColor || slide.textColor || "#000000")
      pdf.setTextColor(titleColor)
      pdf.setFontSize(24)
      pdf.setFont("helvetica", "bold")

      const titleLines = wrapText(slide.title, pageWidth - margin * 2, 24)
      let yPosition = margin + 15

      titleLines.forEach((line, lineIndex) => {
        pdf.text(line, margin, yPosition + lineIndex * 10)
      })

      yPosition += titleLines.length * 10 + 10

      // Content
      pdf.setTextColor(textColor)
      pdf.setFontSize(14)
      pdf.setFont("helvetica", "normal")

      if (slide.content) {
        const contentLines = slide.content.split("\n").filter((line) => line.trim())

        contentLines.forEach((line) => {
          const trimmedLine = line.trim()

          if (trimmedLine.startsWith("•") || trimmedLine.startsWith("-")) {
            // Bullet point
            const bulletContent = trimmedLine.substring(1).trim()
            const wrappedLines = wrapText(bulletContent, pageWidth - margin * 3, 14)

            wrappedLines.forEach((wrappedLine, lineIndex) => {
              if (lineIndex === 0) {
                pdf.text("•", margin + 5, yPosition)
                pdf.text(wrappedLine, margin + 15, yPosition)
              } else {
                pdf.text(wrappedLine, margin + 15, yPosition)
              }
              yPosition += 7
            })
          } else {
            // Regular text
            const wrappedLines = wrapText(trimmedLine, pageWidth - margin * 2, 14)
            wrappedLines.forEach((wrappedLine) => {
              pdf.text(wrappedLine, margin, yPosition)
              yPosition += 7
            })
          }

          yPosition += 3 // Extra spacing between paragraphs
        })
      }

      // Add chart data as text if present
      if (slide.chartData && slide.chartData.data) {
        yPosition += 10
        pdf.setFontSize(12)
        pdf.setFont("helvetica", "bold")
        pdf.text("Chart Data:", margin, yPosition)
        yPosition += 8

        pdf.setFont("helvetica", "normal")
        slide.chartData.data.forEach((item) => {
          pdf.text(`${item.name}: ${item.value}`, margin + 10, yPosition)
          yPosition += 6
        })
      }

      // Add table data if present
      if (slide.tableData && slide.tableData.headers) {
        yPosition += 10
        pdf.setFontSize(12)
        pdf.setFont("helvetica", "bold")

        // Headers
        slide.tableData.headers.forEach((header, colIndex) => {
          pdf.text(header, margin + colIndex * 60, yPosition)
        })
        yPosition += 8

        // Rows
        pdf.setFont("helvetica", "normal")
        slide.tableData.rows.forEach((row) => {
          row.forEach((cell, colIndex) => {
            pdf.text(cell, margin + colIndex * 60, yPosition)
          })
          yPosition += 6
        })
      }

      // Add slide number
      pdf.setFontSize(10)
      pdf.setTextColor("#666666")
      pdf.text(`${index + 1} / ${slides.length}`, pageWidth - margin - 20, pageHeight - 10)
    })

    // Generate PDF buffer
    const pdfBuffer = pdf.output("arraybuffer")

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${projectName || "presentation"}.pdf"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("PDF export error:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
