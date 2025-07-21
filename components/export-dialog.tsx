"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FileText, Download, Presentation, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { SlideExporter, type ExportSlide, type ExportProgress } from "@/lib/export-utils"

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  slides: any[]
  presentationName: string
}

export function ExportDialog({ isOpen, onClose, slides, presentationName }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)

  const convertSlidesToExportFormat = (slides: any[]): ExportSlide[] => {
    return slides.map((slide, index) => ({
      id: slide.id || `slide-${index}`,
      title: slide.title || `Slide ${index + 1}`,
      content: slide.content || "",
      background: slide.background || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      textColor: slide.textColor || "#ffffff",
      titleColor: slide.titleColor,
      accentColor: slide.accentColor || "#3b82f6",
      layout: slide.layout || "content",
      chartData: slide.chartData,
      tableData: slide.tableData,
      professionalIcon: slide.professionalIcon,
    }))
  }

  const handleExport = async (format: "pdf" | "pptx") => {
    if (!slides || slides.length === 0) {
      setExportError("No slides available to export")
      return
    }

    setIsExporting(true)
    setExportError(null)
    setExportSuccess(null)
    setExportProgress(null)

    try {
      const exporter = new SlideExporter((progress) => {
        setExportProgress(progress)
      })

      const exportSlides = convertSlidesToExportFormat(slides)
      const filename = `${presentationName || "SlydPRO-Presentation"}.${format}`

      let blob: Blob

      if (format === "pdf") {
        blob = await exporter.exportToPDF(exportSlides, presentationName)
      } else {
        blob = await exporter.exportToPowerPoint(exportSlides, presentationName)
      }

      await SlideExporter.downloadFile(blob, filename)

      setExportSuccess(`Successfully exported ${slides.length} slides as ${format.toUpperCase()}!`)

      // Auto-close success message after 3 seconds
      setTimeout(() => {
        setExportSuccess(null)
        onClose()
      }, 3000)
    } catch (error) {
      console.error("Export error:", error)
      setExportError(error instanceof Error ? error.message : "Export failed. Please try again.")
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportProgress(null), 2000)
    }
  }

  const resetDialog = () => {
    setExportError(null)
    setExportSuccess(null)
    setExportProgress(null)
    setIsExporting(false)
  }

  const handleClose = () => {
    if (!isExporting) {
      resetDialog()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Presentation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Progress */}
          {exportProgress && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">{exportProgress.message}</span>
              </div>
              <Progress value={exportProgress.progress} className="w-full" />
              {exportProgress.currentSlide && exportProgress.totalSlides && (
                <p className="text-xs text-muted-foreground">
                  Processing slide {exportProgress.currentSlide} of {exportProgress.totalSlides}
                </p>
              )}
            </div>
          )}

          {/* Success Message */}
          {exportSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-800">{exportSuccess}</span>
            </div>
          )}

          {/* Error Message */}
          {exportError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-800">{exportError}</span>
            </div>
          )}

          {/* Export Options */}
          {!exportProgress && !exportSuccess && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">Choose your export format:</div>

              <div className="grid gap-3">
                {/* PDF Export */}
                <Button
                  onClick={() => handleExport("pdf")}
                  disabled={isExporting || !slides || slides.length === 0}
                  className="flex items-center justify-between p-4 h-auto"
                  variant="outline"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Export as PDF</div>
                      <div className="text-xs text-muted-foreground">High-quality PDF for sharing and printing</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{slides?.length || 0} slides</div>
                </Button>

                {/* PowerPoint Export */}
                <Button
                  onClick={() => handleExport("pptx")}
                  disabled={isExporting || !slides || slides.length === 0}
                  className="flex items-center justify-between p-4 h-auto"
                  variant="outline"
                >
                  <div className="flex items-center gap-3">
                    <Presentation className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Export as PowerPoint</div>
                      <div className="text-xs text-muted-foreground">Editable PPTX file for Microsoft PowerPoint</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{slides?.length || 0} slides</div>
                </Button>
              </div>

              {(!slides || slides.length === 0) && (
                <p className="text-sm text-muted-foreground text-center">
                  No slides available to export. Please generate slides first.
                </p>
              )}
            </div>
          )}

          {/* Close Button */}
          {!isExporting && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
